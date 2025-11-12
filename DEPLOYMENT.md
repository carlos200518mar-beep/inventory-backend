# 🚀 Guía de Despliegue - Inventory Backend

Este documento te guiará para desplegar tu backend en diferentes plataformas.

## 📋 Requisitos Previos

- Cuenta en la plataforma elegida
- Git instalado
- Tu código en un repositorio de GitHub

---

## 🚂 Opción 1: Railway (Recomendado - Más Fácil)

### Ventajas
- ✅ Despliegue automático desde GitHub
- ✅ MySQL incluido gratis
- ✅ SSL automático
- ✅ $5 de crédito mensual gratis

### Pasos:

1. **Ve a [railway.app](https://railway.app)** y crea una cuenta

2. **Nuevo Proyecto:**
   - Click en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio

3. **Agregar MySQL:**
   - Click en "+ New"
   - Selecciona "Database" → "MySQL"
   - Railway creará automáticamente la base de datos

4. **Configurar Variables de Entorno:**
   En tu servicio, ve a "Variables" y agrega:
   ```
   NODE_ENV=production
   DATABASE_URL=${{MySQL.DATABASE_URL}}
   JWT_SECRET=tu_secreto_super_seguro_aqui_cambiar
   JWT_EXPIRES_IN=7d
   PORT=3000
   ```

5. **Ejecutar Migraciones:**
   - Ve a "Settings" → "Deploy"
   - En "Custom Start Command" agrega:
   ```
   npx prisma migrate deploy && npm run start:prod
   ```

6. **Desplegar:**
   - Railway detectará automáticamente el `Dockerfile`
   - El despliegue se hace automáticamente

7. **Obtener URL:**
   - Ve a "Settings" → "Networking"
   - Click en "Generate Domain"
   - Copia tu URL pública

---

## 🎨 Opción 2: Render

### Ventajas
- ✅ Plan gratuito disponible
- ✅ MySQL incluido
- ✅ Fácil configuración

### Pasos:

1. **Ve a [render.com](https://render.com)** y crea una cuenta

2. **Crear Base de Datos:**
   - Click en "New +"
   - Selecciona "MySQL"
   - Sigue el asistente (plan Free o Starter)

3. **Crear Web Service:**
   - Click en "New +"
   - Selecciona "Web Service"
   - Conecta tu repositorio de GitHub

4. **Configuración:**
   - **Name:** inventory-backend
   - **Environment:** Node
   - **Build Command:** 
     ```
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command:**
     ```
     npx prisma migrate deploy && npm run start:prod
     ```

5. **Variables de Entorno:**
   Agrega en la sección "Environment":
   ```
   NODE_ENV=production
   DATABASE_URL=<copia-el-internal-connection-string-de-tu-mysql>
   JWT_SECRET=tu_secreto_super_seguro_aqui
   JWT_EXPIRES_IN=7d
   PORT=3000
   ```

6. **Desplegar:**
   - Click en "Create Web Service"
   - Render construirá y desplegará automáticamente

---

## 🐳 Opción 3: VPS con Docker (DigitalOcean, Linode, etc.)

### Ventajas
- ✅ Control total
- ✅ Costo predecible ($5-10/mes)
- ✅ Puedes usar tu docker-compose.yml

### Pasos:

1. **Crear un Droplet/VPS:**
   - Ubuntu 22.04 LTS
   - Al menos 1GB RAM

2. **Conectar por SSH:**
   ```bash
   ssh root@tu_ip_del_servidor
   ```

3. **Instalar Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

4. **Instalar Docker Compose:**
   ```bash
   apt-get install docker-compose-plugin
   ```

5. **Clonar tu Repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/tu-repo.git
   cd tu-repo/inventory-backend
   ```

6. **Crear archivo .env de producción:**
   ```bash
   nano .env
   ```
   Contenido:
   ```
   NODE_ENV=production
   DATABASE_URL="mysql://inventory_user:TU_PASSWORD_SEGURO@mysql:3306/inventorydb"
   JWT_SECRET=tu_secreto_jwt_super_seguro
   JWT_EXPIRES_IN=7d
   PORT=3000
   ```

7. **Modificar docker-compose.yml para producción:**
   ```bash
   nano docker-compose.yml
   ```
   Cambia las contraseñas por unas seguras

8. **Construir y Ejecutar:**
   ```bash
   docker compose up -d
   ```

9. **Ejecutar Migraciones:**
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```

10. **Configurar Nginx como Proxy Reverso:**
    ```bash
    apt-get install nginx
    nano /etc/nginx/sites-available/inventory
    ```
    
    Contenido:
    ```nginx
    server {
        listen 80;
        server_name tu_dominio.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

11. **Habilitar y Reiniciar Nginx:**
    ```bash
    ln -s /etc/nginx/sites-available/inventory /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
    ```

12. **Instalar SSL con Certbot (Opcional pero Recomendado):**
    ```bash
    apt-get install certbot python3-certbot-nginx
    certbot --nginx -d tu_dominio.com
    ```

---

## 🔐 Variables de Entorno Importantes

Para **PRODUCCIÓN**, asegúrate de cambiar:

```env
# ⚠️ CAMBIAR EN PRODUCCIÓN
NODE_ENV=production
DATABASE_URL="mysql://usuario:password_seguro@host:3306/database"
JWT_SECRET="genera_un_secreto_muy_largo_y_aleatorio_aqui"
JWT_EXPIRES_IN=7d
PORT=3000
```

### Generar JWT_SECRET Seguro:
```bash
# En Linux/Mac
openssl rand -base64 32

# En Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 📊 Verificación Post-Despliegue

1. **Health Check:**
   ```bash
   curl https://tu-url.com/
   ```

2. **Swagger Documentation:**
   ```
   https://tu-url.com/docs
   ```

3. **Test Login:**
   ```bash
   curl -X POST https://tu-url.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"tu_password"}'
   ```

---

## 🔧 Comandos Útiles

### Railway CLI:
```bash
# Instalar
npm i -g @railway/cli

# Login
railway login

# Ver logs
railway logs

# Ejecutar comando
railway run npx prisma studio
```

### Docker (VPS):
```bash
# Ver logs
docker compose logs -f app

# Reiniciar
docker compose restart app

# Ver contenedores
docker compose ps

# Ejecutar migraciones
docker compose exec app npx prisma migrate deploy

# Ejecutar seed
docker compose exec app npm run prisma:seed
```

---

## 🆘 Troubleshooting

### Error: Cannot connect to database
- Verifica que `DATABASE_URL` esté correctamente configurado
- Asegúrate de usar el "Internal Connection String" en Railway/Render
- Verifica que las migraciones se ejecutaron: `npx prisma migrate deploy`

### Error: JWT errors
- Verifica que `JWT_SECRET` esté configurado
- Debe ser el mismo secreto usado para generar los tokens

### Error: CORS
- El backend ya tiene CORS habilitado en `main.ts`
- Si necesitas restringir orígenes, modifica `app.enableCors()`

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de la plataforma
2. Verifica las variables de entorno
3. Asegúrate de que las migraciones se ejecutaron
4. Consulta la documentación de la plataforma elegida

---

## 🎉 ¡Listo!

Tu backend está desplegado y listo para usar. Recuerda:
- ✅ Cambiar todas las contraseñas por defecto
- ✅ Configurar SSL/HTTPS
- ✅ Hacer backup de la base de datos regularmente
- ✅ Monitorear logs y rendimiento
