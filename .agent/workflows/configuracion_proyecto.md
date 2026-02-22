---
description: Configuración y credenciales del proyecto
---

# Configuración del servidor backend

## Base de datos MySQL
- **Host:** 170.239.87.97
- **Puerto:** 3306
- **Usuario:** root
- **Contraseña:** EXwCVq87aj0F3f1
- **Nombre BD:** portal_estudiantil

## Servidor
- **Puerto:** 3001

## JWT
- **Secret:** portal_estudiantil_jwt_secret_2024_muy_seguro

## Comandos de despliegue
```bash
cd /var/www/react-apps/portal_react && git pull origin master && npm run build && pm2 restart all
```
