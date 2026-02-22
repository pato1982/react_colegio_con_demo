$ErrorActionPreference = "Stop"

# Variables de configuración
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"
$RemoteDir = "/var/www/colegio-react"
$LocalDir = "c:\Users\Telqway\Desktop\colegio-react"

function Run-Remote ($ScriptBlock) {
    $ScriptUnix = $ScriptBlock -replace "`r`n", "`n"
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes($ScriptUnix)
    $Base64 = [System.Convert]::ToBase64String($Bytes)
    ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP "echo '$Base64' | base64 -d | bash"
}

Write-Host "Iniciando despliegue MODO DEMO en servidor $ServerIP..." -ForegroundColor Cyan

# 1. Empaquetar y subir código
Write-Host "1. Subiendo código (Versión Local Modificada)..."
$TempTar = "$env:TEMP\project_demo.tar.gz"
if (Test-Path $TempTar) { Remove-Item $TempTar }
cd $LocalDir
# Excluimos node_modules, .git, dist, y claves
tar -czf "$TempTar" --exclude=node_modules --exclude=.git --exclude=.ssh_keys --exclude=dist *
scp -P $Port -i $Key "$TempTar" "$User@${ServerIP}:/tmp/project_demo.tar.gz"
Remove-Item $TempTar

# 2. Desplegar y Configurar en Modo Demo
Write-Host "2. Configurando servidor en MODO DEMO (Sin BBDD)..."
$DeployScript = @"
#!/bin/bash
set -e

# Limpiar directorio remoto
rm -rf $RemoteDir/*
mkdir -p $RemoteDir

# Descomprimir
tar -xzf /tmp/project_demo.tar.gz -C $RemoteDir
rm /tmp/project_demo.tar.gz

# Ajustar permisos
chown -R root:root $RemoteDir
chmod -R 755 $RemoteDir

cd $RemoteDir

# CREAR .env PARA MODO DEMO
echo "VITE_APP_MODE=demo" > .env
# IMPORTANTE: No definimos VITE_API_BASE_URL para que use los mocks locales

# Instalar dependencias (Solo frontend es necesario realmente, pero instalamos todo por si acaso)
npm install

# Construir Frontend (Vite leerá VITE_APP_MODE=demo)
npm run build

# Detener backend (API) para confirmar que no se usa
pm2 stop colegio-api || true

# Configurar Nginx (Simple, solo servir estáticos)
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name _;
    root $RemoteDir/dist;
    index index.html;
    location / {
        try_files `$uri `$uri/ /index.html;
    }
}
EOF

nginx -t
systemctl restart nginx

echo "¡Despliegue DEMO completado!"
"@
Run-Remote $DeployScript

Write-Host "¡Listo! Tu web está en modo DEMO en http://$ServerIP" -ForegroundColor Green
