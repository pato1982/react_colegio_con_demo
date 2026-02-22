# Resumen de Sesión - 15 de Enero 2026

## Objetivos Logrados

### 1. Corrección de "Registros Invisibles" (Asistencias y Notas)
*   **Problema:** Las asistencias y notas ingresadas el 15 de enero no aparecían en las tablas a pesar del mensaje de éxito.
*   **Causa 1 (Zona Horaria):** El sistema usaba hora UTC, por lo que registros hechos después de las 21:00 hrs "saltaban" al día 16 de enero.
*   **Causa 2 (Año Académico):** El backend forzaba el uso del "Año Activo" de la base de datos (que estaba pegado en 2024), guardando los registros en el año incorrecto.
*   **Solución:** 
    *   Backend ahora extrae el año directamente de la fecha seleccionada (ej: 2026).
    *   Frontend ahora usa hora local para evitar el salto de día.
    *   Se mejoraron los filtros de seguridad (establecimiento_id).

### 2. Mejoras de Interfaz en "Agregar Nota"
*   Se implementó ordenamiento interactivo en la tabla **"Últimas Notas"**.
*   Se agregaron iconos de flechas (▲/▼) en las columnas:
    *   **Fecha:** Más reciente / Más antigua.
    *   **Alumno:** A-Z / Z-A.
    *   **Nota:** Mayor a menor / Menor a mayor.

## Estado Final
*   Todo el código fue subido a la rama `master`.
*   El servidor debe actualizarse con: `git pull origin master && npm run build && pm2 restart all`.

## Próximos pasos pendientes
*   Verificar que los reportes históricos (2024/2025) sigan accesibles correctamente con la nueva lógica de fechas.
