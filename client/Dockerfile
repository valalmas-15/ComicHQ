FROM node:22-bookworm-slim

WORKDIR /app/client

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

# Tambahkan flag host dan port langsung di sini
CMD ["./node_modules/.bin/vite", "dev", "--host", "0.0.0.0", "--port", "3001", "--allowed-hosts", "all"]