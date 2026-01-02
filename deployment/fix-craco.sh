#!/bin/bash

# Script para agregar el archivo craco.config.js faltante

echo "Creando archivo craco.config.js..."

cd /var/www/inventario/frontend

cat > craco.config.js << 'EOF'
module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Configuración adicional de webpack si es necesaria
      return webpackConfig;
    },
  },
};
EOF

echo "✅ Archivo craco.config.js creado exitosamente"
echo ""
echo "Ahora ejecute:"
echo "yarn build"
