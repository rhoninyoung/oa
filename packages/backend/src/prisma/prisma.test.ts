import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('PrismaClient', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should initialize without throwing', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow();
  });

  it('should have binary engine type configured in schema', () => {
    const schemaPath = join(__dirname, '../../prisma/schema.prisma');
    const schema = readFileSync(schemaPath, 'utf-8');
    expect(schema).toMatch(/engineType\s*=\s*"binary"/);
  });

  it('should execute a findMany query on Task model', async () => {
    const tasks = await prisma.task.findMany({ take: 1 });
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('should execute a findMany query on User model', async () => {
    const users = await prisma.user.findMany({ take: 1 });
    expect(Array.isArray(users)).toBe(true);
  });
});
