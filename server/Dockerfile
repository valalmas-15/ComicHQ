FROM node:22-bookworm-slim

WORKDIR /app/server

# Kita hanya install library minimal yang dibutuhkan sqlite3 untuk jalan (runtime saja)
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install biasa (tanpa build-from-source) agar cepat dan irit RAM
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]