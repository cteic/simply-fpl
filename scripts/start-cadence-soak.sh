#!/bin/bash
set -eu

REPO=/Users/peterwatters/src/simply-fpl
PID_FILE=/tmp/lf01-cadence-soak.pid
LOG_FILE=/tmp/lf01-cadence-soak.log
SCHED_LOG=/tmp/lf01-cadence-soak-stop.log

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  cat <<USAGE
usage: $0 [stop-utc-timestamp]

  Defaults to the next Sunday at 21:00 UTC (or today if it's Sunday before 21:00).
  Examples:
    $0                              # auto: next Sunday 21:00 UTC
    $0 2026-05-24T21:00:00Z         # explicit
    $0 \$(date -u -v+12H +%FT%H:00:00Z)  # 12 hours from now
USAGE
  exit 0
fi

if [ $# -ge 1 ]; then
  STOP_AT_UTC="$1"
else
  DOW=$(date -u +%u)
  HOUR=$(date -u +%H)
  DAYS_AHEAD=$(((7 - DOW) % 7))
  if [ "$DAYS_AHEAD" -eq 0 ] && [ "$HOUR" -ge 21 ]; then
    DAYS_AHEAD=7
  fi
  STOP_AT_UTC=$(date -u -v+${DAYS_AHEAD}d +%Y-%m-%dT21:00:00Z)
fi

cd "$REPO"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "already running pid=$(cat "$PID_FILE")"
  echo "tail $LOG_FILE to watch; kill -INT \$(cat $PID_FILE) to stop early"
  exit 0
fi

mkdir -p var

caffeinate -dimsu node scripts/measure-fpl-cadence.mjs >"$LOG_FILE" 2>&1 &
RUN_PID=$!
echo "$RUN_PID" >"$PID_FILE"
disown "$RUN_PID" 2>/dev/null || true

sleep 3
JSONL_PATH=$(grep -oE 'var/fpl-cadence-[^ ]+\.jsonl' "$LOG_FILE" | head -1)
if [ -z "$JSONL_PATH" ]; then
  echo "warning: could not detect JSONL path from $LOG_FILE; analyzer will glob var/fpl-cadence-*.jsonl"
  JSONL_PATH='var/fpl-cadence-*.jsonl'
fi
GW_TAG=$(echo "$JSONL_PATH" | grep -oE 'gw[0-9]+' | head -1 || true)
SUMMARY="var/fpl-cadence-summary-${GW_TAG:-latest}.md"

TARGET=$(TZ=UTC date -j -f '%Y-%m-%dT%H:%M:%SZ' "$STOP_AT_UTC" +%s)
NOW=$(date -u +%s)
DELAY=$((TARGET - NOW))

if [ "$DELAY" -le 0 ]; then
  echo "stop time $STOP_AT_UTC is in the past, killing measurement now"
  kill -INT "$RUN_PID" 2>/dev/null || true
  exit 1
fi

HOURS=$((DELAY / 3600))
MINUTES=$(((DELAY % 3600) / 60))

nohup bash -c "
sleep $DELAY
echo \"\$(date -u +%Y-%m-%dT%H:%M:%SZ) sending SIGINT to \$(cat $PID_FILE)\" >> $SCHED_LOG
kill -INT \$(cat $PID_FILE) 2>>$SCHED_LOG || echo 'already stopped' >> $SCHED_LOG
sleep 5
echo \"running analyzer over $JSONL_PATH\" >> $SCHED_LOG
cd $REPO
node scripts/analyze-fpl-cadence.mjs $JSONL_PATH > $SUMMARY 2>>$SCHED_LOG
echo \"\$(date -u +%Y-%m-%dT%H:%M:%SZ) wrote $SUMMARY (\$(wc -l < $SUMMARY) lines)\" >> $SCHED_LOG
" >/dev/null 2>&1 &
SCHED_PID=$!
disown "$SCHED_PID" 2>/dev/null || true

cat <<EOF
started cadence soak
  measurement pid: $RUN_PID    (log: $LOG_FILE)
  jsonl:           $JSONL_PATH
  auto-stop at:    $STOP_AT_UTC  (in ${HOURS}h ${MINUTES}m)
  scheduler pid:   $SCHED_PID    (log: $SCHED_LOG)
  summary will be: $REPO/$SUMMARY

keep laptop open + plugged in (caffeinate holds the wake-lock)
watch live: tail -f $LOG_FILE
stop early: kill -INT $RUN_PID
EOF
