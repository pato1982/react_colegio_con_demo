# Deployment & Demo Instructions

## Chat Functionality in Demo Mode
The chat system has been configured to work in **Demo Mode** without requiring a database connection.
- **Backend Simulation**: The server intercepts chat requests and simulates a database in-memory.
- **Real-time**: WebSocket events are emitted for real-time message updates.
- **Users**: You can log in as:
  - **Admin**: `admin@demo.cl` / `password`
  - **Docente**: `docente@demo.cl` / `password` (Simulates Docente ID 1)
  - **Apoderado**: `apoderado@demo.cl` / `password`

## Running with PM2
To run the application using PM2 (Process Manager):

1. Install PM2 globally (if not installed):
   ```bash
   npm install pm2 -g
   ```

2. Start the ecosystem:
   ```bash
   pm2 start ecosystem.config.js
   ```

3. Monitor logs:
   ```bash
   pm2 logs
   ```

## Nginx Configuration (Example)
If deploying to a VPS (Linux), configure Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend (Vite Preview or Static)
    location / {
        proxy_pass http://localhost:5173; # Or serve static files from dist/
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```
