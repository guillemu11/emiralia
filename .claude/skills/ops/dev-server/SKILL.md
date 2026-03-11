# Skill: Dev Server

Levanta los servidores de desarrollo de Emiralia.

## Trigger
Cuando el usuario pida levantar/arrancar/iniciar el dashboard, website, o la app.

## Actions

### `dashboard` (default)
Levanta backend (Express en :3001) + frontend (Vite en :5173) del dashboard.

```bash
cd c:/Users/gmunoz02/Desktop/emiralia && npm run dev:dashboard
```

### `website`
Levanta solo el website (Next.js/Vite).

```bash
cd c:/Users/gmunoz02/Desktop/emiralia && npm run dev:website
```

### `all`
Levanta todo: backend + dashboard + website.

```bash
cd c:/Users/gmunoz02/Desktop/emiralia && npm run dev:all
```

## Instrucciones

1. Primero verificar si Docker/PostgreSQL esta corriendo:
   ```bash
   curl -s http://localhost:5433 2>&1 || docker compose -f c:/Users/gmunoz02/Desktop/emiralia/docker-compose.yml up -d
   ```

2. Verificar si los puertos ya estan en uso:
   ```bash
   curl -s http://localhost:3001/api/agents 2>&1 | head -1
   ```

3. Si el backend ya esta corriendo, avisar al usuario. Si no, ejecutar el comando correspondiente con `run_in_background: true`.

4. Despues de lanzar, esperar 3 segundos y verificar que el backend responde:
   ```bash
   sleep 3 && curl -s http://localhost:3001/api/agents | head -1
   ```

5. Reportar las URLs al usuario:
   - Dashboard frontend: http://localhost:5173
   - Dashboard API: http://localhost:3001
   - Website (si aplica): http://localhost:3000

## Notas
- El backend necesita PostgreSQL corriendo (Docker) y `.env` con las credenciales.
- Si el server crashea con `ERR_STREAM_WRITE_AFTER_END`, es un bug conocido en el SSE del chat — ya esta parcheado.
- En Windows, los procesos background de Claude se cierran al terminar el task. Usar `run_in_background: true` sin timeout para que persista.
