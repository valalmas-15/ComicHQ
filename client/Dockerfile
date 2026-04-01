FROM node:22-bookworm-slim

WORKDIR /app/client

COPY package*.json ./

RUN rm -f package-lock.json
RUN npm install

COPY . .

EXPOSE 3001

# Jalankan vite langsung dari bin agar pasti ketemu
CMD ["./node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "3001"]