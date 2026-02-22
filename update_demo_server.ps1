$ErrorActionPreference = "Stop"
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"

Write-Host "Actualizando DEMO INTERCEPTOR..."
scp -P $Port -i $Key "server\middleware\demoInterceptor.js" "${User}@${ServerIP}:/var/www/colegio-react/server/middleware/demoInterceptor.js"

Write-Host "Reiniciando Backend..."
ssh -p $Port -i $Key -o StrictHostKeyChecking=no "${User}@${ServerIP}" "pm2 reload colegio-api"

Write-Host "¡Actualizado!" -ForegroundColor Green
