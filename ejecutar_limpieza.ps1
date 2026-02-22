$ErrorActionPreference = "Stop"

# Configuración
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"

Write-Host "--- AVISO: VACIANDO BASE DE DATOS VPS ---" -ForegroundColor Red
Write-Host "Iniciando limpieza total en $ServerIP..." -ForegroundColor Cyan

# 1. Subir script JS
Write-Host "1. Subiendo script de limpieza..."
scp -P $Port -i $Key "c:\Users\Telqway\Desktop\colegio-react\limpiar_vps_completo.cjs" "$User@${ServerIP}:/var/www/colegio-react/limpiar_vps_completo.cjs"

# 2. Ejecutar script remoto con Node (para usar conexiones internas y asegurar limpieza)
Write-Host "2. Ejecutando TRUNCATE masivo..."
$Cmd = "cd /var/www/colegio-react && npm install bcryptjs mysql2 dotenv && node limpiar_vps_completo.cjs"
ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP $Cmd

Write-Host "✅ Base de datos vaciada y contadores reiniciados." -ForegroundColor Yellow
