# Emiralia 🇦🇪

El primer buscador inteligente de propiedades en Emiratos Árabes Unidos para el mercado hispanohablante.

Opera mediante **agentes de IA especializados** que replican los departamentos de una empresa real, coordinados a través del framework WAT (Workflows · Agents · Tools).

---

## 📁 Estructura del Proyecto

```
emiralia/
├── .claude/          WAT Framework (workflows, agents, tools, skills)
├── apps/             Aplicaciones del monorepo (api, dashboard, website)
├── tools/            Tools WAT determinísticos invocados por agentes
├── scripts/          Scripts de deployment e infraestructura
│   ├── deployment/   Scripts de deployment por plataforma (Railway, Vercel)
│   ├── migrations/   Migraciones de datos y archivos SQL
│   └── utilities/    Utilities de mantenimiento (cleanup, backups)
├── docs/             Documentación de infraestructura y arquitectura
└── docker-compose.yml
```

---

## 🚀 Comandos Rápidos

### Desarrollo

```bash
npm run db:up              # Levantar PostgreSQL local
npm run db:init            # Inicializar schema
npm run dev:all            # Levantar dashboard + website
```

### Deployment

```bash
npm run deploy:railway:setup    # Configurar Railway (primera vez)
npm run deploy:railway          # Deploy automático a Railway
```

### Migraciones

```bash
npm run migration:import-properties    # Importar propiedades vía API
npm run migration:import-to-railway    # Importar a Railway DB
```

### Mantenimiento

```bash
npm run cleanup:temp    # Limpiar archivos temporales
```

---

## 📚 Documentación

- **Framework WAT**: Ver [.claude/CLAUDE.md](.claude/CLAUDE.md)
- **Deployment**: Ver [docs/deployment/](docs/deployment/)
- **Estado del Proyecto**: Ver [ESTADO_PROYECTO.md](ESTADO_PROYECTO.md)

---

## 🏗️ Arquitectura

### Aplicaciones

- **Dashboard** (`apps/dashboard`): Admin panel para gestión de propiedades
- **Website** (`apps/website`): Sitio público para usuarios finales
- **API** (`apps/api`): API REST (deprecado, funcionalidad movida a dashboard)

### Agentes WAT

- **content-agent**: Generación de listings y contenido SEO
- **translation-agent**: Traducciones inmobiliarias ES/EN
- **data-agent**: Scraping y normalización de datos
- **frontend-agent**: UI/UX premium
- **dev-agent**: Implementación de features
- **pm-agent**: Challenges y planificación
- **marketing-agent**: Campañas y posicionamiento
- **research-agent**: Monitoreo de fuentes externas
- **wat-auditor-agent**: Auditoría del sistema WAT

---

## 🔧 Configuración

1. **Clonar el repositorio**
2. **Copiar `.env.example` a `.env`** y rellenar credenciales
3. **Levantar base de datos local**: `npm run db:up`
4. **Inicializar schema**: `npm run db:init`
5. **Levantar servicios**: `npm run dev:all`

---

## 📊 Métricas del Proyecto

- **58 → 14 archivos en root** (76% reducción)
- **9 agentes activos** + 7 planificados
- **35+ skills** invocables
- **46 tools** documentados
- **7 workflows** activos

---

## 📝 Licencia

Propiedad de Emiralia. Todos los derechos reservados.
