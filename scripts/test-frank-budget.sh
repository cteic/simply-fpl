#!/usr/bin/env bash
# Exercise supabase/migrations/0011_frank_daily_budget.sql against a real
# Postgres, including under concurrency.
#
# The route's own tests run against a counter with the same semantics, which
# proves the route and not the SQL. This proves the SQL: it applies the
# migration to a throwaway database, checks each edge case, then fires many
# simultaneous connections at a cap and confirms the grants never exceed it.
#
# Needs Docker. Starts and removes its own container.
#
# Usage: scripts/test-frank-budget.sh
set -euo pipefail

NAME=sfpl-frank-budget-test
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/0011_frank_daily_budget.sql"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16-alpine >/dev/null
for _ in $(seq 1 30); do
  docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

sql() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
scalar() { docker exec -i "$NAME" psql -U postgres -tAq -c "$1"; }

fail=0
expect() {
  local label="$1" want="$2" got="$3"
  if [ "$want" = "$got" ]; then
    printf '  ok    %s\n' "$label"
  else
    printf '  FAIL  %s: wanted %s, got %s\n' "$label" "$want" "$got"
    fail=1
  fi
}

# Supabase provides these roles; plain Postgres does not.
sql -c "create role anon; create role authenticated; create role service_role;"
sql < "$MIGRATION"
echo "migration applied"

echo "semantics"
expect "reserves while there is room" t "$(scalar 'select frank_reserve_tokens(6000, 10000)')"
expect "refuses what the cap cannot cover" f "$(scalar 'select frank_reserve_tokens(6000, 10000)')"
expect "a refusal reserves nothing" 6000 "$(scalar 'select tokens_reserved from frank_daily_budget')"
scalar 'select frank_settle_tokens(-1700)' >/dev/null
expect "settle hands back the unused part" 4300 "$(scalar 'select tokens_reserved from frank_daily_budget')"
expect "reserves up to the cap exactly" t "$(scalar 'select frank_reserve_tokens(5700, 10000)')"
expect "refuses one token past the cap" f "$(scalar 'select frank_reserve_tokens(1, 10000)')"
scalar 'select frank_settle_tokens(-999999)' >/dev/null
expect "the counter never goes below zero" 0 "$(scalar 'select tokens_reserved from frank_daily_budget')"
expect "refuses zero tokens" f "$(scalar 'select frank_reserve_tokens(0, 10000)')"
expect "refuses negative tokens" f "$(scalar 'select frank_reserve_tokens(-5, 10000)')"
expect "refuses a null cap" f "$(scalar 'select frank_reserve_tokens(10, null)')"

echo "access"
expect "row level security is on" t "$(scalar "select relrowsecurity from pg_class where relname='frank_daily_budget'")"
expect "anon cannot reserve" f "$(scalar "select has_function_privilege('anon','frank_reserve_tokens(integer,bigint)','execute')")"
expect "authenticated cannot reserve" f "$(scalar "select has_function_privilege('authenticated','frank_reserve_tokens(integer,bigint)','execute')")"
expect "anon cannot settle" f "$(scalar "select has_function_privilege('anon','frank_settle_tokens(integer)','execute')")"
expect "service_role can reserve" t "$(scalar "select has_function_privilege('service_role','frank_reserve_tokens(integer,bigint)','execute')")"

# The property the migration exists for. Each round starts with no row for the
# day, so it also covers the first request of a day racing others to create it.
burst() {
  local n="$1" tokens="$2" cap="$3" tmp granted total
  sql -c "delete from frank_daily_budget"
  tmp="$(mktemp -d)"
  for i in $(seq 1 "$n"); do
    (scalar "select frank_reserve_tokens($tokens, $cap)" >"$tmp/$i" 2>&1) &
  done
  wait
  granted="$(cat "$tmp"/* | grep -c '^t$' || true)"
  total="$(scalar 'select tokens_reserved from frank_daily_budget')"
  rm -rf "$tmp"
  expect "$n at once, room for $((cap / tokens)): grants" "$((cap / tokens))" "$granted"
  expect "$n at once, room for $((cap / tokens)): counter" "$((granted * tokens))" "$total"
}

echo "concurrency"
burst 60 6000 30000
burst 60 6000 30000
burst 60 6000 30000
burst 50 7 100

if [ "$fail" -ne 0 ]; then
  echo "FAILED"
  exit 1
fi
echo "all checks passed"
