# Gunakan Bullseye karena library GLIBC-nya lebih ramah sistem lama
FROM node:22-bullseye-slim

WORKDIR /app/server

# Install sqlite3-dev agar npm bisa compile yang pas buat CPU kamu
RUN apt-get update && apt-get install -y \
    python3 make g++ libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Paksa install ulang di dalam container
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]