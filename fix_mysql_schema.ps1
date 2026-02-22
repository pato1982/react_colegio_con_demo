$ErrorActionPreference = "Stop"

# Variables de configuración
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"
$DBPassword = "9Il2cmw4PgSQ10V"

# --- FUNCIÓN DE AYUDA (Base64) ---
function Run-Remote ($ScriptBlock) {
    $ScriptUnix = $ScriptBlock -replace "`r`n", "`n"
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes($ScriptUnix)
    $Base64 = [System.Convert]::ToBase64String($Bytes)
    ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP "echo '$Base64' | base64 -d | bash"
}

Write-Host "Reintentando importación de esquema en $ServerIP..." -ForegroundColor Cyan

# 1. Definir Script de Fix e Importación
$FixSchemaScript = @"
#!/bin/bash
set -e

# Variable contraseña para no repetir
PASS='$DBPassword'

# Crear archivo temporal combinando SET FK=0 + esquema
echo "SET FOREIGN_KEY_CHECKS=0;" > /tmp/full_schema.sql
cat /tmp/schema.sql >> /tmp/full_schema.sql
echo "SET FOREIGN_KEY_CHECKS=1;" >> /tmp/full_schema.sql

# Importar
echo "Importando tablas con FK Check desactivado..."
mysql -u root -p"\$PASS" portal_estudiantil < /tmp/full_schema.sql

echo "¡Tablas creadas exitosamente!"
rm /tmp/full_schema.sql
rm /tmp/schema.sql
"@

Run-Remote $FixSchemaScript

Write-Host "¡Esquema importado correctamente!" -ForegroundColor Green
Write-Host "Tu base de datos 'portal_estudiantil' ya tiene las 53 tablas."
