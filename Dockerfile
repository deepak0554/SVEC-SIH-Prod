FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data
COPY --from=build /app/public ./public

# Ensure uploads subdirectories exist for server-side persistence
RUN mkdir -p /app/data/uploads/ppts /app/data/uploads/images /app/data/uploads/documents /app/data/uploads/sample_ppts

# Declare persistent data volume so container redeployments retain all data, PPTs, and images
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["npm", "start"]
