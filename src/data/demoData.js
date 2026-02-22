/**
 * Datos estáticos del demo - embebidos en el frontend
 * No requiere servidor backend ni base de datos
 */

const ANIO = 2026;

// ==========================================
// 1. CURSOS
// ==========================================
export const cursos = [
    { id: 101, nombre: '1° Básico A', nivel: 'basica', grado: 1, letra: 'A', anio_academico: ANIO },
    { id: 102, nombre: '2° Básico A', nivel: 'basica', grado: 2, letra: 'A', anio_academico: ANIO },
    { id: 103, nombre: '3° Básico A', nivel: 'basica', grado: 3, letra: 'A', anio_academico: ANIO },
    { id: 104, nombre: '4° Básico A', nivel: 'basica', grado: 4, letra: 'A', anio_academico: ANIO }
];

// ==========================================
// 2. ASIGNATURAS
// ==========================================
export const asignaturasBase = [
    { id: 1, nombre: 'Lenguaje' },
    { id: 2, nombre: 'Matemática' },
    { id: 3, nombre: 'Historia' },
    { id: 4, nombre: 'Ciencias' },
    { id: 5, nombre: 'Inglés' },
    { id: 6, nombre: 'Artes' },
    { id: 7, nombre: 'Ed. Física' },
    { id: 8, nombre: 'Tecnología' }
];

// ==========================================
// 3. ASIGNACIONES (curso-asignatura)
// ==========================================
export const asignaciones = [];
let _asigId = 200;
cursos.forEach(c => {
    asignaturasBase.forEach(a => {
        asignaciones.push({
            id: _asigId++,
            curso_id: c.id,
            asignatura_id: a.id,
            curso_nombre: c.nombre,
            asignatura_nombre: a.nombre,
            nivel: c.nivel,
            docente_id: 99,
            docente_nombre_completo: 'González Muñoz, Carlos'
        });
    });
});

// ==========================================
// 4. ALUMNOS (10 por curso = 40)
// ==========================================
const nombresM = ['Sebastián', 'Matías', 'Benjamín', 'Lucas', 'Tomás', 'Martín', 'Diego', 'Joaquín', 'Nicolás', 'Felipe',
    'Vicente', 'Agustín', 'Gabriel', 'Maximiliano', 'Santiago', 'Daniel', 'Pablo', 'Ignacio', 'Cristóbal', 'Emilio'];
const nombresF = ['Sofía', 'Martina', 'Florencia', 'Valentina', 'Isidora', 'Agustina', 'Catalina', 'Amanda', 'Emilia', 'Antonella',
    'Fernanda', 'Constanza', 'Javiera', 'Camila', 'Macarena', 'Trinidad', 'Josefa', 'Victoria', 'Daniela', 'Renata'];
const apellidos1 = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda',
    'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'García', 'Garrido', 'Bravo', 'Reyes', 'Núñez'];
const apellidos2 = ['Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Figueroa', 'Cortés', 'Vega',
    'Carrasco', 'Medina', 'Vargas', 'Cáceres', 'Pizarro', 'Sandoval', 'Guerrero', 'Bustos', 'Jara', 'Aravena'];

export const alumnos = [];
let _alumnoId = 1000;

