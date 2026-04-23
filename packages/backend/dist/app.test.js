"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_js_1 = require("./app.module.js");
const prisma_service_js_1 = require("./prisma.service.js");
describe('AppModule', () => {
    let module;
    beforeEach(async () => {
        module = await testing_1.Test.createTestingModule({
            imports: [app_module_js_1.AppModule],
        }).compile();
    });
    afterEach(async () => {
        await module.close();
    });
    it('should bootstrap the application', async () => {
        expect(module).toBeDefined();
    });
    it('should provide PrismaService as injectable', async () => {
        const prismaService = module.get(prisma_service_js_1.PrismaService);
        expect(prismaService).toBeInstanceOf(prisma_service_js_1.PrismaService);
    });
    it('should connect to the database on init', async () => {
        const prismaService = module.get(prisma_service_js_1.PrismaService);
        await prismaService.onModuleInit();
        const isConnected = prismaService.$isConnected;
        expect(isConnected).toBe(true);
    });
});
//# sourceMappingURL=app.test.js.map