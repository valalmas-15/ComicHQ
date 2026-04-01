# Kita pakai Ubuntu 24.04 asli sebagai basis
FROM ubuntu:24.04

# Set environment agar instalasi tidak bertanya (non-interactive)
ENV DEBIAN_FRONTEND=noninteractive

# 1. Install Node.js 22 secara minimal
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get purge -y curl && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# 2. Copy package files
COPY package*.json ./

# 3. Install dependencies (Tanpa build tools berat agar RAM irit)
# NPM akan otomatis ambil binary yang cocok dengan Ubuntu Noble
RUN npm install --production

# 4. Copy sisa file project
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]