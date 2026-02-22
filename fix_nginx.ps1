$ErrorActionPreference = "Stop"
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"

Write-Host "Reconfigurando NGINX..."
scp -P $Port -i $Key nginx_remoto.conf "${User}@${ServerIP}:/tmp/nginx.conf"

Write-Host "Aplicando y Reiniciando..."
ssh -p $Port -i $Key -o StrictHostKeyChecking=no "${User}@${ServerIP}" "cp /tmp/nginx.conf /etc/nginx/sites-available/default && nginx -t && systemctl restart nginx && pm2 restart colegio-api"

Write-Host "¡NGINX ARREGLADO!" -ForegroundColor Green
