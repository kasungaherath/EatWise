FROM node:24-bookworm-slim AS frontend
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
COPY server/src/services/ /app/server/src/services/
COPY server/database/deployment_catalogue.json server/database/twenty_more_foods.json /app/server/database/
ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=frontend /app/client/dist /app/client/dist
USER node
CMD ["npm", "start"]
