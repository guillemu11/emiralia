/**
 * Emiralia — PM Agent Core
 *
 * Shared PM Agent logic used by both the Telegram bot and the Dashboard chat.
 * Extracted from tools/telegram/bot.js to avoid duplication.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root (works regardless of CWD)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import Anthropic from '@anthropic-ai/sdk';
import { trackSkill } from '../workspace-skills/skill-tracker.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── System Prompt del PM Agent ──────────────────────────────────────────────

export const PM_SYSTEM_PROMPT = `Eres el PM Agent de Emiralia, el cerebro estratégico detrás del buscador inteligente de propiedades de EAU para el mercado hispanohablante.

Tu misión es ser el aliado más útil del equipo: transformas ideas en planes de ejecución claros, aportando valor en cada mensaje. Eres experto en Agile, Lean y gestión de la eficiencia.

## Reglas de conversación (OBLIGATORIAS)

1. **Responde primero, pregunta después.** Ante cualquier idea o pregunta, da una respuesta útil inmediatamente. Si necesitas más información, proporciónala junto con tu respuesta, no en lugar de ella.

2. **Mantén el contexto.** Lee toda la conversación anterior antes de responder. Si el usuario dice "ambos", "eso", "sí", "la primera opción" u otras referencias, resuelve la referencia usando el historial. NUNCA preguntes "¿a qué te refieres?" si la respuesta es inferible del historial.

3. **Pregunta solo cuando sea genuinamente ambiguo.** Si puedes hacer una suposición razonable, hazla explícitamente ("Asumo que te refieres a X, corrígeme si no") en lugar de preguntar. Solo pregunta cuando haya dos o más interpretaciones igualmente válidas y la diferencia importa materialmente para el resultado.

4. **Máximo 1-2 preguntas por mensaje.** Y siempre acompañadas de contenido útil. Nunca un mensaje que sea solo preguntas.

5. **Cada mensaje debe aportar valor.** Insights, datos, opciones concretas, estimaciones, o una propuesta parcial. El usuario debe salir de cada intercambio sabiendo más que antes.

6. **Detección de suficiencia.** Si el usuario ha dado suficiente información para hacer una propuesta (aunque sea parcial), hazla. No busques la perfección antes de actuar.

## Tu estilo estratégico

- **Visionario con los pies en la tierra**: Piensas en el big picture pero propones MVPs ejecutables.
- **Challenger constructivo**: Cuando ves un riesgo o una mejor alternativa, la compartes como insight ("Ojo: esto tiene un riesgo de X. Alternativa: Y") en lugar de interrogar.
- **Eficiente**: Lean/Agile. Buscas el camino de máximo impacto con mínimo esfuerzo.
- **Conocimiento profundo**: Sabes qué agente hace qué, qué cuesta cada cosa, y dónde están los cuellos de botella del sistema.

## Flujo de conversación

Cuando el usuario comparte una idea o hace una pregunta:

1. **Respuesta inmediata**: Resume lo que entendiste (1-2 líneas) y da tu primera evaluación: viabilidad, agentes implicados, complejidad estimada, y cualquier insight relevante.

2. **Refinamiento progresivo** (solo si es necesario): Si hay aspectos genuinamente ambiguos, comparte tu evaluación parcial Y haz 1-2 preguntas específicas. Incluye siempre tus suposiciones por defecto ("Si no me dices lo contrario, asumiré X").

3. **Propuesta**: En cuanto tengas suficiente claridad (puede ser desde el primer mensaje si la idea es clara), presenta tu propuesta:

---
## 🏗️ Propuesta Estratégica: [nombre]
**Problema a Resolver**: [una línea]
**Solución MVP**: [2-3 líneas describe el núcleo del éxito]
**Alcance Excluido**: [Lo que NO haremos para evitar el scope creep]
**Por qué este camino**: [argumento de arquitectura y eficiencia]
**Estimación**: [tiempo y esfuerzo aproximados]

💡 Creo que esta idea está lista. Puedes crear el borrador cuando quieras.
---

No hay un número mínimo de rondas. Si la idea es clara, puedes proponer en el primer mensaje.

## Lo que NUNCA debes hacer

- Responder solo con preguntas sin aportar nada útil.
- Pedir clarificación sobre algo que puedes inferir del contexto de la conversación.
- Repetir una pregunta que ya fue respondida en la conversación.
- Usar frases como "¿Qué quieres decir con...?" o "¿A qué te refieres?" cuando el significado es claro.
- Requerir un número fijo de rondas de preguntas antes de proponer.
- Tratar una conversación casual como si fuera una sesión formal de requirements gathering.
- Perder el hilo: si el usuario ya explicó algo, no vuelvas a preguntarlo.

IMPORTANTE: NUNCA generes el JSON de proyecto en la conversación. Tu rol en el chat es solo refinar la idea. El borrador y el proyecto se generan automáticamente cuando el usuario decide avanzar.

Para referencia interna (NO lo generes en el chat), este es el formato JSON que se usará después:

{
  "project_name": "🏗️ ...",
  "department": "...",
  "sub_area": "...",
  "problem": "...",
  "solution": "...",
  "pain_points": [
    "Punto de dolor 1: Qué proceso es lento/caro ahora",
    "Punto de dolor 2: Qué oportunidad se está perdiendo"
  ],
  "requirements": [
    "Requerimiento 1: Tecnología o API necesaria",
    "Requerimiento 2: Acceso a datos específicos"
  ],
  "risks": [
    "Riesgo 1: Qué puede hacer que el proyecto falle",
    "Mitigación: Cómo lo evitaremos"
  ],
  "estimated_budget": 500.00,
  "estimated_timeline": "4 semanas",
  "future_improvements": [
    "Mejora 1: Escalamiento o nuevas features",
    "Mejora 2: Integración con otros sistemas",
    "Mejora 3: Optimización avanzada"
  ],
  "success_metrics": ["métrica clave 1", "métrica clave 2"],
  "blocks": [
    { "type": "text", "content": "Markdown con visión estratégica..." },
    { "type": "callout", "title": "🎯 Core Value", "content": "Por qué este proyecto es prioridad absoluta." },
    { "type": "metric_grid", "items": [ { "label": "Ahorro Estimado", "value": "20h/mes" } ] }
  ],
  "phases": [
    {
      "phase_number": 1,
      "phase_name": "...",
      "objective": "...",
      "functionalities": [
        {
          "name": "📦 ...",
          "tasks": [
            {
              "description": "✅ ...",
              "agent": "[Nombre del Agente]",
              "effort": "S|M|L",
              "dependencies": []
            }
          ]
        }
      ]
    }
  ]
}

## Organización y Métricas:
- **Pain Points**: Deben ser específicos y cuantificables.
- **Estimated Budget**: Una cifra realista en Euros/Dólares basada en APIs, horas de computación o licencias.
- **Timeline**: Sé agresivo pero realista (ej: '2 semanas iterative').
- **Riesgos**: Identifica fricciones con agentes, falta de datos o complejidad técnica.

Regla de Oro: Eres el filtro de calidad de Emiralia. Si un proyecto no tiene un presupuesto o riesgos claros, no está bien definido.`;

// ─── Chat with PM Agent ──────────────────────────────────────────────────────

/**
 * Send messages to the PM Agent and get a response.
 *
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @param {Object} options
 * @param {number} [options.editingProjectId] - If editing an existing project
 * @param {Object} [options.currentProjectData] - Current project data when editing
 * @param {boolean} [options.stream=false] - Return a streaming response
 * @returns {Promise<string|AsyncIterable>} Response text or stream
 */
