---
id: 43
status: Planning
created: 2026-03-23
agents:
  - social-media-agent
  - content-agent
  - marketing-agent
  - dev-agent
  - frontend-agent
---

# Creative Studio — Internal Higgsfield

## Problema

Emiralia depende de herramientas externas (Higgsfield, HeyGen) para generar fotos y videos con los avatares Fernando y Yolanda. Esto crea fricción operativa, costes adicionales y falta de control sobre el pipeline de producción de contenido.

## Solución

Construir un "Creative Studio" nativo dentro del dashboard de Emiralia que:

1. Sirva como hub de producción cross-agente para crear fotos y videos con KIE AI (ya integrado)
2. Permita a content-agent y marketing-agent generar el calendario editorial automáticamente
3. Tenga un flujo de aprobación humana (Borrador → En Revisión → Aprobado → Programado)
4. Una vez aprobado, programe la publicación para social-media-agent

## Métricas de éxito

- Eliminar dependencia de Higgsfield
- Reducir dependencia de HeyGen
- Tiempo de producción de video < 10 minutos desde guion hasta clip generado
- Calendario editorial auto-poblado por agentes semanalmente

## Fases y tareas

### Fase 1 (3-4 días): UI Shell + Calendario + DB

- Disenar e implementar la UI principal del Creative Studio en el dashboard | frontend-agent | M | High | Task
- Crear schema de DB: tablas `creative_assets`, `editorial_calendar`, `approval_workflow` | dev-agent | S | High | Task
- Implementar vista de calendario editorial con estados (Borrador, En Revision, Aprobado, Programado) | frontend-agent | M | High | Task
- Endpoint API REST para CRUD de assets creativos | dev-agent | M | Medium | Task
- Integrar el calendario con el sistema de agentes (content-agent y marketing-agent pueden escribir en el calendario) | dev-agent | L | High | Task

### Fase 2 (3-4 días): Video Generation con KIE AI

- Conectar el Creative Studio al endpoint KIE AI ya integrado para generacion de fotos con avatares | dev-agent | M | High | Task
- Implementar UI de generacion de video: selector de avatar (Fernando/Yolanda), campo de guion, parametros | frontend-agent | M | High | Task
- Pipeline de generacion de video: guion → audio → video con KIE AI | dev-agent | L | High | Task
- Tracker de estado de generacion en tiempo real (polling o websocket) | dev-agent | M | Medium | Task
- Galeria de assets generados con preview, descarga y accion "Enviar a Calendario" | frontend-agent | M | Medium | Task

### Fase 3 (4-5 días): Workflow automatizado completo

- Skill `/generar-contenido-semana` en content-agent: genera guiones para 5-7 posts semanales | content-agent | M | High | Task
- Skill `/planificar-semana-editorial` en marketing-agent: distribuye contenido en el calendario semanalmente | marketing-agent | M | High | Task
- Flujo de aprobacion: notificacion al usuario cuando hay borradores pendientes de revision | dev-agent | M | Medium | Task
- Integracion social-media-agent: al aprobar un asset, se encola automaticamente para publicacion | social-media-agent | L | High | Task
- Tests end-to-end del pipeline completo: guion → video generado → aprobado → publicado | dev-agent | M | High | Task

## Post-MVP / Hoja de Ruta

- **Fase Futura 1 — Multi-avatar y estilos visuales:** Soporte para mas avatares y estilos de video (testimonial, explainer, reel). Templates pre-diseniados por tipo de propiedad.
- **Fase Futura 2 — IA editorial avanzada:** content-agent sugiere temas basandose en tendencias del mercado inmobiliario EAU y performance de posts anteriores. A/B testing automatico de guiones.
- **Fase Futura 3 — White-label para developers:** Developers partners pueden usar el Creative Studio para generar su propio contenido de marketing sobre sus propiedades, como servicio premium B2B.
