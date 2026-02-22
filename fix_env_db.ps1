$ErrorActionPreference = "Stop"
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"
$Key = ".ssh_keys\id_rsa_vps_new"

$DbPass = 'H4lcon$9.2024'

$RemoteCmd = @"
cat > /var/www/colegio-react/.env <<'EOF'
VITE_APP_MODE=production
VITE_API_BASE_URL=/api
VITE_SESSION_TIMEOUT=3600

# Backend vars
DB_HOST=localhost
DB_USER=root
# Password literal sin expansion gracias a 'EOF'
DB_PASS=$DbPass
DB_NAME=portal_estudiantil
JWT_SECRET=super_secret_jwt_key_2026
PORT=3001
NODE_ENV=production
EOF

cp /var/www/colegio-react/.env /var/www/colegio-react/server/.env
pm2 reload colegio-api
"@

# Convert content to Unix line endings BEFORE encoding
$RemoteCmd = $RemoteCmd -replace "`r`n", "`n"
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($RemoteCmd)
$Base64 = [System.Convert]::ToBase64String($Bytes)

Write-Host "Corrigiendo .env (DB Password)..."
ssh -p $Port -i $Key -o StrictHostKeyChecking=no "${User}@${ServerIP}" "echo '$Base64' | base64 -d | bash"

Write-Host "¡DB Password Corregida!" -ForegroundColor Green
