FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/build .
COPY --from=build /app/package*.json .
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts .
COPY --from=build /app/src/lib/seed.ts ./src/lib/seed.ts
COPY --from=build /app/src/lib/schema.ts ./src/lib/schema.ts
COPY --from=build /app/entrypoint.sh .
RUN npm ci --omit=dev && npm install drizzle-kit tsx
RUN chmod +x entrypoint.sh
EXPOSE 3000
CMD ["./entrypoint.sh"]
