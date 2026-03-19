#!/usr/bin/env node
/**
 * Reset Telegram Bot - Elimina webhooks y cierra todas las conexiones
 */

import dotenv from 'dotenv';
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN no está configurado');
  process.exit(1);
}

async function resetBot() {
  console.log('🔄 Reseteando bot de Telegram...\n');

  try {
    // 1. Eliminar webhook (si existe)
    console.log('1️⃣ Eliminando webhook...');
    const deleteWebhookRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`
    );
    const deleteWebhookData = await deleteWebhookRes.json();
    console.log('   ✅', deleteWebhookData.description || 'Webhook eliminado');

    // 2. Cerrar conexiones de long polling
    console.log('\n2️⃣ Cerrando conexiones de long polling...');
    const closeRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/close`
    );
    const closeData = await closeRes.json();
    console.log('   ✅', closeData.description || 'Conexiones cerradas');

    // 3. Verificar estado
    console.log('\n3️⃣ Verificando estado del bot...');
    const meRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
    );
    const meData = await meRes.json();
    if (meData.ok) {
      console.log('   ✅ Bot activo:', meData.result.username);
    }

    console.log('\n✅ Reset completado. Ahora puedes reiniciar el bot.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetBot();
