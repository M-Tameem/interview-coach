# ---- Build stage: compile the React client ----
FROM node:18-alpine AS build

WORKDIR /app

# Install server dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Install and build the React client
COPY client/package*.json ./client/
RUN cd client && npm install --legacy-peer-deps

COPY client/ ./client/
RUN cd client && npm run build

# ---- Production stage ----
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production server dependencies
COPY package*.json ./
RUN npm install --production

# Copy server source and built client
COPY server/ ./server/
COPY --from=build /app/client/build ./client/build

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server/server.js"]
