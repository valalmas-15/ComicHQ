# Stage 1: Builder (Dapur kompilasi)
FROM node:22-alpine AS builder

# Di Alpine, kita gunakan build-base dan sqlite-dev
RUN apk add --no-cache python3 make g++ build-base sqlite-dev

WORKDIR /app/server
COPY package*.json ./

# Build sqlite3 dari source agar cocok dengan arsitektur laptopmu
RUN npm install --build-from-source sqlite3

# Stage 2: Production (Hasil jadi yang enteng)
FROM node:22-alpine

WORKDIR /app/server

# Install library runtime saja (sangat kecil, hanya ~1MB)
RUN apk add --no-cache sqlite-libs

# Ambil node_modules yang sudah jadi dari builder
COPY --from=builder /app/server/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]