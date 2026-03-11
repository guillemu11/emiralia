# Emiralia - Estado del Proyecto
**Fecha:** 2026-03-11
**Última actualización:** Preparación para producción

---

## 📋 Resumen Ejecutivo

Emiralia es una plataforma PropTech para inversores hispanohablantes interesados en UAE. Estamos **preparando el MVP para desplegar a Railway**.

**Estado actual:** Plan completo creado, listo para ejecutar.

**Problema principal identificado:**
- Docker NO está corriendo → PostgreSQL inaccesible → propiedades no se cargan
- 45+ enlaces rotos (href="#") en toda la web
- 3 páginas nuevas por crear: invertir.html, ai-insights.html, interes.html
- Blog existe pero no está integrado en navegación

---

## 🎯 Decisiones Arquitectónicas Tomadas

| Decisión | Opción Elegida |
|----------|----------------|
| **Versión de propiedades** | Mantener ambas (propiedades.html + propiedades-v2.html) |
| **"Invertir" y "AI Insights"** | Crear páginas dedicadas (no redirigir a filtros) |
| **Login/Acceso** | Crear formulario de interés (interes.html + endpoint /api/leads) |
| **Blog** | Integrar completamente (añadir a vite.config + navbar) |

---

## 📂 Archivos de Referencia Clave

### Plan de Ejecución Completo
**Ubicación:** `.claude/plans/temporal-splashing-lantern.md`
- Plan detallado fase por fase
- 9 fases de ejecución
- Checklist completo de verificación
- Código completo para todas las páginas nuevas

### Plan de Producción Railway
**Ubicación:** `plan_produccion/plan_final.md`
- Arquitectura target en Railway
- Cambios técnicos (SSL, API_URL, Dockerfile)
- Variables de entorno
- Proceso de deploy

### Business Plan
**Ubicación:** `.claude/BUSINESS_PLAN.md`
- Norte estratégico del proyecto
- Modelo B2B (venta a developers)
- Roadmap de fases

---

## 🚧 Estado Actual: BLOQUEADO

### Bloqueador Inmediato
**Docker no está corriendo**
- Error: `failed to connect to the docker API`
- Impacto: PostgreSQL no accesible, API no puede arrancar, propiedades no se cargan

**Solución requerida:**
1. Abrir Docker Desktop desde Windows
2. Esperar a que inicie completamente (ícono verde en barra de tareas)
3. Ejecutar: `docker compose up -d postgres redis`

---

## ✅ Progreso Completado

### Investigación y Análisis (100%)
- [x] Exploración completa del codebase
- [x] Identificación de 45+ enlaces rotos
- [x] Diagnóstico: propiedades no cargan por Docker
- [x] Mapa completo de navegación
- [x] Análisis de flujos de usuario

### Planificación (100%)
- [x] Plan completo de 9 fases creado
- [x] Decisiones arquitectónicas confirmadas con usuario
- [x] Orden de ejecución definido
- [x] Criterios de éxito establecidos

### Ejecución (78%)
- [x] **COMPLETADO:** Arrancar Docker y verificar PostgreSQL
- [x] **COMPLETADO:** Crear tabla leads en PostgreSQL
- [x] **COMPLETADO:** Crear endpoint /api/leads (POST + GET)
- [x] **COMPLETADO:** Actualizar vite.config.js con 11 páginas
- [x] **COMPLETADO:** Crear 3 páginas nuevas (invertir, ai-insights, interes)
- [x] **COMPLETADO:** Fix navegación en 8 archivos HTML
- [x] **COMPLETADO:** Integrar blog (15 artículos linkeados)
- [ ] **PENDIENTE:** Verificación local (requiere Docker corriendo)
- [ ] **PENDIENTE:** Git + Railway deploy

---

## 📝 Próximos Pasos (Inmediatos)

### PASO 1: Arrancar Docker (CRÍTICO)
```bash
# 1. Abrir Docker Desktop manualmente desde Windows
# 2. Verificar que está corriendo:
docker ps

# 3. Arrancar servicios:
cd C:/Users/gmunoz02/Desktop/emiralia
docker compose up -d postgres redis

# 4. Verificar PostgreSQL:
node -e "import pool from './tools/db/pool.js'; const r = await pool.query('SELECT NOW()'); console.log('✓ PostgreSQL connected:', r.rows[0]); await pool.end();" --input-type=module

# 5. Arrancar API:
node apps/dashboard/server.js
# Debe mostrar: "Dashboard server listening on port 3001"

# 6. Test endpoint:
curl http://localhost:3001/api/properties?limit=5
```

### PASO 2: Crear Tabla Leads (15 min)
```bash
# Modificar tools/db/schema.sql (añadir al final):
# - Tabla leads con campos: name, email, country, interests[]
# - Índices en email y created_at

# Aplicar migration si PostgreSQL ya tiene schema viejo
```

