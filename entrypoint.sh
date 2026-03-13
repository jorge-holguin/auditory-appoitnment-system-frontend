#!/bin/sh

# Reemplaza las variables placeholders (VITE_API_...) en los archivos JS generados por Vite
# con los valores reales del contenedor leídos en tiempo de ejecución

echo "⏳ Inyectando variables de entorno en los archivos estáticos..."

# Buscar los archivos JS en la carpeta assets de Nginx
for file in /usr/share/nginx/html/assets/*.js; do
  if [ -f "$file" ]; then
    # Usar sed para reemplazar los placeholders por los valores reales de entorno
    sed -i "s|VITE_API_INTEROP_URL_PLACEHOLDER|${VITE_API_INTEROP_URL}|g" $file
    sed -i "s|VITE_AUTH_API_URL_PLACEHOLDER|${VITE_AUTH_API_URL}|g" $file
    sed -i "s|VITE_API_CITAS_URL_PLACEHOLDER|${VITE_API_CITAS_URL}|g" $file
  fi
done

echo "✅ Variables inyectadas. Iniciando Nginx..."

# Iniciar Nginx
exec "$@"