cursos.forEach((c, ci) => {
    for (let i = 0; i < 10; i++) {
        const esFem = i % 2 === 0;
        const idx = ci * 10 + i;
        const nombres = esFem ? nombresF[idx % nombresF.length] : nombresM[idx % nombresM.length];
        const ap1 = apellidos1[idx % apellidos1.length];
        const ap2 = apellidos2[idx % apellidos2.length];
        const id = _alumnoId++;
        alumnos.push({
            id,
            rut: `${10 + ci}.${100 + i * 111}.${200 + i * 33}-${i}`,
            nombres,
            apellidos: `${ap1} ${ap2}`,
            nombre_completo: `${ap1} ${ap2}, ${nombres}`,
            fecha_nacimiento: `${2015 + ci}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
            sexo: esFem ? 'F' : 'M',
            direccion: `Calle ${apellidos2[(idx + 3) % apellidos2.length]} ${100 + idx * 7}, Santiago`,
            curso_id: c.id,
            curso_nombre: c.nombre
        });
    }
});

// ==========================================
// 5. DOCENTES
// ==========================================
export const docentes = [
    {
        id: 99, rut: '11.234.567-8',
        nombres: 'Carlos', apellidos: 'González Muñoz',
        nombre_completo: 'González Muñoz, Carlos',
        email: 'carlos.gonzalez@colegiodemo.cl',
        asignaturas: [
            { id: 1, nombre: 'Lenguaje' },
            { id: 2, nombre: 'Matemática' },
            { id: 3, nombre: 'Historia' }
        ]
    },
    {
        id: 100, rut: '12.345.678-9',
        nombres: 'María', apellidos: 'López Soto',
        nombre_completo: 'López Soto, María',
        email: 'maria.lopez@colegiodemo.cl',
        asignaturas: [
            { id: 4, nombre: 'Ciencias' },
            { id: 5, nombre: 'Inglés' },
            { id: 6, nombre: 'Artes' }
        ]
    },
    {
        id: 101, rut: '13.456.789-0',
        nombres: 'Pedro', apellidos: 'Martínez Rojas',
        nombre_completo: 'Martínez Rojas, Pedro',
        email: 'pedro.martinez@colegiodemo.cl',
        asignaturas: [
            { id: 7, nombre: 'Ed. Física' },
            { id: 8, nombre: 'Tecnología' }
        ]
    }
];

// ==========================================
// 6. NOTAS (generadas determinísticamente)
// ==========================================
function seededRandom(seed) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

export const notas = [];
const rng = seededRandom(42);
const mesesTri = { 1: ['03', '04'], 2: ['05', '06', '07'], 3: ['08', '09', '10', '11'] };

alumnos.forEach(alum => {
    asignaturasBase.forEach(asig => {
        for (let tri = 1; tri <= 3; tri++) {
            const meses = mesesTri[tri];
            for (let n = 0; n < 8; n++) {
                const base = 3.5 + rng() * 3.5; // 3.5 - 7.0
                const nota = Math.min(7.0, Math.max(1.0, base));
                const mes = meses[n % meses.length];
                const dia = String(1 + Math.floor(rng() * 25)).padStart(2, '0');
                notas.push({
                    id: notas.length + 1,
                    alumno_id: alum.id,
                    asignatura_id: asig.id,
                    curso_id: alum.curso_id,
                    periodo: tri,
                    nota: parseFloat(nota.toFixed(1)),
                    fecha: `${ANIO}-${mes}-${dia}`,
                    es_pendiente: false
                });
            }
        }
    });
});

// ==========================================
// 7. ASISTENCIA (todo el año)
// ==========================================
export const asistencia = [];
const rngA = seededRandom(777);
const mesesAnio = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

alumnos.forEach(alum => {
    mesesAnio.forEach(mes => {
        for (let dia = 1; dia <= 20; dia++) {
            const r = rngA();
            asistencia.push({
                alumno_id: alum.id,
                curso_id: alum.curso_id,
                fecha: `${ANIO}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
                estado: r > 0.12 ? 'presente' : (r > 0.06 ? 'ausente' : 'tardio')
            });
        }
    });
});

