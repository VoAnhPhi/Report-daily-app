FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile --ignore-scripts

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && yarn prisma:generate && yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema && node dist/main.js"]
