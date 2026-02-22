$ErrorActionPreference = "Stop"

# Configuración
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"

# Contenido del archivo .env para producción
$EnvContent = @"
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=9Il2cmw4PgSQ10V
DB_NAME=portal_estudiantil
JWT_SECRET=secreto_vps_colegio_2026_secure
NODE_ENV=production

# Variables de Frontend (Vite)
VITE_APP_MODE=production
VITE_API_BASE_URL=http://45.236.130.25/api
VITE_SESSION_TIMEOUT=60
"@

# Guardar localmente
$LocalEnvPath = "c:\Users\Telqway\Desktop\colegio-react\.env.production"
Set-Content -Path $LocalEnvPath -Value $EnvContent

Write-Host "Configurando variables de entorno en $ServerIP..." -ForegroundColor Cyan

# 1. Subir a la raíz del proyecto en el servidor
Write-Host "1. Subiendo archivo .env..."
scp -P $Port -i $Key "$LocalEnvPath" "$User@${ServerIP}:/var/www/colegio-react/.env"

# 2. Reiniciar PM2 para aplicar cambios
Write-Host "2. Reiniciando servicio PM2..."
ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP "cd /var/www/colegio-react && pm2 restart colegio-api"

# Limpieza local
Remove-Item $LocalEnvPath

Write-Host "¡Entorno configurado y servicio reiniciado!" -ForegroundColor Green
