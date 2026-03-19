/**
 * Authorization Middleware for Telegram Bot
 *
 * Blocks all commands from unauthorized users (is_authorized=false)
 * Exempts /start and /help commands to allow initial interaction
 *
 * Part of Feature 11: Security & Auth (Agent Command Center)
 */

import { getUser } from '../db/telegram_user_queries.js';

/**
 * Middleware to require authorization before processing commands
 *
 * @param {Object} ctx - Telegraf context
 * @param {Function} next - Next middleware function
 */
export async function requireAuthorization(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply('❌ Error: No se pudo identificar al usuario');
    return;
  }

  try {
    const user = await getUser(userId);

    if (!user) {
      // User not registered yet (auto-register middleware should have run)
      await ctx.reply(
        '⚠️ Tu cuenta no está registrada.\n\n' +
        'El administrador ha sido notificado. Espera autorización.'
      );
      console.log(`[Auth] User ${userId} not found in database`);
      return;
    }

    if (!user.is_authorized) {
      // User is registered but not authorized
      await ctx.reply(
        '🔒 Acceso no autorizado.\n\n' +
        'Tu cuenta está registrada pero no tiene permisos de acceso.\n' +
        'Solicita autorización al administrador del bot.'
      );
      console.log(`[Auth] User ${userId} (@${user.username || 'no-username'}) blocked - not authorized`);
      return;
    }

    // User is authorized, continue to next middleware
    console.log(`[Auth] User ${userId} (@${user.username || 'no-username'}) authorized as ${user.role}`);
    await next();

  } catch (err) {
    console.error('[Auth] Error checking authorization:', err);
    await ctx.reply(
      '❌ Error de autorización.\n\n' +
      'Por favor intenta de nuevo más tarde.'
    );
  }
}

/**
 * Check if user is admin
 *
 * @param {number} userId - Telegram user ID
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin(userId) {
  try {
    const user = await getUser(userId);
    return user && user.is_authorized && user.role === 'admin';
  } catch (err) {
    console.error('[Auth] Error checking admin status:', err);
    return false;
  }
}

/**
 * Middleware to require admin role
 *
 * @param {Object} ctx - Telegraf context
 * @param {Function} next - Next middleware function
 */
export async function requireAdmin(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply('❌ Error: No se pudo identificar al usuario');
    return;
  }

  const userIsAdmin = await isAdmin(userId);

  if (!userIsAdmin) {
    await ctx.reply('❌ Solo administradores pueden ejecutar este comando.');
    console.log(`[Auth] User ${userId} blocked - not admin`);
    return;
  }

  await next();
}
