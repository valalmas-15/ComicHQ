# Build stage: Use Node.js to build the Solid.js application
FROM node:18-alpine as builder

WORKDIR /app/client

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Solid.js application (assuming 'npm run build' outputs to 'dist')
RUN npm run build

# Serve stage: Use Nginx to serve the static files
FROM nginx:alpine

# Copy the built files from the builder stage to Nginx's public directory
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Expose port 80 (default HTTP port)
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]