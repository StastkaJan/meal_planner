FROM node:26-alpine@sha256:ef24c5053d50fdc3e4e56eb4e7ddb7861874ab0fdc797046ba897581deb8e868 AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
RUN npx esbuild src/lib/database/migrate.ts --bundle --platform=node --format=esm --packages=external --outdir=scripts-dist

FROM node:26-alpine@sha256:ef24c5053d50fdc3e4e56eb4e7ddb7861874ab0fdc797046ba897581deb8e868
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
