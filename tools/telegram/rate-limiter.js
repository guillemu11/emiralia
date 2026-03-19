/**
 * Rate Limiter for Telegram Bot
 *
 * Prevents spam and abuse by limiting messages to 10 per minute per user.
 *
 * Part of Feature 11: Security & Auth (Agent Command Center)
 */

// In-memory storage: userId → { count, windowStart }
const userMessageCounts = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_MESSAGES = 10;

/**
 * Rate limiting middleware
 *
 * @param {Object} ctx - Telegraf context
 * @param {Function} next - Next middleware function
 */
export async function rateLimitMiddleware(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId) return next();

  const now = Date.now();
  const userData = userMessageCounts.get(userId) || { count: 0, windowStart: now };

  // Reset window if expired
  if (now - userData.windowStart > WINDOW_MS) {
    userData.count = 0;
    userData.windowStart = now;
  }

  userData.count++;
  userMessageCounts.set(userId, userData);

  if (userData.count > MAX_MESSAGES) {
    const timeLeft = Math.ceil((WINDOW_MS - (now - userData.windowStart)) / 1000);
    await ctx.reply(
      `⏸️ Demasiados mensajes.\n\n` +
      `Espera ${timeLeft} segundos antes de enviar más mensajes.`
    );
    console.log(`[RateLimit] User ${userId} blocked - exceeded ${MAX_MESSAGES} messages/min`);
    return; // Block
  }

  await next();
}

/**
 * Cleanup old entries every 5 minutes to prevent memory leak
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of userMessageCounts.entries()) {
    // Remove entries older than 2x window (2 minutes)
    if (now - data.windowStart > WINDOW_MS * 2) {
      userMessageCounts.delete(userId);
    }
  }
  console.log(`[RateLimit] Cleanup complete - ${userMessageCounts.size} users in memory`);
}, 5 * 60 * 1000);
