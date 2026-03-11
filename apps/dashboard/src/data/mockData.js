// ─── Real Data for Emiralia Workspace ────────────────────────────────────────

export const departments = [
    {
        id: 'data',
        name: 'Data',
        emoji: '📊',
        color: '#10b981',
        theme: 'theme-green',
        description: 'Extraccion, limpieza y normalizacion de datos de propiedades EAU',
        health: 'good',
    },
    {
        id: 'dev',
        name: 'Dev',
        emoji: '💻',
        color: '#06b6d4',
        theme: 'theme-cyan',
        description: 'Desarrollo de software, features y automatizacion',
        health: 'good',
    },
    {
        id: 'content',
        name: 'Content',
        emoji: '✍️',
        color: '#f59e0b',
        theme: 'theme-amber',
        description: 'Fichas de propiedades, blog y descripciones SEO',
        health: 'good',
    },
    {
        id: 'design',
        name: 'Design',
        emoji: '🎨',
        color: '#6366f1',
        theme: 'theme-indigo',
        description: 'UI/UX, identidad visual y prototipos',
        health: 'good',
    },
    {
        id: 'product',
        name: 'Product',
        emoji: '🧭',
        color: '#a855f7',
        theme: 'theme-purple',
        description: 'Gestion de producto, sprints y coordinacion de agentes',
        health: 'good',
    },
];

export const skills = [
    { id: 'activity-tracking', name: 'Activity Tracking', description: 'Registrar acciones de agentes en el Audit Log', icon: '📋' },
    { id: 'dev-server', name: 'Dev Server', description: 'Servidor de desarrollo local (dashboard, website)', icon: '🖥️' },
    { id: 'eod-report', name: 'EOD Report', description: 'Reporte de fin de dia para cada agente', icon: '📝' },
    { id: 'pm-challenge', name: 'PM Challenge', description: 'Validacion y cuestionamiento de ideas por el PM Agent', icon: '🎯' },
    { id: 'propertyfinder-scraper', name: 'PropertyFinder Scraper', description: 'Extraccion de propiedades de PropertyFinder.ae via Apify', icon: '🕷️' },
    { id: 'screenshot-loop', name: 'Screenshot Loop', description: 'Iteracion visual basada en capturas y brand guidelines', icon: '📸' },
    { id: 'skill-builder', name: 'Skill Builder', description: 'Crear o auditar skills siguiendo best practices', icon: '🔧' },
    { id: 'ui-ux-pro-max', name: 'UI/UX Pro Max', description: 'Inteligencia de diseno (67 estilos, 96 paletas, tipografia)', icon: '🎨' },
];

export const tools = [
    { id: 'apify', name: 'Apify', description: 'Scraping de PropertyFinder.ae en la nube', icon: '🤖', status: 'connected', credits: null },
    { id: 'postgresql', name: 'PostgreSQL', description: 'Base de datos de propiedades y agentes', icon: '🐘', status: 'connected', credits: null },
    { id: 'telegram', name: 'Telegram Bot', description: 'Bot para captura de ideas y notificaciones', icon: '💬', status: 'connected', credits: null },
    { id: 'anthropic', name: 'Anthropic API', description: 'Claude para agentes de IA especializados', icon: '🧠', status: 'connected', credits: null },
];

export const workflows = [
    {
        id: 'pm-review',
        name: 'PM Review',
        description: 'Validacion de ideas y desglose en proyectos, fases y tareas',
        status: 'active',
        steps: [
            { agent: 'pm-agent', action: 'Escucha y resumen de la idea' },
            { agent: 'pm-agent', action: 'Cuestionamiento estrategico (5 rondas)' },
            { agent: 'pm-agent', action: 'Propuesta de enfoque' },
            { agent: 'pm-agent', action: 'Breakdown maestro tras aprobacion' },
        ],
    },
    {
        id: 'scrape-propertyfinder',
        name: 'Scrape PropertyFinder',
        description: 'Extraccion de propiedades off-plan de PropertyFinder.ae via Apify',
        status: 'active',
        steps: [
            { agent: 'data-agent', action: 'Configurar URL y lanzar Apify actor' },
            { agent: 'data-agent', action: 'Esperar y recuperar dataset del run' },
            { agent: 'data-agent', action: 'Guardar propiedades en PostgreSQL (upsert)' },
            { agent: 'data-agent', action: 'Verificar conteo en DB' },
        ],
    },
    {
        id: 'screenshot-design-loop',
        name: 'Screenshot Design Loop',
        description: 'Iteracion de UI de alta fidelidad basada en capturas y comparacion visual',
        status: 'active',
        steps: [
            { agent: 'frontend-agent', action: 'Deploy y captura de screenshot' },
            { agent: 'frontend-agent', action: 'Comparacion visual con referencia' },
            { agent: 'frontend-agent', action: 'Analisis de discrepancias' },
            { agent: 'frontend-agent', action: 'Implementar correcciones y re-capturar' },
        ],
    },
    {
        id: 'workspace-phases',
        name: 'Workspace Phases 4-5',
        description: 'Implementacion de Dashboard UI y skills operativas del workspace',
        status: 'active',
        steps: [
            { agent: 'dev-agent', action: 'Acciones de escritura en UI (formularios/modales)' },
            { agent: 'dev-agent', action: 'Skills operativas: EOD, Weekly, Activity' },
            { agent: 'pm-agent', action: 'Coordinacion y validacion de fases' },
        ],
    },
];

