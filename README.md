# 📦 Inventory Management System - Backend API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

Sistema completo de gestión de inventario construido con **NestJS**, **MySQL** y **Prisma**.



## 🚀 Características

- **Autenticación JWT** con roles RBAC (ADMIN, MANAGER, CLERK)
- **Gestión de productos** con categorías, SKU y código de barras
- **Control de inventario** multi-almacén con niveles de stock
- **Movimientos de stock** transaccionales (IN/OUT/ADJUST)
- **Órdenes de compra** con recepción parcial/completa
- **Órdenes de venta** con fulfillment automático
- **Soft delete** en todas las entidades principales
- **Documentación OpenAPI/Swagger** en `/docs`
- **Validación** completa de DTOs
- **Transacciones** atómicas en operaciones críticas

## 📋 Requisitos Previos

- Node.js 18+
- MySQL 8+
- npm o yarn

## 🛠️ Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura las variables:

```env
DATABASE_URL="mysql://root:password123@localhost:3306/inventorydb"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
PORT=3000
```

### 3. Iniciar base de datos con Docker (opcional)

```bash
docker-compose up -d
```

O configura MySQL manualmente y crea la base de datos:

```sql
CREATE DATABASE inventorydb;
```

### 4. Ejecutar migraciones de Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Ejecutar seed (datos iniciales)

```bash
npm run prisma:seed
```

Esto creará:
- Usuario ADMIN (email: `admin@local`, password: `Admin123!`)
- Usuario MANAGER (email: `manager@local`, password: `Manager123!`)
- 3 categorías de productos
- 1 almacén principal
- 2 proveedores
- 2 clientes
- 5 productos con stock inicial

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.

## 🏃 Ejecución

### Modo desarrollo

```bash
npm run start:dev
```

### Modo producción

```bash
npm run build
npm run start:prod
```

El servidor estará disponible en:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs

## 🚀 Despliegue a Producción

Este proyecto está listo para desplegarse en múltiples plataformas. **Consulta [DEPLOYMENT.md](./DEPLOYMENT.md)** para guías detalladas de:

- ✅ **Railway** (Recomendado - MySQL incluido)
- ✅ **Render** (Alternativa gratuita)
- ✅ **VPS con Docker** (Control total)
- ✅ **DigitalOcean / AWS / GCP**

### Quick Start - Railway

