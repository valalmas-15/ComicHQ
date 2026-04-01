FROM node:22-bookworm-slim

WORKDIR /app/server

# Install library pendukung sqlite (ringan)
RUN apt-get update && apt-get install -y \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Hapus lockfile agar npm cari versi yang paling pas untuk linux
RUN rm -f package-lock.json

# Install dependencies (NPM akan otomatis pilih binary yang cocok)
RUN npm install --production

# Salin semua file project
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]