### PASO 3: Crear Endpoint /api/leads (30 min)
```javascript
// En apps/dashboard/server.js
// POST /api/leads
// - Validar name y email
// - Insertar en tabla leads
// - ON CONFLICT (email) actualizar
```

### PASO 4: Modificar vite.config.js (5 min)
```javascript
// Añadir 5 páginas al build:
// - blog
// - articulo
// - invertir
// - ai-insights
// - interes
```

### PASO 5: Crear 3 Páginas Nuevas (4-5 horas)
1. **invertir.html** + invertir.js
   - Hero + 3 categorías de inversión
   - CTAs a propiedades filtradas

2. **ai-insights.html** + ai-insights.js
   - Hero + explicación AI Score
   - Top 10 propiedades desde API

3. **interes.html** + interes.js
   - Formulario de early access
   - Submit a /api/leads

### PASO 6: Fix Navegación (2 horas)
- Modificar navbar en 8 archivos HTML
- Cambiar href="#" por rutas reales
- Añadir "Academia" al navbar
- Fix Login/Acceso → redirect a /interes.html

### PASO 7: Integrar Blog (1 hora)
- Linkar 6 artículos en blog.html → articulo.html?id=X
- Linkar 8 capítulos de guía → articulo.html?guia=X
- Limpiar footers

### PASO 8: Verificación Local (1.5 horas)
- Checklist completo de navegación
- Build de producción
- Test preview

### PASO 9: Git + Railway Deploy (3 horas)
- Crear .gitignore
- git init + commit
- GitHub repo
- Seguir plan_produccion/plan_final.md

---

## 📊 Archivos a Crear/Modificar

### CREAR (8 archivos nuevos)
```
apps/website/invertir.html
apps/website/src/invertir.js
apps/website/ai-insights.html
apps/website/src/ai-insights.js
apps/website/interes.html
apps/website/src/interes.js
.gitignore
README.md (opcional)
```

### MODIFICAR (12 archivos)
```
apps/website/vite.config.js          → +5 páginas al build
apps/website/index.html               → navbar fix
apps/website/propiedades.html         → navbar fix
apps/website/propiedades-v2.html      → navbar fix
apps/website/propiedad.html           → navbar fix
apps/website/desarrolladores.html     → navbar fix
apps/website/desarrollador.html       → navbar fix
apps/website/blog.html                → navbar + 14 links de artículos
apps/website/articulo.html            → navbar + footer
apps/dashboard/server.js              → endpoint POST /api/leads
tools/db/schema.sql                   → tabla leads
```

---

## 🎨 Estructura Actual del Proyecto

```
emiralia/
├── .claude/
│   ├── CLAUDE.md                     # Instrucciones principales
│   ├── BUSINESS_PLAN.md              # Norte estratégico
│   ├── plans/
│   │   └── temporal-splashing-lantern.md  # PLAN COMPLETO ★
│   ├── agents/                       # Definiciones de agentes
│   └── skills/                       # Skills invocables
├── plan_produccion/
│   └── plan_final.md                 # Plan Railway ★
├── apps/
│   ├── website/                      # Frontend estático (Vite)
│   │   ├── index.html
│   │   ├── propiedades.html
│   │   ├── propiedades-v2.html
│   │   ├── propiedad.html
│   │   ├── desarrolladores.html
│   │   ├── desarrollador.html
│   │   ├── blog.html
│   │   ├── articulo.html
│   │   ├── src/
│   │   │   ├── main.js
│   │   │   ├── propiedades-v2.js    # API fetch de propiedades
│   │   │   ├── propiedad.js
│   │   │   ├── desarrollador.js
│   │   │   ├── blog.js
│   │   │   └── style.css
│   │   └── vite.config.js
│   ├── dashboard/                    # Dashboard React SPA
│   │   ├── server.js                 # Express API backend ★
│   │   └── src/
│   └── api/                          # API vieja (duplicado)
├── tools/
│   └── db/
│       ├── pool.js                   # Conexión PostgreSQL
│       ├── schema.sql                # Schema DB ★
│       └── seed.sql
├── docker-compose.yml                # Postgres, Redis, API, Adminer
├── .env                              # Variables de entorno
└── ESTADO_PROYECTO.md                # Este archivo ★
```

---

## 🔧 Tecnologías y Stack

### Frontend (Website)
- **Framework:** Vite (sin framework JS, HTML puro + vanilla JS)
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide Icons
- **Tipografía:** Inter (Google Fonts)

### Backend
- **API:** Express.js (puerto 3001)
- **Runtime:** Node.js
- **Base de datos:** PostgreSQL 16
- **Cache:** Redis 7

