
# ==========================================
# BUILD STAGE
# ==========================================
FROM node:22-alpine AS build

WORKDIR /usr/src/app

# Dummy URL used only during Prisma Client generation.
# The actual database URL is injected at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/splitflow"

# Install dependencies using the lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma configuration and schema
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Copy backend source and configuration
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Compile NestJS
RUN npm run build


# ==========================================
# PRODUCTION STAGE
# ==========================================
FROM node:22-alpine AS production

ENV NODE_ENV=production
ENV TZ=Africa/Lagos

WORKDIR /usr/src/app

# OpenSSL support for Prisma
RUN apk add --no-cache openssl

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma schema and configuration
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Copy generated Prisma Client
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy compiled NestJS application
COPY --from=build /usr/src/app/dist ./dist

# Backend listens on port 4000
EXPOSE 4000

# Start NestJS
CMD ["node", "dist/src/main.js"]
