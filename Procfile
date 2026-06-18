release: pnpm --filter @helios/api exec prisma migrate deploy && pnpm --filter @helios/api exec tsx prisma/seed.ts
web: node apps/api/dist/main.js
