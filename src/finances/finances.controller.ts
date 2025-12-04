import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FinancesService } from './finances.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('finances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  // ==================== TRANSACTIONS ====================

  @Post('transactions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createTransaction(
    @CurrentUser('sub') userId: string,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.financesService.createTransaction(userId, createTransactionDto);
  }

  @Get('transactions')
  findAllTransactions(
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financesService.findAllTransactions({ type, categoryId, startDate, endDate });
  }

  @Get('transactions/:id')
  findOneTransaction(@Param('id') id: string) {
    return this.financesService.findOneTransaction(id);
  }

  @Delete('transactions/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteTransaction(@Param('id') id: string) {
    return this.financesService.deleteTransaction(id);
  }

  // ==================== FINANCIAL CATEGORIES ====================

  @Post('categories')
  @Roles(UserRole.ADMIN)
  createCategory(@Body() createCategoryDto: CreateFinancialCategoryDto) {
    return this.financesService.createCategory(createCategoryDto);
  }

  @Get('categories')
  findAllCategories(@Query('type') type?: string) {
    return this.financesService.findAllCategories(type);
  }

  // ==================== DASHBOARD & REPORTS ====================

  @Get('dashboard/stats')
  getDashboardStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financesService.getDashboardStats(startDate, endDate);
  }

  @Get('dashboard/monthly-comparison')
  getMonthlyComparison(@Query('months') months?: string) {
    const monthsNum = months ? parseInt(months, 10) : 6;
    return this.financesService.getMonthlyComparison(monthsNum);
  }
}
