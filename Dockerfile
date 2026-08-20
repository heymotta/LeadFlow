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

# Expose port
ENV PORT=3000
EXPOSE 3000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
