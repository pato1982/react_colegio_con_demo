$ErrorActionPreference = "Stop"

# Variables de configuración
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"
$DBPassword = "9Il2cmw4PgSQ10V" # Contraseña solicitada
$LocalSQLFile = "c:\Users\Telqway\Desktop\colegio-react\estructuras_tb.sql"

# --- FUNCIÓN DE AYUDA (Base64) ---
function Run-Remote ($ScriptBlock) {
    $ScriptUnix = $ScriptBlock -replace "`r`n", "`n"
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes($ScriptUnix)
    $Base64 = [System.Convert]::ToBase64String($Bytes)
    ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP "echo '$Base64' | base64 -d | bash"
}

Write-Host "Iniciando instalación de MySQL en $ServerIP..." -ForegroundColor Cyan

# 1. Subir archivo SQL
Write-Host "1. Subiendo esquema de base de datos..."
scp -P $Port -i $Key "$LocalSQLFile" "$User@${ServerIP}:/tmp/schema.sql"

# 2. Script de Instalación y Configuración
Write-Host "2. Instalando y configurando MySQL (esto puede tardar)..."
$InstallScript = @"
#!/bin/bash
set -e

# Evitar prompts interactivos
export DEBIAN_FRONTEND=noninteractive

# Instalar MySQL Server
if ! command -v mysql &> /dev/null; then
    apt-get update -y
    apt-get install -y mysql-server
fi

# Iniciar servicio
systemctl start mysql
systemctl enable mysql

# Configurar contraseña de root y permisos
# Usamos mysql directamente con sudo
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DBPassword';"
mysql -u root -p'$DBPassword' -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;"
mysql -u root -p'$DBPassword' -e "FLUSH PRIVILEGES;"

# Crear Base de Datos
mysql -u root -p'$DBPassword' -e "CREATE DATABASE IF NOT EXISTS portal_estudiantil CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Importar Tablas
echo "Importando tablas..."
mysql -u root -p'$DBPassword' portal_estudiantil < /tmp/schema.sql

# Crear usuario 'portal_user' (opcional, buena práctica) por si la app lo usa
# O simplemente nos aseguramos que root funcione localmente para la app
# La app corre en localhost, así que root@localhost funciona.
# Pero si queremos acceso 'remoto' via túnel, root@localhost también funciona porque el túnel hace port forwarding.

echo "MySQL instalado y configurado correctamente."
rm /tmp/schema.sql
"@

Run-Remote $InstallScript

Write-Host "¡MySQL instalado y base de datos 'portal_estudiantil' creada!" -ForegroundColor Green
Write-Host "Ahora puedes intentar conectar tu cliente de DB nuevamente."