// ==========================================
// 8. COMUNICADOS
// ==========================================
export const comunicados = [
    {
        id: 1, titulo: 'Reunión de Apoderados - Primer Trimestre',
        mensaje: 'Se convoca a reunión de apoderados para revisar el avance académico del primer trimestre. Se tratarán temas de rendimiento, asistencia y actividades extraprogramáticas. Se ruega puntualidad.',
        contenido: 'Se convoca a reunión de apoderados para revisar el avance académico del primer trimestre. Se tratarán temas de rendimiento, asistencia y actividades extraprogramáticas. Se ruega puntualidad.',
        fecha: '2026-03-10T10:00:00', remitente_nombre: 'Dirección Académica',
        leido: 0, tipo: 'reunion',
        fecha_evento: '2026-03-20', hora_evento: '18:30', lugar_evento: 'Salón Auditorio'
    },
    {
        id: 2, titulo: 'Salida Pedagógica al Museo de Historia Natural',
        mensaje: 'Informamos que el curso realizará una salida pedagógica al Museo Nacional de Historia Natural. Los alumnos deberán traer autorización firmada, colación y uniforme de salida. El transporte será proporcionado por el colegio.',
        contenido: 'Informamos que el curso realizará una salida pedagógica al Museo Nacional de Historia Natural. Los alumnos deberán traer autorización firmada, colación y uniforme de salida. El transporte será proporcionado por el colegio.',
        fecha: '2026-03-05T09:00:00', remitente_nombre: 'Prof. Carlos González',
        leido: 1, tipo: 'evento',
        fecha_evento: '2026-03-25', hora_evento: '08:00', lugar_evento: 'Museo Nacional de Historia Natural'
    },
    {
        id: 3, titulo: 'Calendario de Evaluaciones - Marzo',
        mensaje: 'Se adjunta calendario de evaluaciones para el mes de marzo. Por favor revisar las fechas de cada asignatura y apoyar a sus pupilos en la preparación. Cualquier duda comunicarse con el profesor jefe.',
        contenido: 'Se adjunta calendario de evaluaciones para el mes de marzo. Por favor revisar las fechas de cada asignatura y apoyar a sus pupilos en la preparación. Cualquier duda comunicarse con el profesor jefe.',
        fecha: '2026-03-01T08:00:00', remitente_nombre: 'UTP - Unidad Técnica Pedagógica',
        leido: 1, tipo: 'academico'
    },
    {
        id: 4, titulo: 'Feria de Ciencias 2026',
        mensaje: 'Invitamos a toda la comunidad escolar a participar de nuestra Feria de Ciencias anual. Los alumnos presentarán sus proyectos de investigación en stands temáticos. Habrá premios para los mejores trabajos por categoría.',
        contenido: 'Invitamos a toda la comunidad escolar a participar de nuestra Feria de Ciencias anual. Los alumnos presentarán sus proyectos de investigación en stands temáticos. Habrá premios para los mejores trabajos por categoría.',
        fecha: '2026-02-15T11:00:00', remitente_nombre: 'Depto. Ciencias',
        leido: 0, tipo: 'evento',
        fecha_evento: '2026-04-15', hora_evento: '10:00', lugar_evento: 'Patio Central del Colegio'
    },
    {
        id: 5, titulo: 'Actualización de Datos de Contacto',
        mensaje: 'Solicitamos a todos los apoderados actualizar sus datos de contacto (teléfono, email, dirección) en secretaría del colegio o a través del portal. Es fundamental contar con información vigente para emergencias.',
        contenido: 'Solicitamos a todos los apoderados actualizar sus datos de contacto (teléfono, email, dirección) en secretaría del colegio o a través del portal. Es fundamental contar con información vigente para emergencias.',
        fecha: '2026-02-10T09:00:00', remitente_nombre: 'Secretaría Académica',
        leido: 0, tipo: 'administrativo'
    },
    {
        id: 6, titulo: 'Suspensión de Clases - Jornada Docente',
        mensaje: 'Se informa que el viernes 14 de marzo no habrá clases por jornada de planificación docente. Las actividades se retoman normalmente el lunes 17 de marzo. Agradecemos su comprensión.',
        contenido: 'Se informa que el viernes 14 de marzo no habrá clases por jornada de planificación docente. Las actividades se retoman normalmente el lunes 17 de marzo. Agradecemos su comprensión.',
        fecha: '2026-03-08T14:00:00', remitente_nombre: 'Dirección',
        leido: 0, tipo: 'informativo'
    }
];

// ==========================================
// 9. DATOS APODERADO
// ==========================================
export const apoderadoDetalle = {
    nombres: 'Carolina', apellidos: 'Fuentes Araya',
    rut: '14.567.890-1', parentezco: 'Madre',
    email: 'carolina.fuentes@gmail.com', telefono: '+56 9 8765 4321',
    direccion: 'Av. Libertador Bernardo O\'Higgins 1234, Santiago'
};

export const apoderadoPupilos = [
    { ...alumnos[0], establecimiento_id: 1, establecimiento_nombre: 'Colegio Demo' },
    { ...alumnos[10], establecimiento_id: 1, establecimiento_nombre: 'Colegio Demo' }
];

// ==========================================
// 10. USUARIOS DEMO
// ==========================================
export const users = {
    admin: {
        id: 1, email: 'admin@demo.com', role: 'administrador',
        nombres: 'Administrador', apellidos: 'Demo',
        nombre: 'Admin Demo', establecimiento_id: 1,
        nombre_establecimiento: 'Colegio Demo'
    },
    docente: {
        id: 2, email: 'docente@demo.com', role: 'docente',
        nombres: 'Carlos', apellidos: 'González Muñoz',
        nombre: 'Profesor Demo', docente_id: 99, establecimiento_id: 1,
        nombre_establecimiento: 'Colegio Demo'
    },
    apoderado: {
        id: 3, email: 'apoderado@demo.com', role: 'apoderado',
        nombres: 'Carolina', apellidos: 'Fuentes Araya',
        nombre: 'Apoderado Demo', apoderado_id: 88,
        rut: '14.567.890-1', establecimiento_id: 1,
        nombre_establecimiento: 'Colegio Demo'
    }
};

// ==========================================
// HELPERS
// ==========================================
export function calcularPromedio(notasFiltradas) {
    if (!notasFiltradas.length) return 0;
    const sum = notasFiltradas.reduce((acc, n) => acc + n.nota, 0);
    return parseFloat((sum / notasFiltradas.length).toFixed(1));
}
