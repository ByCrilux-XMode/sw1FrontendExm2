# -------- ETAPA 1: BUILD --------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build


# -------- ETAPA 2: NGINX --------
FROM nginx:alpine

# Limpiar carpeta default
RUN rm -rf /usr/share/nginx/html/*

# ⚠️ Ajusta si NO usas /browser
COPY --from=build /app/dist/gestion-politicas-frontend/browser /usr/share/nginx/html

# Config nginx (puerto dinámico luego)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Entrypoint
COPY entrypoint.sh /entrypoint.sh

# Fix CRLF (IMPORTANTE en Windows)
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]