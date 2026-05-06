# build client stage
FROM node:18-bullseye-slim AS builder
WORKDIR /app

# install all dependencies
COPY package*.json ./
RUN npm ci --silent

# copy source code
COPY . .

# build the Vite React client (outputs to /app/dist-client)
RUN npm run client:build

# build runtime stage
FROM node:18-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# install production dependencies
COPY package*.json ./
RUN npm ci --production --silent

# copy server source
COPY server ./server

# copy built client into a `public` folder at repo root so server/static path works
COPY --from=builder /app/dist-client ./public

# expose server port
EXPOSE 8080

# start application
CMD ["node", "server/index.js"]
