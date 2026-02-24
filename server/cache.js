// Caché en memoria para endpoints de estadísticas y progreso
// TTL: 30 minutos. Warmup automático al iniciar + setInterval cada 30 min.

const cache = new Map();
const TTL = 30 * 60 * 1000; // 30 minutos

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function set(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function clear(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

// Precalentamiento: ejecuta HTTP requests internos para llenar el caché
let warmupTimer = null;

async function warmup(port) {
  const http = require('http');
  const base = `http://localhost:${port}/api`;

  const fetchLocal = (path) => new Promise((resolve) => {
    http.get(`${base}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });

  console.log('[Cache] Precalentando caché de estadísticas...');
  const inicio = Date.now();

  try {
    // 1. Estadísticas generales admin (todos ven lo mismo)
    await Promise.all([
      fetchLocal('/estadisticas/general'),
      fetchLocal('/estadisticas/general/asignaturas'),
      fetchLocal('/estadisticas/general/ranking-cursos'),
      fetchLocal('/estadisticas/general/distribucion'),
      fetchLocal('/estadisticas/asistencia/general'),
      fetchLocal('/estadisticas/asistencia/por-curso'),
      fetchLocal('/estadisticas/asistencia/ranking'),
    ]);

    // 2. Listas de selectores
    const [cursosData, docentesData, asignaturasData] = await Promise.all([
      fetchLocal('/estadisticas/cursos'),
      fetchLocal('/estadisticas/docentes'),
      fetchLocal('/estadisticas/asignaturas'),
    ]);

    // 3. Estadísticas por curso (todos los cursos)
    const cursos = cursosData?.data || [];
    if (cursos.length > 0) {
      await Promise.all(cursos.map(c =>
        Promise.all([
          fetchLocal(`/estadisticas/curso/${c.id}`),
          fetchLocal(`/estadisticas/curso/${c.id}/asignaturas`),
          fetchLocal(`/estadisticas/asistencia/curso/${c.id}`),
        ])
      ));
    }

    // 4. Estadísticas por docente
    const docentes = docentesData?.data || [];
    if (docentes.length > 0) {
      await Promise.all(docentes.map(d => fetchLocal(`/estadisticas/docente/${d.id}`)));
    }

    // 5. Estadísticas por asignatura
    const asignaturas = asignaturasData?.data || [];
    if (asignaturas.length > 0) {
      await Promise.all(asignaturas.map(a =>
        Promise.all([
          fetchLocal(`/estadisticas/asignatura/${a.id}`),
          fetchLocal(`/estadisticas/asignatura/${a.id}/por-curso`),
        ])
      ));
    }

    const duracion = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`[Cache] Precalentamiento completo en ${duracion}s (${cache.size} entradas)`);
  } catch (err) {
    console.error('[Cache] Error en precalentamiento:', err.message);
  }
}

function startWarmupSchedule(port) {
  // Primer warmup 3 segundos después de iniciar (dar tiempo a que el server escuche)
  setTimeout(() => {
    warmup(port);
    // Repetir cada 30 minutos
    warmupTimer = setInterval(() => warmup(port), TTL);
  }, 3000);
}

module.exports = { get, set, clear, startWarmupSchedule };
