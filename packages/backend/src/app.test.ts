import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module.js';
import { PrismaService } from './prisma.service.js';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should bootstrap the application', async () => {
    expect(module).toBeDefined();
  });

  it('should provide PrismaService as injectable', async () => {
    const prismaService = module.get<PrismaService>(PrismaService);
    expect(prismaService).toBeInstanceOf(PrismaService);
  });

  it('should connect to the database on init', async () => {
    const prismaService = module.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();
    // PrismaClient has no $isConnected; verify $connect resolves without error
    await expect(prismaService.$connect()).resolves.toBeUndefined();
  });
});
