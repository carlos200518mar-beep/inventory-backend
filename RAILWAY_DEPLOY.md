# 🚂 DESPLIEGUE EN RAILWAY - GUÍA PASO A PASO

## ⏱️ Tiempo estimado: 10-15 minutos

---

## 📋 ANTES DE EMPEZAR

### ✅ Requisitos:
- [ ] Cuenta de GitHub (tu código debe estar en GitHub)
- [ ] Cuenta de Railway (la crearás en el paso 1)
- [ ] Este repositorio subido a GitHub

### ⚠️ Si tu código NO está en GitHub todavía:

```powershell
# 1. Inicializa Git (si no lo has hecho)
git init
git add .
git commit -m "Ready for deployment"

# 2. Crea un repo en GitHub y conecta
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

---

## 🎯 PASO 1: CREAR CUENTA EN RAILWAY

1. Ve a **https://railway.app**

2. Click en **"Login"** (esquina superior derecha)

3. Selecciona **"Sign in with GitHub"**
   - Esto conectará tu cuenta de GitHub automáticamente
   - Autoriza a Railway cuando te lo pida

4. ¡Listo! Ya tienes cuenta en Railway 🎉

**💰 Plan Gratuito:**
- $5 de crédito mensual gratis
- Suficiente para proyectos pequeños/medianos
- No necesitas tarjeta de crédito

---

## 🎯 PASO 2: CREAR NUEVO PROYECTO

1. En el dashboard de Railway, click en **"New Project"**

2. Verás varias opciones, selecciona:
   **"Deploy from GitHub repo"**

3. Railway te pedirá permisos para acceder a tus repos:
   - Click **"Configure GitHub App"**
   - Puedes dar acceso a:
     - **Todos los repos** (más fácil)
     - **Solo repos específicos** (más seguro)
   - Click **"Install & Authorize"**

4. Selecciona tu repositorio:
   - Busca: `inventory-backend` o el nombre de tu repo
   - Click en el repositorio

5. Railway empezará a analizar tu proyecto
   - Detectará automáticamente el `Dockerfile`
   - Click **"Deploy Now"** si te lo pide

6. Verás que se crea un servicio llamado **"inventory-backend"**
   - Por ahora fallará porque falta la base de datos
   - ¡Es normal! Continuamos...

---

## 🎯 PASO 3: AGREGAR BASE DE DATOS MYSQL

1. En tu proyecto de Railway, click en **"+ New"** (botón superior derecho)

2. Selecciona **"Database"**

3. Selecciona **"Add MySQL"**
   - Railway creará automáticamente una base de datos MySQL
   - Se llamará simplemente **"MySQL"**

4. Espera unos segundos mientras se crea
   - Verás un nuevo servicio "MySQL" en tu proyecto
   - ¡Listo! Ya tienes base de datos 🎉

---

## 🎯 PASO 4: CONFIGURAR VARIABLES DE ENTORNO

### 4.1 Generar JWT_SECRET

Primero necesitas un JWT_SECRET seguro:

```powershell
# Ejecuta esto en PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Copia el resultado** - Lo necesitarás en el siguiente paso.

### 4.2 Agregar Variables

1. Click en tu servicio **"inventory-backend"** (el que no es MySQL)

2. Ve a la pestaña **"Variables"**

3. Click en **"+ New Variable"** y agrega cada una:

#### Variable 1: DATABASE_URL
```
DATABASE_URL
```
**Valor:** Click en **"Add Reference"** → Selecciona **"MySQL"** → **"DATABASE_URL"**
- Esto conectará automáticamente con tu base de datos
- Verás algo como: `${{MySQL.DATABASE_URL}}`

#### Variable 2: JWT_SECRET
```
JWT_SECRET
```
**Valor:** Pega el secreto que generaste arriba
- Ejemplo: `aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3x`

#### Variable 3: JWT_EXPIRES_IN
```
JWT_EXPIRES_IN
```
**Valor:**
```
7d
```

#### Variable 4: NODE_ENV
```
NODE_ENV
```
**Valor:**
```
production
```

#### Variable 5: PORT
```
PORT
```
**Valor:**
```
3000
```

4. Las variables se guardan automáticamente

---

## 🎯 PASO 5: CONFIGURAR COMANDO DE INICIO

Railway ejecutará tu app, pero necesita ejecutar las migraciones primero.

1. En tu servicio **"inventory-backend"**, ve a **"Settings"**

2. Scroll hasta encontrar **"Deploy"**

3. En **"Custom Start Command"**, agrega:
```bash
npx prisma migrate deploy && npm run start:prod
```

4. Esto ejecutará:
   - Las migraciones de Prisma primero
   - Luego iniciará tu aplicación

---

## 🎯 PASO 6: REDESPLEGAR

1. Ve a la pestaña **"Deployments"**

2. Click en **"Deploy"** (botón superior derecho)
   - O simplemente haz un push a GitHub y se desplegará automáticamente

