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

Write-Host "Iniciando despliegue PREBUILT (Skip Remote Build) en $ServerIP..." -ForegroundColor Cyan

# 1. Empaquetar y subir
Write-Host "1. Subiendo código compilado (dist + server)..."
$TempTar = "$env:TEMP\project_prebuilt.tar.gz"
if (Test-Path $TempTar) { Remove-Item $TempTar }
cd $LocalDir
# Subimos solo lo necesario: dist (frontend listo), server (backend completo sin node_modules)
tar -czf "$TempTar" --exclude=server/node_modules --exclude=.git dist server
scp -P $Port -i $Key "$TempTar" "$User@${ServerIP}:/tmp/project_prebuilt.tar.gz"
Remove-Item $TempTar

# 2. Script remoto
Write-Host "2. Configurando servidor y backend..."
$RemoteScript = @"
#!/bin/bash
set -e

mkdir -p $RemoteDir
# Descomprimir (sobreescribiendo)
tar -xzf /tmp/project_prebuilt.tar.gz -C $RemoteDir
rm /tmp/project_prebuilt.tar.gz

# Permisos
chown -R root:root $RemoteDir
chmod -R 755 $RemoteDir

cd $RemoteDir

# CREAR .env DE PRODUCCIÓN
cat > .env <<EOF
VITE_APP_MODE=production
VITE_API_BASE_URL=/api
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

cp .env server/.env

# INSTALAR DEPENDENCIAS BACKEND
echo "Instalando dependencias Backend..."
cd server
npm install --production
cd ..

# INICIAR BACKEND (PM2)
echo "Iniciando Backend..."
pm2 delete colegio-api || true
pm2 start server/index.js --name "colegio-api"
pm2 save

# CONFIGURAR NGINX
echo "Configurando Nginx..."
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name _;
    
    root $RemoteDir/dist;
    index index.html;

    # Frontend (SPA)
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

echo "¡DESPLIEGUE FINALIZADO!"
"@
Run-Remote $RemoteScript

Write-Host "¡Listo! Accede a http://$ServerIP" -ForegroundColor Green
