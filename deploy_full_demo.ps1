$ErrorActionPreference = "Stop"

$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"
$RemoteDir = "/var/www/colegio-react"
$LocalDir = "c:\Users\Telqway\Desktop\colegio-react"
$DbPass = "H4lcon$9.2024"

function Run-Remote ($ScriptBlock) {
    $ScriptUnix = $ScriptBlock -replace "`r`n", "`n"
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes($ScriptUnix)
    $Base64 = [System.Convert]::ToBase64String($Bytes)
    # Ejecutar en bash decodificando
    ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP "echo '$Base64' | base64 -d | bash"
}

Write-Host "Iniciando despliegue FULL DEMO (Backend + Frontend + Datos) en $ServerIP..." -ForegroundColor Cyan

# 1. Empaquetar y subir
Write-Host "1. Subiendo código..."
$TempTar = "$env:TEMP\project_full.tar.gz"
if (Test-Path $TempTar) { Remove-Item $TempTar }
cd $LocalDir
# Subimos todo excepto node_modules/git/leves
tar -czf "$TempTar" --exclude=node_modules --exclude=.git --exclude=.ssh_keys --exclude=dist .
scp -P $Port -i $Key "$TempTar" "$User@${ServerIP}:/tmp/project_full.tar.gz"
Remove-Item $TempTar

# 2. Script remoto masivo
Write-Host "2. Configurando servidor, backend y base de datos..."
$RemoteScript = @"
#!/bin/bash
set -e

# Limpiar directorio pero asegurar permisos
mkdir -p $RemoteDir
# NO BORRAR TODO EL CONTENIDO PREVIO (Para mantener node_modules)
# Pero si no borramos, puede haber basura. Asumimos riesgo calculado.
# rm -rf $RemoteDir/*

# Descomprimir (sobreescribiendo archivos)
tar -xzf /tmp/project_full.tar.gz -C $RemoteDir
rm /tmp/project_full.tar.gz

# Permisos
chown -R root:root $RemoteDir
chmod -R 755 $RemoteDir

cd $RemoteDir

# CREAR .env DE PRODUCCIÓN (Con credenciales REALES)
# Incluye frontend y backend vars
cat > .env <<EOF
VITE_APP_MODE=production
VITE_API_BASE_URL=http://$ServerIP/api
VITE_SESSION_TIMEOUT=3600

# Backend vars
DB_HOST=localhost
DB_USER=root
DB_PASS=$DbPass
DB_NAME=portal_estudiantil
JWT_SECRET=super_secret_jwt_key_2026
PORT=3001
NODE_ENV=production
DEMO_MODE=true
EOF

# Copiar .env a server/.env también por si acaso (aunque dotenv suele buscar en root si se configura así)
# Pero mejor asegurar.
cp .env server/.env

# INSTALAR DEPENDENCIAS
echo "Instalando dependencias Frontend..."
npm install

echo "Instalando dependencias Backend..."
cd server
npm install
cd ..

# CONSTRUIR FRONTEND
echo "Construyendo Frontend..."
npm run build

# INICIAR BACKEND (PM2)
echo "Iniciando Backend..."
pm2 delete colegio-api || true
pm2 start server/index.js --name "colegio-api"
pm2 save

# CONFIGURAR NGINX (Proxy a Backend + Static Frontend)
echo "Configurando Nginx..."
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name _;
    
    root $RemoteDir/dist;
    index index.html;

    # Frontend
    location / {
        try_files `$uri `$uri/ /index.html;
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }
}
EOF

nginx -t
systemctl restart nginx

# POBLAR DATOS (Ejecutar script node)
# echo "Poblando Datos DEMO en Base de Datos..."
# if [ -f "poblar_datos_full_demo.js" ]; then
#    node poblar_datos_full_demo.js
# else
#    echo "ERROR: poblar_datos_full_demo.js no encontrado."
# fi

echo "¡DESPLIEGUE COMPLETO FINALIZADO!"
"@
Run-Remote $RemoteScript

Write-Host "¡Listo! Accede a http://$ServerIP" -ForegroundColor Green