1. Conecta tu repositorio en [railway.app](https://railway.app)
2. Agrega una base de datos MySQL
3. Configura las variables de entorno
4. ¡Despliega automáticamente!

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones completas.

### Verificar despliegue

```bash
node check-health.js https://tu-url.com
```

## 📚 Documentación API

## License

Una vez iniciado el servidor, accede a la documentación interactiva en:

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

**http://localhost:3000/docs**

### Endpoints principales:

#### Autenticación
- `POST /auth/login` - Login con email y contraseña

#### Usuarios
- `GET /users` - Listar usuarios (paginado)
- `POST /users` - Crear usuario (ADMIN)
- `GET /users/:id` - Obtener usuario
- `PATCH /users/:id` - Actualizar usuario (ADMIN)
- `DELETE /users/:id` - Eliminar usuario (ADMIN)

#### Categorías
- `GET /categories` - Listar categorías
- `POST /categories` - Crear categoría (ADMIN/MANAGER)
- `GET /categories/:id` - Obtener categoría
- `PATCH /categories/:id` - Actualizar categoría (ADMIN/MANAGER)
- `DELETE /categories/:id` - Eliminar categoría (ADMIN)

#### Productos
- `GET /products` - Listar productos (con filtros)
  - `?categoryId=` - Filtrar por categoría
  - `?sku=` - Buscar por SKU
  - `?name=` - Buscar por nombre
  - `?minStockAlert=true` - Solo productos con stock bajo
- `POST /products` - Crear producto (ADMIN/MANAGER)
- `GET /products/:id` - Obtener producto con inventario
- `PATCH /products/:id` - Actualizar producto (ADMIN/MANAGER)
- `DELETE /products/:id` - Eliminar producto (ADMIN)

#### Inventario
- `GET /inventory/levels` - Obtener niveles de inventario
  - `?warehouseId=` - Filtrar por almacén
  - `?productId=` - Filtrar por producto
- `POST /inventory/adjust` - Ajuste manual de inventario (ADMIN/MANAGER)

#### Movimientos de Stock
- `POST /stock-movements/in` - Entrada de stock (ADMIN/MANAGER)
- `POST /stock-movements/out` - Salida de stock (ADMIN/MANAGER)
- `GET /stock-movements` - Historial de movimientos

#### Órdenes de Compra
- `POST /purchase-orders` - Crear orden (DRAFT)
- `GET /purchase-orders` - Listar órdenes
- `GET /purchase-orders/:id` - Obtener orden
- `POST /purchase-orders/:id/order` - Marcar como ORDERED
- `POST /purchase-orders/:id/receive` - Recibir mercancía

#### Órdenes de Venta
- `POST /sales-orders` - Crear orden (DRAFT)
- `GET /sales-orders` - Listar órdenes
- `GET /sales-orders/:id` - Obtener orden
- `POST /sales-orders/:id/confirm` - Confirmar orden
- `POST /sales-orders/:id/fulfill` - Cumplir orden (descuenta inventario)

#### Proveedores
- `GET /suppliers` - Listar proveedores
- `POST /suppliers` - Crear proveedor (ADMIN/MANAGER)
- CRUD completo

#### Clientes
- `GET /customers` - Listar clientes
- `POST /customers` - Crear cliente (ADMIN/MANAGER)
- CRUD completo

#### Almacenes
- `GET /warehouses` - Listar almacenes
- `POST /warehouses` - Crear almacén (ADMIN/MANAGER)
- CRUD completo

## 🔐 Autenticación

1. Obtén un token JWT haciendo login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{![alt text](image.png)
    "email": "admin@local",
    "password": "Admin123!"
  }'
```

2. Usa el token en las siguientes peticiones:

```bash
curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

En Swagger, haz clic en "Authorize" e introduce: `Bearer YOUR_TOKEN`

## 🎯 Roles y Permisos

- **ADMIN**: Acceso total (crear usuarios, eliminar productos, etc.)
- **MANAGER**: Gestión operativa (productos, inventario, órdenes)
- **CLERK**: Solo lectura en la mayoría de endpoints

## 🧪 Tests

### Tests unitarios
```bash
npm test
```

### Tests E2E
```bash
npm run test:e2e
```

### Cobertura
```bash
npm run test:cov
```

## 📊 Base de Datos

### Ver datos con Prisma Studio
```bash
npm run prisma:studio
```

Abre http://localhost:5555 en tu navegador

### Crear nueva migración
```bash
npx prisma migrate dev --name descripcion_del_cambio
```

### Resetear base de datos
```bash
npx prisma migrate reset
```

## 🔄 Flujos de Trabajo

### Flujo de Compra
1. Crear orden de compra (DRAFT)
2. Marcar como ORDERED
3. Recibir mercancía (genera movimientos IN y actualiza inventario)
4. Estado cambia a RECEIVED cuando se recibe todo

### Flujo de Venta
1. Crear orden de venta (DRAFT)
2. Confirmar orden (CONFIRMED)
3. Cumplir orden (genera movimientos OUT, descuenta inventario)
4. Estado cambia a FULFILLED

### Ajuste de Inventario
- Usa `/inventory/adjust` para correcciones manuales
- Genera un movimiento tipo ADJUST
- Requiere rol ADMIN o MANAGER

## 🏗️ Arquitectura

```
src/
├── auth/              # Autenticación JWT y guards
├── users/             # Gestión de usuarios
├── categories/        # Categorías de productos
├── suppliers/         # Proveedores
├── customers/         # Clientes
├── warehouses/        # Almacenes
├── products/          # Catálogo de productos
├── inventory/         # Niveles de inventario
├── stock-movements/   # Movimientos de stock
├── purchase-orders/   # Órdenes de compra
├── sales-orders/      # Órdenes de venta
├── prisma/            # Cliente Prisma (global)
├── common/            # DTOs, filters, decorators comunes
├── app.module.ts      # Módulo raíz
└── main.ts            # Bootstrap de la aplicación
```

## 📝 Notas de Implementación

- **Soft Delete**: Los registros eliminados tienen `deletedAt` != null y se filtran automáticamente
- **Transacciones**: Todos los movimientos de stock usan transacciones de Prisma
- **Validación**: Class-validator en todos los DTOs
- **Paginación**: Soportada en todos los endpoints de listado (`?page=1&limit=20`)
- **Ordenamiento**: `?sort=field:asc` o `?sort=field:desc`
- **Búsqueda**: `?search=term` busca en campos relevantes

## 🐛 Troubleshooting

### Error de conexión a MySQL
- Verifica que MySQL esté corriendo
- Comprueba las credenciales en `.env`
- Asegúrate de que la base de datos existe

### Errores de Prisma
```bash
npm run prisma:generate
```

### Puerto en uso
Cambia `PORT` en `.env` o mata el proceso:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

## 📄 Licencia

UNLICENSED - Uso interno

## 👥 Autor

Backend Senior Developer
