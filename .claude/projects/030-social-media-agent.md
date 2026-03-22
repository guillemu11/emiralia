---
id: "030"
status: In Progress
created: 2026-03-22
agents: [social-media-agent, content-agent, data-agent, marketing-agent]
supabase_id: 35
---

# Social Media Agent — Contenido IG & TikTok con Fernando & Yolanda

## Problema

Emiralia carece de presencia orgánica consistente en redes sociales hispanohablantes. La producción de contenido para IG y TikTok es lenta, inconsistente y no escala. Sin un flujo estructurado, se pierden oportunidades de captación orgánica en el nicho hispano interesado en real estate de EAU.

## Solución

Agente WAT (`social-media-agent`) que guioniza contenido adaptado a la personalidad de los avatares IA Fernando & Yolanda, genera calendarios editoriales semanales y produce briefs de producción completos (HeyGen + KIE AI) listos para ejecutar.

**Decisión de arquitectura:** Fernando & Yolanda son avatares de IA (cambio respecto al diseño original del 2026-03-08 que los definía como presentadores humanos). La IA actúa como cerebro creativo y organizador; HeyGen ejecuta la producción de vídeo.

**Stack técnico:**
- Guionización: `social-media-agent` (este agente)
- Imágenes/thumbnails: KIE AI via `tools/images/generate-image.js`
- Vídeo/avatar: HeyGen (externo, sin integración API en MVP)
- Distribución al equipo: Telegram bot

## Métricas de éxito

- Cadencia de publicación: mínimo 3 piezas/semana durante el primer mes
- Tiempo de guionización: de idea a brief completo en < 30 minutos por pieza
- Buffer editorial: calendario con mínimo 2 semanas de contenido guionizado en todo momento
- Engagement rate IG/TikTok: +15% en las primeras 8 semanas vs baseline actual

## Fases y tareas

### Fase 1 — Agente base (✅ completada)
- [x] Definición del agente: `.claude/agents/marketing/social-media-agent.md`
- [x] Registro en DB tabla `agents`
- [x] Inventario actualizado en `AGENTS.md` y `SKILLS.md`

### Fase 2 — Skills core (En progreso)
- [ ] Skill `/guionizar` — guion para avatar + pilar + duración
- [ ] Skill `/brief-avatar` — paquete completo (guion + prompt KIE AI + caption + config HeyGen)
- [ ] Skill `/calendar-social` — calendario editorial semanal

### Fase 3 — Integración de datos
- [ ] Skill `/property-content` — pieza de contenido desde `property_id`
- [ ] Skill `/actualizar-persona` — refinamiento de personas en memoria

### Fase 4 — Mejoras futuras (Post-MVP)
- [ ] Análisis de rendimiento: integrar métricas reales de IG/TikTok
- [ ] Banco de hooks: librería de aperturas de alta conversión
- [ ] Automatización de publicación via API IG/TikTok
- [ ] Integración API HeyGen para generación de vídeo directa

## Post-MVP / Hoja de Ruta

Ver campo `future_improvements` en el proyecto Supabase ID 35:
- Análisis de rendimiento automático
- Banco de hooks y hooks testeados
- Scheduling automático via APIs IG/TikTok
- Subtitulado multiidioma (inglés/árabe) para ampliar alcance en EAU
- Integración HeyGen API para producción de vídeo desde el agente