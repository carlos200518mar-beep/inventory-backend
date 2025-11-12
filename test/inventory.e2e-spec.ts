import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Inventory System E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testProductId: string;
  let testWarehouseId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('/auth/login (POST) - should login successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@local',
          password: 'Admin123!',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe('admin@local');
      authToken = response.body.accessToken;
    });

    it('/auth/login (POST) - should fail with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@local',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Categories', () => {
    it('/categories (POST) - should create category', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Category E2E',
          description: 'Test description',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Test Category E2E');
      testCategoryId = response.body.data.id;
    });

    it('/categories (GET) - should get all categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
    });
  });

  describe('Warehouses', () => {
    it('/warehouses (POST) - should create warehouse', async () => {
      const response = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Warehouse E2E',
          location: 'Test Location',
        })
        .expect(201);

      expect(response.body.data.name).toBe('Test Warehouse E2E');
      testWarehouseId = response.body.data.id;
    });
  });

  describe('Products', () => {
    it('/products (POST) - should create product', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: 'TEST-E2E-001',
          name: 'Test Product E2E',
          description: 'Test product for E2E testing',
          categoryId: testCategoryId,
          unit: 'EA',
          minStock: 10,
        })
        .expect(201);

      expect(response.body.data.sku).toBe('TEST-E2E-001');
      testProductId = response.body.data.id;
    });

    it('/products (GET) - should get all products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Stock Movements', () => {
    it('/stock-movements/in (POST) - should add stock', async () => {
      const response = await request(app.getHttpServer())
        .post('/stock-movements/in')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          warehouseId: testWarehouseId,
          quantity: 50,
          reason: 'Initial stock',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('IN');
    });

    it('/stock-movements/out (POST) - should remove stock', async () => {
      const response = await request(app.getHttpServer())
        .post('/stock-movements/out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          warehouseId: testWarehouseId,
          quantity: 10,
          reason: 'Test sale',
        })
        .expect(201);

      expect(response.body.data.type).toBe('OUT');
    });

    it('/stock-movements/out (POST) - should fail with insufficient stock', async () => {
      await request(app.getHttpServer())
        .post('/stock-movements/out')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProductId,
          warehouseId: testWarehouseId,
          quantity: 1000,
          reason: 'Should fail',
        })
        .expect(400);
    });
  });

  describe('Inventory', () => {
    it('/inventory/levels (GET) - should get inventory levels', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/levels')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ productId: testProductId })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 0) {
        expect(response.body.data[0].productId).toBe(testProductId);
      }
    });
  });
});
