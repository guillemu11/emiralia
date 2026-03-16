#!/bin/bash
set -e

BOT_DIR="/c/Users/gmunoz02/Desktop/emiralia/tools/telegram"
LOG_FILE="/c/Users/gmunoz02/Desktop/emiralia/telegram-bot.log"
PID_FILE="/c/Users/gmunoz02/Desktop/emiralia/telegram-bot.pid"

echo "🚀 Starting Telegram Bot..."

# Matar proceso anterior si existe
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "Killing existing bot (PID: $OLD_PID)"
        kill "$OLD_PID" 2>/dev/null || true
        sleep 2
    fi
    rm "$PID_FILE"
fi

# Verificar Docker
echo "Checking Docker services..."
docker ps | grep emiralia_postgres || {
    echo "ERROR: PostgreSQL not running. Start with: docker compose up -d"
    exit 1
}

# Test DB connection
echo "Testing database..."
cd /c/Users/gmunoz02/Desktop/emiralia
node -e "
import('pg').then(({ default: pg }) => {
    const pool = new pg.Pool({
        host: 'localhost',
        port: 5433,
        database: 'emiralia',
        user: 'emiralia',
        password: 'changeme'
    });
    pool.query('SELECT NOW()').then(() => {
        console.log('DB OK');
        process.exit(0);
    }).catch(err => {
        console.error('DB Error:', err.message);
        process.exit(1);
    });
});
" || {
    echo "ERROR: Cannot connect to database"
    exit 1
}

# Iniciar bot en background
echo "Launching bot..."
cd /c/Users/gmunoz02/Desktop/emiralia
nohup node tools/telegram/bot.js >> "$LOG_FILE" 2>&1 &
BOT_PID=$!
echo "$BOT_PID" > "$PID_FILE"

echo "✅ Bot started (PID: $BOT_PID)"
echo "📋 Logs: tail -f $LOG_FILE"

# Verificar que no crasheó inmediatamente
sleep 3
if ps -p "$BOT_PID" > /dev/null 2>&1; then
    echo "✅ Bot is running"
    echo ""
    echo "Last 10 log lines:"
    tail -10 "$LOG_FILE"
else
    echo "❌ Bot crashed. Check logs:"
    cat "$LOG_FILE"
    exit 1
fi
