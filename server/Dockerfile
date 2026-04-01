FROM node:22-bookworm-slim

WORKDIR /app/server

# Install library pendukung runtime (sangat ringan)
RUN apt-get update && apt-get install -y \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Hapus lockfile agar npm mencari binary yang cocok dengan Linux Debian
RUN rm -f package-lock.json

# Install standar (npm akan otomatis cari binary 'sharp' dan 'sqlite' yang cocok)
RUN npm install --production

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]