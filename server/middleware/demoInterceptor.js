const mockData = require('../data/mockDataFull');
const jwt = require('jsonwebtoken');

const FORCE_DEMO = process.env.DEMO_MODE === 'true';

// --- IN-MEMORY CHAT STORE (Reset on server restart) ---
let mockConversations = [];
let mockMessages = [];
let nextConvId = 100;
let nextMsgId = 5000;

module.exports = (req, res, next) => {
    // 1. Detectar usuario demo (por token JWT o por DEMO_MODE env)
    const token = req.headers.authorization?.replace('Bearer ', '');
    let isDemo = FORCE_DEMO; // Si DEMO_MODE=true, interceptar siempre
    let currentUser = null;

    if (token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.isDemo) {
                isDemo = true;
                currentUser = decoded;
            }
        } catch (e) { }
    }

    if (!isDemo) {
        return next();
    }

    const { method, path, query } = req;

    // ==========================================
    // RUTAS AUTH (MOCKED)
    // ==========================================

    if (path === '/api/auth/login' && method === 'POST') {
        const { email, password, tipo } = req.body;
        let usuario = null;

        if (tipo === 'administrador') {
            usuario = {
                id: 1,
                nombres: 'Administrador',
                apellidos: 'Demo',
                email: 'admin@demo.cl',
                tipo_usuario: 'administrador',
                establecimiento_id: 1,
                rol: 'admin'
            };
        } else if (tipo === 'docente') {
            // Mock Docente (ID 11 -> Docente 1)
            const d = mockData.docentes[0];
            usuario = {
                id: d.id + 10,
                docente_id: d.id, // ID real de docente
                nombres: d.nombres,
                apellidos: d.apellidos,
                email: d.email,
                tipo_usuario: 'docente',
                establecimiento_id: 1
            };
        } else if (tipo === 'apoderado') {
            usuario = {
                id: 99,
                nombres: 'Juan',
                apellidos: 'Perez',
                email: 'apoderado@demo.cl',
                tipo_usuario: 'apoderado',
                establecimiento_id: 1
            };
        }

        if (usuario) {
            // Generar token dummy
            const token = 'demo_token_' + Buffer.from(JSON.stringify(usuario)).toString('base64');
            return res.json({ success: true, token, usuario });
        }

        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    if (path === '/api/auth/me' && method === 'GET') {
        // Decodificar token dummy
        if (token && token.startsWith('demo_token_')) {
            try {
                const jsonPart = Buffer.from(token.replace('demo_token_', ''), 'base64').toString('utf-8');
                const usuario = JSON.parse(jsonPart);
                return res.json({ success: true, usuario });
            } catch (e) {
                return res.status(401).json({ success: false, message: 'Token inválido' });
            }
        }
        // Si no, fallback a admin mocked si FORCE_DEMO
        if (FORCE_DEMO) {
            return res.json({ success: true, usuario: { id: 1, tipo_usuario: 'administrador', nombres: 'Admin', apellidos: 'Demo' } });
        }
    }

    // POST/PUT/DELETE -> éxito simulado
    if (method !== 'GET') {
        console.log(`[DEMO] ${method} ${path} -> Simulated`);
        return res.json({ success: true, message: 'Operación simulada exitosa (Modo Demo)' });
    }

    console.log(`[DEMO] GET ${path}`);

    // ==========================================
    // RUTAS COMPARTIDAS / GENERALES
    // ==========================================

    // Establecimientos
    if (path === '/api/establecimientos') {
        return res.json({ success: true, establecimientos: ['Colegio Demo'], data: [{ id: 1, nombre: 'Colegio Demo' }] });
    }

    // Cursos
    if (path === '/api/cursos') {
        return res.json({ success: true, data: mockData.cursos });
    }

    // Asignaturas (catálogo completo)
    if (path === '/api/asignaturas') {
        return res.json({ success: true, data: mockData.asignaturasBase });
    }

    // Asignaturas por curso
    const matchAsigCurso = path.match(/^\/api\/asignaturas\/por-curso\/(\d+)$/);
    if (matchAsigCurso) {
        return res.json({ success: true, data: mockData.asignaturasBase.map(a => ({ ...a, codigo: `ASIG-${a.id}` })) });
    }

    // ==========================================
    // RUTAS ADMIN - ALUMNOS
    // ==========================================

    // Alumnos lista (con filtro opcional)
    if (path === '/api/alumnos') {
        let data = mockData.alumnos;
        if (query.curso_id) {
            data = data.filter(a => a.curso_id == query.curso_id);
        }
        return res.json({ success: true, data });
    }

    // Alumnos agrupados por curso
    if (path === '/api/alumnos/por-curso') {
        const agrupa = {};
        mockData.cursos.forEach(c => {
            agrupa[c.nombre] = mockData.alumnos.filter(a => a.curso_id === c.id);
        });
        return res.json({ success: true, data: agrupa });
    }

    // Alumnos de un curso (por ID)
    const matchCursoAlumnos = path.match(/^\/api\/curso\/(\d+)\/alumnos$/);
    if (matchCursoAlumnos) {
        const cursoId = parseInt(matchCursoAlumnos[1]);
        const lista = mockData.alumnos.filter(a => a.curso_id === cursoId)
            .map((a, idx) => ({ ...a, numero_lista: idx + 1 }));
        return res.json({ success: true, data: lista });
    }

    // Detalle de alumno (ficha completa)
    const matchAlumnoDetalle = path.match(/^\/api\/alumnos\/(\d+)\/detalle$/);
    if (matchAlumnoDetalle) {
        const alumnoId = parseInt(matchAlumnoDetalle[1]);
        const alumno = mockData.alumnos.find(a => a.id === alumnoId);
        if (!alumno) {
            return res.json({ success: false, error: 'Alumno no encontrado' });
        }
        return res.json({
            success: true,
            data: {
                alumno: {
                    ...alumno,
                    alergias: 'Ninguna',
                    enfermedades_cronicas: 'Ninguna',
                    tiene_nee: 0,
                    detalle_nee: '',
                    contacto_emergencia_nombre: 'Contacto Demo',
                    contacto_emergencia_telefono: '+56 9 8765 4321',
                    matricula_id: alumnoId,
                    anio_academico: 2026
                },
                apoderado: mockData.apoderadoDetalle
            }
        });
    }

    // ==========================================
    // RUTAS ADMIN - DOCENTES
    // ==========================================

    if (path === '/api/docentes') {
        return res.json({ success: true, data: mockData.docentes });
    }

    // ==========================================
    // RUTAS ADMIN - ASIGNACIONES
    // ==========================================

    if (path === '/api/asignaciones') {
        const data = mockData.asignaciones.map(a => ({
            ...a,
            docente_id: currentUser ? currentUser.id : 99,
            docente_nombre_completo: 'Profesor Demo'
        }));
        return res.json({ success: true, data });
    }

    // ==========================================
    // RUTAS ADMIN - MATRICULAS
    // ==========================================

    const matchMatriculaApoderado = path.match(/^\/api\/matriculas\/apoderado\/(.+)$/);
    if (matchMatriculaApoderado) {
        return res.json({
            success: true,
            data: {
                nombres: mockData.apoderadoDetalle.nombres,
                apellidos: mockData.apoderadoDetalle.apellidos,
                email: mockData.apoderadoDetalle.email,
                telefono: mockData.apoderadoDetalle.telefono
            }
        });
    }

    // ==========================================
    // RUTAS ADMIN - NOTAS POR CURSO
    // ==========================================

    if (path === '/api/notas/por-curso') {
        const cursoId = parseInt(query.curso_id);
        const asigId = parseInt(query.asignatura_id);
        const trimestre = query.trimestre ? parseInt(query.trimestre) : null;

        const alumnosCurso = mockData.alumnos.filter(a => a.curso_id === cursoId);
        const resultado = alumnosCurso.map(alum => {
            const notasAlum = mockData.notas.filter(n =>
                n.alumno_id === alum.id && n.asignatura_id === asigId
            );
            const notas = {};
            const trimestres = trimestre ? [trimestre] : [1, 2, 3];
            trimestres.forEach(t => {
                const del_tri = notasAlum.filter(n => n.periodo === t);
                notas[t] = del_tri.map((n, idx) => ({
                    numero: idx + 1,
                    nota: n.nota
                }));
            });
            return {
                id: alum.id,
                nombre_completo: alum.nombre_completo,
                notas
            };
        });

        const trimestresActivos = [
            { id: 1, nombre: 'Trimestre 1' },
            { id: 2, nombre: 'Trimestre 2' },
            { id: 3, nombre: 'Trimestre 3' }
        ];

        return res.json({ success: true, data: resultado, trimestres: trimestresActivos });
    }

    // ==========================================
    // RUTAS ADMIN - ASISTENCIA
    // ==========================================

    const matchAsistencia = path.match(/^\/api\/asistencia\/verificar\/(\d+)\/(.+)$/);
    if (matchAsistencia) {
        const cursoId = parseInt(matchAsistencia[1]);
        const fecha = matchAsistencia[2];
        const asis = mockData.asistencia.filter(a => a.curso_id === cursoId && a.fecha === fecha);
        const existe = asis.length > 0;
        const map = {};
        asis.forEach(a => {
            let st = a.estado;
            if (st === 'atrasado') st = 'tardio';
            map[a.alumno_id] = { estado: st, observacion: '' };
        });
        return res.json({ success: true, existe, data: map });
    }

    // ==========================================
    // RUTAS ADMIN - ESTADISTICAS (13 endpoints)
    // ==========================================

    // Listas para filtros
    if (path === '/api/estadisticas/cursos') {
        return res.json({ success: true, data: mockData.cursos.map(c => ({ id: c.id, nombre: c.nombre })) });
    }

    if (path === '/api/estadisticas/docentes') {
        return res.json({
            success: true,
            data: mockData.docentes.map(d => ({
                id: d.id,
                nombre: d.nombre_completo,
                asignaturas: d.asignaturas.map(a => a.nombre).join(', ')
            }))
        });
    }

    if (path === '/api/estadisticas/asignaturas') {
        return res.json({ success: true, data: mockData.asignaturasBase.map(a => ({ id: a.id, nombre: a.nombre })) });
    }

    // General
    if (path === '/api/estadisticas/general') {
        const promedioGlobal = mockData.calcularPromedioNotas(mockData.notas);
        const totalAlumnos = mockData.alumnos.length;
        const aprobados = mockData.alumnos.filter(a => {
            return mockData.calcularPromedioNotas(mockData.notas.filter(n => n.alumno_id === a.id)) >= 4.0;
        }).length;
        const presentes = mockData.asistencia.filter(a => a.estado === 'presente').length;
        const asistPct = parseFloat((presentes / mockData.asistencia.length * 100).toFixed(1));

        const destacados = mockData.alumnos.filter(a => mockData.calcularPromedioNotas(mockData.notas.filter(n => n.alumno_id === a.id)) >= 6.0).length;
        const riesgo = mockData.alumnos.filter(a => mockData.calcularPromedioNotas(mockData.notas.filter(n => n.alumno_id === a.id)) < 4.0).length;

        return res.json({
            success: true,
            data: {
                promedio: promedioGlobal,
                aprobacion: parseFloat((aprobados / totalAlumnos * 100).toFixed(1)),
                asistencia: asistPct,
                alumnos: totalAlumnos,
                destacados,
                regulares: totalAlumnos - destacados - riesgo,
                riesgo,
                tendencia: [promedioGlobal - 0.3, promedioGlobal - 0.1, promedioGlobal, promedioGlobal + 0.1, promedioGlobal + 0.2],
                meses: ['Mar', 'Abr', 'May', 'Jun', 'Jul']
            }
        });
    }

    if (path === '/api/estadisticas/general/asignaturas') {
        const data = mockData.asignaturasBase.map(a => ({
            asignatura: a.nombre,
            promedio: mockData.calcularPromedioNotas(mockData.notas.filter(n => n.asignatura_id === a.id))
        }));
        return res.json({ success: true, data });
    }

    if (path === '/api/estadisticas/general/ranking-cursos') {
        const data = mockData.cursos.map(c => {
            const notasCurso = mockData.notas.filter(n => n.curso_id === c.id);
            const asistCurso = mockData.asistencia.filter(a => a.curso_id === c.id);
            const pres = asistCurso.filter(a => a.estado === 'presente').length;
            return {
                curso: c.nombre,
                promedio: mockData.calcularPromedioNotas(notasCurso),
                promedioAsistencia: asistCurso.length ? parseFloat((pres / asistCurso.length * 100).toFixed(1)) : 0
            };
        });
        return res.json({ success: true, data });
    }

    if (path === '/api/estadisticas/general/distribucion') {
        const totalAlumnos = mockData.alumnos.length;
        const destacados = mockData.alumnos.filter(a => mockData.calcularPromedioNotas(mockData.notas.filter(n => n.alumno_id === a.id)) >= 6.0).length;
        const riesgo = mockData.alumnos.filter(a => mockData.calcularPromedioNotas(mockData.notas.filter(n => n.alumno_id === a.id)) < 4.0).length;
        return res.json({
            success: true,
            data: { destacados, regulares: totalAlumnos - destacados - riesgo, enRiesgo: riesgo }
        });
    }

    // Estadísticas por curso
    const matchEstCurso = path.match(/^\/api\/estadisticas\/curso\/(\d+)$/);
    if (matchEstCurso) {
        const cursoId = parseInt(matchEstCurso[1]);
        return res.json({ success: true, data: mockData.calcularEstadisticasCurso(cursoId) });
    }

    const matchEstCursoAsig = path.match(/^\/api\/estadisticas\/curso\/(\d+)\/asignaturas$/);
    if (matchEstCursoAsig) {
        const cursoId = parseInt(matchEstCursoAsig[1]);
        const data = mockData.asignaturasBase.map(a => ({
            asignatura: a.nombre,
            promedio: mockData.calcularPromedioNotas(mockData.notas.filter(n => n.curso_id === cursoId && n.asignatura_id === a.id))
        }));
        return res.json({ success: true, data });
    }

    // Estadísticas por docente
    const matchEstDocAsig = path.match(/^\/api\/estadisticas\/docente\/(\d+)\/asignatura\/(\d+)$/);
    if (matchEstDocAsig) {
        const docenteId = parseInt(matchEstDocAsig[1]);
        const asigId = parseInt(matchEstDocAsig[2]);
        const docente = mockData.docentes.find(d => d.id === docenteId) || mockData.docentes[0];
        const notasAsig = mockData.notas.filter(n => n.asignatura_id === asigId);
        const promediosPorCurso = mockData.cursos.map(c => ({
            curso: c.nombre,
            promedio: mockData.calcularPromedioNotas(notasAsig.filter(n => n.curso_id === c.id))
        }));
        const promGlobal = mockData.calcularPromedioNotas(notasAsig);
        const alumnosConNotas = [...new Set(notasAsig.map(n => n.alumno_id))];
        const aprobados = alumnosConNotas.filter(aid => mockData.calcularPromedioNotas(notasAsig.filter(n => n.alumno_id === aid)) >= 4.0).length;
        const total = alumnosConNotas.length || 1;

        return res.json({
            success: true,
            data: {
                promedio: promGlobal,
                aprobacion: parseFloat((aprobados / total * 100).toFixed(1)),
                asistencia: 90,
                alumnos: alumnosConNotas.length,
                destacados: alumnosConNotas.filter(aid => mockData.calcularPromedioNotas(notasAsig.filter(n => n.alumno_id === aid)) >= 6.0).length,
                regulares: alumnosConNotas.filter(aid => { const p = mockData.calcularPromedioNotas(notasAsig.filter(n => n.alumno_id === aid)); return p >= 4.0 && p < 6.0; }).length,
                riesgo: alumnosConNotas.filter(aid => mockData.calcularPromedioNotas(notasAsig.filter(n => n.alumno_id === aid)) < 4.0).length,
                asignaturas: docente.asignaturas.map(a => a.nombre),
                asignaturasDetalle: docente.asignaturas,
                cursos: mockData.cursos.map(c => c.nombre),
                promediosPorCurso
            }
        });
    }

    const matchEstDocente = path.match(/^\/api\/estadisticas\/docente\/(\d+)$/);
    if (matchEstDocente) {
        const docenteId = parseInt(matchEstDocente[1]);
        const docente = mockData.docentes.find(d => d.id === docenteId) || mockData.docentes[0];
        const asigIds = docente.asignaturas.map(a => a.id);
        const notasDoc = mockData.notas.filter(n => asigIds.includes(n.asignatura_id));
        const promedio = mockData.calcularPromedioNotas(notasDoc);
        const alumnosIds = [...new Set(notasDoc.map(n => n.alumno_id))];
        const total = alumnosIds.length || 1;
        const aprobados = alumnosIds.filter(aid => mockData.calcularPromedioNotas(notasDoc.filter(n => n.alumno_id === aid)) >= 4.0).length;
        const destacados = alumnosIds.filter(aid => mockData.calcularPromedioNotas(notasDoc.filter(n => n.alumno_id === aid)) >= 6.0).length;
        const riesgo = alumnosIds.filter(aid => mockData.calcularPromedioNotas(notasDoc.filter(n => n.alumno_id === aid)) < 4.0).length;

        return res.json({
            success: true,
            data: {
                promedio,
                aprobacion: parseFloat((aprobados / total * 100).toFixed(1)),
                asistencia: 90,
                alumnos: alumnosIds.length,
                destacados,
                regulares: total - destacados - riesgo,
                riesgo,
                tendencia: [promedio - 0.2, promedio - 0.1, promedio, promedio + 0.15, promedio + 0.1],
                asignaturas: docente.asignaturas.map(a => a.nombre),
                asignaturasDetalle: docente.asignaturas,
                cursos: mockData.cursos.map(c => c.nombre)
            }
        });
    }

    // Estadísticas por asignatura
    const matchEstAsigPorCurso = path.match(/^\/api\/estadisticas\/asignatura\/(\d+)\/por-curso$/);
    if (matchEstAsigPorCurso) {
        const asigId = parseInt(matchEstAsigPorCurso[1]);
        const data = mockData.cursos.map(c => ({
            curso: c.nombre,
            promedio: mockData.calcularPromedioNotas(mockData.notas.filter(n => n.asignatura_id === asigId && n.curso_id === c.id))
        }));
        return res.json({ success: true, data });
    }

    const matchEstAsig = path.match(/^\/api\/estadisticas\/asignatura\/(\d+)$/);
    if (matchEstAsig) {
        const asigId = parseInt(matchEstAsig[1]);
        const notasAsig = mockData.notas.filter(n => n.asignatura_id === asigId);
        const promedio = mockData.calcularPromedioNotas(notasAsig);
        const alumnosIds = [...new Set(notasAsig.map(n => n.alumno_id))];
        const total = alumnosIds.length || 1;
        const aprobados = alumnosIds.filter(aid => mockData.calcularPromedioNotas(notasAsig.filter(n => n.alumno_id === aid)) >= 4.0).length;
        const destacados = alumnosIds.filter(aid => mockData.calcularPromedioNotas(notasAsig.filter(n => n.alumno_id === aid)) >= 6.0).length;
        const riesgo = alumnosIds.filter(aid => mockData.calcularPromedioNotas(notasAsig.filter(n => n.alumno_id === aid)) < 4.0).length;

        const promsPorCurso = mockData.cursos.map(c => ({
            curso: c.nombre,
            prom: mockData.calcularPromedioNotas(notasAsig.filter(n => n.curso_id === c.id))
        }));
        const mejor = promsPorCurso.reduce((a, b) => a.prom >= b.prom ? a : b);
        const peor = promsPorCurso.reduce((a, b) => a.prom <= b.prom ? a : b);

        return res.json({
            success: true,
            data: {
                promedio,
                aprobacion: parseFloat((aprobados / total * 100).toFixed(1)),
                asistencia: 90,
                alumnos: alumnosIds.length,
                destacados,
                regulares: total - destacados - riesgo,
                riesgo,
                mejorCurso: mejor.curso,
                peorCurso: peor.curso,
                docentes: mockData.docentes.filter(d => d.asignaturas.some(a => a.id === asigId)).length,
                tendencia: [promedio - 0.2, promedio, promedio + 0.1, promedio - 0.05, promedio + 0.15]
            }
        });
    }

    // Estadísticas asistencia
    if (path === '/api/estadisticas/asistencia/general' || path.match(/^\/api\/estadisticas\/asistencia\/curso\/(\d+)$/)) {
        const matchCursoAsist = path.match(/^\/api\/estadisticas\/asistencia\/curso\/(\d+)$/);
        let asistFiltrada = mockData.asistencia;
        let alumnosFiltrados = mockData.alumnos;
        if (matchCursoAsist) {
            const cid = parseInt(matchCursoAsist[1]);
            asistFiltrada = asistFiltrada.filter(a => a.curso_id === cid);
            alumnosFiltrados = alumnosFiltrados.filter(a => a.curso_id === cid);
        }
        const presentes = asistFiltrada.filter(a => a.estado === 'presente').length;
        const totalReg = asistFiltrada.length || 1;
        const pctGeneral = parseFloat((presentes / totalReg * 100).toFixed(1));

        const mesesNombres = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const mesesNum = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const asistenciaMensual = {};
        mesesNum.forEach((m, idx) => {
            const mesStr = String(m).padStart(2, '0');
            const del_mes = asistFiltrada.filter(a => a.fecha.startsWith(`2026-${mesStr}`));
            const pres_mes = del_mes.filter(a => a.estado === 'presente').length;
            asistenciaMensual[mesesNombres[idx]] = del_mes.length ? parseFloat((pres_mes / del_mes.length * 100).toFixed(1)) : 0;
        });

        const asist100 = alumnosFiltrados.filter(a => {
            const sus = asistFiltrada.filter(r => r.alumno_id === a.id);
            return sus.length > 0 && sus.every(r => r.estado === 'presente');
        }).length;

        const bajoUmbral = alumnosFiltrados.filter(a => {
            const sus = asistFiltrada.filter(r => r.alumno_id === a.id);
            if (!sus.length) return false;
            const pres = sus.filter(r => r.estado === 'presente').length;
            return (pres / sus.length * 100) < 85;
        }).length;

        return res.json({
            success: true,
            data: {
                promedioAsistencia: pctGeneral,
                totalAlumnos: alumnosFiltrados.length,
                asistencia100: asist100,
                bajoUmbral85: bajoUmbral,
                asistenciaMensual,
                alumnosDestacados: asist100,
                alumnosRegulares: alumnosFiltrados.length - asist100 - bajoUmbral,
                alumnosRiesgo: bajoUmbral
            }
        });
    }

    if (path === '/api/estadisticas/asistencia/por-curso') {
        const data = mockData.cursos.map(c => {
            const asistCurso = mockData.asistencia.filter(a => a.curso_id === c.id);
            const pres = asistCurso.filter(a => a.estado === 'presente').length;
            return {
                curso: c.nombre,
                promedioAsistencia: asistCurso.length ? parseFloat((pres / asistCurso.length * 100).toFixed(1)) : 0
            };
        });
        return res.json({ success: true, data });
    }

    if (path === '/api/estadisticas/asistencia/ranking') {
        const data = mockData.cursos.map(c => {
            const asistCurso = mockData.asistencia.filter(a => a.curso_id === c.id);
            const pres = asistCurso.filter(a => a.estado === 'presente').length;
            return {
                curso: c.nombre,
                promedioAsistencia: asistCurso.length ? parseFloat((pres / asistCurso.length * 100).toFixed(1)) : 0,
                curso_id: c.id
            };
        }).sort((a, b) => b.promedioAsistencia - a.promedioAsistencia);
        return res.json({ success: true, data });
    }

    // Riesgo detalle (popup)
    if (path === '/api/estadisticas/riesgo-detalle') {
        const alumnosRiesgo = mockData.alumnos
            .map(a => {
                const prom = mockData.calcularPromedioNotas(mockData.notas.filter(n => n.alumno_id === a.id));
                const asigRiesgo = mockData.asignaturasBase
                    .filter(asig => mockData.calcularPromedioNotas(mockData.notas.filter(n => n.alumno_id === a.id && n.asignatura_id === asig.id)) < 4.0)
                    .map(asig => asig.nombre);
                return { nombre_completo: a.nombre_completo, curso: a.curso_nombre, promedio: prom, asignaturas: asigRiesgo.join(', ') || 'Ninguna' };
            })
            .filter(a => a.promedio < 4.0);
        return res.json({ success: true, data: alumnosRiesgo });
    }

    // ==========================================
    // RUTAS DOCENTE
    // ==========================================

    // Cursos del docente
    if (path.match(/^\/api\/docente\/[^/]+\/cursos(\?|$)/)) {
        const cursosMap = new Map();
        if (mockData.asignaciones && mockData.asignaciones.length > 0) {
            mockData.asignaciones.forEach(a => {
                if (!cursosMap.has(a.curso_id)) {
                    cursosMap.set(a.curso_id, {
                        id: a.curso_id, nombre: a.curso_nombre,
                        nivel: a.nivel, letra: 'A', anio_academico: 2026
                    });
                }
            });
        } else {
            mockData.cursos.forEach(c => cursosMap.set(c.id, c));
        }
        return res.json({ success: true, data: Array.from(cursosMap.values()) });
    }

    // Asignaturas por curso del docente
    const matchAsigCursoDoc = path.match(/^\/api\/docente\/[^/]+\/asignaturas-por-curso\/(\d+)(\?|$)/);
    if (matchAsigCursoDoc) {
        const cursoId = parseInt(matchAsigCursoDoc[1]);
        const asigs = mockData.asignaciones
            .filter(a => a.curso_id === cursoId)
            .map(a => ({ id: a.asignatura_id, nombre: a.asignatura_nombre, asignatura_id: a.asignatura_id, asignatura_nombre: a.asignatura_nombre }));
        const unicos = [];
        const mapIds = new Set();
        asigs.forEach(item => { if (!mapIds.has(item.id)) { mapIds.add(item.id); unicos.push(item); } });
        return res.json({ success: true, data: unicos });
    }

    // Notas por asignatura (sábana docente)
    if (path.match(/^\/api\/docente\/\d+\/notas\/por-asignatura$/)) {
        const cursoId = parseInt(query.curso_id);
        const asigId = parseInt(query.asignatura_id);
        const notasCurso = mockData.notas.filter(n => n.curso_id === cursoId && n.asignatura_id === asigId);
        const alumnosCurso = mockData.alumnos.filter(a => a.curso_id === cursoId);
        const resultado = alumnosCurso.map(alum => {
            const susNotas = notasCurso.filter(n => n.alumno_id === alum.id);
            const ag = { 1: [], 2: [], 3: [] };
            susNotas.forEach((n, idx) => {
                if (ag[n.periodo]) ag[n.periodo].push({ numero: (idx % 8) + 1, nota: n.nota, es_pendiente: n.es_pendiente });
            });
            return { alumno_id: alum.id, alumno_nombres: alum.nombres, alumno_apellidos: alum.apellidos, notas_t1: ag[1], notas_t2: ag[2], notas_t3: ag[3] };
        });
        return res.json({ success: true, data: resultado });
    }

    // Progreso estadísticas docente
    if (path.match(/^\/api\/docente\/[^/]+\/progreso\/estadisticas(\?|$)/)) {
        const cursoId = query.curso_id ? parseInt(query.curso_id) : null;
        const asigId = query.asignatura_id ? parseInt(query.asignatura_id) : null;
        let notasFilt = mockData.notas;
        if (cursoId) notasFilt = notasFilt.filter(n => n.curso_id === cursoId);
        if (asigId) notasFilt = notasFilt.filter(n => n.asignatura_id === asigId);

        const alumnosIds = [...new Set(notasFilt.map(n => n.alumno_id))];
        const total = alumnosIds.length || 1;
        const promsAlumnos = alumnosIds.map(aid => ({
            aid,
            prom: mockData.calcularPromedioNotas(notasFilt.filter(n => n.alumno_id === aid))
        }));
        const aprobados = promsAlumnos.filter(a => a.prom >= 4.0).length;
        const promCurso = mockData.calcularPromedioNotas(notasFilt);
        const notas = notasFilt.map(n => parseFloat(n.nota));

        return res.json({
            success: true,
            data: {
                kpis: {
                    alumnosConNotas: alumnosIds.length,
                    aprobados,
                    reprobados: total - aprobados,
                    porcentajeAprobados: parseFloat((aprobados / total * 100).toFixed(1)),
                    porcentajeReprobados: parseFloat(((total - aprobados) / total * 100).toFixed(1)),
                    promedioCurso: promCurso,
                    notaMaxima: notas.length ? Math.max(...notas) : 0,
                    notaMinima: notas.length ? Math.min(...notas) : 0
                },
                distribucion: {
                    insuficiente: promsAlumnos.filter(a => a.prom < 4.0).length,
                    suficiente: promsAlumnos.filter(a => a.prom >= 4.0 && a.prom < 5.0).length,
                    bueno: promsAlumnos.filter(a => a.prom >= 5.0 && a.prom < 6.0).length,
                    excelente: promsAlumnos.filter(a => a.prom >= 6.0).length
                },
                top5: promsAlumnos
                    .sort((a, b) => b.prom - a.prom)
                    .slice(0, 5)
                    .map(a => {
                        const al = mockData.alumnos.find(al => al.id === a.aid);
                        return { nombre: al ? al.nombre_completo : `Alumno ${a.aid}`, promedio: a.prom };
                    }),
                alumnosAtencion: promsAlumnos
                    .filter(a => a.prom < 4.0)
                    .map(a => {
                        const al = mockData.alumnos.find(al => al.id === a.aid);
                        const notasRojas = mockData.asignaturasBase.filter(asig =>
                            mockData.calcularPromedioNotas(notasFilt.filter(n => n.alumno_id === a.aid && n.asignatura_id === asig.id)) < 4.0
                        ).length;
                        return { alumno_id: a.aid, nombre: al ? al.nombre_completo : `Alumno ${a.aid}`, promedio: a.prom, notasRojas, tendencia: 'estable' };
                    })
            }
        });
    }

    // Fechas con notas (para calendario ModificarNota)
    if (path.match(/^\/api\/docente\/[^/]+\/fechas-con-notas(\?|$)/)) {
        let notasFilt = mockData.notas;
        if (query.curso_id) notasFilt = notasFilt.filter(n => n.curso_id == query.curso_id);
        if (query.asignatura_id) notasFilt = notasFilt.filter(n => n.asignatura_id == query.asignatura_id);
        if (query.alumno_id) notasFilt = notasFilt.filter(n => n.alumno_id == query.alumno_id);
        const fechas = [...new Set(notasFilt.map(n => n.fecha))];
        return res.json({ success: true, data: fechas });
    }

    // Buscar notas (ModificarNota)
    if (path.match(/^\/api\/docente\/[^/]+\/notas\/buscar(\?|$)/)) {
        let notasFilt = mockData.notas;
        if (query.curso_id) notasFilt = notasFilt.filter(n => n.curso_id == query.curso_id);
        if (query.asignatura_id) notasFilt = notasFilt.filter(n => n.asignatura_id == query.asignatura_id);
        if (query.alumno_id) notasFilt = notasFilt.filter(n => n.alumno_id == query.alumno_id);
        if (query.fecha) notasFilt = notasFilt.filter(n => n.fecha === query.fecha);

        const resultado = notasFilt.slice(0, 50).map(n => {
            const alumno = mockData.alumnos.find(a => a.id === n.alumno_id);
            const asig = mockData.asignaturasBase.find(a => a.id === n.asignatura_id);
            const curso = mockData.cursos.find(c => c.id === n.curso_id);
            return {
                id: n.id,
                alumno_id: n.alumno_id,
                alumno_nombres: alumno ? alumno.nombres : '',
                alumno_apellidos: alumno ? alumno.apellidos : '',
                asignatura_nombre: asig ? asig.nombre : '',
                curso_nombre: curso ? curso.nombre : '',
                nota: n.nota,
                trimestre: n.periodo,
                fecha_evaluacion: n.fecha,
                comentario: '',
                es_pendiente: n.es_pendiente ? 1 : 0
            };
        });
        return res.json({ success: true, data: resultado });
    }

    // ==========================================
    // RUTAS APODERADO
    // ==========================================

    // Mis pupilos
    if (path.match(/^\/api\/apoderado\/mis-pupilos\//)) {
        return res.json({
            success: true,
            data: mockData.apoderadoPupilos.map(p => ({
                id: p.id, nombres: p.nombres, apellidos: p.apellidos,
                curso_nombre: p.curso_nombre, rut: p.rut,
                fecha_nacimiento: p.fecha_nacimiento, sexo: p.sexo,
                establecimiento_id: 1, establecimiento_nombre: 'Colegio Demo'
            }))
        });
    }

    // Pupilos pendientes
    if (path.match(/^\/api\/apoderado\/pupilos-pendientes\//)) {
        return res.json({ success: true, data: [] });
    }

    // Notas del pupilo
    const matchPupiloNotas = path.match(/^\/api\/apoderado\/pupilo\/(\d+)\/notas$/);
    if (matchPupiloNotas) {
        const pupiloId = parseInt(matchPupiloNotas[1]);
        const notasPupilo = mockData.notas.filter(n => n.alumno_id === pupiloId);
        const resultado = notasPupilo.map(n => {
            const asig = mockData.asignaturasBase.find(a => a.id === n.asignatura_id);
            return {
                id: n.id,
                alumno_id: n.alumno_id,
                asignatura: asig ? asig.nombre : `Asignatura ${n.asignatura_id}`,
                trimestre: n.periodo,
                nota: parseFloat(n.nota),
                fecha: n.fecha,
                numero_evaluacion: (notasPupilo.filter(x => x.asignatura_id === n.asignatura_id && x.periodo === n.periodo).indexOf(n)) + 1,
                comentario: '',
                es_pendiente: n.es_pendiente ? 1 : 0
            };
        });
        return res.json({ success: true, data: resultado });
    }

    // Comunicados del pupilo
    const matchPupiloCom = path.match(/^\/api\/apoderado\/pupilo\/(\d+)\/comunicados$/);
    if (matchPupiloCom) {
        return res.json({ success: true, data: mockData.comunicados });
    }

    // Progreso del pupilo
    const matchPupiloProgreso = path.match(/^\/api\/apoderado\/pupilo\/(\d+)\/progreso$/);
    if (matchPupiloProgreso) {
        const pupiloId = parseInt(matchPupiloProgreso[1]);
        const notasPupilo = mockData.notas.filter(n => n.alumno_id === pupiloId);
        const promedio = mockData.calcularPromedioNotas(notasPupilo);
        const aprobadas = mockData.asignaturasBase.filter(a => {
            return mockData.calcularPromedioNotas(notasPupilo.filter(n => n.asignatura_id === a.id)) >= 4.0;
        }).length;
        const totalAsig = mockData.asignaturasBase.length;

        const promediosPorAsignatura = {};
        mockData.asignaturasBase.forEach(a => {
            promediosPorAsignatura[a.nombre] = mockData.calcularPromedioNotas(notasPupilo.filter(n => n.asignatura_id === a.id));
        });

        const promediosMensuales = {};
        [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(m => {
            const mesStr = String(m).padStart(2, '0');
            const del_mes = notasPupilo.filter(n => n.fecha && n.fecha.includes(`-${mesStr}-`));
            promediosMensuales[m] = del_mes.length ? mockData.calcularPromedioNotas(del_mes) : null;
        });

        const asistPupilo = mockData.asistencia.filter(a => a.alumno_id === pupiloId);
        const presentes = asistPupilo.filter(a => a.estado === 'presente').length;
        const pctAsist = asistPupilo.length ? parseFloat((presentes / asistPupilo.length * 100).toFixed(1)) : 0;

        return res.json({
            success: true,
            data: {
                estadisticas: {
                    promedio,
                    porcentajeAprobacion: parseFloat((aprobadas / totalAsig * 100).toFixed(1)),
                    totalNotas: notasPupilo.length
                },
                promediosPorAsignatura,
                promediosMensuales,
                asignaturas: mockData.asignaturasBase.map(a => a.nombre),
                asistencia: { porcentaje: pctAsist }
            }
        });
    }

    // Si no match, next()
    // ==========================================
    // RUTAS CHAT (MOCKED FOR REAL-TIME DEMO)
    // ==========================================

    if (path.startsWith('/api/chat')) {
        console.log(`[DEMO CHAT] ${method} ${path}`);

        // 1. Contactos
        if (path === '/api/chat/contactos') {
            const userId = parseInt(query.usuario_id);
            // Retornar lista combinada: Admin + Docentes + Apoderado (si es docente quien pide)
            // Simplificado: Retorna todos menos el propio usuario
            const contactos = [
                { usuario_id: 1, nombre_completo: 'Administrador Demo', tipo: 'administrador', es_admin: 1, mensajes_no_leidos: 0 },
                ...mockData.docentes.map(d => ({
                    usuario_id: d.id + 10, // Offset para evitar colision con admin (ID 1)
                    nombre_completo: d.nombre_completo,
                    tipo: 'docente',
                    es_admin: 0,
                    mensajes_no_leidos: 0,
                    asignaturas: d.asignaturas.map(a => a.nombre).join(', ')
                })),
                // Apoderado Demo
                { usuario_id: 99, nombre_completo: 'Juan Perez (Apoderado)', tipo: 'apoderado', es_admin: 0, mensajes_no_leidos: 0 }
            ].filter(c => c.usuario_id !== userId);

            return res.json({ success: true, data: contactos });
        }

        // 2. Conversaciones
        if (path === '/api/chat/conversaciones') {
            const userId = parseInt(query.usuario_id);
            const misConvs = mockConversations.filter(c => c.usuario1_id === userId || c.usuario2_id === userId);

            // Enriquecer con datos del otro usuario
            const enriquecidas = misConvs.map(c => {
                const otroId = c.usuario1_id === userId ? c.usuario2_id : c.usuario1_id;
                let otroUsuario = { nombre_completo: `Usuario ${otroId}`, tipo_usuario: 'desconocido' };

                if (otroId === 1) otroUsuario = { nombre_completo: 'Administrador Demo', tipo_usuario: 'administrador' };
                else if (otroId === 99) otroUsuario = { nombre_completo: 'Juan Perez', tipo_usuario: 'apoderado' };
                else {
                    const doc = mockData.docentes.find(d => d.id + 10 === otroId);
                    if (doc) otroUsuario = { nombre_completo: doc.nombre_completo, tipo_usuario: 'docente' };
                }

                return {
                    ...c,
                    otro_usuario: otroUsuario,
                    mensajes_no_leidos: 0 // Simplificado
                };
            });

            return res.json({ success: true, data: enriquecidas });
        }

        // 3. Mensajes de una conversación
        const matchMensajes = path.match(/^\/api\/chat\/conversacion\/(\d+)\/mensajes$/);
        if (matchMensajes && method === 'GET') {
            const convId = parseInt(matchMensajes[1]);
            const msgs = mockMessages.filter(m => m.conversacion_id === convId);
            // Sort by date ASC
            msgs.sort((a, b) => new Date(a.fecha_envio) - new Date(b.fecha_envio));

            // Add direction relative to requester
            const userId = parseInt(query.usuario_id);
            const mapped = msgs.map(m => ({
                ...m,
                direccion: m.remitente_id === userId ? 'enviado' : 'recibido'
            }));

            return res.json({ success: true, data: mapped });
        }

        // 4. Crear conversación
        if (path === '/api/chat/conversacion' && method === 'POST') {
            const { usuario_id, otro_usuario_id } = req.body;
            // Verificar si existe
            let conv = mockConversations.find(c =>
                (c.usuario1_id === usuario_id && c.usuario2_id === otro_usuario_id) ||
                (c.usuario1_id === otro_usuario_id && c.usuario2_id === usuario_id)
            );

            if (conv) {
                return res.json({ success: true, data: { id: conv.id, respuesta_habilitada: conv.respuesta_habilitada } });
            }

            const newConv = {
                id: nextConvId++,
                usuario1_id: usuario_id,
                usuario2_id: otro_usuario_id,
                establecimiento_id: 1,
                activo: 1,
                respuesta_habilitada: 1, // Default enabled
                created_at: new Date().toISOString()
            };
            mockConversations.push(newConv);

            return res.json({ success: true, data: { id: newConv.id, respuesta_habilitada: 1 } });
        }

        // 5. Enviar Mensaje
        if (path === '/api/chat/mensaje' && method === 'POST') {
            const { conversacion_id, remitente_id, mensaje } = req.body;

            const newMsg = {
                id: nextMsgId++,
                conversacion_id: parseInt(conversacion_id),
                remitente_id: remitente_id,
                mensaje: mensaje,
                tipo_mensaje: 'texto',
                fecha_envio: new Date().toISOString(),
                leido: 0
            };
            mockMessages.push(newMsg);

            // Update conversation last message
            const conv = mockConversations.find(c => c.id === parseInt(conversacion_id));
            if (conv) {
                // Socket Emit
                if (req.io) {
                    const otroId = conv.usuario1_id === remitente_id ? conv.usuario2_id : conv.usuario1_id;

                    // Al destinatario
                    req.io.to(`user_${otroId}`).emit('nuevo_mensaje', {
                        ...newMsg,
                        direccion: 'recibido'
                    });

                    // Al remitente (confirmación)
                    req.io.to(`user_${remitente_id}`).emit('nuevo_mensaje', {
                        ...newMsg,
                        direccion: 'enviado'
                    });
                }
            }

            return res.json({ success: true, data: newMsg });
        }

        // 6. No leídos (Mocked)
        if (path === '/api/chat/no-leidos') {
            return res.json({ success: true, data: { total_no_leidos: 0 } });
        }

        // 7. Marcar leído (Mocked)
        const matchLeido = path.match(/^\/api\/chat\/conversacion\/(\d+)\/leer-todos$/);
        if (matchLeido && method === 'PUT') {
            return res.json({ success: true });
        }

        // 8. Habilitar respuesta
        const matchHabilitar = path.match(/^\/api\/chat\/conversacion\/(\d+)\/habilitar-respuesta$/);
        if (matchHabilitar && method === 'PUT') {
            const convId = parseInt(matchHabilitar[1]);
            const { habilitado } = req.body;
            const conv = mockConversations.find(c => c.id === convId);
            if (conv) {
                conv.respuesta_habilitada = habilitado ? 1 : 0;

                // Notificar cambio de estado por socket
                if (req.io) {
                    req.io.to(`user_${conv.usuario1_id}`).emit('chat_estado_actualizado', { conversacion_id: convId, habilitado });
                    req.io.to(`user_${conv.usuario2_id}`).emit('chat_estado_actualizado', { conversacion_id: convId, habilitado });
                }
            }
            return res.json({ success: true });
        }

        // 9. Cursos del docente (para chat)
        const matchChatCursos = path.match(/^\/api\/chat\/docente\/(\d+)\/cursos$/);
        if (matchChatCursos) {
            // Reutilizar lógica de cursos general
            return res.json({ success: true, data: mockData.cursos });
        }

        // 10. Alumnos de un curso (para chat - con datos de apoderado)
        const matchChatAlumnos = path.match(/^\/api\/chat\/curso\/(\d+)\/alumnos-chat$/);
        if (matchChatAlumnos) {
            const cursoId = parseInt(matchChatAlumnos[1]);
            const alumnos = mockData.alumnos.filter(a => a.curso_id === cursoId).map(a => ({
                alumno_id: a.id,
                nombre_alumno: a.nombre_completo,
                apoderado_usuario_id: 99, // Todos apuntan al apoderado demo por simplicidad
                nombre_apoderado: 'Juan Perez'
            }));
            return res.json({ success: true, data: alumnos });
        }

        // 11. Nuevos mensajes (Polling)
        if (path === '/api/chat/nuevos-mensajes') {
            const timestamp = query.timestamp;
            const userId = parseInt(query.usuario_id);

            let nuevos = [];
            if (timestamp) {
                nuevos = mockMessages.filter(m =>
                    (m.remitente_id === userId ||
                        mockConversations.find(c => c.id === m.conversacion_id && (c.usuario1_id === userId || c.usuario2_id === userId))) &&
                    new Date(m.fecha_envio) > new Date(timestamp)
                );
            }

            // Mapear dirección
            const mapped = nuevos.map(m => ({
                ...m,
                direccion: m.remitente_id === userId ? 'enviado' : 'recibido'
            }));

            return res.json({ success: true, data: mapped, timestamp: new Date().toISOString() });
        }

        // Fallback for other chat routes
        return res.json({ success: true, message: 'Chat route mocked', data: [] });
    }

    next();
};
