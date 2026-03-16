# SQL Exports Archive

Este directorio contiene exports canónicos de datos de producción.

## Archivos Disponibles

| Archivo | Propósito | Tamaño | Última Actualización |
|---------|-----------|--------|---------------------|
| `properties.sql` | Export completo de propiedades (153 records) | 33MB | 2024-03-16 |
| `agents.sql` | Export de configuración de agentes | 12KB | 2024-03-16 |
| `projects.sql` | Export de proyectos | 224KB | 2024-03-16 |

## Cuándo Usar

**Para importar a Railway:**
```bash
npm run migration:import-to-railway
```

**Para importar vía API (local):**
```bash
npm run migration:import-properties
```

## Notas

- Estos archivos son **snapshots temporales**, no código vivo
- El historial completo está en Git
- Para generar un nuevo export, ejecutar:
  ```bash
  pg_dump $DATABASE_URL > scripts/migrations/archive/properties-$(date +%Y%m%d).sql
  ```
