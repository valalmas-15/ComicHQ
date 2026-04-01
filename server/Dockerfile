FROM node:22-bookworm

WORKDIR /app/server

# Install tools kompilasi (Wajib untuk SQLite)
RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Hapus lockfile dan install dari nol di dalam container
RUN rm -f package-lock.json
RUN npm install --build-from-source sqlite3
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]