FROM node:26-alpine@sha256:aadf416b2cdce311a8811ba3f0608a61b77dbf997500e2eafe781b51f6a0b019 AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
RUN npx esbuild src/lib/database/migrate.ts --bundle --platform=node --format=esm --packages=external --outdir=scripts-dist

FROM node:26-alpine@sha256:aadf416b2cdce311a8811ba3f0608a61b77dbf997500e2eafe781b51f6a0b019
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
