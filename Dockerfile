# Step 1: Build Phase
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for optimal docker cache layers
COPY package*.json ./

# Install all dependencies (including build devDependencies like typescript, esbuild, vite)
RUN npm install

# Copy rest of the application files
COPY . .

# Build the frontend (Vite) and the backend (esbuild)
RUN npm run build

# Step 2: Runtime Phase
FROM node:20-alpine
WORKDIR /app

# Copy package files for installing runtime-only dependencies
COPY package*.json ./

# Install only production dependencies (keeps the final image light and highly secure)
RUN npm install --omit=dev

# Copy compiled frontend build and bundled server from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port 8080 (Default for Google Cloud Run)
EXPOSE 8080

# Configure production environment settings
ENV PORT=8080
ENV NODE_ENV=production

# Start the production Express/WebSocket server
CMD ["node", "dist/server.cjs"]
