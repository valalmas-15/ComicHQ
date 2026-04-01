FROM node:22-alpine

# Install alat kompilasi minimal (hanya saat build, lalu dihapus)
RUN apk add --no-cache python3 make g++ build-essential sqlite-dev

WORKDIR /app/server
COPY package*.json ./

# Install hanya dependencies produksi (tanpa devDeps agar RAM irit)
RUN npm install --production

COPY . .
EXPOSE 3000
CMD ["node", "index.js"]