#!/usr/bin/env node
/**
 * Monitorea el bot de Telegram y notifica cuando esté listo
 */

import dotenv from 'dotenv';
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHECK_INTERVAL = 30000; // 30 segundos
const MAX_ATTEMPTS = 30; // Máximo 15 minutos

let attempts = 0;

async function checkBot() {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
    );
    const data = await response.json();

    if (data.ok) {
      console.log(`\n✅ Bot está activo: @${data.result.username}`);

      // Verificar que no haya updates pendientes que causen conflicto
      const updatesRes = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=1`
      );
      const updatesData = await updatesRes.json();

      if (updatesData.ok) {
        console.log('✅ Bot puede recibir actualizaciones');
        console.log('\n🎉 El bot está listo para usar!');
        console.log('   Prueba enviando un mensaje al bot en Telegram.\n');
        return true;
      } else {
        console.log(`⏳ Bot activo pero no puede recibir updates: ${updatesData.description}`);
        return false;
      }
    } else {
      console.log(`❌ Error: ${data.description}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}`);
    return false;
  }
}

async function monitor() {
  console.log('🔍 Monitoreando bot de Telegram...\n');
  console.log(`   Verificando cada ${CHECK_INTERVAL / 1000} segundos`);
  console.log(`   Máximo ${MAX_ATTEMPTS} intentos (${(MAX_ATTEMPTS * CHECK_INTERVAL) / 60000} minutos)\n`);

  const interval = setInterval(async () => {
    attempts++;
    console.log(`[${attempts}/${MAX_ATTEMPTS}] Verificando...`);

    const isReady = await checkBot();

    if (isReady) {
      clearInterval(interval);
      process.exit(0);
    }

    if (attempts >= MAX_ATTEMPTS) {
      console.log('\n⏱️  Tiempo máximo alcanzado.');
      console.log('   El bot aún no está listo. Verifica los logs de Railway.\n');
      clearInterval(interval);
      process.exit(1);
    }
  }, CHECK_INTERVAL);

  // Primera verificación inmediata
  const isReady = await checkBot();
  if (isReady) {
    clearInterval(interval);
    process.exit(0);
  }
}

monitor();
