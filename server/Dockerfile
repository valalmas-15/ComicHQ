FROM node:22-bookworm-slim

WORKDIR /app/server

# Install alat minimal untuk kompilasi sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# PENTING: Hapus node_modules di dalam container dan install ulang
# Ini memastikan sqlite3 dikompilasi KHUSUS untuk laptopmu
RUN npm install && npm rebuild sqlite3 --build-from-source

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]