export const agents = [
    {
        id: 'content-agent',
        name: 'Content Agent',
        role: 'Fichas de propiedades, blog, descripciones SEO en español',
        department: 'content',
        avatar: '✍️',
        status: 'active',
        skills: ['activity-tracking'],
        tools: ['memory'],
        workflows: [],
        lastRun: null,
        lastRunStatus: null,
        totalRuns: 0,
        successRate: 0,
    },
    {
        id: 'data-agent',
        name: 'Data Agent',
        role: 'Extrae, limpia y normaliza datos de propiedades EAU',
        department: 'data',
        avatar: '📊',
        status: 'active',
        skills: ['propertyfinder-scraper', 'activity-tracking'],
        tools: ['apify', 'postgresql', 'memory'],
        workflows: ['scrape-propertyfinder'],
        lastRun: null,
        lastRunStatus: null,
        totalRuns: 0,
        successRate: 0,
    },
    {
        id: 'dev-agent',
        name: 'Dev Agent',
        role: 'Features, bugs, PRs en el codebase',
        department: 'dev',
        avatar: '💻',
        status: 'active',
        skills: ['dev-server', 'activity-tracking'],
        tools: ['memory'],
        workflows: ['workspace-phases'],
        lastRun: null,
        lastRunStatus: null,
        totalRuns: 0,
        successRate: 0,
    },
    {
        id: 'frontend-agent',
        name: 'Design Agent',
        role: 'UI/UX, creatividades, identidad visual y prototipos',
        department: 'design',
        avatar: '🎨',
        status: 'active',
        skills: ['ui-ux-pro-max', 'screenshot-loop', 'activity-tracking'],
        tools: ['memory', 'wat-memory'],
        workflows: ['screenshot-design-loop'],
        lastRun: null,
        lastRunStatus: null,
        totalRuns: 0,
        successRate: 0,
    },
    {
        id: 'pm-agent',
        name: 'PM Agent',
        role: 'Sprints, backlog, coordinacion entre agentes',
        department: 'product',
        avatar: '🧭',
        status: 'active',
        skills: ['eod-report', 'pm-challenge', 'activity-tracking'],
        tools: ['weekly-generator', 'eod-generator', 'wat-memory', 'memory'],
        workflows: ['pm-review', 'workspace-phases'],
        lastRun: null,
        lastRunStatus: null,
        totalRuns: 0,
        successRate: 0,
    },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

export const getAgentsByDepartment = (deptId) =>
    agents.filter((a) => a.department === deptId);

export const getDepartmentById = (deptId) =>
    departments.find((d) => d.id === deptId);

export const getAgentById = (agentId) =>
    agents.find((a) => a.id === agentId);

export const getSkillById = (skillId) =>
    skills.find((s) => s.id === skillId);

export const getToolById = (toolId) =>
    tools.find((t) => t.id === toolId);

export const getWorkflowById = (workflowId) =>
    workflows.find((w) => w.id === workflowId);

export const getWorkflowsForAgent = (agentId) =>
    workflows.filter((w) => w.steps.some((s) => s.agent === agentId));

export const getDepartmentStats = (deptId) => {
    const deptAgents = getAgentsByDepartment(deptId);
    return {
        agentCount: deptAgents.length,
        activeCount: deptAgents.filter((a) => a.status === 'active').length,
        totalRuns: deptAgents.reduce((sum, a) => sum + a.totalRuns, 0),
        avgSuccessRate: deptAgents.length
            ? Math.round(deptAgents.reduce((sum, a) => sum + a.successRate, 0) / deptAgents.length)
            : 0,
        skillsCount: new Set(deptAgents.flatMap((a) => a.skills)).size,
    };
};

// ─── Weekly Brainstorm Sessions (populated from DB) ─────────────────────────

export const weeklySessions = [];

// ─── Pipeline: Projects from Weeklies (populated from DB) ───────────────────

export const weeklyProjects = [];

// ─── Weekly Helper Functions ────────────────────────────────────────────────

export const getWeekliesByDepartment = (deptId) =>
    weeklySessions.filter((w) => w.department === deptId).sort((a, b) => b.date.localeCompare(a.date));

export const getWeeklyById = (weeklyId) =>
    weeklySessions.find((w) => w.id === weeklyId);

export const getProjectsByDepartment = (deptId) =>
    weeklyProjects.filter((p) => p.department === deptId);

export const getProjectById = (projectId) =>
    weeklyProjects.find((p) => p.id === projectId);

export const getProjectsByWeekly = (weeklyId) =>
    weeklyProjects.filter((p) => p.originWeekly === weeklyId);

// ─── Agent End-of-Day Reports (populated from DB) ───────────────────────────

export const eodReports = [];

// ─── EOD Report Helper Functions ────────────────────────────────────────────

export const getEodReportsByDate = (date) =>
    eodReports.filter((r) => r.date === date);

export const getEodReportsByAgent = (agentId) =>
    eodReports.filter((r) => r.agentId === agentId).sort((a, b) => b.date.localeCompare(a.date));

export const getEodReportsByDeptAndDate = (deptId, date) => {
    const deptAgentIds = agents.filter((a) => a.department === deptId).map((a) => a.id);
    return eodReports.filter((r) => r.date === date && deptAgentIds.includes(r.agentId));
};

export const getDailyStandupData = (deptId, date) => {
    const reports = getEodReportsByDeptAndDate(deptId, date);
    return {
        done: reports.flatMap((r) => r.completed.map((c) => ({ ...c, agentId: r.agentId }))),
        inProgress: reports.flatMap((r) => r.inProgress.map((p) => ({ ...p, agentId: r.agentId }))),
        blocked: reports.flatMap((r) => r.blockers.map((b) => ({ ...b, agentId: r.agentId }))),
        insights: reports.flatMap((r) => r.insights.map((i) => ({ text: i, agentId: r.agentId }))),
        reports,
    };
};

export const moodConfig = {
    productive: { emoji: '🚀', label: 'Productivo' },
    focused: { emoji: '🎯', label: 'Enfocado' },
    creative: { emoji: '✨', label: 'Creativo' },
    energized: { emoji: '⚡', label: 'Energizado' },
    motivated: { emoji: '💪', label: 'Motivado' },
    strategic: { emoji: '🧠', label: 'Estratégico' },
    accomplished: { emoji: '🏆', label: 'Realizado' },
    starting: { emoji: '🌱', label: 'Empezando' },
    idle: { emoji: '💤', label: 'Sin actividad' },
};

// ─── Audit (populated from DB) ───────────────────────────────────────────────

export const auditLog = [];

// ─── Helpers ────────────────────────────────────────────────────────────────

export const getAuditLog = (filters = {}) => {
    let filtered = [...auditLog].sort((a, b) => b.date.localeCompare(a.date));
    if (filters.dept && filters.dept !== 'all') filtered = filtered.filter(e => e.dept === filters.dept);
    if (filters.type && filters.type !== 'all') filtered = filtered.filter(e => e.type === filters.type);
    return filtered;
};

// ─── Intelligence (populated from DB) ───────────────────────────────────────

export const intelligenceMetrics = {
    timeSeries: [],
    costBreakdown: [],
};

export const agentCosts = [];

export const systemAlerts = [];

export const forecasting = {
    nextMonthCost: 0,
    predictedGrowth: 0,
    efficiencyGain: 0,
};

// ─── Intelligence Helpers ───────────────────────────────────────────────────

export const getIntelligenceSummary = () => {
    const latest = intelligenceMetrics.timeSeries[intelligenceMetrics.timeSeries.length - 1] || { runs: 0, successRate: 0, cost: 0, errors: 0 };
    const previous = intelligenceMetrics.timeSeries[intelligenceMetrics.timeSeries.length - 2] || { runs: 0, cost: 0 };

    const runChange = previous.runs ? ((latest.runs - previous.runs) / previous.runs) * 100 : 0;
    const costChange = previous.cost ? ((latest.cost - previous.cost) / previous.cost) * 100 : 0;

    return {
        latest,
        runChange: runChange.toFixed(1),
        costChange: costChange.toFixed(1),
        totalMonthlyCost: intelligenceMetrics.timeSeries.reduce((acc, curr) => acc + curr.cost, 0).toFixed(2),
        activeAlerts: systemAlerts.filter(a => a.status === 'active').length,
    };
};

export const getAgentCost = (agentId) =>
    agentCosts.find(c => c.agentId === agentId) || { cost: 0, runs: 0, tokens: '0' };
