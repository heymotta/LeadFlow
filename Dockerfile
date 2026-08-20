# ─── Stage 1: Build Frontend ───────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Build Backend ───────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma/ ./prisma/
ENV DATABASE_URL=file:./data/leadflowz.db
RUN npx prisma generate
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# ─── Stage 3: Runtime ─────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema + generated client
COPY prisma/ ./prisma/
COPY --from=backend-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled backend
COPY --from=backend-build /app/dist ./dist

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment defaults
ENV PORT=3000
ENV DATABASE_URL=file:./data/leadflowz.db
EXPOSE 3000

# Push schema to SQLite database then start
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
