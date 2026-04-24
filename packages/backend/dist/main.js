"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_js_1 = require("./app.module.js");
const prisma_service_js_1 = require("./prisma.service.js");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule);
    app.enableCors();
    app.setGlobalPrefix('api');
    const prisma = app.get(prisma_service_js_1.PrismaService);
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
//# sourceMappingURL=main.js.map