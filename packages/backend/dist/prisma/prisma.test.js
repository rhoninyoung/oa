"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = require("path");
describe('PrismaClient', () => {
    let prisma;
    beforeAll(() => {
        prisma = new client_1.PrismaClient();
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    it('should initialize without throwing', async () => {
        await expect(prisma.$connect()).resolves.not.toThrow();
    });
    it('should have binary engine type configured in schema', () => {
        const schemaPath = (0, path_1.join)(__dirname, '../../prisma/schema.prisma');
        const schema = (0, fs_1.readFileSync)(schemaPath, 'utf-8');
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
//# sourceMappingURL=prisma.test.js.map