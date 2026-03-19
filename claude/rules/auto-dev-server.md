# Rule: Auto Dev Server

Siempre que se cree o modifique una pagina del website (`apps/website/`), levantar automaticamente el servidor de desarrollo para que el usuario pueda ver los cambios de inmediato.

```bash
cd apps/website && npm run dev
```

No esperar a que el usuario lo pida. Hacerlo proactivamente despues de cada cambio relevante en el frontend.

---

# Rule: Auto Restart Servers

Siempre que se modifique un archivo de servidor backend (`server.js`, rutas API, middleware), reiniciar automaticamente el servidor afectado:

1. Encontrar el proceso en el puerto correspondiente (`netstat -ano | grep <port>`)
2. Matarlo (`taskkill //PID <pid> //F`)
3. Reiniciarlo en background (`node server.js &`)
4. Verificar que arrancó correctamente

Servidores conocidos:
- `apps/dashboard/server.js` → puerto 3001
- `apps/api/src/index.js` → puerto 3000

No esperar a que el usuario lo pida. Hacerlo proactivamente despues de cada cambio en backend.
