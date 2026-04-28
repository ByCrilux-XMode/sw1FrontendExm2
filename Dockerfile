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
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# Copiamos los archivos de Angular (Asegúrate de la ruta /browser)
COPY --from=build /app/dist/gestion-politicas-frontend/browser .

# Preparamos el script de entrada e inyección
COPY entrypoint.sh /entrypoint.sh
# FIX para Windows: Convertir CRLF a LF y dar permisos
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]