3. Verás el progreso en tiempo real:
   - 📦 Building...
   - 🐳 Creating Docker image...
   - 🗄️ Running migrations...
   - ✅ Deployed!

4. **Espera 2-3 minutos** mientras se construye y despliega

---

## 🎯 PASO 7: OBTENER TU URL PÚBLICA

1. En tu servicio **"inventory-backend"**, ve a **"Settings"**

2. Scroll hasta **"Networking"**

3. Verás **"Public Networking"**

4. Click en **"Generate Domain"**
   - Railway creará una URL como: `https://inventory-backend-production-xxxx.up.railway.app`

5. **¡Copia esta URL!** La necesitarás para:
   - Probar tu API
   - Configurar tu frontend
   - Compartir tu API

---

## 🎯 PASO 8: VERIFICAR QUE TODO FUNCIONE

### 8.1 Verificar Logs

1. En tu servicio, ve a la pestaña **"Logs"**

2. Deberías ver:
```
🚀 Application is running on: http://localhost:3000
📚 Swagger documentation: http://localhost:3000/docs
```

3. Si ves errores:
   - Verifica las variables de entorno
   - Chequea que DATABASE_URL esté conectado
   - Ve a la sección "Problemas Comunes" abajo

### 8.2 Probar la API

**Opción 1: Con el script**
```powershell
npm run health:check https://TU-URL-AQUI.up.railway.app
```

**Opción 2: Manualmente en el navegador**

Abre tu navegador y ve a:
```
https://TU-URL-AQUI.up.railway.app/docs
```

Deberías ver la documentación Swagger 🎉

### 8.3 Probar Login

1. En Swagger, busca el endpoint **POST /auth/login**

2. Click en "Try it out"

3. Usa las credenciales de seed:
```json
{
  "email": "admin@local",
  "password": "Admin123!"
}
```

4. Click **"Execute"**

5. Deberías recibir un token JWT ✅

---

## 🎯 PASO 9: EJECUTAR SEED (DATOS INICIALES)

Para agregar los datos de prueba (usuarios, productos, etc.):

### Opción 1: Desde Railway CLI

1. Instala Railway CLI:
```powershell
npm install -g @railway/cli
```

2. Login:
```powershell
railway login
```

3. Conecta a tu proyecto:
```powershell
railway link
```

4. Ejecuta el seed:
```powershell
railway run npm run prisma:seed
```

### Opción 2: Desde Prisma Studio (más fácil)

1. En Railway CLI:
```powershell
railway run npx prisma studio
```

2. Se abrirá en http://localhost:5555

3. Agrega los datos manualmente o importa desde tu DB local

### Opción 3: Ejecutar localmente contra Railway DB

1. Copia la DATABASE_URL de Railway:
   - Ve a **MySQL** → **Variables** → Copia **DATABASE_URL**

2. En tu terminal local:
```powershell
$env:DATABASE_URL="mysql://root:PASSWORD@....railway.app:PORT/railway"
npm run prisma:seed
```

---

## 🎯 PASO 10: CONFIGURAR TU FRONTEND

Ahora que tu backend está desplegado, configura el frontend:

1. Abre `inventory-frontend/js/config.js`

2. Cambia la URL:
```javascript
const API_URL = 'https://TU-URL-AQUI.up.railway.app';
```

3. Guarda y listo!

---

## 🎉 ¡FELICIDADES! TU BACKEND ESTÁ EN PRODUCCIÓN

### URLs Importantes:

- **API Base:** `https://TU-URL.up.railway.app`
- **Swagger Docs:** `https://TU-URL.up.railway.app/docs`
- **Login:** `https://TU-URL.up.railway.app/auth/login`
- **Productos:** `https://TU-URL.up.railway.app/products`

### Credenciales de Seed:

**Admin:**
- Email: `admin@local`
- Password: `Admin123!`

**Manager:**
- Email: `manager@local`
- Password: `Manager123!`

**⚠️ IMPORTANTE:** Cambia estas contraseñas después del primer login!

---

## 🔄 ACTUALIZACIONES FUTURAS

Cada vez que hagas cambios:

1. **Haz commit y push a GitHub:**
```powershell
git add .
git commit -m "Tu mensaje"
git push
```

2. **Railway desplegará automáticamente** 🎉
   - No necesitas hacer nada más
   - Verás el progreso en la pestaña "Deployments"

---

## ⚙️ CONFIGURACIÓN AVANZADA

### Auto-Deploy desde GitHub

Ya está activado por defecto, pero puedes verificar:

1. Ve a **Settings** → **Deploy**
2. Asegúrate que **"Automatic Deployments"** esté ON
3. Puedes configurar:
   - Rama específica (main, production, etc.)
   - Path específico si tienes monorepo

### Variables de Entorno Adicionales

Si en el futuro necesitas más variables:

1. **Settings** → **Variables**
2. Click **+ New Variable**
3. Agrega el nombre y valor
4. Se aplicarán en el próximo deploy

