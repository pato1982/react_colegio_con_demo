$ErrorActionPreference = "Stop"

# Configuración
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"

Write-Host "Iniciando poblado de datos demo en $ServerIP..." -ForegroundColor Cyan

# 1. Subir script JS
Write-Host "1. Subiendo script de poblado..."
scp -P $Port -i $Key "c:\Users\Telqway\Desktop\colegio-react\poblar_datos_demo.cjs" "$User@${ServerIP}:/var/www/colegio-react/poblar_datos_demo.cjs"

# 2. Ejecutar script remoto con Node
Write-Host "2. Ejecutando inserción de datos (usando entorno del servidor)..."
# Entramos a la carpeta, aseguramos instalación de bcryptjs (por si acaso) y corremos el script
$Cmd = "cd /var/www/colegio-react && npm install bcryptjs mysql2 dotenv && node poblar_datos_demo.cjs"
ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP $Cmd

Write-Host "¡Datos insertados correctamente!" -ForegroundColor Green
Write-Host "Usuarios creados:"
Write-Host " - Admin: admin.demo@colegio.cl"
Write-Host " - Docente: docente.demo@colegio.cl"
Write-Host " - Apoderado: apoderado.demo@colegio.cl"
Write-Host "Clave para todos: 123456"
