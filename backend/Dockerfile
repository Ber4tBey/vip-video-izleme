FROM node:20-alpine

WORKDIR /app

# Install build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Create upload + db directories
RUN mkdir -p uploads/videos uploads/images db

EXPOSE 3001
CMD ["node", "server.js"]
