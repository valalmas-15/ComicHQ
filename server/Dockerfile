FROM node:22-bookworm-slim

# Install alat bantu build
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# Copy package files
COPY package*.json ./

# Hapus lock file lama agar install ulang dengan versi yang benar
RUN rm -f package-lock.json

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]