# Etapa 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Angular reemplazará automáticamente los archivos según angular.json
RUN npm run build --configuration=production

# Etapa 2: Serve
FROM nginx:alpine
# Ajusta la ruta si tu carpeta dist es diferente (ej. sin /browser)
COPY --from=build /app/dist/gestion-politicas-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# Arrancamos Nginx directamente, sin intermediarios
CMD ["nginx", "-g", "daemon off;"]