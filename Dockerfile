FROM node:26-alpine@sha256:2d984a15c9b54fd0aeb608b8e0d0d83529eb34d2966db27a1fb4f1edc3d298a3 AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
RUN npx esbuild src/lib/database/migrate.ts --bundle --platform=node --format=esm --packages=external --outdir=scripts-dist

FROM node:26-alpine@sha256:2d984a15c9b54fd0aeb608b8e0d0d83529eb34d2966db27a1fb4f1edc3d298a3
RUN apk upgrade --no-cache libcrypto3 libssl3
WORKDIR /app
COPY --from=build /app/build .
COPY --from=build /app/package*.json .
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts-dist ./scripts-dist
RUN npm ci --omit=dev --ignore-scripts \
    && rm package-lock.json \
    && rm -rf /root/.npm /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx
EXPOSE 3000
CMD ["node", "index.js"]
