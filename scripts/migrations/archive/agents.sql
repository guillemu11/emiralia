--
-- PostgreSQL database dump
--

\restrict 3PRO1JcxMtMvf9zzrExyzEN2MhWrx9G0y4j1gsDsCNjLtZ61nxMzpIdJOzWKzi9

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: emiralia
--

INSERT INTO public.agents VALUES ('data-agent', 'Data Agent', 'Extrae, limpia y normaliza datos de propiedades EAU', 'data', 'active', '📊', '["propertyfinder-scraper", "activity-tracking"]', '["apify-propertyfinder", "fetch-dataset", "memory"]', '2026-03-05 10:43:33.900569+00', '2026-03-09 07:47:50.570481+00');
INSERT INTO public.agents VALUES ('dev-agent', 'Dev Agent', 'Features, bugs, PRs en el codebase', 'dev', 'active', '💻', '["dev-server", "activity-tracking"]', '["memory"]', '2026-03-05 10:43:33.910606+00', '2026-03-09 07:47:50.57355+00');
INSERT INTO public.agents VALUES ('frontend-agent', 'Design Agent', 'UI/UX, creatividades, identidad visual y prototipos', 'design', 'active', '🎨', '["ui-ux-pro-max", "screenshot-loop", "activity-tracking"]', '["memory", "wat-memory"]', '2026-03-05 10:43:33.912917+00', '2026-03-09 07:47:50.576744+00');
INSERT INTO public.agents VALUES ('pm-agent', 'PM Agent', 'Sprints, backlog, coordinación entre agentes', 'product', 'active', '🧭', '["eod-report", "pm-challenge", "pm-context-audit", "activity-tracking"]', '["weekly-generator", "eod-generator", "wat-memory", "memory"]', '2026-03-05 10:43:33.914968+00', '2026-03-09 07:47:50.580033+00');
INSERT INTO public.agents VALUES ('translation-agent', 'Translation Agent', 'Traduccion ingles/arabe → espanol con precision inmobiliaria', 'content', 'active', '🌐', '["traducir", "activity-tracking"]', '["translate", "memory", "wat-memory"]', '2026-03-07 15:27:43.10197+00', '2026-03-09 07:47:50.584809+00');
INSERT INTO public.agents VALUES ('research-agent', 'Research Agent', 'Monitorea fuentes externas (Anthropic, GitHub, comunidad) y genera intelligence reports para el WAT Auditor', 'ops', 'active', '🔬', '["research-monitor"]', '["memory", "wat-memory"]', '2026-03-09 07:05:11.599516+00', '2026-03-09 07:47:50.587729+00');
INSERT INTO public.agents VALUES ('content-agent', 'Content Agent', 'Fichas de propiedades, blog, descripciones SEO en español', 'content', 'active', '✍️', '["activity-tracking"]', '["memory"]', '2026-03-05 10:43:33.907808+00', '2026-03-09 07:47:50.562688+00');


--
-- Data for Name: agent_memory; Type: TABLE DATA; Schema: public; Owner: emiralia
--

