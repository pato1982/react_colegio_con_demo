const fetch = require('node-fetch');

async function testEndpoint() {
    const alumnoId = 121; // El ID de Florencia/Alumno Demo
    const url = `http://170.239.87.97:3001/api/apoderado/pupilo/${alumnoId}/progreso`;

    try {
        console.log('--- Probando Endpoint de Progreso ---');
        console.log('URL:', url);

        const response = await fetch(url);
        const data = await response.json();

        console.log('Resultado Success:', data.success);
        if (data.success) {
            console.log('Asignaturas encontradas:', data.data.asignaturas.length);
            console.log('Lista de Asignaturas:', data.data.asignaturas);
            console.log('Promedios:', data.data.promediosPorAsignatura);
        } else {
            console.log('Error de API:', data.error);
        }
    } catch (error) {
        console.error('Error de conexión:', error.message);
    }
}

testEndpoint();
