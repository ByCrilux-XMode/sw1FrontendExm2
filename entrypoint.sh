#!/bin/sh

ROOT_DIR=/usr/share/nginx/html

echo "Inyectando variables de entorno..."

# Debug (opcional pero útil)
echo "Contenido de $ROOT_DIR:"
ls -la $ROOT_DIR

# Reemplazo seguro en archivos JS
for file in $ROOT_DIR/*.js; do
  [ -f "$file" ] || continue
  echo "Procesando $file"

  sed -i "s|API_URL_PLACEHOLDER|$API_URL|g" "$file"
  sed -i "s|FIREBASE_API_KEY_PLACEHOLDER|$FIREBASE_API_KEY|g" "$file"
  sed -i "s|FIREBASE_AUTH_DOMAIN_PLACEHOLDER|$FIREBASE_AUTH_DOMAIN|g" "$file"
  sed -i "s|FIREBASE_PROJECT_ID_PLACEHOLDER|$FIREBASE_PROJECT_ID|g" "$file"
  sed -i "s|FIREBASE_STORAGE_BUCKET_PLACEHOLDER|$FIREBASE_STORAGE_BUCKET|g" "$file"
  sed -i "s|FIREBASE_SENDER_ID_PLACEHOLDER|$FIREBASE_MESSAGING_SENDER_ID|g" "$file"
  sed -i "s|FIREBASE_APP_ID_PLACEHOLDER|$FIREBASE_APP_ID|g" "$file"
  sed -i "s|FIREBASE_MEASUREMENT_ID_PLACEHOLDER|$FIREBASE_MEASUREMENT_ID|g" "$file"
done

# 🔥 IMPORTANTE: usar puerto dinámico de Cloud Run
echo "Configurando puerto dinámico: $PORT"
sed -i "s/listen 8080;/listen ${PORT};/" /etc/nginx/conf.d/default.conf

echo "Iniciando Nginx..."
nginx -g "daemon off;"