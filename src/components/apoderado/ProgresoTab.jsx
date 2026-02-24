import React, { useMemo, useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { apiFetch } from '../../utils/api';
import { useResponsive } from '../../hooks';

// Registrar componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function ProgresoTab({ pupilo, notas: notasProp }) {
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState('todas');

  // Hook responsivo para tamaños de pantalla
  const { isMobile, isTablet } = useResponsive();

  // Estados para datos de la API
  const [datosProgreso, setDatosProgreso] = useState(null);
  const [notasRaw, setNotasRaw] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // Cargar datos de progreso cuando cambia el pupilo
  useEffect(() => {
    // Si hay prop de notas (DEMO MODE o data pre-cargada)
    if (notasProp && notasProp.length > 0) {
      // Calcular datosProgreso localmente
      const raw = notasProp;
      setNotasRaw(raw);

      // 1. Asignaturas únicas
      const asignaturasUnique = [...new Set(raw.map(n => n.asignatura))];

      // 2. Promedios por asignatura
      const promediosAsig = {};
      asignaturasUnique.forEach(asig => {
        const notasAsig = raw.filter(n => n.asignatura === asig);
        const suma = notasAsig.reduce((acc, n) => acc + parseFloat(n.nota), 0);
        promediosAsig[asig] = (suma / notasAsig.length).toFixed(1);
      });

      // 3. Promedios mensuales
      const promediosMensuales = {};
      for (let m = 3; m <= 12; m++) {
        const result = raw.filter(n => {
          const f = new Date(n.fecha || n.fecha_evaluacion);
          return f.getMonth() + 1 === m;
        });
        if (result.length > 0) {
          const sum = result.reduce((acc, n) => acc + parseFloat(n.nota), 0);
          promediosMensuales[m] = parseFloat((sum / result.length).toFixed(1));
        } else {
          promediosMensuales[m] = null;
        }
      }

      // 4. Estadísticas generales
      const notasValidas = raw.filter(n => n.nota);
      const sumaTotal = notasValidas.reduce((acc, n) => acc + parseFloat(n.nota), 0);
      const promedioGral = notasValidas.length ? (sumaTotal / notasValidas.length).toFixed(1) : 0;
      const aprobados = notasValidas.filter(n => parseFloat(n.nota) >= 4.0).length;
      const porcentajeAprobacion = notasValidas.length ? (aprobados / notasValidas.length) * 100 : 0;

      setDatosProgreso({
        estadisticas: {
          promedio: promedioGral,
          porcentajeAprobacion: porcentajeAprobacion,
          totalNotas: notasValidas.length
        },
        promediosPorAsignatura: promediosAsig,
        promediosMensuales: promediosMensuales,
        asignaturas: asignaturasUnique,
        asistencia: { porcentaje: 92 } // Mock asistencia
      });
      return;
    }

    const cargarProgreso = async () => {
      if (!pupilo?.id) {
        setDatosProgreso(null);
        setNotasRaw([]);
        return;
      }

      setCargando(true);
      setError('');

      try {
        const urlProgreso = `/apoderado/pupilo/${pupilo.id}/progreso`;
        const resProgreso = await apiFetch(urlProgreso);
        const dataProgreso = await resProgreso.json();

        if (dataProgreso.success) {
          setDatosProgreso(dataProgreso.data);
          if (dataProgreso.ultimaActualizacion) setUltimaActualizacion(dataProgreso.ultimaActualizacion);
        } else {
          setError(dataProgreso.error || 'Error al cargar progreso');
        }

        const urlNotas = `/apoderado/pupilo/${pupilo.id}/notas`;
        const resNotas = await apiFetch(urlNotas);
        const dataNotas = await resNotas.json();

        if (dataNotas.success && Array.isArray(dataNotas.data)) {
          setNotasRaw(dataNotas.data);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error de conexión');
      } finally {
        setCargando(false);
      }
    };

    cargarProgreso();
  }, [pupilo?.id, notasProp]);

  // Estadísticas para KPIs
  const estadisticasFiltradas = useMemo(() => {
    if (!datosProgreso) return null;
    const { estadisticas, promediosPorAsignatura } = datosProgreso;
    const promedios = Object.values(promediosPorAsignatura || {}).filter(val => val !== null);

    return {
      promedio: estadisticas.promedio,
      notaMaxima: promedios.length > 0 ? Math.max(...promedios) : 0,
      notaMinima: promedios.length > 0 ? Math.min(...promedios) : 0,
      porcentajeAprobacion: estadisticas.porcentajeAprobacion,
      totalNotas: estadisticas.totalNotas
    };
  }, [datosProgreso]);

  // Datos para el gráfico de línea (Desempeño Mensual)
  const lineChartData = useMemo(() => {
    if (!datosProgreso) return null;

    const mesesLabels = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesesOrden = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    let datasetsData = [];

    if (asignaturaSeleccionada === 'todas') {
      datasetsData = mesesOrden.map(m => datosProgreso.promediosMensuales[m] || null);
    } else {
      datasetsData = mesesOrden.map(mes => {
        const notasDelMes = notasRaw.filter(n => {
          if (n.asignatura !== asignaturaSeleccionada) return false;
          if (!n.nota || n.es_pendiente) return false;
          const fecha = new Date(n.fecha || n.fecha_evaluacion);
          return (fecha.getMonth() + 1) === mes;
        });
        if (notasDelMes.length > 0) {
          const suma = notasDelMes.reduce((acc, curr) => acc + parseFloat(curr.nota), 0);
          return parseFloat((suma / notasDelMes.length).toFixed(1));
        }
        return null;
      });
    }

    return {
      labels: mesesLabels,
      datasets: [{
        label: asignaturaSeleccionada === 'todas' ? 'Promedio General' : asignaturaSeleccionada,
        data: datasetsData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#3b82f6',
        spanGaps: true
      }]
    };
  }, [datosProgreso, notasRaw, asignaturaSeleccionada]);

  // Datos para el gráfico de barras (Promedio por Asignatura)
  const barChartData = useMemo(() => {
    if (!datosProgreso || !datosProgreso.asignaturas) return null;

    const { asignaturas, promediosPorAsignatura } = datosProgreso;

    // Función para abreviar asignaturas
    // Función para abreviar asignaturas
    const abreviar = (nombre) => {
      if (!nombre) return '';
      // Normalizar nombre para búsqueda
      const map = {
        'Matemática': 'Mat',
        'Matemáticas': 'Mat',
        'Lenguaje y Comunicación': 'Len y Com',
        'Lenguaje': 'Lenguaje',
        'Historia, Geografía y Ciencias Sociales': 'Hist y Geo',
        'Historia': 'Historia',
        'Ciencias Naturales': 'Cs. Nat',
        'Biología': 'Biol',
        'Física': 'Fís',
        'Química': 'Quím',
        'Inglés': 'Ing',
        'Artes Visuales': 'Artes',
        'Música': 'Mús',
        'Educación Física y Salud': 'Ed. Fís',
        'Educación Física': 'Ed. Fís',
        'Tecnología': 'Tec',
        'Religión': 'Rel',
        'Orientación': 'Ori',
        'Filosofía': 'Filo'
      };

      // Buscar coincidencia exacta o parcial
      for (const [key, val] of Object.entries(map)) {
        if (nombre.includes(key)) return val;
      }

      // Fallback inteligente
      return nombre.length > 8 ? nombre.substring(0, 5) + '.' : nombre;
    };

    const labels = asignaturas.map(a => abreviar(a));
    const values = asignaturas.map(asig => parseFloat(promediosPorAsignatura[asig] || 0).toFixed(1));
    const colors = values.map(v => {
      if (v >= 6.0) return '#10b981';
      if (v >= 5.0) return '#3b82f6';
      if (v >= 4.0) return '#f59e0b';
      return '#ef4444';
    });

    return {
      labels,
      datasets: [{
        label: 'Promedio',
        data: values,
        backgroundColor: colors,
        borderRadius: 4,
        barPercentage: 0.6
      }]
    };
  }, [datosProgreso, isMobile]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      y: { min: 1, max: 7, ticks: { stepSize: 1 } },
      x: { grid: { display: false } }
    }
  };

  const getNotaClass = (nota) => {
    if (nota < 4.0) return 'nota-roja';
    if (nota < 5.0) return 'nota-amarilla';
    return 'nota-azul';
  };

  if (!pupilo) return <div className="tab-panel active"><div className="card-body">Seleccione un pupilo.</div></div>;
  if (cargando) return <div className="tab-panel active"><div className="card-body">Cargando...</div></div>;
  if (error) return <div className="tab-panel active"><div className="card-body" style={{ color: 'red' }}>{error}</div></div>;
  if (!datosProgreso || datosProgreso.estadisticas.totalNotas === 0) {
    return <div className="tab-panel active"><div className="card-body">No hay datos suficientes para {pupilo.nombres}.</div></div>;
  }

  return (
    <div className="tab-panel active" style={{ padding: '20px' }}>
      <style>{`
        .progreso-grid { display: grid; grid-template-columns: 1fr 340px 1fr; gap: 20px; min-height: 300px; align-items: stretch; }
        @media (max-width: 1200px) { .progreso-grid { grid-template-columns: 1fr 1fr; } .kpi-col { grid-column: 1 / -1; order: -1; } }
        @media (max-width: 768px) { .progreso-grid { grid-template-columns: 1fr; } }
        
        .kpi-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-content: center; height: 100%; }
        .kpi-card { 
          background: white; 
          padding: 12px 8px; 
          border-radius: 12px; 
          border: 1px solid #e2e8f0; 
          display: flex; 
          flex-direction: column;
          align-items: center; 
          justify-content: center;
          text-align: center;
          gap: 4px; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .kpi-val { font-size: 20px; font-weight: bold; line-height: 1; }
        .kpi-label { font-size: 11px; color: #64748b; font-weight: 500; }
        
        .chart-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column; }
        .chart-header { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .chart-body { flex: 1; min-height: 220px; padding: 15px; position: relative; }
        .nota-azul { color: #2563eb; } .nota-amarilla { color: #d97706; } .nota-roja { color: #dc2626; }
        
        @media (max-width: 699px) {
          .chart-header h3, h3 {
            font-size: 14px !important;
          }
          .kpi-val {
            font-size: 16px !important;
          }
          .chart-card {
            border-radius: 0 !important;
          }
          .kpi-label {
            font-size: 10px !important;
          }
          .chart-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .chart-header h3 {
            font-size: 10px !important;
            flex: 1 !important; /* Que ocupe el espacio */
            white-space: nowrap !important;
          }
          .chart-header select {
            font-size: 11px !important; /* Agrandar un poco texto */
            padding: 2px 0px !important; /* Reducir padding horizontal */
            width: auto !important;
            max-width: 110px !important; /* Limitar ancho máximo */
            text-overflow: ellipsis !important;
            margin-left: 5px !important;
          }
        }
      `}</style>

      {ultimaActualizacion && (
        <div style={{ textAlign: 'right', marginBottom: '8px', fontSize: '12px', color: '#94a3b8' }}>
          Actualizado: {new Date(ultimaActualizacion).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      <div className="progreso-grid">
        {/* Gráfico Mensual */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Rendimiento Mensual</h3>
            <select
              value={asignaturaSeleccionada}
              onChange={e => setAsignaturaSeleccionada(e.target.value)}
              style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            >
              <option value="todas">Todas</option>
              {datosProgreso.asignaturas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="chart-body">
            {lineChartData && <Line data={lineChartData} options={chartOptions} />}
          </div>
        </div>

        {/* KPIs Centrales - 6 Indicadores en 2 columnas */}
        <div className="kpi-col">
          <div className="kpi-card">
            <div className={`kpi-val ${getNotaClass(estadisticasFiltradas.promedio)}`}>{parseFloat(estadisticasFiltradas.promedio).toFixed(1)}</div>
            <div className="kpi-label">Promedio Gral.</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: '#10b981' }}>{estadisticasFiltradas.porcentajeAprobacion.toFixed(0)}%</div>
            <div className="kpi-label">Aprobación</div>
          </div>
          <div className="kpi-card">
            <div className={`kpi-val ${getNotaClass(estadisticasFiltradas.notaMaxima)}`}>{estadisticasFiltradas.notaMaxima.toFixed(1)}</div>
            <div className="kpi-label">Promedio Máx.</div>
          </div>
          <div className="kpi-card">
            <div className={`kpi-val ${getNotaClass(estadisticasFiltradas.notaMinima)}`}>{estadisticasFiltradas.notaMinima.toFixed(1)}</div>
            <div className="kpi-label">Promedio Mín.</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: '#3b82f6' }}>{datosProgreso.asistencia.porcentaje.toFixed(0)}%</div>
            <div className="kpi-label">Asistencia</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val" style={{ color: '#6366f1' }}>{estadisticasFiltradas.totalNotas}</div>
            <div className="kpi-label">Total Notas</div>
          </div>
        </div>

        {/* Gráfico de Barras */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Rendimiento por Asignatura</h3>
          </div>
          <div className="chart-body">
            {barChartData && <Bar data={barChartData} options={chartOptions} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgresoTab;
