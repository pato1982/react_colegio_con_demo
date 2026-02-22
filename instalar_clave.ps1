$ErrorActionPreference = "Stop"

$PubKeyPath = ".ssh_keys\id_rsa_vps_new.pub"
$ServerIP = "45.236.130.25"
$Port = "25404"
$User = "root"

if (-not (Test-Path $PubKeyPath)) {
    Write-Error "No se encontro la clave publica en $PubKeyPath"
    exit 1
}

$PubKey = Get-Content $PubKeyPath -Raw

Write-Host "Conectando a $ServerIP para instalar la clave publica..."
Write-Host "Se te solicitara la contrasena del servidor (9Il2cmw4PgSQ10V)."

# Comando SSH para agregar la clave
$RemoteCommand = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$PubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

ssh -p $Port $User@$ServerIP $RemoteCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "¡Clave instalada exitosamente!" -ForegroundColor Green
    Write-Host "Prueba la conexion con: ssh -p $Port -i .ssh_keys\id_rsa_vps_new $User@$ServerIP"
} else {
    Write-Host "Hubo un error al instalar la clave." -ForegroundColor Red
}
