$ErrorActionPreference = "Stop"

# Configuración
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"
$DBPass = "9Il2cmw4PgSQ10V"

Write-Host "Iniciando reparación de Base de Datos (Modo Directo)..." -ForegroundColor Cyan

# 1. Subir esquema original
Write-Host "1. Subiendo esquema SQL..."
scp -P $Port -i $Key "c:\Users\Telqway\Desktop\colegio-react\estructuras_tb.sql" "$User@${ServerIP}:/tmp/schema.sql"

# 2. Ejecutar comandos remotos uno a uno para evitar problemas de script
Write-Host "2. Preparando y ejecutando importación..."

# Comando A: Crear archivo combinado (Reset DB + sin chequear FK)
$CmdPrepare = "echo 'DROP DATABASE IF EXISTS portal_estudiantil; CREATE DATABASE portal_estudiantil DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE portal_estudiantil; SET FOREIGN_KEY_CHECKS=0;' > /tmp/full.sql && cat /tmp/schema.sql >> /tmp/full.sql && echo 'SET FOREIGN_KEY_CHECKS=1;' >> /tmp/full.sql"
ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP $CmdPrepare

# Comando B: Importar
# Nota: Pasamos la contraseña directamente en el comando, escapada.
$CmdImport = "mysql -u root -p'$DBPass' portal_estudiantil < /tmp/full.sql"
ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP $CmdImport

# Comando C: Limpieza
$CmdClean = "rm /tmp/full.sql /tmp/schema.sql"
ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP $CmdClean

Write-Host "¡Proceso terminado! Verifica tu conexión DBeaver." -ForegroundColor Green
