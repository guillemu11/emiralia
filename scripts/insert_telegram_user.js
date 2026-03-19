#!/usr/bin/env node
/**
 * Inserta un usuario de Telegram manualmente en la base de datos
 */

import pool from '../tools/db/pool.js';

const userId = parseInt(process.argv[2]);
const username = process.argv[3] || null;
const firstName = process.argv[4] || 'Usuario';
const role = process.argv[5] || 'admin';

if (!userId || isNaN(userId)) {
  console.error('❌ Error: Debes proporcionar un user_id válido');
  console.log('\nUso:');
  console.log('  node scripts/insert_telegram_user.js <user_id> [username] [first_name] [role]');
  console.log('\nEjemplo:');
  console.log('  node scripts/insert_telegram_user.js 6334755199 gmunoz02 Gabriel admin');
  process.exit(1);
}

async function insertUser() {
  try {
    console.log(`\n📝 Insertando usuario ${userId}...\n`);

    const result = await pool.query(
      `INSERT INTO telegram_users (
        user_id,
        username,
        first_name,
        language_code,
        is_authorized,
        role
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id)
      DO UPDATE SET
        is_authorized = EXCLUDED.is_authorized,
        role = EXCLUDED.role,
        last_interaction_at = NOW()
      RETURNING *`,
      [userId, username, firstName, 'es', true, role]
    );

    console.log('✅ Usuario insertado/actualizado:');
    console.log(`   - user_id: ${result.rows[0].user_id}`);
    console.log(`   - username: @${result.rows[0].username || 'sin username'}`);
    console.log(`   - nombre: ${result.rows[0].first_name}`);
    console.log(`   - autorizado: ${result.rows[0].is_authorized ? '✅ Sí' : '❌ No'}`);
    console.log(`   - rol: ${result.rows[0].role}`);
    console.log();
    console.log('El usuario ahora puede usar el bot.');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

insertUser();
