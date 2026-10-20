# ---------- Stage 1: build the app ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies first, so Docker can reuse this layer when only code changes
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the code, generate the Prisma client, build Next.js
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Stage 2: the image that actually runs ----------
FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.mjs ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma
# The Reset & Seed DB button reads these SQL files at runtime
COPY --from=build /app/database ./database

EXPOSE 3000
CMD ["npm", "start"]