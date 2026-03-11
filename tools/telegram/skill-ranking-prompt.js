/**
 * Emiralia — Skill Ranking Telegram Formatter
 *
 * Formats skill usage ranking data for Telegram messages
 * with emoji status indicators.
 */

/**
 * Format ranking data for Telegram display.
 * @param {Array} rankings - Output from getSkillRanking()
 * @returns {string} Markdown-formatted message for Telegram
 */
export function formatSkillRanking(rankings) {
    if (!rankings || rankings.length === 0) {
        return 'No hay datos de uso de skills en el periodo seleccionado.';
    }

    const lines = ['*Skill Ranking (30d)*\n'];

    for (let i = 0; i < rankings.length; i++) {
        const r = rankings[i];
        const emoji = getStatusEmoji(i, r.days_inactive);
        const lastStr = formatLastUsed(r.days_inactive);
        const failStr = r.fail > 0 ? ` | ${r.fail} err` : '';
        lines.push(`${emoji} \`${r.skill_name}\` — ${r.total}x (${lastStr})${failStr}`);
    }

    // Summary stats
    const totalInvocations = rankings.reduce((sum, r) => sum + r.total, 0);
    const activeCount = rankings.filter(r => r.days_inactive <= 7).length;
    const zombieCount = rankings.filter(r => r.days_inactive > 30).length;

    lines.push('');
    lines.push(`📊 *Total:* ${totalInvocations} invocaciones | ${activeCount} activas | ${zombieCount} zombies`);

    return lines.join('\n');
}

/**
 * Get emoji based on rank position and activity.
 */
function getStatusEmoji(index, daysInactive) {
    if (index < 3) return '🔥'; // Top 3
    if (daysInactive <= 7) return '✅';  // Active
    if (daysInactive <= 30) return '⚠️'; // Cooling off
    return '💀'; // Zombie
}

/**
 * Format days since last use as human-readable string.
 */
function formatLastUsed(days) {
    if (days === null || days === undefined) return 'nunca';
    if (days === 0) return 'hoy';
    if (days === 1) return 'ayer';
    return `hace ${days}d`;
}
