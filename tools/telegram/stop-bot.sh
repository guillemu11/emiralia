#!/bin/bash

PID_FILE="/c/Users/gmunoz02/Desktop/emiralia/telegram-bot.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Bot may not be running."
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo "Stopping bot (PID: $PID)..."
    kill "$PID"
    sleep 2

    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Force killing..."
        kill -9 "$PID"
    fi

    echo "✅ Bot stopped"
else
    echo "Bot process not found (stale PID)"
fi

rm "$PID_FILE"
