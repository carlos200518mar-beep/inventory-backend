import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  INestApplication,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  // Helper for cleaning up soft-deleted records (optional, for maintenance)
  async cleanSoftDeleted(model: string, daysOld = 30) {
    const date = new Date();
    date.setDate(date.getDate() - daysOld);

    // This would need to be implemented per-model
    // Just a placeholder for the concept
  }
}
