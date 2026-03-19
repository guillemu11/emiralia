---
name: perfil-cliente-ideal
description: >
  Usar cuando se necesite definir o refinar los perfiles de cliente ideal (ICP)
  de Emiralia. Genera arquetipos detallados de inversores hispanohablantes
  interesados en el mercado inmobiliario de EAU, con demographics, JTBD,
  triggers, canales y objeciones.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[segmento: todos|espana|latam|expats]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - SEGMENT: Segmento a perfilar (todos, espana, latam, expats)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Perfil de Cliente Ideal (ICP)

## ¿Qué hace este skill?

Genera **arquetipos detallados** de los clientes ideales de Emiralia. Cada arquetipo incluye datos demográficos, Jobs To Be Done, eventos trigger, canales de contacto y objeciones comunes con respuestas preparadas.

## Cuándo usarlo

- Al inicio del proyecto para definir a quién nos dirigimos.
- Antes de crear campañas de marketing (para segmentar mensajes).
- Cuando el Content Agent necesite saber para quién escribe.
- Al evaluar un nuevo mercado geográfico.

---

## Proceso paso a paso

Actúa como un **experto en segmentación de mercado y customer research** en el sector PropTech. Para `$ARGUMENTS`:

### Paso 1: Consultar ICPs existentes
```bash
node tools/db/memory.js get pm-agent icp_profiles_count
```

### Paso 2: Generar arquetipos
Para cada segmento solicitado, crear un perfil completo con datos reales del mercado.

**Arquetipos base de Emiralia:**

| Arquetipo | Segmento | Motivación principal |
|-----------|----------|---------------------|
| El Empresario Español | España | Segunda residencia + inversión fiscal |
| El Inversor Latinoamericano | Venezuela/Argentina/Colombia | Protección de capital |
| El Expat Hispano en EAU | Dubai/Abu Dhabi | Comprar vs seguir alquilando |

### Paso 3: Validar con datos de mercado
- Cruzar con estadísticas reales del DLD (Dubai Land Department).
- Verificar tendencias de búsqueda en Google Trends para cada segmento.

### Paso 4: Documentar objeciones y respuestas
Cada objeción debe tener una respuesta fundamentada y un recurso de soporte.

---

## Plantilla de output

Para cada arquetipo:

```markdown
# ICP: [Nombre del Arquetipo]

## Demografía
| Atributo | Valor |
|----------|-------|
| Nombre ficticio | [Ej: Carlos Martínez] |
| Edad | [40-55 años] |
| Ubicación | [Madrid, España] |
| Profesión | [Empresario / Director financiero] |
| Ingresos anuales | [80,000-200,000 EUR] |
| Estado familiar | [Casado, 2 hijos] |
| Experiencia inversora | [Ha invertido en fondos/acciones, primera vez en inmobiliario internacional] |
| Idiomas | [Español nativo, inglés intermedio] |

## Jobs To Be Done
| Job | Tipo | Prioridad |
|-----|------|-----------|
| Diversificar inversiones fuera de Europa | Funcional | Alta |
| Obtener rentabilidad > 6% anual | Funcional | Alta |
| Sentir seguridad de que no le van a estafar | Emocional | Crítica |
| Poder explicar la inversión a su pareja | Social | Media |
| Tener un plan B de residencia (Golden Visa) | Funcional | Media |

## Eventos Trigger
| Trigger | Probabilidad | Canal donde ocurre |
|---------|-------------|-------------------|
| Lee artículo sobre rentabilidad en Dubai | Alta | LinkedIn, prensa financiera |
| Amigo/conocido compra en Dubai | Alta | Boca a boca, redes sociales |
| Inestabilidad política/fiscal en su país | Media | Noticias, foros inversores |
| Recibe bonus anual o venta de negocio | Media | Momento personal |
| Descubre Golden Visa en un evento | Baja | Conferencias, ferias |

## Canales para Alcanzarlo
| Canal | Efectividad | Coste |
|-------|-------------|-------|
| SEO: "comprar propiedad Dubai español" | Alta | Bajo (orgánico) |
| YouTube: tours y análisis de mercado | Alta | Medio |
| LinkedIn: contenido sobre inversión EAU | Media | Bajo |
| Telegram: grupos de inversores | Media | Bajo |
| Ferias inmobiliarias (SIMA Madrid) | Baja | Alto |

## Objeciones y Respuestas
| Objeción | Respuesta | Recurso de soporte |
|----------|-----------|-------------------|
| "No conozco el mercado de Dubai" | Emiralia ofrece guías completas en español sobre cada zona y tipo de inversión | Guía: "Dubai para inversores españoles" |
| "¿Y si me estafan?" | Todas las transacciones pasan por RERA y DLD, reguladores del gobierno de Dubai | Artículo: "Protección legal del comprador en EAU" |
| "Los precios parecen muy altos" | El precio medio en JVC es ~300,000 AED (75,000 EUR), comparable a ciudades medias españolas | Comparativa de precios por zona |
| "No hablo inglés suficiente" | Emiralia te conecta con agentes que hablan español | Directorio de agentes hispanohablantes |
| "¿Cómo gestiono una propiedad desde España?" | Existen property managers que gestionan alquiler a distancia con comisión del 5-8% | Guía: "Gestión remota de tu inversión" |

## Métricas de Cualificación
| Criterio | Valor mínimo |
|----------|-------------|
| Capacidad de inversión | > 50,000 EUR |
| Intención temporal | Próximos 12 meses |
| Nivel de investigación | Ha buscado al menos una vez sobre inmobiliario EAU |
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "ICP — [Nombre Arquetipo]" --summary "Perfil de cliente ideal"
node tools/db/memory.js set pm-agent icp_profiles_count '"[N]"' shared
node tools/db/memory.js set pm-agent icp_last_updated '"[timestamp]"' shared
```

---

## Notas

- Los arquetipos deben basarse en datos reales del mercado, no en suposiciones.
- Cada objeción debe tener una respuesta **honesta y verificable**.
- Complementar con `/propuesta-valor` (para el value prop) y `/analisis-competidores` (para diferenciar).
- El Marketing Agent y Content Agent deben consultar estos ICPs antes de crear campañas o contenido.
