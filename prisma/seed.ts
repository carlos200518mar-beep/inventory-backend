import { PrismaClient, UserRole, ProductUnit } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@local' },
    update: {},
    create: {
      email: 'admin@local',
      passwordHash: adminPasswordHash,
      fullName: 'System Administrator',
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create manager user
  const managerPasswordHash = await bcrypt.hash('Manager123!', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@local' },
    update: {},
    create: {
      email: 'manager@local',
      passwordHash: managerPasswordHash,
      fullName: 'Warehouse Manager',
      role: UserRole.MANAGER,
    },
  });
  console.log('✅ Manager user created:', manager.email);

  // Create categories
  const electronics = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: {
      name: 'Electronics',
      description: 'Electronic devices and accessories',
    },
  });

  const furniture = await prisma.category.upsert({
    where: { name: 'Furniture' },
    update: {},
    create: {
      name: 'Furniture',
      description: 'Office and home furniture',
    },
  });

  const office = await prisma.category.upsert({
    where: { name: 'Office Supplies' },
    update: {},
    create: {
      name: 'Office Supplies',
      description: 'General office supplies',
    },
  });

  console.log('✅ Categories created');

  // Create warehouse
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { name: 'Main Warehouse' },
    update: {},
    create: {
      name: 'Main Warehouse',
      location: '123 Industrial Blvd, City, State 12345',
    },
  });
  console.log('✅ Warehouse created:', mainWarehouse.name);

  // Create suppliers
  const techSupplier = await prisma.supplier.create({
    data: {
      name: 'TechWorld Supplies',
      contactName: 'John Smith',
      email: 'contact@techworld.com',
      phone: '+1-555-0100',
      address: '456 Tech Street, Silicon Valley, CA',
    },
  });

  const furnitureSupplier = await prisma.supplier.create({
    data: {
      name: 'Modern Furniture Co',
      contactName: 'Jane Doe',
      email: 'sales@modernfurniture.com',
      phone: '+1-555-0200',
      address: '789 Furniture Ave, Design City, NY',
    },
  });

  console.log('✅ Suppliers created');

  // Create customers
  await prisma.customer.create({
    data: {
      name: 'ABC Corporation',
      email: 'orders@abccorp.com',
      phone: '+1-555-1000',
      address: '100 Business Park, Enterprise City, TX',
    },
  });

  await prisma.customer.create({
    data: {
      name: 'XYZ Retail Store',
      email: 'purchasing@xyzretail.com',
      phone: '+1-555-2000',
      address: '200 Shopping Center, Retail Town, FL',
    },
  });

  console.log('✅ Customers created');

  // Create products
  const laptop = await prisma.product.create({
    data: {
      sku: 'LAPTOP-001',
      name: 'Professional Laptop 15"',
      description: 'High-performance laptop for professionals',
      categoryId: electronics.id,
      unit: ProductUnit.EA,
      minStock: 10,
      barcode: '1234567890123',
    },
  });

  const mouse = await prisma.product.create({
    data: {
      sku: 'MOUSE-001',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      categoryId: electronics.id,
      unit: ProductUnit.EA,
      minStock: 50,
      barcode: '1234567890124',
    },
  });

  const desk = await prisma.product.create({
    data: {
      sku: 'DESK-001',
      name: 'Office Desk Standing',
      description: 'Adjustable standing desk',
      categoryId: furniture.id,
      unit: ProductUnit.EA,
      minStock: 5,
    },
  });

  const chair = await prisma.product.create({
    data: {
      sku: 'CHAIR-001',
      name: 'Ergonomic Office Chair',
      description: 'Comfortable office chair with lumbar support',
      categoryId: furniture.id,
      unit: ProductUnit.EA,
      minStock: 15,
    },
  });

  const notebook = await prisma.product.create({
    data: {
      sku: 'NOTE-001',
      name: 'Spiral Notebook A4',
      description: 'College-ruled spiral notebook',
      categoryId: office.id,
      unit: ProductUnit.EA,
      minStock: 100,
      barcode: '1234567890125',
    },
  });

  console.log('✅ Products created');

  // Create initial inventory levels
  await prisma.inventoryLevel.createMany({
    data: [
      { productId: laptop.id, warehouseId: mainWarehouse.id, quantity: 25 },
      { productId: mouse.id, warehouseId: mainWarehouse.id, quantity: 150 },
      { productId: desk.id, warehouseId: mainWarehouse.id, quantity: 20 },
      { productId: chair.id, warehouseId: mainWarehouse.id, quantity: 45 },
      { productId: notebook.id, warehouseId: mainWarehouse.id, quantity: 500 },
    ],
  });

  console.log('✅ Initial inventory levels created');

  console.log('');
  console.log('🎉 Seeding completed successfully!');
  console.log('');
  console.log('📝 Test Credentials:');
  console.log('   Admin - Email: admin@local, Password: Admin123!');
  console.log('   Manager - Email: manager@local, Password: Manager123!');

  // Create Financial Categories
  const salesCategory = await prisma.financialCategory.upsert({
    where: { name: 'Sales Revenue' },
    update: {},
    create: {
      name: 'Sales Revenue',
      type: 'INCOME',
      color: '#10B981',
      icon: '💰',
    },
  });

  const purchasesCategory = await prisma.financialCategory.upsert({
    where: { name: 'Inventory Purchases' },
    update: {},
    create: {
      name: 'Inventory Purchases',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: '📦',
    },
  });

  await prisma.financialCategory.upsert({
    where: { name: 'Utilities' },
    update: {},
    create: {
      name: 'Utilities',
      type: 'EXPENSE',
      color: '#F59E0B',
      icon: '⚡',
    },
  });

  await prisma.financialCategory.upsert({
    where: { name: 'Rent' },
    update: {},
    create: {
      name: 'Rent',
      type: 'EXPENSE',
      color: '#8B5CF6',
      icon: '🏢',
    },
  });

  await prisma.financialCategory.upsert({
    where: { name: 'Salaries' },
    update: {},
    create: {
      name: 'Salaries',
      type: 'EXPENSE',
      color: '#EC4899',
      icon: '👥',
    },
  });

  await prisma.financialCategory.upsert({
    where: { name: 'Other Income' },
    update: {},
    create: {
      name: 'Other Income',
      type: 'INCOME',
      color: '#06B6D4',
      icon: '➕',
    },
  });

  console.log('✅ Financial categories created');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