INSERT INTO public.agent_memory VALUES (2, 'data-agent', 'last_scrape_url', '"https://www.propertyfinder.ae/en/search?c=1&t=2&l=2-Dubai"', 'shared', '2026-03-05 10:43:42.443976+00');
INSERT INTO public.agent_memory VALUES (3, 'data-agent', 'last_scrape_at', '"2026-03-05T10:00:00Z"', 'shared', '2026-03-05 10:43:42.891001+00');
INSERT INTO public.agent_memory VALUES (5, 'data-agent', 'last_run_status', '"success"', 'shared', '2026-03-05 10:43:43.692324+00');
INSERT INTO public.agent_memory VALUES (4, 'data-agent', 'total_properties', '300', 'shared', '2026-03-05 10:43:55.284314+00');
INSERT INTO public.agent_memory VALUES (7, 'data-agent', 'last_dedup_at', '"2026-03-06T15:42:47.161Z"', 'shared', '2026-03-06 15:42:47.167379+00');
INSERT INTO public.agent_memory VALUES (8, 'data-agent', 'last_dedup_mode', '"mark"', 'shared', '2026-03-06 15:42:47.174655+00');
INSERT INTO public.agent_memory VALUES (9, 'data-agent', 'last_dedup_groups_found', '1972', 'shared', '2026-03-06 15:42:47.17837+00');
INSERT INTO public.agent_memory VALUES (10, 'data-agent', 'last_dedup_duplicates_found', '6679', 'shared', '2026-03-06 15:42:47.1819+00');
INSERT INTO public.agent_memory VALUES (11, 'data-agent', 'last_dedup_by_tier', '{"tier1": 671, "tier2": 618, "tier3": 683}', 'shared', '2026-03-06 15:42:47.18614+00');
INSERT INTO public.agent_memory VALUES (28, 'research-agent', 'last_processed_tag_github', '"v2.1.71"', 'private', '2026-03-09 07:26:44.555905+00');
INSERT INTO public.agent_memory VALUES (27, 'research-agent', 'last_processed_date_anthropic', '"2026-03-09"', 'private', '2026-03-09 07:26:46.735506+00');
INSERT INTO public.agent_memory VALUES (35, 'research-agent', 'total_runs', '2', 'private', '2026-03-09 07:26:48.763781+00');
INSERT INTO public.agent_memory VALUES (29, 'research-agent', 'last_processed_post_reddit', '"1rogixd"', 'private', '2026-03-09 07:05:19.762189+00');
INSERT INTO public.agent_memory VALUES (34, 'research-agent', 'latest_research_report', '{"summary": {"low": 0, "high": 8, "total": 14, "medium": 6, "critical_actions": ["Migrate from Haiku 3 before April 19 2026 deadline", "Review output_format to output_config.format migration", "Evaluate Opus 4.6 medium effort default impact on strategic skills", "Consider auto-memory integration with WAT Memory system"]}, "findings": [{"id": 1, "score": 45, "title": "Claude Opus 4.6 upgraded coding skills", "action": "Verify Emiralia agents using Opus get improved performance automatically. Update skill model assignments if needed.", "detail": "Opus 4.6 is now default with improved coding. Opus 4/4.1 removed from model selector.", "impact": "high", "source": "anthropic-docs"}, {"id": 2, "score": 42, "title": "Claude Haiku 3 deprecation - April 19 2026", "action": "URGENT: Audit all Emiralia skills/tools using haiku model references. Ensure none reference claude-3-haiku. Update to haiku-4.5.", "detail": "claude-3-haiku-20240307 deprecated, retire April 19. Migrate to Haiku 4.5.", "impact": "high", "source": "anthropic-docs"}, {"id": 3, "score": 40, "title": "Structured outputs GA - output_config.format", "action": "Review any API calls using output_format parameter and migrate to output_config.format.", "detail": "output_format moved to output_config.format. Structured outputs GA on Sonnet 4.5, Opus 4.5, Haiku 4.5. No beta header needed.", "impact": "high", "source": "anthropic-docs"}, {"id": 4, "score": 25, "title": "Data residency controls - inference_geo parameter", "action": "Monitor for EU residency option. Relevant for GDPR-conscious Spanish/EU users.", "detail": "New inference_geo param for US-only inference at 1.1x pricing.", "impact": "medium", "source": "anthropic-docs"}, {"id": 5, "score": 30, "title": "Web fetch tool in beta", "action": "Could replace some custom scraping tools. Evaluate for Data Agent workflows.", "detail": "Claude can now fetch full web page content and PDFs natively.", "impact": "medium", "source": "anthropic-docs"}, {"id": 6, "score": 28, "title": "v2.1.71 - /loop command for recurring prompts", "action": "Evaluate /loop for recurring Emiralia tasks like property data refresh.", "detail": "New /loop command with cron scheduling. Also fixes startup freezes and plugin issues.", "impact": "medium", "source": "github-releases"}, {"id": 7, "score": 27, "title": "v2.1.69 - /claude-api skill, 10 new voice languages", "action": "Voice STT in Spanish could enable voice-driven property search for Emiralia users.", "detail": "Built-in skill for Claude API. Voice STT now supports 20 languages including Spanish.", "impact": "medium", "source": "github-releases"}, {"id": 8, "score": 38, "title": "v2.1.68 - Opus 4.6 defaults to medium effort", "action": "Ensure strategic skills (PRD, GTM) use ultrathink or explicit high effort when needed.", "detail": "Opus 4.6 now defaults to medium effort for Max/Team. Ultrathink keyword re-introduced for high effort.", "impact": "high", "source": "github-releases"}, {"id": 9, "score": 35, "title": "v2.1.63 - Auto-memory shared across worktrees, HTTP hooks", "action": "HTTP hooks could integrate with Emiralia webhook-based monitoring. Worktree sharing improves multi-branch dev.", "detail": "Project configs and auto-memory shared across git worktrees. HTTP hooks support POST+JSON.", "impact": "high", "source": "github-releases"}, {"id": 10, "score": 36, "title": "v2.1.59 - Auto-memory feature launched", "action": "Complement WAT Memory system. Evaluate if auto-memory can reduce manual memory.js calls.", "detail": "Claude automatically saves useful context to auto-memory. Manage with /memory command.", "impact": "high", "source": "github-releases"}, {"id": 11, "score": 22, "title": "March 2 global outage - 10 hours", "action": "Implement failover strategy for Emiralia agents. Consider local caching for critical data.", "detail": "Major Claude outage March 2. API remained functional but web/claude.ai down. Related to surge past ChatGPT in rankings.", "impact": "medium", "source": "community"}, {"id": 12, "score": 35, "title": "MCP lazy loading reduces context by 95%", "action": "Already using ToolSearch. Verify all MCP servers use lazy loading pattern.", "detail": "ToolSearch enables lazy loading for MCP servers. 5-server setup with 58 tools drops from 55k tokens to minimal.", "impact": "high", "source": "community"}, {"id": 13, "score": 25, "title": "Skills best practice - progressive disclosure", "action": "Emiralia CLAUDE.md is well-structured. Continue current skills architecture.", "detail": "Skills use ~100 tokens scanning, <5k when activated. Community consensus: CLAUDE.md is as important as .gitignore.", "impact": "medium", "source": "community"}, {"id": 14, "score": 33, "title": "Agent teams with parallel coordination", "action": "Aligns with WAT multi-agent architecture. Evaluate for sprint execution with PM Agent as lead.", "detail": "Community pattern: spin up parallel agents coordinating through shared task list. One session as team lead.", "impact": "high", "source": "community"}], "report_id": 7, "generated_at": "2026-03-09T12:00:00Z", "sources_status": {"community": "ok", "anthropic-docs": "ok", "github-releases": "ok"}}', 'shared', '2026-03-09 07:26:24.030188+00');
INSERT INTO public.agent_memory VALUES (32, 'research-agent', 'last_monitor_at', '"2026-03-09T12:00:00Z"', 'shared', '2026-03-09 07:26:32.93463+00');
INSERT INTO public.agent_memory VALUES (30, 'research-agent', 'last_task_completed', '"research-cycle-manual"', 'shared', '2026-03-09 07:26:35.860805+00');
INSERT INTO public.agent_memory VALUES (31, 'research-agent', 'last_task_at', '"2026-03-09T12:00:00Z"', 'shared', '2026-03-09 07:26:38.574271+00');
INSERT INTO public.agent_memory VALUES (33, 'research-agent', 'sources_health', '{"community": "ok", "anthropic-docs": "ok", "github-releases": "ok"}', 'shared', '2026-03-09 07:26:41.061212+00');
INSERT INTO public.agent_memory VALUES (36, 'pm-agent', 'last_project_closed', '{"projectId": 29, "department": "ops", "totalTasks": 13, "completedAt": "2026-03-09T07:50:51.590Z", "projectName": "🔍 PM Agent Context Auditor — Visibilidad del Flujo Real de Contexto"}', 'shared', '2026-03-09 07:50:51.657605+00');
INSERT INTO public.agent_memory VALUES (51, 'pm-agent', 'last_skill_used', '{"at": "2026-03-09T07:50:51.695Z", "status": "completed", "skill_name": "cerrar-proyecto", "skill_domain": "ejecucion"}', 'shared', '2026-03-09 07:50:51.698706+00');
INSERT INTO public.agent_memory VALUES (52, 'pm-agent', 'skill_invocation_count', '4', 'shared', '2026-03-09 07:50:51.711894+00');
INSERT INTO public.agent_memory VALUES (19, 'dev-agent', 'last_skill_used', '{"at": "2026-03-10T19:09:01.428Z", "status": "completed", "skill_name": "generate-architecture-pdf", "skill_domain": "ops"}', 'shared', '2026-03-10 19:09:01.434658+00');
INSERT INTO public.agent_memory VALUES (21, 'dev-agent', 'skill_invocation_count', '4', 'shared', '2026-03-10 19:09:01.582711+00');


--
-- Name: agent_memory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: emiralia
--

SELECT pg_catalog.setval('public.agent_memory_id_seq', 61, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 3PRO1JcxMtMvf9zzrExyzEN2MhWrx9G0y4j1gsDsCNjLtZ61nxMzpIdJOzWKzi9

