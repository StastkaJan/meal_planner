# syntax=docker/dockerfile:1.10
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN,required=false \
    SENTRY_ORG="$SENTRY_ORG" SENTRY_PROJECT="$SENTRY_PROJECT" SENTRY_RELEASE="$SENTRY_RELEASE" npm run build
RUN npx esbuild src/lib/database/seed.ts --bundle --platform=node --format=esm --packages=external --outfile=scripts-dist/seed.js

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/build .
COPY --from=build /app/package*.json .
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts .
COPY --from=build /app/scripts-dist/seed.js ./scripts-dist/seed.js
COPY --from=build /app/entrypoint.sh .
RUN npm ci --omit=dev && npm install drizzle-kit
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh
EXPOSE 3000
CMD ["./entrypoint.sh"]
