# Kita pakai Noble karena dia punya GLIBC yang diminta SQLite-mu
FROM node:22-noble-slim

WORKDIR /app/server

# Salin package.json saja dulu
COPY package*.json ./

# Hapus lockfile agar NPM mencari binary yang COCOK dengan container ini
RUN rm -f package-lock.json

# Install standar (NPM akan mendownload binary 'pre-built' yang sudah jadi)
# Ini sangat ringan karena tidak ada proses "make" atau "g++"
RUN npm install --production

# Salin semua file project
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]