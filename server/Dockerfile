FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 22 secara minimal
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get purge -y curl && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server
COPY package*.json ./
RUN rm -f package-lock.json
RUN npm install --production
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]