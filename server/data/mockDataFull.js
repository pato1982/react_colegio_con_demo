const ANIO_ACADEMICO = 2026;

// ==========================================
// GENERADORES DE DATOS
// ==========================================

// 1. Cursos (4 Cursos)
const cursos = [
    { id: 101, nombre: '1° Básico A', nivel: 'basica', grado: 1, letra: 'A', anio_academico: ANIO_ACADEMICO },
    { id: 102, nombre: '2° Básico A', nivel: 'basica', grado: 2, letra: 'A', anio_academico: ANIO_ACADEMICO },
    { id: 103, nombre: '3° Básico A', nivel: 'basica', grado: 3, letra: 'A', anio_academico: ANIO_ACADEMICO },
    { id: 104, nombre: '4° Básico A', nivel: 'basica', grado: 4, letra: 'A', anio_academico: ANIO_ACADEMICO }
];

// 2. Asignaturas (Id, Nombre)
const asignaturasBase = [
    { id: 1, nombre: 'Lenguaje' },
    { id: 2, nombre: 'Matemática' },
    { id: 3, nombre: 'Historia' },
    { id: 4, nombre: 'Ciencias' },
    { id: 5, nombre: 'Inglés' },
    { id: 6, nombre: 'Artes' },
    { id: 7, nombre: 'Ed. Física' },
    { id: 8, nombre: 'Tecnología' }
];

// Generar asignaciones (Todas las asignaturas para todos los cursos para el Docente Demo)
const asignaciones = []; // Docente ve esto
let asigIdCounter = 200;
const asignaturasPorCurso = {}; // cid -> [asignaturas]

cursos.forEach(c => {
    asignaturasPorCurso[c.id] = [];
    asignaturasBase.forEach(a => {
        const asigRealId = asigIdCounter++; // ID unico por instancia curso-asignatura en sistema real suele ser asi, o tabla pivote
        // Simulemos que tabla asignaturas tiene ID unico
        // Pero el frontend a veces agrupa por nombre. 
        // Usaremos el ID base para nombre, pero un ID unico para la "Asignatura en Curso" si fuese necesario.
        // En el backend real tb_asignaturas suele ser Catalogo o Instancia?
        // En este proyecto tb_asignaturas tiene curso_id? No, tb_asignaciones vincula.
        // Así que usamos la lista base.

        asignaturasPorCurso[c.id].push({
            id: a.id,
            nombre: a.nombre,
            curso_id: c.id
        });

        asignaciones.push({
            id: asigIdCounter++, // id asignacion
            curso_id: c.id,
            asignatura_id: a.id,
            curso_nombre: c.nombre,
            asignatura_nombre: a.nombre,
            nivel: c.nivel
        });
    });
});

// 3. Alumnos (10 por curso = 40)
const alumnos = [];
const alumnosPorCurso = {}; // cid -> [alumnos]
let alumnoIdCounter = 1000;

cursos.forEach((c, idx) => {
    alumnosPorCurso[c.id] = [];
    for (let i = 1; i <= 10; i++) {
        const id = alumnoIdCounter++;
        const alumno = {
            id: id,
            rut: `${c.grado}${i}.000.000-${i}`,
            nombres: `Alumno ${i}`,
            apellidos: `Del Curso ${c.nombre}`,
            fecha_nacimiento: '2015-01-01',
            sexo: i % 2 === 0 ? 'F' : 'M',
            direccion: 'Calle Demo 123',
            curso_id: c.id,
            curso_nombre: c.nombre,
            nombre_completo: `Del Curso ${c.nombre}, Alumno ${i}`
        };
        alumnos.push(alumno);
        alumnosPorCurso[c.id].push(alumno);
    }
});

// 4. Notas (Trimestres 1, 2, 3)
// Estructura para endpoint GET /api/notas/curso/:cursoId/asignatura/:asignaturaId
const notasDB = [];
const tiposEval = [
    { id: 1, nombre: 'Prueba', abreviatura: 'P', ponderacion: 30 },
    { id: 2, nombre: 'Trabajo', abreviatura: 'T', ponderacion: 30 },
    { id: 3, nombre: 'Control', abreviatura: 'C', ponderacion: 40 }
];

alumnos.forEach(alum => {
    asignaturasBase.forEach(asig => {
        // 3 Trimestres
        for (let tri = 1; tri <= 3; tri++) {
            // 8 notas por trimestre
            for (let n = 1; n <= 8; n++) {
                notasDB.push({
                    id: Math.floor(Math.random() * 999999),
                    alumno_id: alum.id,
                    asignatura_id: asig.id,
                    curso_id: alum.curso_id, // Helper
                    periodo: tri, // 1, 2, 3
                    nota: (Math.random() * 3 + 4).toFixed(1), // 4.0 - 7.0
                    tipo_evaluacion_id: tiposEval[n % 3].id,
                    fecha: `${ANIO_ACADEMICO}-0${tri + 2}-15`,
                    es_pendiente: false
                });
            }
        }
    });
});

