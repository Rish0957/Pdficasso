# Stage 1: Build Phase
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package files and install ALL dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm install

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript code (compiles to dist/)
RUN npm run build

# Stage 2: Production Phase
FROM node:20-alpine

WORKDIR /usr/src/app

# Only copy over the production package details and lockfile
COPY package*.json ./

# Install only production dependencies for smaller image size
RUN npm ci --only=production

# Copy the compiled output from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the API port
EXPOSE 3001

# The Node application uses the compiled index.js
CMD ["node", "dist/index.js"]
