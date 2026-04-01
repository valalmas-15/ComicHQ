FROM node:22-alpine

WORKDIR /app/client
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3001
CMD ["./node_modules/.bin/vite", "dev", "--host", "0.0.0.0", "--port", "3001"]