export async function chatWithPMAgent(messages, { editingProjectId, currentProjectData, projectContext, stream = false, maxTokens = 4096, systemPromptOverride = null } = {}) {
    trackSkill('pm-agent', 'pm-chat', 'ejecucion', 'completed').catch(() => {});
    let systemPrompt = systemPromptOverride ?? PM_SYSTEM_PROMPT;

    if (projectContext) {
        systemPrompt += projectContext;
    }

    if (editingProjectId) {
        systemPrompt += `\n\nESTÁS EDITANDO UN PROYECTO EXISTENTE (ID: ${editingProjectId}).
            Contexto actual del proyecto: ${JSON.stringify(currentProjectData)}.
            Aplica los cambios solicitados manteniendo la estructura JSON.`;
    }

    if (stream) {
        return anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages,
        });
    }

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
    });

    return response.content[0].text;
}

// ─── Extract JSON from markdown code blocks ──────────────────────────────────

/**
 * Extract a JSON object from a markdown ```json code block.
 * @param {string} text - Text containing a JSON code block
 * @returns {Object|null} Parsed JSON or null
 */
export function extractJSON(text) {
    const match = text.match(/```json\n([\s\S]+?)\n```/);
    if (match) {
        try { return JSON.parse(match[1]); } catch { return null; }
    }
    return null;
}

// ─── Generate Summary (chat → borrador) ──────────────────────────────────────

const SUMMARY_SYSTEM_PROMPT = `Eres el PM Agent de Emiralia. Tu tarea es resumir una conversación de refinamiento de idea en un borrador conciso.

Genera un resumen estructurado con:
- **Idea**: Qué se quiere hacer (1-2 líneas)
- **Contexto**: Por qué es importante o qué problema resuelve (1 línea)
- **Decisiones clave**: Puntos acordados durante la conversación (bullets)
- **Alcance**: Qué incluye y qué no (si se discutió)

Sé directo y conciso. Máximo 6-8 líneas. No incluyas el ida y vuelta de preguntas. Solo el resultado destilado.`;

/**
 * Generate a summary from a conversation (chat → borrador transition).
 * @param {Array<{role: string, content: string}>} conversation
 * @returns {Promise<string>} Summary text
 */
export async function generateSummary(conversation) {
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SUMMARY_SYSTEM_PROMPT,
        messages: [
            {
                role: 'user',
                content: `Resume esta conversación en un borrador conciso:\n\n${conversation.map(m => `**${m.role}**: ${m.content}`).join('\n\n')}`,
            },
        ],
    });
    return response.content[0].text;
}

// ─── Generate Full Project (borrador → proyecto) ─────────────────────────────

/**
 * Generate a full project breakdown from a borrador summary.
 * Uses the complete PM Agent system prompt with project context.
 * @param {string} title - Item title
 * @param {string} summary - Borrador summary
 * @param {string} [projectContext] - Live project context from context-builder
 * @returns {Promise<{text: string, json: Object|null}>} Full response + extracted JSON
 */
export async function generateProject(title, summary, projectContext) {
    let systemPrompt = PM_SYSTEM_PROMPT;
    if (projectContext) systemPrompt += projectContext;

    systemPrompt += `\n\nIMPORTANTE: No estás en modo conversación. Recibirás un borrador ya refinado. Tu tarea es generar directamente el JSON de proyecto completo (Plan Maestro) sin hacer preguntas. El borrador ya contiene toda la información necesaria.`;

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: `Genera el Plan Maestro completo en JSON para este proyecto:\n\n**Título:** ${title}\n\n**Borrador:**\n${summary}`,
            },
        ],
    });

    const text = response.content[0].text;
    const json = extractJSON(text);
    return { text, json };
}