### Logs en Tiempo Real

1. Ve a la pestaña **"Logs"**
2. Puedes:
   - Ver logs en tiempo real
   - Filtrar por fecha/hora
   - Descargar logs

---

## 🐛 PROBLEMAS COMUNES

### ❌ Error: "Cannot connect to database"

**Causa:** DATABASE_URL mal configurada

**Solución:**
1. Ve a **Variables**
2. Verifica que `DATABASE_URL` tenga el valor: `${{MySQL.DATABASE_URL}}`
3. Si no, bórrala y créala de nuevo como Reference

### ❌ Error: "Prisma Client not generated"

**Causa:** Migraciones no se ejecutaron

**Solución:**
1. Ve a **Settings** → **Deploy**
2. Verifica el **Custom Start Command:**
   ```
   npx prisma migrate deploy && npm run start:prod
   ```
3. Redeploy

### ❌ Error: "Port 3000 already in use"

**Causa:** Railway usa un puerto dinámico

**Solución:**
En `src/main.ts`, ya está configurado correctamente:
```typescript
const port = process.env.PORT ?? 3000;
```
No necesitas cambiar nada.

### ❌ Error: "Build failed"

**Causa:** Dependencias faltantes o errores de TypeScript

**Solución:**
1. Ve a **Deployments** → Click en el deployment fallido
2. Lee los logs para ver el error específico
3. Corrige localmente y haz push

### ❌ El servicio se cae después de deployar

**Causa:** Posible error en runtime

**Solución:**
1. Ve a **Logs**
2. Busca el error
3. Comunes:
   - Variable de entorno faltante
   - Error de conexión a DB
   - Error en el código

---

## 💰 COSTOS Y LÍMITES

### Plan Gratuito (Hobby):
- **$5 de crédito mensual**
- Suficiente para:
  - ~500 horas de ejecución
  - Proyectos de desarrollo/prueba
  - Apps pequeñas con poco tráfico

### Si necesitas más:
- **Plan Developer:** $5/mes sin límite de ejecución
- **Plan Team:** $20/mes con más recursos

### Monitorear uso:
1. Dashboard → **Usage**
2. Verás gráficos de:
   - Tiempo de ejecución
   - Memoria usada
   - Tráfico de red

---

## 🔒 SEGURIDAD POST-DEPLOYMENT

### 1. Cambia las contraseñas de seed

Después del primer deploy:

```powershell
# Conecta a tu DB y cambia las contraseñas
railway run npx prisma studio
```

O usa el endpoint de cambio de contraseña de tu API.

### 2. Regenera JWT_SECRET periódicamente

Cada 3-6 meses:
1. Genera un nuevo secret
2. Actualiza la variable en Railway
3. Los usuarios tendrán que hacer login de nuevo

### 3. Habilita logs de auditoría

En tu código, considera agregar:
- Log de intentos de login
- Log de cambios importantes
- Monitoreo de errores (Sentry, LogRocket)

---

## 📊 MONITOREO

### Ver métricas:

1. **Deployments:** Historial de todos los deploys
2. **Logs:** Logs en tiempo real
3. **Metrics:** CPU, Memoria, Network
4. **Usage:** Cuánto crédito has usado

### Alertas (Plan pagado):

Puedes configurar alertas para:
- Errores de deploy
- Uso excesivo de recursos
- Downtime

---

## 🎯 PRÓXIMOS PASOS

### ✅ Ya desplegado:
- [x] Backend en Railway
- [x] MySQL configurado
- [x] Variables de entorno
- [x] URL pública

### 📋 Pendiente:
- [ ] Ejecutar seed de datos
- [ ] Configurar frontend para usar la nueva URL
- [ ] Cambiar contraseñas de seed
- [ ] Probar todos los endpoints
- [ ] Configurar dominio personalizado (opcional)

---

## 🆘 ¿NECESITAS AYUDA?

1. **Logs de Railway:** Primera parada para debugging
2. **Railway Discord:** https://discord.gg/railway
3. **Railway Docs:** https://docs.railway.app
4. **Stack Overflow:** Tag `railway`

---

## 🎊 ¡ÉXITO!

Si llegaste hasta aquí, tu backend está:
- ✅ Desplegado en Railway
- ✅ Conectado a MySQL
- ✅ Con SSL/HTTPS
- ✅ Con deploy automático

**¡Felicidades! 🎉 Tu API está en producción.**

---

## 📝 CHECKLIST FINAL

Marca cada uno cuando lo completes:

- [ ] Cuenta de Railway creada
- [ ] Proyecto creado desde GitHub
- [ ] MySQL agregado
- [ ] Variables de entorno configuradas
- [ ] Comando de inicio configurado
- [ ] Deploy exitoso
- [ ] URL pública generada
- [ ] Swagger accesible
- [ ] Login funciona
- [ ] Seed ejecutado
- [ ] Frontend configurado
- [ ] Contraseñas cambiadas
- [ ] ¡TODO LISTO! 🚀
