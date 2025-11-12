import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Permitir parámetros extra sin error
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Inventory Management API')
    .setDescription('REST API for inventory management system with MySQL and Prisma')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'Login and JWT authentication')
    .addTag('Users', 'User management')
    .addTag('Categories', 'Product categories')
    .addTag('Suppliers', 'Supplier management')
    .addTag('Customers', 'Customer management')
    .addTag('Warehouses', 'Warehouse locations')
    .addTag('Products', 'Product catalog with inventory tracking')
    .addTag('Inventory', 'Inventory levels and adjustments')
    .addTag('Stock Movements', 'Stock IN/OUT operations')
    .addTag('Purchase Orders', 'Purchase orders and receiving')
    .addTag('Sales Orders', 'Sales orders and fulfillment')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
}
bootstrap();
