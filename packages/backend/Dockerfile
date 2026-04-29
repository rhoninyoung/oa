FROM node:22

WORKDIR /app

# Install pnpm globally via npm
RUN npm install -g pnpm@10

# Copy root package files first
COPY package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

# Install all workspace dependencies (allow scripts for proper binary linking)
RUN pnpm install

# Copy rest of source
COPY . .

# Generate Prisma client
RUN pnpm --filter @oa-mvp/backend exec prisma generate

# Build shared first (for runtime imports)
RUN pnpm --filter @oa-mvp/shared run build

# Build backend TypeScript
RUN pnpm --filter @oa-mvp/backend run build

EXPOSE 3000

# Run Prisma seed before starting the server
CMD ["sh", "-c", "pnpm --filter @oa-mvp/backend exec tsx prisma/seed.ts && node packages/backend/dist/src/main.js"]
