#!/bin/bash
set -eu

REPO=/Users/peterwatters/src/simply-fpl
STOP_AT_UTC='2026-05-17T21:00:00Z'
PID_FILE=/tmp/lf01-gw37.pid
LOG_FILE=/tmp/lf01-gw37.log
SCHED_LOG=/tmp/lf01-gw37-stop.log
SUMMARY=var/fpl-cadence-summary-gw37.md

cd "$REPO"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "already running pid=$(cat "$PID_FILE")"
  echo "tail $LOG_FILE to watch; kill -INT \$(cat $PID_FILE) to stop early"
  exit 0
fi

mkdir -p var

caffeinate -dimsu node scripts/measure-fpl-cadence.mjs > "$LOG_FILE" 2>&1 &
RUN_PID=$!
echo "$RUN_PID" > "$PID_FILE"
disown "$RUN_PID" 2>/dev/null || true

TARGET=$(TZ=UTC date -j -f '%Y-%m-%dT%H:%M:%SZ' "$STOP_AT_UTC" +%s)
NOW=$(date -u +%s)
DELAY=$((TARGET - NOW))

if [ "$DELAY" -le 0 ]; then
  echo "stop time is in the past, killing immediately"
  kill -INT "$RUN_PID"
  exit 1
fi

HOURS=$((DELAY / 3600))
MINUTES=$(((DELAY % 3600) / 60))

nohup bash -c "
sleep $DELAY
echo \"\$(date -u +%Y-%m-%dT%H:%M:%SZ) sending SIGINT to \$(cat $PID_FILE)\" >> $SCHED_LOG
kill -INT \$(cat $PID_FILE) 2>>$SCHED_LOG || echo 'already stopped' >> $SCHED_LOG
sleep 5
echo \"running analyzer\" >> $SCHED_LOG
cd $REPO
node scripts/analyze-fpl-cadence.mjs var/fpl-cadence-gw37-*.jsonl > $SUMMARY 2>>$SCHED_LOG
echo \"\$(date -u +%Y-%m-%dT%H:%M:%SZ) wrote $SUMMARY (\$(wc -l < $SUMMARY) lines)\" >> $SCHED_LOG
" > /dev/null 2>&1 &
SCHED_PID=$!
disown "$SCHED_PID" 2>/dev/null || true

cat <<EOF
started cadence soak
  measurement pid: $RUN_PID    (log: $LOG_FILE)
  auto-stop at:    $STOP_AT_UTC  (in ${HOURS}h ${MINUTES}m)
  scheduler pid:   $SCHED_PID    (log: $SCHED_LOG)
  summary will be: $REPO/$SUMMARY

keep laptop open + plugged in (caffeinate holds the wake-lock)
watch live: tail -f $LOG_FILE
stop early: kill -INT $RUN_PID
EOF
