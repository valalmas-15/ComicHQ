# Stage 1: Siapkan "Dapur" (Kompilasi)
FROM node:22-alpine AS builder

# Di Alpine, kita pakai build-base, bukan build-essential
RUN apk add --no-cache python3 make g++ build-base sqlite-dev

WORKDIR /app/server
COPY package*.json ./

# Install semua termasuk sqlite3 dari source agar cocok dengan CPU Acer
RUN npm install --build-from-source sqlite3

# Stage 2: Hasil Jadi (Hanya ambil yang penting)
FROM node:22-alpine

WORKDIR /app/server

# Kita butuh library runtime sqlite saja, sangat kecil
RUN apk add --no-cache libsqlite3-dev

# Ambil hasil masak dari Stage 1
COPY --from=builder /app/server/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]