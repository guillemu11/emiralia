#!/usr/bin/env node
/**
 * Script para autorizar usuarios de Telegram
 *
 * Uso:
 *   node scripts/authorize_telegram_user.js <user_id> [role]
 *
 * Ejemplo:
 *   node scripts/authorize_telegram_user.js 123456789 admin
 */

import { setAuthorization, getUser } from '../tools/db/telegram_user_queries.js';

const userId = parseInt(process.argv[2]);
const role = process.argv[3] || 'admin';

if (!userId || isNaN(userId)) {
  console.error('❌ Error: Debes proporcionar un user_id válido');
  console.log('\nUso:');
  console.log('  node scripts/authorize_telegram_user.js <user_id> [role]');
  console.log('\nEjemplo:');
  console.log('  node scripts/authorize_telegram_user.js 123456789 admin');
  console.log('\nRoles disponibles: viewer, operator, admin');
  process.exit(1);
}

if (!['viewer', 'operator', 'admin'].includes(role)) {
  console.error('❌ Error: Rol inválido. Debe ser: viewer, operator, admin');
  process.exit(1);
}

console.log(`\n🔑 Autorizando usuario ${userId} con rol "${role}"...\n`);

try {
  // Verificar que el usuario existe
  const user = await getUser(userId);

  if (!user) {
    console.error('❌ Error: Usuario no encontrado en la base de datos');
    console.log('   El usuario debe interactuar con el bot primero (comando /start)');
    process.exit(1);
  }

  console.log('📋 Usuario encontrado:');
  console.log(`   - user_id: ${user.user_id}`);
  console.log(`   - username: @${user.username || 'sin username'}`);
  console.log(`   - nombre: ${user.first_name} ${user.last_name || ''}`);
  console.log(`   - autorizado: ${user.is_authorized ? '✅ Sí' : '❌ No'}`);
  console.log(`   - rol actual: ${user.role}`);
  console.log();

  // Autorizar usuario
  const updatedUser = await setAuthorization(userId, true, role);

  console.log('✅ Usuario autorizado exitosamente');
  console.log(`   - is_authorized: ${updatedUser.is_authorized}`);
  console.log(`   - role: ${updatedUser.role}`);
  console.log();
  console.log('El usuario ahora puede usar todos los comandos del bot.');

  process.exit(0);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
