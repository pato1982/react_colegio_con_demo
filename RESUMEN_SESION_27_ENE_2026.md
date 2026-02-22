# Resumen de Sesión - 27 de Enero 2026

## Objetivos de la Sesión
El objetivo principal fue limpiar la data "sucia" o inconsistente y poblar la base de datos con un set de datos de prueba **controlado, realista y robusto**. Se requería crear una estructura específica de familias y alumnos para pruebas de usabilidad, incluyendo una cuenta "VIP" para demostraciones multifamiliares.

## Acciones Realizadas

### 1. Limpieza Profunda (`Deep Clean`)
Se ejecutó un script de purga total para eliminar inconsistencias previas:
- **Tablas vaciadas:** `tb_alumnos`, `tb_apoderados`, `tb_matriculas`, `tb_notas`, `tb_asistencia`, `tb_apoderado_alumno`, `tb_observaciones_alumno`.
- **Usuarios eliminados:** Se borraron las cuentas de usuario asociadas a apoderados y alumnos para evitar conflictos de emails duplicados.
- **Infraestructura mantenida:** Se preservaron las tablas estructurales (`tb_cursos`, `tb_docentes`, `tb_establecimientos`, `tb_asignaturas`, `tb_asignaciones`).

### 2. Poblado Controlado (Curso por Curso)
Se insertaron manualmente **5 alumnos por curso** para los 12 niveles del colegio (1° Básico a 4° Medio), totalizando 60 alumnos activos.

**Criterios aplicados:**
- **Nomenclatura:** Nombre real + Segundo nombre "Demo" + Apellido real (ej: *Lucas Demo González*).
- **Apoderados:** Nombre real + Segundo nombre "Demo" + Apellido (ej: *Pedro Demo González*).
- **Credenciales:** Todos los usuarios generados tienen la contraseña maestra `Pmmj8282.` (hash bcrypt).
- **RUTs:** Se utilizaron secuencias lógicas para evitar duplicidad (ej: 21.000.xxx-K).

### 3. Configuración "Familia VIP" (Demo)
Se configuró un caso de uso específico para pruebas de apoderado con múltiples pupilos.
- **Usuario:** `demo@colegio.cl` / `Pmmj8282.`
- **Apoderado:** Juan Demo Pérez.
- **Alumnos Vinculados:**
  1.  **Martín Demo Pérez** (1° Básico A)
  2.  **Matías Demo Pérez** (5° Básico A)
  3.  **Camila Demo Pérez** (1° Medio A)
Esto permite probar la interfaz de apoderado alternando entre estudiantes de distintos niveles.

### 4. Generación Masiva de Asistencia (`PoblarAsistencia2026`)
Se creó y ejecutó un Stored Procedure avanzado para poblar la asistencia de todo el año escolar 2026.
- **Rango:** 01 de Marzo al 16 de Diciembre.
- **Inteligencia de Calendario:** 
  - Excluye automáticamente **Sábados y Domingos**.
  - Excluye feriados legales de Chile 2026 (Semana Santa, Fiestas Patrias, etc.).
- **Distribución de Estados:**
  - 90% Presente
  - 5% Atrasado
  - 3% Ausente
  - 2% Justificado

## Estado Actual
La base de datos se encuentra **poblada, consistente y lista para pruebas**. 
- 60 Alumnos matriculados.
- 12 Cursos activos.
- Historial de asistencia completo.
- Relaciones familiares (Apoderado-Alumno) correctamente enlazadas.

## Pasos Siguientes Pendientes
1.  **Re-generación de Notas:** Aunque se creó el script `RellenarNotas` en la sesión, se ejecutó la limpieza posterior. **Es necesario volver a ejecutar el procedure de notas** para que estos nuevos 60 alumnos tengan calificaciones (5 por trimestre en cada asignatura).
2.  **Pruebas de Frontend:** Verificar que el login con `demo@colegio.cl` muestre correctamente a los 3 alumnos y sus datos de asistencia.
