#!/usr/bin/env node
/**
 * Script para listar todos los usuarios de Telegram
 *
 * Uso:
 *   node scripts/list_telegram_users.js [--all|--authorized|--unauthorized]
 */

import pool from '../tools/db/pool.js';

const flag = process.argv[2] || '--all';

async function listUsers() {
  let query;
  let title;

  switch (flag) {
    case '--authorized':
      query = 'SELECT * FROM telegram_users WHERE is_authorized = TRUE ORDER BY last_interaction_at DESC';
      title = '✅ Usuarios Autorizados';
      break;
    case '--unauthorized':
      query = 'SELECT * FROM telegram_users WHERE is_authorized = FALSE ORDER BY last_interaction_at DESC';
      title = '❌ Usuarios No Autorizados';
      break;
    case '--all':
    default:
      query = 'SELECT * FROM telegram_users ORDER BY last_interaction_at DESC';
      title = '👥 Todos los Usuarios';
      break;
  }

  try {
    const result = await pool.query(query);

    console.log(`\n${title}\n`);

    if (result.rows.length === 0) {
      console.log('   (vacío)');
    } else {
      console.table(result.rows.map(u => ({
        user_id: u.user_id,
        username: u.username || '(sin username)',
        nombre: `${u.first_name} ${u.last_name || ''}`.trim(),
        autorizado: u.is_authorized ? '✅' : '❌',
        rol: u.role,
        agente_activo: u.active_agent_id || '(ninguno)',
        última_interacción: u.last_interaction_at
      })));
    }

    console.log(`\nTotal: ${result.rows.length} usuarios\n`);

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

listUsers();