// 5. Asistencia (Todo el año)
const asistenciaDB = [];
const diasMes = 20; // Simplificado
const meses = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

alumnos.forEach(alum => {
    meses.forEach(mes => {
        for (let dia = 1; dia <= diasMes; dia++) {
            asistenciaDB.push({
                alumno_id: alum.id,
                curso_id: alum.curso_id,
                fecha: `${ANIO_ACADEMICO}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
                estado: Math.random() > 0.1 ? 'presente' : (Math.random() > 0.5 ? 'ausente' : 'atrasado')
            });
        }
    });
});

// 6. Docentes (3 profesores demo)
const docentes = [
    {
        id: 99, rut: '11.111.111-1',
        nombres: 'Carlos', apellidos: 'González Muñoz',
        nombre_completo: 'González Muñoz, Carlos',
        email: 'docente@demo.com',
        asignaturas: [
            { id: 1, nombre: 'Lenguaje' },
            { id: 2, nombre: 'Matemática' },
            { id: 3, nombre: 'Historia' }
        ]
    },
    {
        id: 100, rut: '22.222.222-2',
        nombres: 'María', apellidos: 'López Soto',
        nombre_completo: 'López Soto, María',
        email: 'maria.lopez@demo.com',
        asignaturas: [
            { id: 4, nombre: 'Ciencias' },
            { id: 5, nombre: 'Inglés' },
            { id: 6, nombre: 'Artes' }
        ]
    },
    {
        id: 101, rut: '33.333.333-3',
        nombres: 'Pedro', apellidos: 'Martínez Rojas',
        nombre_completo: 'Martínez Rojas, Pedro',
        email: 'pedro.martinez@demo.com',
        asignaturas: [
            { id: 7, nombre: 'Ed. Física' },
            { id: 8, nombre: 'Tecnología' }
        ]
    }
];

// 7. Comunicados (demo para apoderado)
const comunicados = [
    {
        id: 1, alumno_id: null, titulo: 'Reunión de Apoderados',
        mensaje: 'Se convoca a reunión de apoderados para revisar el avance académico del primer trimestre. Se ruega puntualidad.',
        contenido: 'Se convoca a reunión de apoderados para revisar el avance académico del primer trimestre. Se ruega puntualidad.',
        fecha: '2026-03-10T10:00:00', remitente_nombre: 'Dirección Académica',
        leido: 0, tipo: 'reunion',
        fecha_evento: '2026-03-20', hora_evento: '18:30', lugar_evento: 'Salón Auditorio'
    },
    {
        id: 2, alumno_id: null, titulo: 'Salida Pedagógica al Museo',
        mensaje: 'Informamos que el curso realizará una salida pedagógica al Museo Nacional de Historia Natural. Se requiere autorización firmada.',
        contenido: 'Informamos que el curso realizará una salida pedagógica al Museo Nacional de Historia Natural. Se requiere autorización firmada.',
        fecha: '2026-03-05T09:00:00', remitente_nombre: 'Prof. Carlos González',
        leido: 1, tipo: 'evento',
        fecha_evento: '2026-03-25', hora_evento: '08:00', lugar_evento: 'Museo Nacional de Historia Natural'
    },
    {
        id: 3, alumno_id: null, titulo: 'Calendario de Evaluaciones Marzo',
        mensaje: 'Se adjunta calendario de evaluaciones para el mes de marzo. Por favor revisar las fechas de cada asignatura y apoyar a sus pupilos en la preparación.',
        contenido: 'Se adjunta calendario de evaluaciones para el mes de marzo. Por favor revisar las fechas de cada asignatura y apoyar a sus pupilos en la preparación.',
        fecha: '2026-03-01T08:00:00', remitente_nombre: 'UTP',
        leido: 1, tipo: 'academico'
    },
    {
        id: 4, alumno_id: null, titulo: 'Feria de Ciencias 2026',
        mensaje: 'Invitamos a toda la comunidad escolar a participar de nuestra Feria de Ciencias anual. Los alumnos presentarán sus proyectos de investigación.',
        contenido: 'Invitamos a toda la comunidad escolar a participar de nuestra Feria de Ciencias anual. Los alumnos presentarán sus proyectos de investigación.',
        fecha: '2026-02-15T11:00:00', remitente_nombre: 'Depto. Ciencias',
        leido: 0, tipo: 'evento',
        fecha_evento: '2026-04-15', hora_evento: '10:00', lugar_evento: 'Patio Central del Colegio'
    },
    {
        id: 5, alumno_id: null, titulo: 'Actualización de Datos de Contacto',
        mensaje: 'Solicitamos a todos los apoderados actualizar sus datos de contacto (teléfono, email, dirección) en secretaría del colegio antes del 28 de febrero.',
        contenido: 'Solicitamos a todos los apoderados actualizar sus datos de contacto (teléfono, email, dirección) en secretaría del colegio antes del 28 de febrero.',
        fecha: '2026-02-10T09:00:00', remitente_nombre: 'Secretaría',
        leido: 0, tipo: 'administrativo'
    },
    {
        id: 6, alumno_id: null, titulo: 'Suspensión de Clases - Día Administrativo',
        mensaje: 'Se informa que el día viernes 14 de marzo no habrá clases por jornada de planificación docente. Las actividades se retoman el lunes 17.',
        contenido: 'Se informa que el día viernes 14 de marzo no habrá clases por jornada de planificación docente. Las actividades se retoman el lunes 17.',
        fecha: '2026-03-08T14:00:00', remitente_nombre: 'Dirección',
        leido: 0, tipo: 'informativo'
    }
];

// 8. Datos apoderado para detalle
const apoderadoDetalle = {
    nombres: 'Apoderado', apellidos: 'Demo Parental',
    rut: '44.444.444-4', parentezco: 'Madre',
    email: 'apoderado@demo.com', telefono: '+56 9 1234 5678',
    direccion: 'Av. Libertador 456, Santiago'
};

// Apoderado (Vinculado a Alumno 1 del Curso 1 y Alumno 1 del Curso 2)
const apoderadoPupilos = [
    { ...alumnosPorCurso[101][0], establecimiento_id: 1, establecimiento_nombre: 'Colegio Demo' },
    { ...alumnosPorCurso[102][0], establecimiento_id: 1, establecimiento_nombre: 'Colegio Demo' }
];

// ==========================================
// FUNCIONES HELPER PARA ESTADISTICAS
// ==========================================

function calcularPromedioNotas(notasFiltradas) {
    if (!notasFiltradas.length) return 0;
    const sum = notasFiltradas.reduce((acc, n) => acc + parseFloat(n.nota), 0);
    return parseFloat((sum / notasFiltradas.length).toFixed(1));
}

function calcularEstadisticasCurso(cursoId) {
    const notasCurso = notasDB.filter(n => n.curso_id === cursoId);
    const alumnosCurso = alumnos.filter(a => a.curso_id === cursoId);
    const promedio = calcularPromedioNotas(notasCurso);
    const aprobados = alumnosCurso.filter(a => {
        const sus = notasCurso.filter(n => n.alumno_id === a.id);
        return calcularPromedioNotas(sus) >= 4.0;
    }).length;
    const total = alumnosCurso.length;
    const asistCurso = asistenciaDB.filter(a => a.curso_id === cursoId);
    const presentes = asistCurso.filter(a => a.estado === 'presente').length;
    const asistPct = asistCurso.length ? parseFloat((presentes / asistCurso.length * 100).toFixed(1)) : 0;

    return {
        promedio,
        aprobacion: total ? parseFloat((aprobados / total * 100).toFixed(1)) : 0,
        asistencia: asistPct,
        alumnos: total,
        destacados: alumnosCurso.filter(a => { const p = calcularPromedioNotas(notasCurso.filter(n => n.alumno_id === a.id)); return p >= 6.0; }).length,
        regulares: alumnosCurso.filter(a => { const p = calcularPromedioNotas(notasCurso.filter(n => n.alumno_id === a.id)); return p >= 4.0 && p < 6.0; }).length,
        riesgo: alumnosCurso.filter(a => { const p = calcularPromedioNotas(notasCurso.filter(n => n.alumno_id === a.id)); return p < 4.0; }).length,
        tendencia: [promedio - 0.3, promedio - 0.1, promedio, promedio + 0.1, promedio + 0.2],
        tendenciaMensual: [promedio - 0.2, promedio, promedio + 0.1, promedio - 0.1, promedio + 0.15]
    };
}

// DATA EXPORT
const Data = {
    users: {
        admin: {
            id: 1,
            email: 'admin@demo.com',
            role: 'administrador',
            nombre: 'Admin Demo',
            establecimiento_id: 1
        },
        docente: {
            id: 2,
            email: 'docente@demo.com',
            role: 'docente',
            nombre: 'Profesor Demo',
            docente_id: 99, // ID perfil docente
            establecimiento_id: 1
        },
        apoderado: {
            id: 3,
            email: 'apoderado@demo.com',
            role: 'apoderado',
            nombre: 'Apoderado Demo',
            apoderado_id: 88, // ID perfil apoderado
            establecimiento_id: 1
        }
    },
    cursos,
    asignaturasBase,
    asignaturasPorCurso,
    alumnos,
    alumnosPorCurso,
    docentes,
    comunicados,
    apoderadoDetalle,
    notas: notasDB,
    asistencia: asistenciaDB,
    apoderadoPupilos,
    asignaciones,
    calcularPromedioNotas,
    calcularEstadisticasCurso
};

module.exports = Data;
