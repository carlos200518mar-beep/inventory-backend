# 🚀 INICIO RÁPIDO - DESPLIEGUE

## ✅ ¿Qué se ha preparado?

Tu backend ahora está **100% listo para desplegar** en producción con:

1. ✅ **Dockerfile** optimizado (build multi-stage)
2. ✅ **Archivos de configuración** para Railway y Render
3. ✅ **Scripts de deployment** en package.json
4. ✅ **Guía completa** en DEPLOYMENT.md
5. ✅ **Script de verificación** (check-health.js)
6. ✅ **Plantilla de variables** para producción

---

## 🎯 3 OPCIONES RÁPIDAS

### Opción 1: Railway (⏱️ 5 minutos) - RECOMENDADO

**Lo más fácil y rápido:**

1. Ve a https://railway.app y crea cuenta
2. Click "New Project" → "Deploy from GitHub repo"
3. Selecciona tu repositorio `inventory-backend`
4. Click "+ New" → "Database" → "MySQL"
5. En tu servicio, agrega estas variables:
   ```
   DATABASE_URL=${{MySQL.DATABASE_URL}}
   JWT_SECRET=genera_algo_aleatorio_aqui
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   PORT=3000
   ```
6. En Settings → Deploy → Custom Start Command:
   ```
   npx prisma migrate deploy && npm run start:prod
   ```
7. Deploy automático! 🎉

**URL:** Railway te da una URL automática (ej: `https://tu-app.railway.app`)

---

### Opción 2: Render (⏱️ 10 minutos)

**Gratis con limitaciones:**

1. Ve a https://render.com
2. Crea una base de datos MySQL
3. Crea un nuevo "Web Service" desde GitHub
4. Configura:
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm run start:prod`
5. Agrega variables de entorno (copia DATABASE_URL de tu MySQL)
6. Deploy! 🚀

---

### Opción 3: Docker en VPS (⏱️ 30 minutos)

**Control total:**

1. Alquila un VPS (DigitalOcean, Linode, etc.)
2. Instala Docker:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```
3. Clona tu repo y ejecuta:
   ```bash
   docker build -t inventory-backend .
   docker run -d -p 3000:3000 --env-file .env inventory-backend
   ```

---

## 🔧 SIGUIENTES PASOS

### 1. Generar JWT_SECRET Seguro

**En PowerShell (Windows):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**En Linux/Mac:**
```bash
openssl rand -base64 32
```

Copia el resultado y úsalo como `JWT_SECRET`

### 2. Después del Despliegue

```bash
# Verifica que todo funcione
node check-health.js https://tu-url-aqui.com

# O manualmente:
# 1. Visita: https://tu-url.com/docs
# 2. Prueba login en: POST /auth/login
```

### 3. Configurar Frontend

En tu `inventory-frontend/js/config.js`, cambia:
```javascript
const API_URL = 'https://tu-backend-url.railway.app';
```

---

## 📚 DOCUMENTACIÓN COMPLETA

Para más detalles, consulta:
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía completa paso a paso
- **[README.md](./README.md)** - Documentación del proyecto
- **[.env.production.example](./.env.production.example)** - Variables de entorno

---

## ⚠️ IMPORTANTE ANTES DE DESPLEGAR

### Cambios de Seguridad OBLIGATORIOS:

1. ❌ **NO uses las contraseñas por defecto**
   - Cambia `JWT_SECRET`
   - Cambia contraseñas de MySQL
   
2. ✅ **Habilita SSL/HTTPS**
   - Railway y Render lo hacen automáticamente
   - En VPS, usa Certbot

3. ✅ **Cambia usuarios de seed**
   - Después del primer deploy, cambia las contraseñas:
   ```
   admin@local / Admin123!  → Cambiar
   manager@local / Manager123!  → Cambiar
   ```

---

## 🆘 ¿PROBLEMAS?

### Error: Cannot connect to database
→ Verifica `DATABASE_URL` en variables de entorno

### Error: Migrations failed
→ Ejecuta manualmente: `npx prisma migrate deploy`

### Error: Port already in use
→ En producción, usa el PORT que provee la plataforma (variable `PORT`)

### Más ayuda
→ Consulta la sección "Troubleshooting" en [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 💡 TIPS PRO

1. **Usa Railway para empezar** (más fácil, MySQL incluido)
2. **Habilita GitHub Auto-deploy** (se actualiza solo con cada push)
3. **Monitorea logs** de la plataforma para detectar errores
4. **Haz backup** de la base de datos regularmente
5. **Prueba todo** en local primero con Docker

---

## ✨ ¡LISTO PARA DESPLEGAR!

Todos los archivos necesarios están listos. Solo tienes que:
1. Elegir una plataforma (recomiendo Railway)
2. Seguir los pasos
3. ¡Disfrutar de tu API en producción!

**¿Dudas?** Abre [DEPLOYMENT.md](./DEPLOYMENT.md) para la guía detallada.
