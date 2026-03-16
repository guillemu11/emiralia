#!/bin/bash

LOG_FILE="/c/Users/gmunoz02/Desktop/emiralia/telegram-bot.log"
PID_FILE="/c/Users/gmunoz02/Desktop/emiralia/telegram-bot.pid"

echo "Telegram Bot Status"
echo "===================="

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "✅ Status: RUNNING (PID: $PID)"
        echo ""
        echo "Last 20 log lines:"
        tail -20 "$LOG_FILE"
    else
        echo "❌ Status: CRASHED"
        echo ""
        echo "Last 50 lines (crash context):"
        tail -50 "$LOG_FILE"
    fi
else
    echo "❌ Status: NOT RUNNING"
fi

echo ""
echo "Live logs: tail -f $LOG_FILE"
