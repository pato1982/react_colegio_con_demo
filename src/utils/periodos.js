/**
 * Utilidad para manejar periodos academicos (trimestral/semestral)
 */
export function getPeriodos(modalidad) {
  const esSemestral = modalidad === 'semestral';

  const cantidad = esSemestral ? 2 : 3;
  const notasPorPeriodo = esSemestral ? 14 : 8;
  const ids = esSemestral ? [1, 2] : [1, 2, 3];

  const labels = esSemestral
    ? ['Semestre 1', 'Semestre 2']
    : ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];

  const labelsCortos = esSemestral
    ? ['S1', 'S2']
    : ['T1', 'T2', 'T3'];

  const labelsFiltro = esSemestral
    ? [{ id: 1, nombre: '1er Semestre' }, { id: 2, nombre: '2do Semestre' }]
    : [{ id: 1, nombre: '1er Trimestre' }, { id: 2, nombre: '2do Trimestre' }, { id: 3, nombre: '3er Trimestre' }];

  const labelsFiltroConTodos = [
    { id: 'todas', nombre: 'Todas (Ver todos)' },
    ...labelsFiltro
  ];

  const nombreGenerico = esSemestral ? 'Semestre' : 'Trimestre';
  const promedioPrefix = esSemestral ? 'PS' : 'PT';

  return {
    cantidad,
    notasPorPeriodo,
    ids,
    labels,
    labelsCortos,
    labelsFiltro,
    labelsFiltroConTodos,
    nombreGenerico,
    promedioPrefix
  };
}
