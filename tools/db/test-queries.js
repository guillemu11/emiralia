/**
 * Test script para DB queries
 */

import { getConversationStats, listConversations } from './conversation_queries.js';
import { getUserStats, listAuthorizedUsers } from './telegram_user_queries.js';

async function testConversationQueries() {
  console.log('\n📊 CONVERSATION STATISTICS\n');
  console.log('─'.repeat(80));

  const stats = await getConversationStats();

  console.log('\nOverall Stats:');
  console.log(`  Total conversations: ${stats.overall.total_conversations}`);
  console.log(`  Unique users: ${stats.overall.unique_users}`);
  console.log(`  Unique agents: ${stats.overall.unique_agents}`);
  console.log(`  Total messages: ${stats.overall.total_messages || 0}`);
  console.log(`  Avg messages/conversation: ${stats.overall.avg_messages_per_conversation || 0}`);

  console.log('\nBy Channel:');
  for (const channelStat of stats.by_channel) {
    console.log(`  ${channelStat.channel}: ${channelStat.conversations_per_channel} conversations`);
  }
}

async function testTelegramUserQueries() {
  console.log('\n\n👥 TELEGRAM USER STATISTICS\n');
  console.log('─'.repeat(80));

  const stats = await getUserStats();

  console.log('\nOverall Stats:');
  console.log(`  Total users: ${stats.overall.total_users}`);
  console.log(`  Authorized: ${stats.overall.authorized_users}`);
  console.log(`  Unauthorized: ${stats.overall.unauthorized_users}`);
  console.log(`  Admins: ${stats.overall.admins}`);
  console.log(`  Operators: ${stats.overall.operators}`);
  console.log(`  Viewers: ${stats.overall.viewers}`);
  console.log(`  Active (7 days): ${stats.overall.active_last_7_days}`);
  console.log(`  Active (30 days): ${stats.overall.active_last_30_days}`);

  console.log('\nAgent Usage:');
  if (stats.agent_usage.length > 0) {
    for (const usage of stats.agent_usage) {
      console.log(`  ${usage.active_agent_id}: ${usage.user_count} users`);
    }
  } else {
    console.log('  No active agents');
  }

  console.log('\n\nAuthorized Users:');
  const users = await listAuthorizedUsers();
  if (users.length > 0) {
    console.table(users.map(u => ({
      user_id: u.user_id,
      username: u.username,
      first_name: u.first_name,
      role: u.role,
      active_agent: u.active_agent_id,
      last_interaction: new Date(u.last_interaction_at).toLocaleString()
    })));
  } else {
    console.log('  No authorized users');
  }
}

async function main() {
  console.log('\n🧪 TESTING DATABASE QUERIES\n');

  try {
    await testConversationQueries();
    await testTelegramUserQueries();

    console.log('\n✅ All tests completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
