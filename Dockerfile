FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
RUN npx esbuild src/lib/database/seed.ts --bundle --platform=node --format=esm --packages=external --outfile=scripts-dist/seed.js

FROM node:22-alpine
WORKDIR /app
ARG RELEASE_ID=unknown
ENV RELEASE_ID=$RELEASE_ID
LABEL org.opencontainers.image.revision=$RELEASE_ID
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
