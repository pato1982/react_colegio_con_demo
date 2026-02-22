/**
 * Interceptor Demo del lado del cliente
 *
 * Reemplaza window.fetch para rutas /api/ y devuelve datos estáticos
 * embebidos en el frontend. NO hace llamadas de red.
 *
 * Solo se activa en modo demo (VITE_APP_MODE=demo o por defecto).
 */

import {
    cursos, asignaturasBase, asignaciones, alumnos, docentes,
    notas, asistencia, comunicados, apoderadoDetalle, apoderadoPupilos,
    users, calcularPromedio
} from '../data/demoData';

// ==========================================
// INSTALACIÓN
// ==========================================
const originalFetch = window.fetch.bind(window);

export function instalarDemoInterceptor() {
    console.log('[DEMO] Interceptor instalado - datos estáticos, sin servidor');

    window.fetch = async (url, options = {}) => {
        // Solo interceptar URLs que contengan /api/
        if (typeof url === 'string' && url.includes('/api/')) {
            const result = handleRequest(url, options);
            if (result !== null) {
                // Simular un pequeño delay para que se vea natural
                await new Promise(r => setTimeout(r, 50));
                return new Response(JSON.stringify(result), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        // Para todo lo demás (assets, HMR, etc.) usar fetch original
        return originalFetch(url, options);
    };
}

// ==========================================
// ROUTER DE PETICIONES
// ==========================================
function handleRequest(url, options) {
    const method = (options.method || 'GET').toUpperCase();
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    const query = Object.fromEntries(urlObj.searchParams);

    // POST/PUT/DELETE -> éxito simulado
    if (method !== 'GET') {
        // Login demo
        if (path.endsWith('/auth/login')) {
            return handleLogin(options);
        }
        // Verificar sesión
        if (path.endsWith('/auth/me')) {
            return handleAuthMe();
        }
        return { success: true, message: 'Operación realizada exitosamente' };
    }

    // Auth me (GET)
    if (path.endsWith('/auth/me')) {
        return handleAuthMe();
    }

    // ==========================================
    // RUTAS GENERALES
    // ==========================================
    if (path.endsWith('/establecimientos')) {
        return { success: true, establecimientos: ['Colegio Demo'], data: [{ id: 1, nombre: 'Colegio Demo' }] };
    }
    if (path.endsWith('/cursos') && !path.includes('estadisticas') && !path.includes('asignatura') && !path.includes('docente')) {
        return { success: true, data: cursos };
    }
    if (path.endsWith('/asignaturas') && !path.includes('por-curso') && !path.includes('estadisticas') && !path.includes('docente')) {
        return { success: true, data: asignaturasBase };
    }

    // Asignaturas por curso
    let m = path.match(/\/asignaturas\/por-curso\/(\d+)$/);
    if (m) {
        return { success: true, data: asignaturasBase.map(a => ({ ...a, codigo: `ASIG-${a.id}` })) };
    }

    // ==========================================
    // ALUMNOS
    // ==========================================
    if (path.endsWith('/alumnos/por-curso')) {
        const agrupa = {};
        cursos.forEach(c => { agrupa[c.nombre] = alumnos.filter(a => a.curso_id === c.id); });
        return { success: true, data: agrupa };
    }

    if (path.endsWith('/alumnos') && !path.includes('curso/')) {
        let data = alumnos;
        if (query.curso_id) data = data.filter(a => a.curso_id == query.curso_id);
        return { success: true, data };
    }

    m = path.match(/\/alumnos\/(\d+)\/detalle$/);
    if (m) {
        const alumno = alumnos.find(a => a.id === parseInt(m[1]));
        if (!alumno) return { success: false, error: 'Alumno no encontrado' };
        return {
            success: true,
            data: {
                alumno: {
                    ...alumno, alergias: 'Ninguna', enfermedades_cronicas: 'Ninguna',
                    tiene_nee: 0, detalle_nee: '', contacto_emergencia_nombre: 'Contacto Emergencia Demo',
                    contacto_emergencia_telefono: '+56 9 1111 2222', matricula_id: alumno.id, anio_academico: 2026
                },
                apoderado: apoderadoDetalle
            }
        };
    }

    m = path.match(/\/curso\/(\d+)\/alumnos$/);
    if (m) {
        const lista = alumnos.filter(a => a.curso_id === parseInt(m[1]))
            .map((a, idx) => ({ ...a, numero_lista: idx + 1 }));
        return { success: true, data: lista };
    }

    // ==========================================
    // DOCENTES
    // ==========================================
    if (path.endsWith('/docentes') && !path.includes('estadisticas')) {
        return { success: true, data: docentes };
    }

    // ==========================================
    // ASIGNACIONES
    // ==========================================
    if (path.endsWith('/asignaciones') && !path.includes('estadisticas')) {
        return { success: true, data: asignaciones };
    }

    // ==========================================
    // MATRICULAS
    // ==========================================
    m = path.match(/\/matriculas\/apoderado\//);
    if (m) {
        return {
            success: true,
            data: { nombres: apoderadoDetalle.nombres, apellidos: apoderadoDetalle.apellidos, email: apoderadoDetalle.email, telefono: apoderadoDetalle.telefono }
        };
    }

    // ==========================================
    // NOTAS POR CURSO (Admin)
    // ==========================================
    if (path.endsWith('/notas/por-curso') && !path.includes('docente')) {
        const cursoId = parseInt(query.curso_id);
        const asigId = parseInt(query.asignatura_id);
        const tri = query.trimestre ? parseInt(query.trimestre) : null;
        const alumnosCurso = alumnos.filter(a => a.curso_id === cursoId);
        const resultado = alumnosCurso.map(alum => {
            const na = notas.filter(n => n.alumno_id === alum.id && n.asignatura_id === asigId);
            const notasObj = {};
            (tri ? [tri] : [1, 2, 3]).forEach(t => {
                notasObj[t] = na.filter(n => n.periodo === t).map((n, i) => ({ numero: i + 1, nota: n.nota }));
            });
            return { id: alum.id, nombre_completo: alum.nombre_completo, notas: notasObj };
        });
        return { success: true, data: resultado, trimestres: [{ id: 1, nombre: 'Trimestre 1' }, { id: 2, nombre: 'Trimestre 2' }, { id: 3, nombre: 'Trimestre 3' }] };
    }

    // ==========================================
    // ASISTENCIA
    // ==========================================
    m = path.match(/\/asistencia\/verificar\/(\d+)\/(.+)$/);
    if (m) {
        const cid = parseInt(m[1]);
        const fecha = m[2];
        const asis = asistencia.filter(a => a.curso_id === cid && a.fecha === fecha);
        const map = {};
        asis.forEach(a => { map[a.alumno_id] = { estado: a.estado === 'atrasado' ? 'tardio' : a.estado, observacion: '' }; });
        return { success: true, existe: asis.length > 0, data: map };
    }

    // ==========================================
    // ESTADÍSTICAS (13 endpoints)
    // ==========================================
    if (path.endsWith('/estadisticas/cursos')) {
        return { success: true, data: cursos.map(c => ({ id: c.id, nombre: c.nombre })) };
    }
    if (path.endsWith('/estadisticas/docentes')) {
        return { success: true, data: docentes.map(d => ({ id: d.id, nombre: d.nombre_completo, asignaturas: d.asignaturas.map(a => a.nombre).join(', ') })) };
    }
    if (path.endsWith('/estadisticas/asignaturas')) {
        return { success: true, data: asignaturasBase.map(a => ({ id: a.id, nombre: a.nombre })) };
    }

    if (path.endsWith('/estadisticas/general')) {
        const prom = calcularPromedio(notas);
        const total = alumnos.length;
        const dest = alumnos.filter(a => calcularPromedio(notas.filter(n => n.alumno_id === a.id)) >= 6.0).length;
        const riesgo = alumnos.filter(a => calcularPromedio(notas.filter(n => n.alumno_id === a.id)) < 4.0).length;
        const pres = asistencia.filter(a => a.estado === 'presente').length;
        return {
            success: true,
            data: {
                promedio: prom, aprobacion: 100 - (riesgo / total * 100), asistencia: parseFloat((pres / asistencia.length * 100).toFixed(1)),
                alumnos: total, destacados: dest, regulares: total - dest - riesgo, riesgo,
                tendencia: [prom - 0.3, prom - 0.1, prom, prom + 0.1, prom + 0.2], meses: ['Mar', 'Abr', 'May', 'Jun', 'Jul']
            }
        };
    }

    if (path.endsWith('/estadisticas/general/asignaturas')) {
        return { success: true, data: asignaturasBase.map(a => ({ asignatura: a.nombre, promedio: calcularPromedio(notas.filter(n => n.asignatura_id === a.id)) })) };
    }

    if (path.endsWith('/estadisticas/general/ranking-cursos')) {
        return {
            success: true,
            data: cursos.map(c => {
                const nc = notas.filter(n => n.curso_id === c.id);
                const ac = asistencia.filter(a => a.curso_id === c.id);
                const p = ac.filter(a => a.estado === 'presente').length;
                return { curso: c.nombre, promedio: calcularPromedio(nc), promedioAsistencia: ac.length ? parseFloat((p / ac.length * 100).toFixed(1)) : 0 };
            })
        };
    }

    if (path.endsWith('/estadisticas/general/distribucion')) {
        const dest = alumnos.filter(a => calcularPromedio(notas.filter(n => n.alumno_id === a.id)) >= 6.0).length;
        const riesgo = alumnos.filter(a => calcularPromedio(notas.filter(n => n.alumno_id === a.id)) < 4.0).length;
        return { success: true, data: { destacados: dest, regulares: alumnos.length - dest - riesgo, enRiesgo: riesgo } };
    }

    // Estadísticas por curso
    m = path.match(/\/estadisticas\/curso\/(\d+)\/asignaturas$/);
    if (m) {
        const cid = parseInt(m[1]);
        return { success: true, data: asignaturasBase.map(a => ({ asignatura: a.nombre, promedio: calcularPromedio(notas.filter(n => n.curso_id === cid && n.asignatura_id === a.id)) })) };
    }

    m = path.match(/\/estadisticas\/curso\/(\d+)$/);
    if (m) {
        const cid = parseInt(m[1]);
        return { success: true, data: calcularEstadisticasCurso(cid) };
    }

    // Estadísticas por docente
    m = path.match(/\/estadisticas\/docente\/(\d+)\/asignatura\/(\d+)$/);
    if (m) {
        const did = parseInt(m[1]);
        const aid = parseInt(m[2]);
        const doc = docentes.find(d => d.id === did) || docentes[0];
        const na = notas.filter(n => n.asignatura_id === aid);
        const ids = [...new Set(na.map(n => n.alumno_id))];
        const total = ids.length || 1;
        const apr = ids.filter(id => calcularPromedio(na.filter(n => n.alumno_id === id)) >= 4.0).length;
        return {
            success: true,
            data: {
                promedio: calcularPromedio(na), aprobacion: parseFloat((apr / total * 100).toFixed(1)), asistencia: 90,
                alumnos: ids.length,
                destacados: ids.filter(id => calcularPromedio(na.filter(n => n.alumno_id === id)) >= 6.0).length,
                regulares: ids.filter(id => { const p = calcularPromedio(na.filter(n => n.alumno_id === id)); return p >= 4.0 && p < 6.0; }).length,
                riesgo: ids.filter(id => calcularPromedio(na.filter(n => n.alumno_id === id)) < 4.0).length,
                asignaturas: doc.asignaturas.map(a => a.nombre), asignaturasDetalle: doc.asignaturas,
                cursos: cursos.map(c => c.nombre),
                promediosPorCurso: cursos.map(c => ({ curso: c.nombre, promedio: calcularPromedio(na.filter(n => n.curso_id === c.id)) }))
            }
        };
    }

    m = path.match(/\/estadisticas\/docente\/(\d+)$/);
    if (m) {
        const doc = docentes.find(d => d.id === parseInt(m[1])) || docentes[0];
        const aIds = doc.asignaturas.map(a => a.id);
        const nd = notas.filter(n => aIds.includes(n.asignatura_id));
        const prom = calcularPromedio(nd);
        const ids = [...new Set(nd.map(n => n.alumno_id))];
        const total = ids.length || 1;
        const apr = ids.filter(id => calcularPromedio(nd.filter(n => n.alumno_id === id)) >= 4.0).length;
        const dest = ids.filter(id => calcularPromedio(nd.filter(n => n.alumno_id === id)) >= 6.0).length;
        const riesgo = ids.filter(id => calcularPromedio(nd.filter(n => n.alumno_id === id)) < 4.0).length;
        return {
            success: true,
            data: {
                promedio: prom, aprobacion: parseFloat((apr / total * 100).toFixed(1)), asistencia: 90,
                alumnos: ids.length, destacados: dest, regulares: total - dest - riesgo, riesgo,
                tendencia: [prom - 0.2, prom - 0.1, prom, prom + 0.15, prom + 0.1],
                asignaturas: doc.asignaturas.map(a => a.nombre), asignaturasDetalle: doc.asignaturas, cursos: cursos.map(c => c.nombre)
            }
        };
    }

    // Estadísticas por asignatura
    m = path.match(/\/estadisticas\/asignatura\/(\d+)\/por-curso$/);
    if (m) {
        const aid = parseInt(m[1]);
        return { success: true, data: cursos.map(c => ({ curso: c.nombre, promedio: calcularPromedio(notas.filter(n => n.asignatura_id === aid && n.curso_id === c.id)) })) };
    }

    m = path.match(/\/estadisticas\/asignatura\/(\d+)$/);
    if (m) {
        const aid = parseInt(m[1]);
        const na = notas.filter(n => n.asignatura_id === aid);
        const prom = calcularPromedio(na);
        const ids = [...new Set(na.map(n => n.alumno_id))];
        const total = ids.length || 1;
        const dest = ids.filter(id => calcularPromedio(na.filter(n => n.alumno_id === id)) >= 6.0).length;
        const riesgo = ids.filter(id => calcularPromedio(na.filter(n => n.alumno_id === id)) < 4.0).length;
        const porCurso = cursos.map(c => ({ curso: c.nombre, prom: calcularPromedio(na.filter(n => n.curso_id === c.id)) }));
        const mejor = porCurso.reduce((a, b) => a.prom >= b.prom ? a : b);
        const peor = porCurso.reduce((a, b) => a.prom <= b.prom ? a : b);
        return {
            success: true,
            data: {
                promedio: prom, aprobacion: parseFloat(((total - riesgo) / total * 100).toFixed(1)), asistencia: 90,
                alumnos: ids.length, destacados: dest, regulares: total - dest - riesgo, riesgo,
                mejorCurso: mejor.curso, peorCurso: peor.curso,
                docentes: docentes.filter(d => d.asignaturas.some(a => a.id === aid)).length,
                tendencia: [prom - 0.2, prom, prom + 0.1, prom - 0.05, prom + 0.15]
            }
        };
    }

    // Estadísticas asistencia
    if (path.endsWith('/estadisticas/asistencia/por-curso')) {
        return {
            success: true,
            data: cursos.map(c => {
                const ac = asistencia.filter(a => a.curso_id === c.id);
                const p = ac.filter(a => a.estado === 'presente').length;
                return { curso: c.nombre, promedioAsistencia: ac.length ? parseFloat((p / ac.length * 100).toFixed(1)) : 0 };
            })
        };
    }

    if (path.endsWith('/estadisticas/asistencia/ranking')) {
        return {
            success: true,
            data: cursos.map(c => {
                const ac = asistencia.filter(a => a.curso_id === c.id);
                const p = ac.filter(a => a.estado === 'presente').length;
                return { curso: c.nombre, promedioAsistencia: ac.length ? parseFloat((p / ac.length * 100).toFixed(1)) : 0, curso_id: c.id };
            }).sort((a, b) => b.promedioAsistencia - a.promedioAsistencia)
        };
    }

    if (path.includes('/estadisticas/asistencia/')) {
        m = path.match(/\/estadisticas\/asistencia\/curso\/(\d+)$/);
        let af = asistencia;
        let alumF = alumnos;
        if (m) {
            const cid = parseInt(m[1]);
            af = af.filter(a => a.curso_id === cid);
            alumF = alumF.filter(a => a.curso_id === cid);
        }
        const pres = af.filter(a => a.estado === 'presente').length;
        const pct = parseFloat((pres / (af.length || 1) * 100).toFixed(1));
        const mesesN = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const asistenciaMensual = {};
        [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((m, i) => {
            const ms = String(m).padStart(2, '0');
            const del_m = af.filter(a => a.fecha.startsWith(`2026-${ms}`));
            const p_m = del_m.filter(a => a.estado === 'presente').length;
            asistenciaMensual[mesesN[i]] = del_m.length ? parseFloat((p_m / del_m.length * 100).toFixed(1)) : 0;
        });
        const a100 = alumF.filter(a => { const s = af.filter(r => r.alumno_id === a.id); return s.length > 0 && s.every(r => r.estado === 'presente'); }).length;
        const bajo85 = alumF.filter(a => { const s = af.filter(r => r.alumno_id === a.id); if (!s.length) return false; return (s.filter(r => r.estado === 'presente').length / s.length * 100) < 85; }).length;
        return {
            success: true,
            data: { promedioAsistencia: pct, totalAlumnos: alumF.length, asistencia100: a100, bajoUmbral85: bajo85, asistenciaMensual, alumnosDestacados: a100, alumnosRegulares: alumF.length - a100 - bajo85, alumnosRiesgo: bajo85 }
        };
    }

    if (path.endsWith('/estadisticas/riesgo-detalle')) {
        const riesgo = alumnos
            .map(a => {
                const prom = calcularPromedio(notas.filter(n => n.alumno_id === a.id));
                const asigR = asignaturasBase.filter(as => calcularPromedio(notas.filter(n => n.alumno_id === a.id && n.asignatura_id === as.id)) < 4.0).map(as => as.nombre);
                return { nombre_completo: a.nombre_completo, curso: a.curso_nombre, promedio: prom, asignaturas: asigR.join(', ') || 'Ninguna' };
            })
            .filter(a => a.promedio < 4.0);
        return { success: true, data: riesgo };
    }

    // ==========================================
    // DOCENTE
    // ==========================================
    m = path.match(/\/docente\/[^/]+\/cursos/);
    if (m) {
        const cursosUnicos = new Map();
        asignaciones.forEach(a => { if (!cursosUnicos.has(a.curso_id)) cursosUnicos.set(a.curso_id, { id: a.curso_id, nombre: a.curso_nombre, nivel: a.nivel, letra: 'A', anio_academico: 2026 }); });
        return { success: true, data: Array.from(cursosUnicos.values()) };
    }

    m = path.match(/\/docente\/[^/]+\/asignaturas-por-curso\/(\d+)/);
    if (m) {
        const cid = parseInt(m[1]);
        const unicos = [];
        const seen = new Set();
        asignaciones.filter(a => a.curso_id === cid).forEach(a => {
            if (!seen.has(a.asignatura_id)) { seen.add(a.asignatura_id); unicos.push({ id: a.asignatura_id, nombre: a.asignatura_nombre, asignatura_id: a.asignatura_id, asignatura_nombre: a.asignatura_nombre }); }
        });
        return { success: true, data: unicos };
    }

    // Notas por asignatura (sábana docente)
    m = path.match(/\/docente\/\d+\/notas\/por-asignatura$/);
    if (m) {
        const cid = parseInt(query.curso_id);
        const aid = parseInt(query.asignatura_id);
        const nc = notas.filter(n => n.curso_id === cid && n.asignatura_id === aid);
        const ac = alumnos.filter(a => a.curso_id === cid);
        const resultado = ac.map(alum => {
            const sn = nc.filter(n => n.alumno_id === alum.id);
            const ag = { 1: [], 2: [], 3: [] };
            sn.forEach((n, idx) => { if (ag[n.periodo]) ag[n.periodo].push({ numero: (idx % 8) + 1, nota: n.nota, es_pendiente: n.es_pendiente }); });
            return { alumno_id: alum.id, alumno_nombres: alum.nombres, alumno_apellidos: alum.apellidos, notas_t1: ag[1], notas_t2: ag[2], notas_t3: ag[3] };
        });
        return { success: true, data: resultado };
    }

    // Progreso estadísticas docente
    m = path.match(/\/docente\/[^/]+\/progreso\/estadisticas/);
    if (m) {
        let nf = notas;
        if (query.curso_id) nf = nf.filter(n => n.curso_id == query.curso_id);
        if (query.asignatura_id) nf = nf.filter(n => n.asignatura_id == query.asignatura_id);
        const ids = [...new Set(nf.map(n => n.alumno_id))];
        const total = ids.length || 1;
        const proms = ids.map(aid => ({ aid, prom: calcularPromedio(nf.filter(n => n.alumno_id === aid)) }));
        const apr = proms.filter(a => a.prom >= 4.0).length;
        const promC = calcularPromedio(nf);
        const vals = nf.map(n => n.nota);
        return {
            success: true,
            data: {
                kpis: {
                    alumnosConNotas: ids.length, aprobados: apr, reprobados: total - apr,
                    porcentajeAprobados: parseFloat((apr / total * 100).toFixed(1)),
                    porcentajeReprobados: parseFloat(((total - apr) / total * 100).toFixed(1)),
                    promedioCurso: promC, notaMaxima: vals.length ? Math.max(...vals) : 0, notaMinima: vals.length ? Math.min(...vals) : 0
                },
                distribucion: {
                    insuficiente: proms.filter(a => a.prom < 4.0).length,
                    suficiente: proms.filter(a => a.prom >= 4.0 && a.prom < 5.0).length,
                    bueno: proms.filter(a => a.prom >= 5.0 && a.prom < 6.0).length,
                    excelente: proms.filter(a => a.prom >= 6.0).length
                },
                top5: proms.sort((a, b) => b.prom - a.prom).slice(0, 5).map(a => {
                    const al = alumnos.find(x => x.id === a.aid);
                    return { nombre: al ? al.nombre_completo : `Alumno ${a.aid}`, promedio: a.prom };
                }),
                alumnosAtencion: proms.filter(a => a.prom < 4.0).map(a => {
                    const al = alumnos.find(x => x.id === a.aid);
                    return { alumno_id: a.aid, nombre: al ? al.nombre_completo : `Alumno ${a.aid}`, promedio: a.prom, notasRojas: 2, tendencia: 'estable' };
                })
            }
        };
    }

    // Fechas con notas
    m = path.match(/\/docente\/[^/]+\/fechas-con-notas/);
    if (m) {
        let nf = notas;
        if (query.curso_id) nf = nf.filter(n => n.curso_id == query.curso_id);
        if (query.asignatura_id) nf = nf.filter(n => n.asignatura_id == query.asignatura_id);
        if (query.alumno_id) nf = nf.filter(n => n.alumno_id == query.alumno_id);
        return { success: true, data: [...new Set(nf.map(n => n.fecha))] };
    }

    // Buscar notas
    m = path.match(/\/docente\/[^/]+\/notas\/buscar/);
    if (m) {
        let nf = notas;
        if (query.curso_id) nf = nf.filter(n => n.curso_id == query.curso_id);
        if (query.asignatura_id) nf = nf.filter(n => n.asignatura_id == query.asignatura_id);
        if (query.alumno_id) nf = nf.filter(n => n.alumno_id == query.alumno_id);
        if (query.fecha) nf = nf.filter(n => n.fecha === query.fecha);
        return {
            success: true,
            data: nf.slice(0, 50).map(n => {
                const al = alumnos.find(a => a.id === n.alumno_id);
                const as = asignaturasBase.find(a => a.id === n.asignatura_id);
                const cu = cursos.find(c => c.id === n.curso_id);
                return {
                    id: n.id, alumno_id: n.alumno_id, alumno_nombres: al?.nombres || '', alumno_apellidos: al?.apellidos || '',
                    asignatura_nombre: as?.nombre || '', curso_nombre: cu?.nombre || '',
                    nota: n.nota, trimestre: n.periodo, fecha_evaluacion: n.fecha, comentario: '', es_pendiente: n.es_pendiente ? 1 : 0
                };
            })
        };
    }

    // ==========================================
    // APODERADO
    // ==========================================
    m = path.match(/\/apoderado\/mis-pupilos\//);
    if (m) {
        return {
            success: true,
            data: apoderadoPupilos.map(p => ({
                id: p.id, nombres: p.nombres, apellidos: p.apellidos,
                curso_nombre: p.curso_nombre, rut: p.rut,
                fecha_nacimiento: p.fecha_nacimiento, sexo: p.sexo,
                establecimiento_id: 1, establecimiento_nombre: 'Colegio Demo'
            }))
        };
    }

    if (path.includes('/apoderado/pupilos-pendientes/')) {
        return { success: true, data: [] };
    }

    m = path.match(/\/apoderado\/pupilo\/(\d+)\/notas$/);
    if (m) {
        const pid = parseInt(m[1]);
        const np = notas.filter(n => n.alumno_id === pid);
        return {
            success: true,
            data: np.map(n => {
                const as = asignaturasBase.find(a => a.id === n.asignatura_id);
                return {
                    id: n.id, alumno_id: n.alumno_id, asignatura: as?.nombre || '',
                    trimestre: n.periodo, nota: n.nota, fecha: n.fecha,
                    numero_evaluacion: np.filter(x => x.asignatura_id === n.asignatura_id && x.periodo === n.periodo).indexOf(n) + 1,
                    comentario: '', es_pendiente: n.es_pendiente ? 1 : 0
                };
            })
        };
    }

    m = path.match(/\/apoderado\/pupilo\/(\d+)\/comunicados/);
    if (m) {
        return { success: true, data: comunicados };
    }

    m = path.match(/\/apoderado\/pupilo\/(\d+)\/progreso$/);
    if (m) {
        const pid = parseInt(m[1]);
        const np = notas.filter(n => n.alumno_id === pid);
        const prom = calcularPromedio(np);
        const aprobadas = asignaturasBase.filter(a => calcularPromedio(np.filter(n => n.asignatura_id === a.id)) >= 4.0).length;
        const promediosPorAsignatura = {};
        asignaturasBase.forEach(a => { promediosPorAsignatura[a.nombre] = calcularPromedio(np.filter(n => n.asignatura_id === a.id)); });
        const promediosMensuales = {};
        [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(me => {
            const ms = String(me).padStart(2, '0');
            const dm = np.filter(n => n.fecha && n.fecha.includes(`-${ms}-`));
            promediosMensuales[me] = dm.length ? calcularPromedio(dm) : null;
        });
        const ap = asistencia.filter(a => a.alumno_id === pid);
        const pres = ap.filter(a => a.estado === 'presente').length;
        return {
            success: true,
            data: {
                estadisticas: { promedio: prom, porcentajeAprobacion: parseFloat((aprobadas / asignaturasBase.length * 100).toFixed(1)), totalNotas: np.length },
                promediosPorAsignatura, promediosMensuales,
                asignaturas: asignaturasBase.map(a => a.nombre),
                asistencia: { porcentaje: ap.length ? parseFloat((pres / ap.length * 100).toFixed(1)) : 0 }
            }
        };
    }

    // No match - retornar respuesta genérica
    console.warn('[DEMO] Ruta no interceptada:', path);
    return { success: true, data: [] };
}

// ==========================================
// HELPERS INTERNOS
// ==========================================
function handleLogin(options) {
    try {
        const body = JSON.parse(options.body);
        const { email, password, tipo } = body;
        if (password === '123456' && email?.endsWith('@demo.com')) {
            const map = { admin: users.admin, administrador: users.admin, docente: users.docente, apoderado: users.apoderado };
            const user = map[tipo];
            if (user) {
                const fakeToken = btoa(JSON.stringify({ id: user.id, email: user.email, tipo, isDemo: true }));
                localStorage.setItem('auth_token', fakeToken);
                return { success: true, token: fakeToken, usuario: { ...user, tipo } };
            }
        }
    } catch (e) { }
    return { success: false, message: 'Credenciales incorrectas' };
}

function handleAuthMe() {
    const token = localStorage.getItem('auth_token');
    if (!token) return { success: false };
    try {
        const decoded = JSON.parse(atob(token));
        const map = { 'admin@demo.com': users.admin, 'docente@demo.com': users.docente, 'apoderado@demo.com': users.apoderado };
        const user = map[decoded.email];
        if (user) return { success: true, usuario: { ...user, tipo: decoded.tipo } };
    } catch (e) { }
    return { success: false };
}

function calcularEstadisticasCurso(cursoId) {
    const nc = notas.filter(n => n.curso_id === cursoId);
    const ac = alumnos.filter(a => a.curso_id === cursoId);
    const prom = calcularPromedio(nc);
    const apr = ac.filter(a => calcularPromedio(nc.filter(n => n.alumno_id === a.id)) >= 4.0).length;
    const dest = ac.filter(a => calcularPromedio(nc.filter(n => n.alumno_id === a.id)) >= 6.0).length;
    const riesgo = ac.filter(a => calcularPromedio(nc.filter(n => n.alumno_id === a.id)) < 4.0).length;
    const asistC = asistencia.filter(a => a.curso_id === cursoId);
    const pres = asistC.filter(a => a.estado === 'presente').length;
    return {
        promedio: prom, aprobacion: ac.length ? parseFloat((apr / ac.length * 100).toFixed(1)) : 0,
        asistencia: asistC.length ? parseFloat((pres / asistC.length * 100).toFixed(1)) : 0,
        alumnos: ac.length, destacados: dest, regulares: ac.length - dest - riesgo, riesgo,
        tendencia: [prom - 0.3, prom - 0.1, prom, prom + 0.1, prom + 0.2],
        tendenciaMensual: [prom - 0.2, prom, prom + 0.1, prom - 0.1, prom + 0.15]
    };
}
