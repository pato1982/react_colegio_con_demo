// Datos para los planes
export const planesData = {
  basico: {
    nombre: 'Basico',
    precio: '$1.500',
    periodo: '/alumno/año',
    promo: '4 meses gratis',
    headerClass: 'modal-plan-header-basico',
    secciones: [
      {
        titulo: 'Panel Apoderado',
        items: [
          'Informacion completa del pupilo',
          'Libro de calificaciones',
          'Notas por periodo',
          'Promedios por asignatura',
          'Detalle de cada evaluacion',
          'Comunicados del colegio',
          'Acceso multiplataforma'
        ]
      },
      {
        titulo: 'Panel Docente',
        items: [
          'Control de asistencia',
          'Agregar notas con comentarios',
          'Modificar calificaciones',
          'Ver notas por curso y asignatura',
          'Filtros multiples'
        ]
      },
      {
        titulo: 'Panel Administrador',
        items: [
          'Gestion completa de alumnos',
          'Gestion de docentes',
          'Asignacion de cursos',
          'Notas por curso',
          'Control de asistencia general',
          'Envio de comunicados masivos'
        ]
      },
      {
        titulo: 'Soporte Tecnico',
        items: [
          'Atencion 24/7',
          'Soporte por email'
        ]
      }
    ],
    featuresGrid: [
      'Ver notas', 'Ver comunicados', 'Registrar notas', 'Modificar notas',
      'Control asistencia', 'Enviar comunicados', 'Gestion alumnos', 'Gestion docentes', 'Soporte 24/7'
    ]
  },
  intermedio: {
    nombre: 'Intermedio',
    precio: '$2.500',
    periodo: '/alumno/año',
    promo: '3 meses gratis',
    badge: 'Popular',
    headerClass: 'modal-plan-header-intermedio',
    secciones: [
      {
        titulo: 'Panel Apoderado',
        items: [
          'Informacion completa del pupilo',
          'Libro de calificaciones',
          'Notas por periodo',
          'Promedios por asignatura',
          'Detalle de cada evaluacion',
          'Comunicados del colegio',
          'Acceso multiplataforma',
          { text: 'Grafico rendimiento mensual', destacado: true },
          { text: 'KPIs de rendimiento', destacado: true },
          { text: 'Promedio por asignatura (grafico)', destacado: true },
          { text: 'Ranking en el curso', destacado: true },
          { text: 'Tasa de aprobacion', destacado: true }
        ]
      },
      {
        titulo: 'Panel Docente',
        items: [
          'Control de asistencia',
          'Agregar notas con comentarios',
          'Modificar calificaciones',
          'Ver notas por curso y asignatura',
          'Filtros multiples',
          { text: 'Grafico evolucion del curso', destacado: true },
          { text: 'KPIs del curso', destacado: true },
          { text: 'Distribucion de notas', destacado: true },
          { text: 'Alumnos en riesgo academico', destacado: true },
          { text: 'Comparativa trimestral', destacado: true }
        ]
      },
      {
        titulo: 'Panel Administrador',
        items: [
          'Gestion completa de alumnos',
          'Gestion de docentes',
          'Asignacion de cursos',
          'Notas por curso',
          'Control de asistencia general',
          'Envio de comunicados masivos',
          { text: 'Dashboard estadisticas globales', destacado: true },
          { text: 'Graficos de rendimiento', destacado: true },
          { text: 'Rankings por curso', destacado: true },
          { text: 'Analisis por asignatura', destacado: true },
          { text: 'Tendencias academicas', destacado: true }
        ]
      },
      {
        titulo: 'Soporte Tecnico',
        items: [
          'Atencion 24/7',
          'Soporte por email'
        ]
      }
    ],
    featuresGrid: [
      'Ver notas', 'Ver comunicados', 'Registrar notas', 'Modificar notas',
      'Control asistencia', 'Enviar comunicados', 'Gestion alumnos', 'Gestion docentes',
      'Graficos de notas', 'KPIs rendimiento', 'Progreso alumno', 'Estadisticas admin',
      'Rankings', 'Alertas riesgo', 'Soporte 24/7'
    ]
  },
  premium: {
    nombre: 'Premium',
    precio: '$3.000',
    periodo: '/alumno/año',
    promo: '3 meses gratis',
    badge: 'Completo',
    badgeClass: 'badge-premium',
    headerClass: 'modal-plan-header-premium',
    secciones: [
      {
        titulo: 'Panel Apoderado',
        items: [
          'Informacion completa del pupilo',
          'Libro de calificaciones',
          'Notas por periodo',
          'Promedios por asignatura',
          'Detalle de cada evaluacion',
          'Comunicados del colegio',
          'Acceso multiplataforma',
          'Grafico rendimiento mensual',
          'KPIs de rendimiento',
          'Promedio por asignatura (grafico)',
          'Ranking en el curso',
          'Tasa de aprobacion',
          { text: 'Matricula 100% online', premium: true }
        ]
      },
      {
        titulo: 'Panel Docente',
        items: [
          'Control de asistencia',
          'Agregar notas con comentarios',
          'Modificar calificaciones',
          'Ver notas por curso y asignatura',
          'Filtros multiples',
          'Grafico evolucion del curso',
          'KPIs del curso',
          'Distribucion de notas',
          'Alumnos en riesgo academico',
          'Comparativa trimestral'
        ]
      },
      {
        titulo: 'Panel Administrador',
        items: [
          'Gestion completa de alumnos',
          'Gestion de docentes',
          'Asignacion de cursos',
          'Notas por curso',
          'Control de asistencia general',
          'Envio de comunicados masivos',
          'Dashboard estadisticas globales',
          'Graficos de rendimiento',
          'Rankings por curso',
          'Analisis por asignatura',
          'Tendencias academicas',
          { text: 'Gestion de matriculas', premium: true },
          { text: 'Proceso digital completo', premium: true },
          { text: 'Reportes de matricula', premium: true }
        ]
      },
      {
        titulo: 'Soporte Tecnico',
        items: [
          'Atencion 24/7',
          'Soporte por email'
        ]
      }
    ],
    featuresGrid: [
      'Ver notas', 'Ver comunicados', 'Registrar notas', 'Modificar notas',
      'Control asistencia', 'Enviar comunicados', 'Gestion alumnos', 'Gestion docentes',
      'Graficos de notas', 'KPIs rendimiento', 'Progreso alumno', 'Estadisticas admin',
      'Rankings', 'Alertas riesgo', 'Matricula online', 'Gestion matriculas', 'Soporte 24/7'
    ]
  }
};

