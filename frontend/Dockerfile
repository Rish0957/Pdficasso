# Stage 1: Build React/Vite App
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Receive API URL from build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# The NGINX default configuration will serve static files from /usr/share/nginx/html on port 80
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
