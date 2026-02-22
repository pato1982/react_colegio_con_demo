$ErrorActionPreference = "Stop"

# Variables de configuración
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"
$RemoteDir = "/var/www/colegio-react"
$LocalDir = "c:\Users\Telqway\Desktop\colegio-react"


# --- FUNCIONES DE AYUDA MEJORADAS ---
function Run-Remote ($ScriptBlock) {
    # 1. Convertir a formato Unix (LF) explícitamente y codificar en Base64
    # Esto evita cualquier problema con caracteres extraños o saltos de línea de Windows
    $ScriptUnix = $ScriptBlock -replace "`r`n", "`n"
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes($ScriptUnix)
    $Base64 = [System.Convert]::ToBase64String($Bytes)
    
    # 2. Enviar y decodificar en el servidor
    # "base64 -d" decodifica y se pasa a "bash"
    ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP "echo '$Base64' | base64 -d | bash"
}

Write-Host "Iniciando despliegue en servidor $ServerIP..." -ForegroundColor Cyan

# 1. Instalar Dependencias del Servidor (Node, Nginx, PM2)
Write-Host "1. Instalando software necesario (Node.js 18, Nginx, PM2, UFW)..."
$SetupScript = @"
#!/bin/bash
set -e

# Actualizar el sistema e instalar prerequisitos
apt-get update -y
apt-get install -y curl build-essential git

# Instalar Node.js 18 (si hace falta)
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Instalar Nginx (si hace falta)
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi

# Instalar PM2
npm install -g pm2

# Configurar Firewall
ufw allow 'Nginx Full'
ufw allow $Port/tcp
# Nota: "yes | ufw enable" puede desconectar si no se tiene cuidado, pero con puerto SSH abierto está bien.
ufw --force enable

# Preparar directorio
mkdir -p $RemoteDir
# Asegurar que esté vacío para evitar conflictos de estructuras antiguas
rm -rf $RemoteDir/*
"@
Run-Remote $SetupScript

# 2. Subir Código
Write-Host "2. Empaquetando y subiendo archivos del proyecto..."

# Ruta temporal segura
$TempTar = "$env:TEMP\project.tar.gz"
if (Test-Path $TempTar) { Remove-Item $TempTar }

# Comprimir usando tar nativo (evitando ./ innecesario)
# Importante: Asegurarse de estar en el directorio correcto
cd $LocalDir
tar -czf "$TempTar" --exclude=node_modules --exclude=.git --exclude=.ssh_keys --exclude=dist *

# Subir archivo
scp -P $Port -i $Key "$TempTar" "$User@${ServerIP}:/tmp/project.tar.gz"
Remove-Item $TempTar

# Descomprimir en remoto
Write-Host "3. Descomprimiendo en servidor..."
$UnpackScript = @"
#!/bin/bash
set -e
tar -xzf /tmp/project.tar.gz -C $RemoteDir
rm /tmp/project.tar.gz
# Ajustar permisos
chown -R root:root $RemoteDir
chmod -R 755 $RemoteDir
"@
Run-Remote $UnpackScript

# 3. Instalar Dependencias y Construir
Write-Host "4. Instalando dependencias y construyendo app..."
$BuildScript = @"
#!/bin/bash
set -e
cd $RemoteDir

# Instalar TODO (incluido devDependencies para vite build)
npm install

# Instalar dependencias del BACKEND (Importante)
if [ -d "server" ]; then
    echo "Instalando dependencias del Backend..."
    cd server
    npm install
    cd ..
fi

# Construir el frontend (Vite)
npm run build

# Verificar que se creó dist
if [ ! -d "dist" ]; then
    echo "ERROR: La carpeta dist no se creó. Falló el build."
    exit 1
fi

# Iniciar backend
pm2 delete colegio-api || true
# Asegurar ruta correcta al server/index.js
if [ -f "server/index.js" ]; then
    pm2 start server/index.js --name 'colegio-api'
else
    echo "ADVERTENCIA: No se encontró server/index.js, iniciando PM2 sin backend..."
fi
pm2 save
pm2 startup || true
"@
Run-Remote $BuildScript

# 4. Configurar Nginx
Write-Host "5. Configurando Nginx..."
$NginxConf = @"
server {
    listen 80;
    server_name _;

    root $RemoteDir/dist;
    index index.html;

    location / {
        try_files `$uri `$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }
}
"@
# Codificar también la config de Nginx para evitar líos
$NginxBytes = [System.Text.Encoding]::UTF8.GetBytes($NginxConf)
$NginxBase64 = [System.Convert]::ToBase64String($NginxBytes)

$NginxScript = @"
#!/bin/bash
set -e
echo '$NginxBase64' | base64 -d > /etc/nginx/sites-available/default
nginx -t
systemctl restart nginx
"@
Run-Remote $NginxScript

Write-Host "¡Despliegue Completado Exitosamente!" -ForegroundColor Green
Write-Host "Accede a tu aplicación en: http://$ServerIP"
