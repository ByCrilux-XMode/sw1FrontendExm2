#!/bin/sh

# Directorio donde están los archivos compilados de Angular
ROOT_DIR=/usr/share/nginx/html

echo "Inyectando variables de entorno..."

# Reemplazar placeholders en todos los archivos .js generados
for file in $ROOT_DIR/*.js;
do
  sed -i "s|API_URL_PLACEHOLDER|$API_URL|g" $file
  sed -i "s|FIREBASE_API_KEY_PLACEHOLDER|$FIREBASE_API_KEY|g" $file
  sed -i "s|FIREBASE_AUTH_DOMAIN_PLACEHOLDER|$FIREBASE_AUTH_DOMAIN|g" $file
  sed -i "s|FIREBASE_PROJECT_ID_PLACEHOLDER|$FIREBASE_PROJECT_ID|g" $file
  sed -i "s|FIREBASE_STORAGE_BUCKET_PLACEHOLDER|$FIREBASE_STORAGE_BUCKET|g" $file
  sed -i "s|FIREBASE_SENDER_ID_PLACEHOLDER|$FIREBASE_MESSAGING_SENDER_ID|g" $file
  sed -i "s|FIREBASE_APP_ID_PLACEHOLDER|$FIREBASE_APP_ID|g" $file
  sed -i "s|FIREBASE_MEASUREMENT_ID_PLACEHOLDER|$FIREBASE_MEASUREMENT_ID|g" $file
done

# Iniciar Nginx
nginx -g 'daemon off;'