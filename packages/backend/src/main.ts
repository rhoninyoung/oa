import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PrismaService } from './prisma.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');

  const prisma = app.get(PrismaService);
  const counts = {
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
  };
  console.log('[oa-mvp] DB ready:', counts);
  if (counts.projects === 0) {
    console.warn('[oa-mvp] WARN: 0 projects — did you run `pnpm seed`?');
  }

  await app.listen(3000);
  console.log('Backend running on http://localhost:3000');
}
void bootstrap();
