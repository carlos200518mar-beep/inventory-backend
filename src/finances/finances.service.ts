import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinancesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== TRANSACTIONS ====================

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        type: dto.type as any,
        categoryId: dto.categoryId,
        amount: new Prisma.Decimal(dto.amount),
        description: dto.description,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
        reference: dto.reference,
        salesOrderId: dto.salesOrderId,
        purchaseOrderId: dto.purchaseOrderId,
        createdBy: userId,
      },
      include: {
        category: true,
      },
    });
  }

  async findAllTransactions(filters?: {
    type?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {
      deletedAt: null,
    };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.transactionDate = {};
      if (filters.startDate) {
        where.transactionDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.transactionDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });
  }

  async findOneTransaction(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!transaction || transaction.deletedAt) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async deleteTransaction(id: string) {
    await this.findOneTransaction(id);
    return this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== FINANCIAL CATEGORIES ====================

  async createCategory(dto: CreateFinancialCategoryDto) {
    return this.prisma.financialCategory.create({
      data: {
        name: dto.name,
        type: dto.type as any,
        color: dto.color || '#6B7280',
        icon: dto.icon,
      },
    });
  }

  async findAllCategories(type?: string) {
    const where: any = {
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    return this.prisma.financialCategory.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });
  }

  // ==================== DASHBOARD STATS ====================

  async getDashboardStats(startDate?: string, endDate?: string) {
    const where: any = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate);
      }
    }

    // Calcular ingresos totales
    const incomeResult = await this.prisma.transaction.aggregate({
      where: {
        ...where,
        type: 'INCOME',
      },
      _sum: {
        amount: true,
      },
    });

    // Calcular egresos totales
    const expenseResult = await this.prisma.transaction.aggregate({
      where: {
        ...where,
        type: 'EXPENSE',
      },
      _sum: {
        amount: true,
      },
    });

    const totalIncome = incomeResult._sum.amount || new Prisma.Decimal(0);
    const totalExpense = expenseResult._sum.amount || new Prisma.Decimal(0);
    const netProfit = totalIncome.minus(totalExpense);
    const profitMargin = totalIncome.toNumber() > 0 
      ? (netProfit.toNumber() / totalIncome.toNumber()) * 100 
      : 0;

    // Obtener transacciones por categoría
    const transactionsByCategory = await this.prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where,
      _sum: {
        amount: true,
      },
    });

    // Obtener categorías para enriquecer los datos
    const categories = await this.prisma.financialCategory.findMany({
      where: { deletedAt: null },
    });

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const enrichedCategories = transactionsByCategory.map(item => ({
      categoryId: item.categoryId,
      categoryName: categoryMap.get(item.categoryId)?.name || 'Unknown',
      type: item.type,
      total: item._sum.amount,
    }));

    return {
      totalIncome: totalIncome.toNumber(),
      totalExpense: totalExpense.toNumber(),
      netProfit: netProfit.toNumber(),
      profitMargin: Math.round(profitMargin * 100) / 100,
      transactionsByCategory: enrichedCategories,
    };
  }

  // ==================== MONTHLY COMPARISON ====================

  async getMonthlyComparison(months: number = 6) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    // Agrupar por mes
    const monthlyData = new Map<string, { income: number; expense: number }>();

    transactions.forEach(t => {
      const date = new Date(t.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(key)) {
        monthlyData.set(key, { income: 0, expense: 0 });
      }

      const data = monthlyData.get(key)!;
      if (t.type === 'INCOME') {
        data.income += t.amount.toNumber();
      } else {
        data.expense += t.amount.toNumber();
      }
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      profit: data.income - data.expense,
    }));
  }
}
