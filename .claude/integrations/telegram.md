# Telegram — Integration

**Status:** ✅ Connected

**Service:** Telegram Bot API (notifications + multi-agent command center)

---

## Overview

Emiralia uses a **Telegram bot** for:
- **Agent Command Center** — invoke agents remotely (`/agents`, `/invoke`)
- **Notifications** — skill invocation alerts, daily EOD reports
- **Skill Ranking** — `/ranking` shows most-used skills

**Bot Username:** `@emiralia_bot` (configured in Railway)

---

## Configuration

### Environment Variables

```bash
# .env
TELEGRAM_BOT_TOKEN=7891234567:AAH...
TELEGRAM_CHAT_ID=123456789  # your user ID
```

**How to Get Token:**
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Follow prompts → receive token
4. Save token to `.env`

**How to Get Chat ID:**
```bash
# Start bot, send any message to it, then:
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates | jq '.result[0].message.chat.id'
```

---

## Health Check

```bash
# Test bot connectivity
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe | jq

# Expected:
# {
#   "ok": true,
#   "result": {
#     "id": 7891234567,
#     "is_bot": true,
#     "first_name": "Emiralia Bot",
#     "username": "emiralia_bot"
#   }
# }

# Test message sending
node -e "
import TelegramBot from 'node-telegram-bot-api';
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, '✅ Health check OK');
console.log('Message sent');
" --input-type=module
```

---

## Commands

### Agent Command Center

| Command | Description | Example |
|---------|-------------|---------|
| `/agents` | List all active agents with status | `/agents` |
| `/invoke <agent> <prompt>` | Invoke specific agent | `/invoke data-agent "scrape Dubai apartments"` |
| `/status <agent>` | Check agent status + memory | `/status pm-agent` |
| `/ranking` | Show most-used skills (last 30d) | `/ranking` |

### Admin Commands (Owner Only)

| Command | Description | Example |
|---------|-------------|---------|
| `/register` | Register user for bot access | `/register` |
| `/create-agent <id> <name> <role>` | Register new agent | `/create-agent seo-agent "SEO Agent" "SEO optimization"` |
| `/update-agent <id> <field> <value>` | Update agent metadata | `/update-agent data-agent status active` |
| `/delete-agent <id>` | Delete agent (soft delete) | `/delete-agent old-agent` |

---

## Architecture

**Bot Server:**
- **Location:** Railway deployment (24/7 uptime)
- **File:** `tools/telegram/bot.js`
- **Adapter:** Claude Agent SDK adapter in `tools/telegram/adapters/`

**Agent Invocation Flow:**
```
User: /invoke data-agent "scrape Dubai"
  ↓
bot.js receives command
  ↓
skill-executor.js parses agent + prompt
  ↓
Spawns Claude Agent SDK instance
  ↓
Agent executes with full tool access
  ↓
Response streamed back to Telegram
```

---

## Deployment (Railway)

**Start Command:**
```bash
node tools/telegram/bot.js
```

**Health Check:**
- Railway auto-restarts on crash
- Webhook: `https://emiralia-bot.up.railway.app/health`

**Logs:**
```bash
# View Railway logs
railway logs --tail

# Check for errors
railway logs | grep ERROR
```

---

## Common Issues

### Issue: Bot Not Responding
**Symptoms:** Commands sent but no response

**Solution:**
```bash
# Check Railway deployment status
railway status

# Check bot process
railway logs --tail | grep "Bot started"

# Restart bot
railway up --detach
```

### Issue: Unauthorized (403)
**Symptoms:** API returns `{"ok":false,"error_code":403}`

**Solution:**
- Verify `TELEGRAM_BOT_TOKEN` in Railway env vars
- Check token hasn't been revoked in @BotFather
- Regenerate token if needed: `/token` in @BotFather

### Issue: Chat Not Found
**Symptoms:** `{"ok":false,"error_code":400,"description":"Bad Request: chat not found"}`

**Solution:**
- Verify `TELEGRAM_CHAT_ID` is correct
- User must `/start` the bot first before receiving messages

### Issue: Agent Invocation Fails
**Symptoms:** `/invoke` returns error or timeout

**Solution:**
```bash
# Check agent is registered
node -e "
import pool from './tools/db/pool.js';
const res = await pool.query('SELECT * FROM agents WHERE id = \$1', ['data-agent']);
console.log(res.rows);
await pool.end();
" --input-type=module

# If not registered, run:
node tools/db/seed_agents.js
```

---

## Related Components

**Used By:**
- All agents — can be invoked via `/invoke <agent-id> <prompt>`
- [[data-agent]] — daily scrape notifications
- [[pm-agent]] — EOD report delivery
- [[research-agent]] — weekly intelligence reports

**Tools:**
- [[tools/telegram/bot.js]] — main bot server
- [[tools/telegram/skill-executor.js]] — agent invocation handler
- [[tools/telegram/crud-handler.js]] — CRUD operations (/create-agent, /update-agent, etc.)
- [[tools/telegram/adapters/]] — Claude Agent SDK integration

**Skills Accessible:**
- All 35+ skills can be invoked via Telegram
- Most common: `/propertyfinder-scraper`, `/eod-report`, `/pm-challenge`, `/wat-audit`

---

## Documentation

- **Telegram Bot API:** https://core.telegram.org/bots/api
- **node-telegram-bot-api:** https://github.com/yagop/node-telegram-bot-api
- **Claude Agent SDK:** https://github.com/anthropics/anthropic-sdk-typescript