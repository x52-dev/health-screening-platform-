FROM node:20-slim

WORKDIR /app

# Install dependencies first to exploit Docker layer caching
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose Vite's default development server port
EXPOSE 5173

# Run Vite development server bound to host network interfaces
CMD ["npm", "run", "dev", "--", "--host"]