### Deploy Target
- **Plataforma:** Railway
- **Costo estimado:** ~$16/mes
- **Servicios:** website (estático) + dashboard (API) + telegram-bot + PostgreSQL

---

## 🐛 Problemas Conocidos

### 1. Docker no está corriendo
**Estado:** BLOQUEADOR
**Solución:** Iniciar Docker Desktop manualmente

### 2. 45+ enlaces rotos (href="#")
**Ubicaciones:**
- Navbar: "Invertir", "AI Insights" en 8 páginas
- Footer: blog.html (16 enlaces), articulo.html (11), desarrollador.html (9)
- Contenido: blog.html (6 artículos + 8 capítulos guía)

**Solución:** Crear páginas nuevas + actualizar hrefs

### 3. Páginas aisladas
- `articulo.html` no es accesible desde ninguna página
- `blog.html` no está en navbar de index.html

**Solución:** Integrar blog en navegación

### 4. CTAs sin funcionalidad
- Botones "Login" y "Acceso" sin acción
- "Solicitar Dossier" en desarrollador.html

**Solución:** Crear interes.html + endpoint /api/leads

---

## 📌 Comandos Útiles

### Docker
```bash
# Arrancar servicios
docker compose up -d postgres redis

# Ver logs
docker compose logs postgres
docker compose logs api

# Detener servicios
docker compose down

# Ver contenedores corriendo
docker ps
```

### Development
```bash
# Backend API (puerto 3001)
node apps/dashboard/server.js

# Frontend Website (puerto 5173)
cd apps/website
npm run dev

# Build producción
cd apps/website
npm run build

# Preview build
npm run preview
```

### Database
```bash
# Conectar a PostgreSQL (si está corriendo)
docker exec -it emiralia_postgres psql -U emiralia -d emiralia

# Test conexión desde Node
node -e "import pool from './tools/db/pool.js'; const r = await pool.query('SELECT NOW()'); console.log(r.rows[0]); await pool.end();" --input-type=module

# Contar propiedades
node -e "import pool from './tools/db/pool.js'; const r = await pool.query('SELECT COUNT(*) FROM properties'); console.log('Properties:', r.rows[0].count); await pool.end();" --input-type=module
```

### Git (cuando esté listo)
```bash
# Init
git init
git add .
git commit -m "feat: Emiralia MVP ready for production"

# GitHub
gh repo create emiralia --private
git branch -M main
git push -u origin main
```

---

## 🎯 Checklist de Producción

### Pre-Deploy Local
- [ ] Docker corriendo, PostgreSQL accesible
- [ ] API responde en localhost:3001/api/properties
- [ ] Propiedades cargan en propiedades.html y propiedades-v2.html
- [ ] Blog integrado en vite.config
- [ ] invertir.html creado y funcional
- [ ] ai-insights.html creado y funcional
- [ ] interes.html creado y funcional
- [ ] Endpoint /api/leads funciona
- [ ] Tabla leads en PostgreSQL
- [ ] 0 enlaces href="#" en navbar
- [ ] Build de producción genera 11 HTML correctamente
- [ ] Preview funciona correctamente

### Post-Deploy Railway
- [ ] Website carga en URL Railway
- [ ] Propiedades cargan desde API
- [ ] Blog/Academia funcional
- [ ] Formulario interes envía a DB
- [ ] Tiempo de carga < 2s
- [ ] Mobile responsive
- [ ] No hay CORS errors

---

## 🚀 Para Continuar en Nueva Conversación

**Referencias este archivo:**
```
@ESTADO_PROYECTO.md
```

**Y también:**
- `.claude/plans/temporal-splashing-lantern.md` - Plan completo de ejecución
- `plan_produccion/plan_final.md` - Plan de deploy a Railway
- `.claude/BUSINESS_PLAN.md` - Contexto estratégico

**Comando para arrancar donde dejamos:**
1. "Quiero continuar con la preparación para producción"
2. "Referencia: ESTADO_PROYECTO.md y plan temporal-splashing-lantern.md"
3. "Último estado: Docker no está corriendo, necesito arrancarlo primero"

**Primer paso al reanudar:**
- Verificar si Docker ya está corriendo
- Si sí: continuar con FASE 1.2 (verificar PostgreSQL)
- Si no: instruir cómo iniciar Docker Desktop

---

## 📞 Contacto y Recursos

- **Proyecto:** Emiralia (PropTech UAE → Mercado Hispanohablante)
- **Repo (futuro):** github.com/[usuario]/emiralia (privado)
- **Deploy target:** Railway.app
- **Stack:** Vite + Express + PostgreSQL + Railway

---

**Última actualización:** 2026-03-11
**Estado:** ⏸️ Pausado - Docker no corriendo (bloqueador)
**Progreso general:** 30% (planificación completa, ejecución 0%)
