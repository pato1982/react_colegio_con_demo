$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"

ssh -p $Port -i $Key -o StrictHostKeyChecking=no $User@$ServerIP "
echo '=== NGINX CONFIG ==='
cat /etc/nginx/sites-available/default
echo '=== NGINX TEST ==='
nginx -t
echo '=== PM2 LIST ==='
pm2 list
echo '=== PM2 LOGS ==='
pm2 logs colegio-api --lines 20 --nostream
echo '=== SERVER DIR ==='
ls -F /var/www/colegio-react/server/
"
