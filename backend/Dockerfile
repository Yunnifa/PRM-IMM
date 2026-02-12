# Build stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use --omit=dev instead of --only=production)
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application files
COPY . .

# Expose port (Railway will override this)
EXPOSE 3000

# Start command
CMD ["npm", "run", "start"]
