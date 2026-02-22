$ErrorActionPreference = "Stop"

# Configuración
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"
$LocalSQL = "c:\Users\Telqway\Desktop\colegio-react\estructuras_tb.sql"

Write-Host "Iniciando reparación de Base de Datos..." -ForegroundColor Cyan

# 1. Subir el archivo SQL original de nuevo (por si acaso)
Write-Host "1. Subiendo archivo SQL..."
scp -P $Port -i $Key "$LocalSQL" "$User@${ServerIP}:/tmp/schema.sql"

# 2. Crear script bash localmente para evitar problemas de comillas
$BashScriptContent = @"
#!/bin/bash
set -e
DB_PASS='9Il2cmw4PgSQ10V'

echo "Preparando esquema con FK Checks desactivados..."
echo "SET FOREIGN_KEY_CHECKS=0;" > /tmp/full_schema.sql
cat /tmp/schema.sql >> /tmp/full_schema.sql
echo "SET FOREIGN_KEY_CHECKS=1;" >> /tmp/full_schema.sql

echo "Importando a MySQL..."
mysql -u root -p"\${DB_PASS}" portal_estudiantil < /tmp/full_schema.sql

echo "Limpiando..."
rm /tmp/full_schema.sql
rm /tmp/schema.sql

echo "GRANT accesos..."
# Asegurar que root pueda conectarse desde localhost (necesario para el tunel)
# Esto ya deberia estar, pero por seguridad
mysql -u root -p"\${DB_PASS}" -e "FLUSH PRIVILEGES;"

echo "=== IMPORTACION EXITOSA ==="
"@

# Guardar script bash temporalmente
$TempBash = "$env:TEMP\install_db.sh"
Set-Content -Path $TempBash -Value $BashScriptContent -Encoding UTF8 -NoNewline

# 3. Subir script bash
Write-Host "2. Subiendo script de instalación..."
scp -P $Port -i $Key "$TempBash" "$User@${ServerIP}:/tmp/install_db.sh"

# 4. Ejecutar script bash
Write-Host "3. Importando tablas..."
ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP "chmod +x /tmp/install_db.sh && /tmp/install_db.sh"

# Limpieza local
Remove-Item $TempBash

Write-Host "¡Listo! Base de datos configurada." -ForegroundColor Green
