# 🚀 Configuración de Vercel - Emiralia

## ✅ Dashboard (URGENTE - Hacer primero)

### 1. Ve a Vercel Dashboard Settings
**URL:** https://vercel.com/[tu-cuenta]/emiralia-dashboard/settings/environment-variables

### 2. Agrega estas Variables de Entorno:

```
PG_HOST=mainline.proxy.rlwy.net
PG_PORT=17638
PG_DB=railway
PG_USER=postgres
PG_PASSWORD=[ver Railway dashboard → emiralia → Variables]
PG_SSL=false
ANTHROPIC_API_KEY=[ver .env local — NUNCA hardcodear en docs]
```

**IMPORTANTE:** Aplica las variables para **Production, Preview y Development**

### 3. Redeploy

Después de guardar las variables:
1. Ve a **Deployments**
2. Click en los **3 puntos** del último deployment
3. Click **"Redeploy"**
4. Espera ~1 minuto

### 4. Verificar

Abre: **https://emiralia-dashboard.vercel.app/api/projects**

Deberías ver un JSON con los 16 proyectos.

---

## 📊 Website (Segundo paso)

El website actual tiene **propiedades hardcodeadas** en el HTML.

### Opciones para mostrar las 5,040 propiedades reales:

**Opción A (Rápida):** Modificar el website para hacer `fetch()` al dashboard API:
```javascript
fetch('https://emiralia-dashboard.vercel.app/api/properties')
  .then(r => r.json())
  .then(properties => renderProperties(properties))
```

**Opción B (Completa):** Usar Vercel Serverless Functions para SSR (Server-Side Rendering)

**¿Cuál prefieres?**

---

## 🎯 Resultado Esperado

Una vez configurado:

✅ **Dashboard:** https://emiralia-dashboard.vercel.app
   - Mostrará los 16 proyectos
   - API funcionando en `/api/projects`, `/api/agents`, etc.

✅ **Website:** https://emiralia-website.vercel.app
   - (Después de implementar fetch) Mostrará las 5,040 propiedades reales
