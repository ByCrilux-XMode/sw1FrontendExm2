# Etapa 1: Construcción
FROM node:20-alpine AS build
WORKDIR /app

# Instalación limpia
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiamos el resto del código
COPY . .

# Ejecutamos el build con más memoria y sin flags innecesarios
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Etapa 2: Servidor
FROM nginx:alpine
# IMPORTANTE: Verifica que en tu PC la carpeta se llame exactamente así después de hacer un build local
COPY --from=build /app/dist/gestion-politicas-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]