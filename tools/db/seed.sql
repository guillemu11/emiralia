-- Seed Real Emiralia Agents
INSERT INTO agents (id, name, role, department, status, avatar, skills, tools) VALUES
('content-agent', 'Content Agent', 'Fichas de propiedades, blog, descripciones SEO en español', 'content', 'active', '✍️', '["activity-tracking"]', '["memory"]'),
('data-agent', 'Data Agent', 'Extrae, limpia y normaliza datos de propiedades EAU', 'data', 'active', '📊', '["propertyfinder-scraper", "activity-tracking"]', '["apify-propertyfinder", "fetch-dataset", "memory"]'),
('dev-agent', 'Dev Agent', 'Features, bugs, PRs en el codebase', 'dev', 'active', '💻', '["dev-server", "activity-tracking"]', '["memory"]'),
('frontend-agent', 'Design Agent', 'UI/UX, creatividades, identidad visual y prototipos', 'design', 'active', '🎨', '["ui-ux-pro-max", "screenshot-loop", "activity-tracking"]', '["memory", "wat-memory"]'),
('pm-agent', 'PM Agent', 'Sprints, backlog, coordinacion entre agentes', 'product', 'active', '🧭', '["eod-report", "pm-challenge", "activity-tracking"]', '["weekly-generator", "eod-generator", "wat-memory", "memory"]')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department,
    avatar = EXCLUDED.avatar, status = EXCLUDED.status,
    skills = EXCLUDED.skills, tools = EXCLUDED.tools;
