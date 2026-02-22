
/**
 * Ordena una lista de cursos siguiendo la lógica escolar chilena:
 * Primero los básicos (B), luego los medios (M).
 * Dentro de cada categoría, ordena por el número de nivel.
 * Finalmente ordena por la letra/sección.
 */
export const ordenarCursos = (cursos) => {
    if (!cursos || !Array.isArray(cursos)) return [];

    return [...cursos].sort((a, b) => {
        const nombreA = (a.nombre || a.label || '').toUpperCase();
        const nombreB = (b.nombre || b.label || '').toUpperCase();

        // Extraer el número inicial (ej: "1" de "1°B A")
        const matchA = nombreA.match(/^(\d+)/);
        const matchB = nombreB.match(/^(\d+)/);

        const nivelA = matchA ? parseInt(matchA[1]) : 0;
        const nivelB = matchB ? parseInt(matchB[1]) : 0;

        // Determinar si es Básico (B) o Medio (M)
        // Buscamos "B" o "M" después del número y el símbolo °
        const esMedioA = nombreA.includes('M');
        const esMedioB = nombreB.includes('M');

        // 1. Prioridad por tipo (Básico antes que Medio)
        if (esMedioA !== esMedioB) {
            return esMedioA ? 1 : -1;
        }

        // 2. Prioridad por nivel numérico (1° antes que 2°)
        if (nivelA !== nivelB) {
            return nivelA - nivelB;
        }

        // 3. Orden alfabético por el resto del nombre (Letras de sección A, B, C...)
        return nombreA.localeCompare(nombreB);
    });
};
