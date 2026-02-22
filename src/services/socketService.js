
import io from 'socket.io-client';
import config from '../config/env';

/**
 * Servicio Singleton para manejar la conexión WebSocket
 */
class SocketService {
    socket = null;

    connect(usuarioId) {
        if (this.socket) {
            if (this.socket.connected) {
                // Si ya estamos conectados y se pide conectar el mismo usuario, verificar sala
                this.socket.emit('join_user', usuarioId);
                return this.socket;
            }
        }

        // Inicializar conexión
        // Ajustar URL: si estamos en dev, usa el del config, sino el relativo
        const url = config.apiBaseUrl.replace('/api', ''); // Hack simple para obtener base host

        console.log('Iniciando Socket.io a:', url);

        this.socket = io(url, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Socket conectado:', this.socket.id);
            if (usuarioId) {
                this.socket.emit('join_user', usuarioId);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Socket desconectado');
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket() {
        return this.socket;
    }
}

export default new SocketService();