// Datos para las caracteristicas por tipo de usuario
export const caracteristicasData = {
  apoderados: {
    titulo: 'Para Apoderados',
    descripcion: 'Mantengase informado sobre el rendimiento academico de sus hijos de manera simple y directa. Nuestra plataforma le permite estar al tanto del progreso escolar sin complicaciones.',
    items: [
      'Consulte las notas de sus pupilos en tiempo real',
      'Visualice el promedio por asignatura',
      'Reciba comunicados importantes del establecimiento',
      'Acceda desde cualquier dispositivo, en cualquier momento'
    ]
  },
  docentes: {
    titulo: 'Para Docentes',
    descripcion: 'Simplifique su trabajo administrativo y dedique mas tiempo a lo que realmente importa: ensenar. Registre las calificaciones de sus estudiantes de forma rapida y eficiente.',
    items: [
      'Registre notas de manera sencilla e intuitiva',
      'Visualice las calificaciones de sus cursos y asignaturas',
      'Mantenga informados a alumnos y apoderados de forma inmediata',
      'Trabaje comodamente desde su computador o telefono movil'
    ]
  },
  administradores: {
    titulo: 'Para Administradores',
    descripcion: 'Tenga el control total del sistema educativo. Gestione la informacion academica, el personal docente y mantenga una comunicacion efectiva con toda la comunidad escolar.',
    items: [
      'Administre la informacion completa de alumnos y docentes',
      'Gestione cursos, asignaturas y asignaciones',
      'Visualice y supervise todas las calificaciones del establecimiento',
      'Envie comunicados importantes a los apoderados',
      'Genere reportes y estadisticas academicas'
    ]
  }
};

// Datos para los beneficios
export const beneficiosData = [
  {
    titulo: 'Acceso Multiplataforma',
    descripcion: 'Utilice el portal desde su computador de escritorio, laptop, tablet o telefono movil. Siempre disponible cuando lo necesite.',
    icono: 'mobile'
  },
  {
    titulo: 'Seguro y Privado',
    descripcion: 'La informacion de cada usuario esta protegida. Los apoderados solo acceden a los datos de sus pupilos, garantizando la privacidad de todos.',
    icono: 'lock'
  },
  {
    titulo: 'Rapido y Sencillo',
    descripcion: 'Interfaz intuitiva disenada para que cualquier persona pueda utilizarla sin complicaciones ni necesidad de capacitacion.',
    icono: 'bolt'
  },
  {
    titulo: 'Informacion Actualizada',
    descripcion: 'Las notas y comunicados se actualizan en tiempo real. Siempre tendra acceso a la informacion mas reciente.',
    icono: 'sync'
  }
];

// KPIs para la seccion de estadisticas
export const kpisData = [
  { numero: '+40', label: 'Colegios', icono: 'school' },
  { numero: '+8.000', label: 'Usuarios Activos', icono: 'users' },
  { numero: '+200.000', label: 'Notas Registradas', icono: 'document' }
];
