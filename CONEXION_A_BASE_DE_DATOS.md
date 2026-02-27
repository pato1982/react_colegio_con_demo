# Conexión a Base de Datos - Portal Estudiantil
**Fecha:** 19 de Febrero de 2026

---

## Credenciales de Acceso

### SSH al Servidor
- **IP:** 45.236.130.25
- **Puerto SSH:** 25404
- **Usuario:** root
- **Llave privada:** `.ssh_keys/id_rsa_vps_new`
- **Nota:** Al usar la llave desde WSL, copiarla a /tmp con chmod 600:
  ```bash
  cp /mnt/c/Users/Telqway/Desktop/colegio-react/.ssh_keys/id_rsa_vps_new /tmp/id_rsa_vps
  chmod 600 /tmp/id_rsa_vps
  ```

### Base de Datos MySQL
- **Host:** 45.236.130.25 (externamente) / localhost (desde dentro del servidor)
- **Puerto:** 3306 (NO expuesto externamente, solo accesible vía SSH)
- **Usuario:** root
- **Password:** 9Il2cmw4PgSQ10V
- **Base de datos:** portal_estudiantil
- **Engine:** InnoDB, charset utf8mb4_unicode_ci

### Cómo conectarse desde Claude Code
El puerto 3306 no está expuesto externamente. Para consultar la BD hay que hacerlo vía SSH:
```bash
ssh -i /tmp/id_rsa_vps -p 25404 -o StrictHostKeyChecking=no root@45.236.130.25 \
  "mysql -u root -p'9Il2cmw4PgSQ10V' portal_estudiantil -e 'TU_QUERY_AQUI;'"
```

No hay Node.js instalado en WSL. El proyecto usa `node.exe` de Windows pero no es ejecutable desde WSL directamente. Para queries usar el método SSH de arriba.

---

## Estado de la Base de Datos (actualizado 25/02/2026)

### 43 tablas (11 eliminadas el 25/02/2026 — ver sesión correspondiente):

1. tb_administrador_establecimiento
2. tb_administradores
3. tb_alumno_establecimiento
4. tb_alumnos
5. tb_apoderado_alumno
6. tb_apoderado_establecimiento
7. tb_apoderados
8. tb_asignaciones
9. tb_asignaturas
10. tb_asistencia
11. tb_chat_conversaciones
12. tb_chat_mensajes
13. tb_codigos_validacion
14. tb_comunicado_curso
15. tb_comunicado_leido
16. tb_comunicados
17. tb_configuracion_establecimiento
18. tb_consultas_contacto
19. tb_cursos
20. tb_docente_asignatura
21. tb_docente_establecimiento
22. tb_docentes
23. tb_documentos_matricula
24. tb_establecimientos
25. tb_intentos_login_fallidos
26. tb_intentos_registro_fallidos
27. tb_intentos_registro_fallidos_admin
28. tb_intentos_registro_fallidos_docentes
29. tb_log_actividades
30. tb_matriculas
31. tb_notas
32. tb_notificaciones
33. tb_observaciones_alumno
34. tb_pagos_matricula
35. tb_periodos_academicos
36. tb_periodos_matricula
37. tb_preregistro_administradores
38. tb_preregistro_docente_asignatura
39. tb_preregistro_docentes
40. tb_preregistro_relaciones
41. tb_sesiones
42. tb_tipos_evaluacion
43. tb_usuarios

---

## Cambios aplicados para modo híbrido (demo + BD real)

Se modificaron 3 archivos para que el sistema funcione en modo híbrido: usuarios demo ven datos mock, usuarios reales consultan MySQL.

### 1. server/.env
```
DEMO_MODE=false  (antes era true)
```
El servidor ya no intercepta todo globalmente, solo intercepta requests de usuarios con token demo.

### 2. server/routes/auth.js (línea 35)
```js
// Antes:
if (email === 'admin@demo.com' && tipo === 'admin') userMock = mockData.users.admin;
// Después:
if (email === 'admin@demo.com' && (tipo === 'admin' || tipo === 'administrador')) userMock = mockData.users.admin;
```
Fix para que el login demo del admin funcione (el frontend envía 'administrador', no 'admin').

### 3. src/config/env.js
```js
// Antes: forzaba modo demo si hostname era la IP del VPS
appMode: (typeof window !== 'undefined' && window.location.hostname === '45.236.130.25') ? 'demo' : ...
apiBaseUrl: ... ? 'http://localhost:3001/api' : ...

// Después: modo producción por defecto
appMode: import.meta.env.VITE_APP_MODE || 'production',
apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
```

### Flujo después de los cambios
- **Login demo** (admin@demo.com / 123456): auth.js genera JWT con `isDemo: true` → demoInterceptor devuelve datos mock
- **Login real** (credenciales reales): auth.js autentica contra MySQL → JWT normal → rutas reales consultan BD

### Pendiente para activar en producción
1. `npm run build` (rebuild del frontend con .env.production)
2. Subir cambios al servidor
3. Reiniciar el servidor

---

## Estructura del proyecto relevante

- **Documento de tablas:** `docs/TABLAS_BASE_DATOS.md` (54 tablas con CREATE TABLE completos)
- **Config BD del servidor:** `server/config/database.js`
- **Variables de entorno servidor:** `server/.env`
- **Rutas de autenticación:** `server/routes/auth.js`
- **Interceptor demo (server):** `server/middleware/demoInterceptor.js`
- **Config del frontend:** `src/config/env.js`
- **Interceptor demo (client):** `src/services/demoInterceptor.js`
- **Rutas del servidor:** `server/index.js` (monta todas las rutas)

---

## Sesión 22/02/2026 - Deploy en producción y fixes

### Resumen de lo realizado
Se desplegó el proyecto en el servidor VPS, se corrigieron errores de conexión a BD y se arreglaron discrepancias entre queries y tablas reales.

### Datos del servidor VPS
- **IP:** 45.236.130.25
- **URL pública:** https://45.236.130.25.sslip.io
- **Ruta del proyecto:** `/var/www/colegio-react`
- **Backup:** `/var/www/colegio-react-backup`
- **RAM:** 957MB (limitada, requiere swap para build)
- **PM2 process:** `colegio-backend` (server/index.js en puerto 3001)
- **Nginx:** proxy reverso en puerto 443 (SSL con Let's Encrypt)

### Cómo ejecutar comandos en el servidor desde Claude Code
```bash
cp /mnt/c/Users/Telqway/Desktop/colegio-react/.ssh_keys/id_rsa_vps_new /tmp/id_rsa_vps
chmod 600 /tmp/id_rsa_vps
ssh -i /tmp/id_rsa_vps -p 25404 -o StrictHostKeyChecking=no root@45.236.130.25 "COMANDO_AQUI"
```

### Cómo hacer deploy (actualizar servidor)
```bash
# 1. Desde el servidor:
cd /var/www/colegio-react
git pull origin master

# 2. Rebuild frontend (necesita swap por RAM limitada):
swapon /swapfile  # si no está activo
NODE_OPTIONS="--max-old-space-size=256" npm run build

# 3. Reiniciar backend:
pm2 restart all
```

### Swap creado para builds
El VPS tiene solo 957MB de RAM. Se creó un swap de 1GB para que Vite pueda compilar:
```bash
# Ya ejecutado (persiste hasta reboot):
fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
# Para hacerlo permanente (NO se ha hecho aún):
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### .env del servidor (`/var/www/colegio-react/server/.env`)
```
VITE_APP_MODE=production
VITE_API_BASE_URL=/api
VITE_SESSION_TIMEOUT=3600
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=9Il2cmw4PgSQ10V
DB_NAME=portal_estudiantil
JWT_SECRET=super_secret_jwt_key_2026
PORT=3001
NODE_ENV=production
DEMO_MODE=false
```
**IMPORTANTE:** dotenv NO carga correctamente desde PM2. Se corrigieron los valores por defecto en `server/config/database.js` directamente en el servidor:
- `DB_USER` default: `root` (antes era `portal_user`)
- `DB_PASSWORD` default: `9Il2cmw4PgSQ10V` (antes era `Portal@DB2024`)

### Nginx config (`/etc/nginx/sites-enabled/default`)
- Puerto 80 redirige a HTTPS
- Puerto 443 con SSL (Let's Encrypt para `45.236.130.25.sslip.io`)
- `/` sirve archivos estáticos desde `/var/www/colegio-react/dist`
- `/api` hace proxy a `localhost:3001`
- `/socket.io` hace proxy a `localhost:3001` con soporte WebSocket (agregado en esta sesión)

### Usuarios reales en la BD
| id | email | tipo_usuario | activo |
|----|-------|-------------|--------|
| 1 | admin@colegio.cl | administrador | 1 |
| 2 | docente@test.cl | docente | 1 |

### Fixes aplicados en el servidor (directamente, NO en repo local)

#### Fix 1: `server/config/database.js` - Credenciales por defecto
Cambiados los fallback values para que funcionen sin dotenv:
- `'portal_user'` → `'root'`
- `'Portal@DB2024'` → `'9Il2cmw4PgSQ10V'`

#### Fix 2: `tb_sesiones` - columna establecimiento_id nullable
```sql
ALTER TABLE tb_sesiones MODIFY COLUMN establecimiento_id int DEFAULT NULL;
```
Antes era `NOT NULL`, lo que causaba error 500 al hacer login si el usuario no tenía establecimiento asociado.

#### Fix 3: `server/routes/auth.js` - columna fecha_expiracion
El archivo en el servidor tenía queries con `fecha_expiracion` que no existe en `tb_sesiones`. Se reemplazó:
- `fecha_expiracion` → `activa` en el INSERT (línea 252)
- `DATE_ADD(NOW(), INTERVAL 24 HOUR)` → `1` en el VALUES (línea 253)
- `AND activa = 1 AND fecha_expiracion > NOW()` → `AND activa = 1` en el SELECT (línea 336)

### Discrepancias queries vs tablas reales — TODAS RESUELTAS (verificado 24/02/2026)

Las 6 discrepancias detectadas originalmente ya fueron corregidas en el código local:

| # | Problema original | Resolución |
|---|-------------------|------------|
| 1 | `respuesta_habilitada` no existe en `tb_chat_conversaciones` | La columna SÍ existe en la tabla. No era un problema real. |
| 2 | Comunicados admin: `nombres, apellidos` en `tb_usuarios` | Corregido: usa CASE WHEN con subqueries a `tb_administradores`/`tb_docentes`/`tb_apoderados` |
| 3 | Comunicados apoderado: mismo problema | Corregido: misma solución CASE WHEN |
| 4 | `matriculas.js`: `anio`/`estado` en `tb_periodos_matricula` | Corregido: usa `anio_academico` y `activo` |
| 5 | `matriculas.js`: pool sin destructuring | Corregido: usa `const { pool } = require(...)` |
| 6 | Logging: nombres NULL para admins | Corregido: usa `COALESCE(d.nombres, a.nombres)` con LEFT JOIN a `tb_docentes` + `tb_administradores` |

### Notas importantes para próximas sesiones
- **El servidor tiene cambios locales** que no están en el repo (fixes 1-3). Si se hace `git pull` se pueden perder. Considerar commitear esos cambios o aplicarlos también al repo local.
- **El swap no es permanente.** Si el servidor se reinicia, hay que ejecutar `swapon /swapfile` antes de hacer build, o agregar al fstab.
- **dotenv no funciona con PM2.** Los valores por defecto en `database.js` deben coincidir con las credenciales reales.
- **El terminal web del usuario corta líneas largas.** Usar SSH desde Claude Code para comandos largos, o `nano`/`vi` para editar archivos en el servidor.

---

## Sesión 23/02/2026 - Conectar página Apoderado a BD real

### Commit
- `156937b` — Conectar página apoderado a BD real - migrar fetch a apiFetch

### Datos de prueba creados en la BD

#### Usuario apoderado
| Campo | Valor |
|-------|-------|
| **Email** | apoderado@test.cl |
| **Password** | Apoderado2026! |
| **usuario_id** | 3 |
| **apoderado_id** | 1 |
| **RUT** | 15.234.567-8 |
| **Nombre** | María Fernanda González Pérez |

#### 3 alumnos vinculados (tb_alumnos + tb_alumno_establecimiento + tb_apoderado_alumno)
| alumno_id | Nombre | RUT | Curso (curso_id) | Parentesco |
|-----------|--------|-----|-------------------|------------|
| 1 | Valentina González Soto | 23.456.789-0 | 1° Básico A (1) | madre |
| 2 | Martín González Soto | 23.567.890-1 | 6° Básico A (6) | madre |
| 3 | Catalina González Muñoz | 23.678.901-2 | 1° Medio A (9) | madre |

#### 21 notas en tb_notas (trimestres 1 y 2, fechas marzo–julio 2026)
- **Valentina (alumno 1):** 5 notas Matemáticas + 3 notas Cs. Naturales (promedio ~6.1)
- **Martín (alumno 2):** 4 notas Matemáticas + 3 notas Artes Visuales (promedio ~5.1)
- **Catalina (alumno 3):** 6 notas Matemáticas (promedio ~5.1)

#### 5 comunicados en tb_comunicados
| id | Título | Tipo | Alcance |
|----|--------|------|---------|
| 1 | Reunión de Apoderados - Marzo 2026 | reunion | Global (todos los cursos) |
| 2 | Inicio Período de Evaluaciones - Trimestre 1 | academico | Global |
| 3 | Día del Alumno - Actividades Recreativas | evento | Global |
| 4 | Actualización de Datos de Contacto | administrativo | Global |
| 5 | Salida Pedagógica 1° Básico - Museo de Ciencias | evento | Solo 1° Básico A (tb_comunicado_curso) |

#### 3 preregistros en tb_preregistro_relaciones (todos con usado=1)
Simulan que el proceso de vinculación ya se completó. No aparece badge de "pupilos pendientes".

### Migración frontend: fetch() → apiFetch()

Archivos modificados (4):
- `src/components/apoderado/ApoderadoPage.jsx` — 4 fetch calls (mis-pupilos, pupilos-pendientes, confirmar-pupilo, vincular-manual)
- `src/components/apoderado/NotasTab.jsx` — 1 fetch call (notas)
- `src/components/apoderado/ProgresoTab.jsx` — 2 fetch calls (progreso, notas)
- `src/components/apoderado/ComunicadosTab.jsx` — 2 fetch calls (comunicados, marcar-leido)

Cambios aplicados en cada archivo:
1. Reemplazó `import config from '../../config/env'` → `import { apiFetch } from '../../utils/api'`
2. Reemplazó `fetch(config.apiBaseUrl + '/ruta')` → `apiFetch('/ruta')`
3. Eliminó `headers: { 'Content-Type': 'application/json' }` manuales (apiFetch lo agrega automáticamente cuando hay body)

### Deploy
- Archivos copiados al servidor vía SCP (git push no disponible, remote HTTPS sin credenciales)
- Build ejecutado: `NODE_OPTIONS="--max-old-space-size=256" npm run build`
- PM2 reiniciado: `pm2 restart all`

### Verificación API (todas OK)
- **Login** apoderado@test.cl → token JWT con apoderado_id, rut, 3 pupilos
- **GET /api/apoderado/mis-pupilos/1** → 3 pupilos con curso, establecimiento, parentesco
- **GET /api/apoderado/pupilo/1/notas** → 8 notas de Valentina
- **GET /api/apoderado/pupilo/1/comunicados** → comunicados visibles (globales + específico 1° Básico A)
- **GET /api/apoderado/pupilo/1/progreso** → estadísticas (promedio 6.1, 100% aprobación, promedios mensuales)
- **GET /api/apoderado/pupilos-pendientes/15.234.567-8** → 0 pendientes

### Nota sobre deploy vía SCP
El servidor tiene los archivos actualizados pero NO vía git pull (se copiaron directamente con SCP). El commit `156937b` está en el repo local pero no se pudo pushear al remote (HTTPS sin credenciales). Si se hace `git pull` en el servidor en el futuro, los archivos ya coinciden.

---

## Usuarios reales en la BD (actualizado 24/02/2026 — ver tabla más reciente abajo)

| usuario_id | email | tipo_usuario | password | activo |
|----|-------|-------------|----------|--------|
| 1 | patcorher@gmail.com | administrador | Admin2026! | 1 |
| 2 | docente@test.cl | docente | (original) | 1 |
| 3 | apoderado@test.cl | apoderado | Apoderado2026! | 1 |
| 4 | ana.lopez@colegio.cl | docente | Docente2026! | 1 |
| 5 | pedro.sanchez@colegio.cl | docente | Docente2026! | 1 |
| 6 | laura.martinez@colegio.cl | docente | Docente2026! | 1 |
| 7 | roberto.diaz@colegio.cl | docente | Docente2026! | 1 |
| 8 | carmen.torres@colegio.cl | docente | Docente2026! | 1 |
| 9 | miguel.herrera@colegio.cl | docente | Docente2026! | 1 |
| 10 | sofia.reyes@colegio.cl | docente | Docente2026! | 1 |
| 11 | patricia.vega@colegio.cl | docente | Docente2026! | 1 |
| 12 | francisco.rojas@colegio.cl | docente | Docente2026! | 1 |
| 13 | diego.fuentes@colegio.cl | docente | Docente2026! | 1 |

---

## Docentes en la BD (actualizado 23/02/2026)

| doc_id | usuario_id | Nombre | RUT | Asignaturas | Cursos |
|--------|-----------|--------|-----|-------------|--------|
| 1 | 2 | Carlos Andrés Muñoz Soto | 12345678-9 | Mat, CsNat, Artes | 9 |
| 2 | 4 | Ana López Silva | 11234567-0 | Lenguaje | 12 |
| 3 | 5 | Pedro Sánchez Mora | 11345678-1 | Historia | 12 |
| 4 | 6 | Laura Martínez Ríos | 11456789-2 | Inglés | 12 |
| 5 | 7 | Roberto Díaz Fuentes | 11567890-3 | Ed. Física | 12 |
| 6 | 8 | Carmen Torres Pino | 11678901-4 | CsNat, Biología | 10 |
| 7 | 9 | Miguel Herrera Vidal | 11789012-5 | Música | 8 |
| 8 | 10 | Sofía Reyes Castillo | 11890123-6 | Artes Visuales | 7 |
| 9 | 11 | Patricia Vega Molina | 11901234-7 | Tecnología, Física | 12 |
| 10 | 12 | Francisco Rojas Bravo | 12012345-8 | Química, Filosofía | 8 |
| 11 | 13 | Diego Fuentes Araya | 12123456-9 | Matemáticas | 6 |

**Total:** 11 docentes, 14 asignaturas, 108 asignaciones (9 por curso × 12 cursos)

### Asignaturas (14 total, establecimiento_id=1)
| ID | Nombre | Nivel | Cursos |
|----|--------|-------|--------|
| 1 | Matemáticas | basica,media | 1-12 |
| 2 | Lenguaje y Comunicación | basica,media | 1-12 |
| 3 | Ciencias Naturales | basica,media | 1-8 |
| 4 | Historia y Geografía | basica,media | 1-12 |
| 5 | Inglés | basica,media | 1-12 |
| 6 | Educación Física | basica,media | 1-12 |
| 7 | Artes Visuales | basica,media | 1-8 |
| 8 | Música | basica,media | 1-8 |
| 9 | Tecnología | basica,media | 1-8 |
| 10 | Orientación | basica,media | (sin asignar) |
| 11 | Biología | media | 9-12 |
| 12 | Física | media | 9-12 |
| 13 | Química | media | 9-12 |
| 14 | Filosofía | media | 9-12 |

---

## Sesión 23/02/2026 (2) — Poblar BD con alumnos, apoderados, notas y asistencia

### Datos insertados
| Tabla | Antes | Nuevos | Total |
|-------|-------|--------|-------|
| tb_alumnos | 3 | 57 | 60 |
| tb_alumno_establecimiento | 3 | 57 | 60 |
| tb_usuarios (apoderado) | 1 | 30 | 31 |
| tb_apoderados | 1 | 30 | 31 |
| tb_apoderado_establecimiento | 1 | 30 | 31 |
| tb_apoderado_alumno | 3 | 57 | 60 |
| tb_notas | 21 | 9,699 | 9,720 |
| tb_asistencia | 0 | 11,820 | 11,820 |
| **TOTAL nuevas filas** | | **~21,500** | |

### Distribución
- **5 alumnos por curso** (12 cursos × 5 = 60 alumnos)
- **162 notas por alumno** (9 asignaturas × 3 trimestres × 6 evaluaciones)
- **197 días hábiles** de asistencia por alumno (marzo-diciembre 2026, sin feriados chilenos)
- **Asistencia:** ~80.5% presente, 5.5% retirado, 5% atrasado, 5% justificado, 4% ausente

### Apoderados nuevos (IDs 2-31)
- 30 apoderados nuevos (usuario_id 14-43)
- Email: `apoderado{N}@test.cl` (N = 2 a 31)
- Password: `Apoderado2026!` (mismo hash bcrypt que apoderado existente)
- 27 con 2 pupilos + 3 con 1 pupilo = 57 alumnos cubiertos
- Apoderada original (ID 1, María Fernanda) conserva sus 3 pupilos (alumnos 1, 2, 3)

### Periodos académicos actualizados
- Trimestre 1: 2026-03-02 → 2026-05-29
- Trimestre 2: 2026-06-01 → 2026-08-28
- Trimestre 3: 2026-09-01 → 2026-12-11

### Notas
- Distribución gaussiana centrada en 4.5-6.5 (varía por alumno)
- 6 tipos de evaluación rotados: PE, TP, INT, TAR, EXP, PRY
- Fechas distribuidas cada 2 semanas por trimestre

---

## GitHub - Push desde WSL

- **Token:** (configurado en remote URL, ver con `git remote -v`)
- **Remote configurado:** `https://pato1982:<token>@github.com/pato1982/react_colegio_con_demo.git`
- **Comando:** `git push origin master` (funciona directo, token ya está en la URL del remote)

---

## Sesión 23/02/2026 (3) — Mejoras UI docente y fix error 400

### Commits
- `046ec96` — Mejorar UI responsiva docente: autocomplete, asistencia y modal notas
- `acfaf31` — Filtro trimestre en gráfico evolución, header móvil compacto, fix 400 notas/buscar

### Cambios realizados (7 archivos, todos desplegados al servidor vía SCP + build)

#### Commit 046ec96 — UI responsiva docente
- **AutocompleteAlumno.jsx**: nueva prop `formatNombre` (formato personalizado de nombres), prop `containerStyle`, estilos inline compactos (height 30px, fontSize 13px), z-index 2000 en dropdown
- **AgregarNotaTab.jsx**: formato dos líneas en móvil (apellidos arriba, nombres abajo), filtro de alumno en "Últimas Notas" cambiado de `<select>` a `AutocompleteAlumno`, eliminados `<div>` wrapper innecesarios con `display:contents`, overflow visible en cards
- **AsistenciaTab.jsx**: botones "Limpiar" y "Cargar Lista" responsivos (height 26px, fontSize 11px en móvil)
- **ModificarNotaTab.jsx**: modal editar nota adaptado a móvil (botones compactos, texto "Guardar" en vez de "Guardar Cambios")
- **colegio.css**: dropdown autocomplete z-index 2000, border-radius ajustado, shadow más marcada

#### Commit acfaf31 — Filtro gráfico + header + fix 400
- **ProgresoTab.jsx**: reemplazado texto "(Nota a Nota)" por mini-select de trimestre (Todos, T1, T2, T3) al lado del título del gráfico "Evolución de Notas". Estado independiente `filtroTrimestreGrafico` que solo afecta ese gráfico (no el filtro principal). Se resetea al cambiar curso.
- **DocentePage.jsx**: "Portal Docente" 11px→8px en móvil, nombre docente 16px→10px en móvil. Importado `useResponsive` hook.
- **AgregarNotaTab.jsx**: fix error 400 repetido en consola — `cargarNotasRecientes()` ya no llama a la API sin `curso_id`. URL corregida (eliminado `&` suelto). Fix scroll tabla: card con `overflow: hidden`, table-responsive con `flex: 1`.

### Estado de la BD (verificado)
- 480 alumnos (40 por curso × 12 cursos)
- 77,760 notas (6 notas × 9 asignaturas × 3 trimestres × 40 alumnos × 12 cursos)
- 94,560 registros de asistencia
- 31 apoderados, 11 docentes, 14 asignaturas, 108 asignaciones

### Deploy
- Archivos copiados al servidor vía SCP
- Build: `NODE_OPTIONS="--max-old-space-size=256" npm run build` (OK, ~19s)
- PM2 reiniciado: `pm2 restart all`

---

## Sesión 23/02/2026 (4) — Modal alumno/apoderado editable, logging auditoría, UI móvil admin

### Commits
- `73f9c1c` — Apoderado editable en modal alumno + logging en tb_log_actividades
- (pendiente) — Layout móvil modales admin + modal docente header blanco + fix tb_docente_asignatura

### Cambios realizados

#### 1. Modal Ficha Alumno — Pestaña Apoderado editable
- Pestaña "Apoderado" convertida de solo lectura a formulario editable
- Campos: RUT, Nombres, Apellidos, Parentesco (select enum), Email, Teléfono, Dirección
- Nuevo endpoint `PUT /api/alumnos/:alumnoId/apoderado` — actualiza `tb_apoderados` + `tb_apoderado_alumno` (parentesco)
- Botón "Guardar Cambios" ahora visible en ambas pestañas (alumno y apoderado)
- Header modal h3 color blanco

#### 2. Logging de auditoría en tb_log_actividades
Se agregó registro de auditoría (datos_anteriores + datos_nuevos en JSON) a 12 endpoints:

| Endpoint | Acción | Módulo |
|----------|--------|--------|
| POST /api/alumnos | crear | alumnos |
| PUT /api/alumnos/:id | editar | alumnos |
| PUT /api/alumnos/:id/apoderado | editar | apoderados |
| POST /api/asignaturas | crear | asignaturas |
| DELETE /api/asignaturas/:id | eliminar | asignaturas |
| POST /api/docentes/agregar | crear | docentes |
| PUT /api/notas/:notaId | editar | notas |
| DELETE /api/notas/:notaId | eliminar | notas |
| POST /api/asistencia | crear/editar | asistencia |
| POST /api/asistencia/masivo | crear | asistencia |
| DELETE /api/comunicados/:id | eliminar | comunicados |

Endpoints que YA tenían logging y no se tocaron: DELETE alumnos, PUT/DELETE docentes, POST comunicados, POST notas/registrar, PUT asistencia, POST/DELETE asignaciones.

#### 3. Layout móvil — Modal Ficha Alumno (AlumnosTab.jsx)
- Nuevo sistema de grid `ficha-grid` con 2 columnas en móvil, clase `fg-full` para items de fila completa
- Pestaña Alumno móvil: Curso+RUT | Nombres+Apellidos | Dirección+Sexo | Alergias (full) | Enf.Crónicas+NEE | Contacto+Tel.Emerg
- Pestaña Apoderado móvil: RUT+Parentesco | Nombres+Apellidos | Email (full) | Teléfono (full) | Dirección (full)
- Footer y badge matrícula compactados en móvil (padding reducido)
- Section-divider "Salud/Emerg." integrado dentro del grid con `grid-column: 1/-1`

#### 4. Modal Editar Docente (DocentesTab.jsx)
- Header "Editar Docente" color blanco (todos los modos)
- RUT + Email en la misma fila en móvil (clase `form-row-mobile-2col`)
- Botones más chicos en móvil (font 12px, padding 6px 12px)
- "Guardar" en vez de "Guardar Cambios" en móvil

#### 5. Fix BD — tb_docente_asignatura vacía
- Solo docente 1 (Carlos Muñoz) tenía registros en `tb_docente_asignatura`
- Los otros 10 docentes tenían sus asignaturas solo en `tb_asignaciones` (cargas académicas)
- Se insertaron 13 registros faltantes desde `tb_asignaciones` → `tb_docente_asignatura`
- Ahora los 11 docentes muestran sus asignaturas al seleccionarlos en "Asignar Docente"

### Deploy
- Archivos copiados al servidor vía SCP (AlumnosTab.jsx, DocentesTab.jsx, server/index.js)
- Build: `NODE_OPTIONS="--max-old-space-size=256" npm run build` (OK, ~18-22s)
- PM2 reiniciado

---

## Sesión 24/02/2026 (2) — Recuperación de contraseña con email real

### Commits
- Recuperación de contraseña: endpoints backend, email con nodemailer, frontend conectado

### Funcionalidad implementada
Flujo completo de "¿Olvidaste tu contraseña?" con envío de email real vía Gmail SMTP.

#### Flujo del usuario
1. Click "¿Olvidaste tu contraseña?" en login
2. Ingresa email → "Enviar instrucciones"
3. Backend genera token (1h), envía email con link `https://45.236.130.25.sslip.io/?token=XXX`
4. Usuario abre email, click en link → llega a ResetPasswordPage
5. Ingresa nueva contraseña → backend la actualiza con bcrypt
6. Redirige al login (si token expirado → mensaje + botón para pedir otro)

#### Archivos creados/modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `server/services/emailService.js` | NUEVO | Servicio nodemailer con Gmail SMTP |
| `server/routes/auth.js` | MODIFICADO | 2 endpoints: POST /api/auth/recuperar + POST /api/auth/reset-password |
| `src/services/authService.js` | MODIFICADO | Nueva función solicitarRecuperacion(email) |
| `src/components/LoginPage.jsx` | MODIFICADO | handleRecuperar conectado al backend real (antes simulado) |
| `src/components/ResetPasswordPage.jsx` | MODIFICADO | Manejo de token expirado/inválido |
| `package.json` | MODIFICADO | Agregado nodemailer como dependencia |

#### Endpoints backend nuevos

**POST /api/auth/recuperar**
- Recibe `{ email }` → busca usuario → genera token 64 chars → guarda en `reset_token` + `reset_token_expira` (1h)
- Envía email HTML+texto con link de recuperación
- Responde siempre igual (no revela si el email existe): `"Si el correo está registrado, recibirás instrucciones"`

**POST /api/auth/reset-password**
- Recibe `{ token, password }` → valida token → hashea con bcrypt(10) → actualiza `password_hash` → limpia token
- Errores: `{ error: 'invalid' }` (token no existe), `{ error: 'expired' }` (token expirado)

#### Cambios en la BD
```sql
ALTER TABLE tb_usuarios
ADD COLUMN reset_token VARCHAR(255) UNIQUE NULL,
ADD COLUMN reset_token_expira DATETIME NULL;
```

#### Email SMTP
- **Servicio:** Gmail con app password
- **Cuenta:** contacto.portalestudiantil@gmail.com
- **App password:** saqn mzva wpwx fnxg
- **Email:** HTML con diseño (logo, botón, link alternativo) + versión texto plano
- **Nota:** Emails pueden llegar a spam por URL basada en IP (sslip.io). Con dominio propio mejorará.

#### Cambio de email del administrador
- **Antes:** admin@colegio.cl
- **Ahora:** patcorher@gmail.com
- Password sin cambios: Admin2026!

### Deploy
- nodemailer instalado en servidor (`npm install nodemailer`)
- Archivos copiados vía SCP (6 archivos)
- Build frontend ejecutado en servidor
- PM2 reiniciado

### Verificaciones completadas
- Token se genera y guarda en BD
- Email enviado correctamente (llega, aunque a spam)
- Email inexistente → mismo mensaje (seguridad)
- Token inválido → `{ error: 'invalid' }`
- Reset con token válido → contraseña actualizada + token limpiado
- Login con nueva contraseña → OK

---

## Usuarios reales en la BD (actualizado 24/02/2026)

| usuario_id | email | tipo_usuario | password | activo |
|----|-------|-------------|----------|--------|
| 1 | **patcorher@gmail.com** | administrador | Admin2026! | 1 |
| 2 | docente@test.cl | docente | (original) | 1 |
| 3 | apoderado@test.cl | apoderado | Apoderado2026! | 1 |
| 4-13 | (docentes) | docente | Docente2026! | 1 |

---

## Próximos pasos

1. ~~**Configurar git push**~~ (HECHO - token configurado)
2. **Hacer swap permanente** en el servidor (`echo '/swapfile none swap sw 0 0' >> /etc/fstab`)
3. ~~**Arreglar las 6 discrepancias pendientes**~~ (HECHO - todas resueltas, ver sección arriba)
4. **Probar todos los módulos en producción:** login real, alumnos, docentes, apoderados, notas, asistencia, chat, comunicados, matrículas
5. **Revisar scroll tabla "Últimas Notas"** en móvil — se aplicó flex:1 + overflow hidden, verificar que funcione bien con muchos datos
6. **Tabla "Últimas Notas" vacía al entrar** — ahora requiere seleccionar curso en filtro para cargar. Considerar mostrar mensaje más descriptivo o cargar automáticamente el primer curso del docente

---

## Sesión 24/02/2026 — UI móvil admin, filtros ligados, header, optimización estadísticas

### Commits
- `6e6451d` — Mejoras móvil listado alumnos: nombre compacto, filtro sin formato RUT, altura tabla
- `bdf740f` — Filtros ligados docentes, header invertido, UI móvil tablas, optimización estadísticas

### Cambios realizados (7 archivos)

#### 1. Gestión de Alumnos — Móvil (AlumnosTab.jsx + colegio.css)
- **Nombres compactos en tabla**: primer apellido + inicial segundo (ej: "González P.") arriba, primer nombre + inicial segundo (ej: "María F.") abajo
- **Dropdown filtro móvil**: muestra "González P. María" (sin badge de curso), font 12px
- **Encabezado columna**: "Nombre" en vez de "Nombre Completo" en móvil
- **Títulos columnas centrados** en móvil
- **Altura listado**: aumentada a 480px (antes 260px)
- **Búsqueda por RUT flexible**: funciona con o sin puntos/guión (todos los modos). Se normaliza quitando `[.\-]` antes de comparar

#### 2. Listado de Docentes — Filtros ligados (DocentesTab.jsx)
- **Filtros docente/asignatura enlazados**: seleccionar un docente filtra las asignaturas del dropdown a solo las que imparte, y seleccionar una asignatura filtra los docentes a solo los que la imparten
- Nuevos `useMemo`: `asignaturasFiltradas` y `docentesDelDropdown`

#### 3. Carga Académica — Asignaciones Actuales (AsignacionesTab.jsx + colegio.css)
- Removido `style={{ maxHeight: '250px' }}` inline que bloqueaba el CSS responsive
- Altura listado móvil: 420px (controlado por CSS)

#### 4. Listado de Docentes — Altura móvil (colegio.css)
- Altura listado docentes: 440px en móvil

#### 5. Header — Invertido en todos los modos (Header.jsx + colegio.css)
- **Arriba**: nombre del colegio (bold, uppercase, font grande)
- **Abajo**: nombre del usuario (font chico, gris claro)
- Alineados a la izquierda (antes centrados)
- Móvil: nombre usuario font 9px, `white-space: nowrap` para evitar recorte

#### 6. Control de Asistencia — Móvil (AsistenciaTab.jsx + colegio.css)
- Título "Estadísticas del Periodo" compacto: font 10px, `white-space: nowrap` (una sola fila)

#### 7. Sábanas de Notas — Móvil (colegio.css)
- **Columna nombre sticky**: fija a la izquierda con `position: sticky`, `left: 0`, `box-shadow`
- **Z-index correcto**: celda nombre body (z-index 1) < thead (z-index 2) < celda nombre header (z-index 3)
- **Contenedor no desborda**: `overflow: hidden` + `max-width: 100vw` (antes `overflow: visible` agrandaba la página)
- **Altura tabla**: 320px
- **Columna nombre pegada al borde**: padding-left 0
- **Título "Alumno" centrado** en header
- **Leyenda colores centrada**

#### 8. Métricas de Gestión — Gráfico asignaturas móvil (EstadisticasTab.jsx)
- Nombres abreviados en móvil: Mat, Leng, CsNat, Hist, Ing, EdFís, Artes, Mús, Tec, Bio, Fís, Quím, Filo
- Font 8px en ticks del eje X en móvil
- Desktop: nombres completos sin cambios

#### 9. Tendencia — Solo periodo escolar (server/index.js)
- Todos los endpoints de tendencia mensual (`/general`, `/curso/:id`, `/docente/:id/asignatura/:id`, `/asignatura/:id`) ahora solo devuelven meses de **marzo a diciembre**
- Se eliminaron enero y febrero del gráfico en todos los modos

#### 10. Optimización carga Métricas de Gestión
- **Frontend**: `cargarListas()` y `cargarDatosGenerales()` ahora corren en paralelo al montar (antes secuencial)
- **Backend**: las 6 queries del endpoint `/estadisticas/general` ahora ejecutan con `Promise.all` (antes secuenciales con await)
- **BD**: 7 índices compuestos nuevos:
  - `idx_notas_est_anio_activo` (establecimiento_id, anio_academico, activo, nota)
  - `idx_notas_curso_anio_activo` (curso_id, anio_academico, activo, nota)
  - `idx_notas_docente_asig_anio` (docente_id, asignatura_id, anio_academico, activo)
  - `idx_notas_asig_est_anio` (asignatura_id, establecimiento_id, anio_academico, activo)
  - `idx_notas_est_anio_fecha` (establecimiento_id, anio_academico, activo, fecha_evaluacion)
  - `idx_asist_est_anio_activo` (establecimiento_id, anio_academico, activo, estado)
  - `idx_asist_curso_anio_activo` (curso_id, anio_academico, activo, estado)
- **Resultado**: carga de ~1.7s a ~0.7s (~60% más rápido)

### Deploy
- Archivos copiados al servidor vía SCP (7 archivos)
- Build: `NODE_OPTIONS="--max-old-space-size=256" npm run build`
- PM2 reiniciado (cambios en server/index.js)
- Índices creados directamente en la BD del servidor

---

## Sesión 24/02/2026 (3) — Nuevo flujo registro admin con código 12 dígitos + TechPanel conectado

### Commit
- `f54c149` — Nuevo flujo registro admin con código 12 dígitos desde TechPanel

### Resumen
Se cambió el flujo de registro de administrador para que use un código de 12 dígitos generado desde el TechPanel como pieza central de validación, en vez de validar solo por RUT+email. El establecimiento ahora aparece prellenado (readonly) en el paso 2.

### Flujo nuevo

**TechPanel (app del programador):**
1. Llena formulario: Nombres, Apellidos, RUT, Teléfono, Correo, Establecimiento
2. Click "Generar código" → genera 1 código único (XXX-XXX-XXX-XXX, solo mayúsculas+números sin ambiguos)
3. Botón se deshabilita (no se puede regenerar)
4. Click "Confirmar pre registro" → guarda en `tb_codigos_validacion` + `tb_preregistro_administradores`

**App estudiantil (registro admin):**
1. **Paso 1** — Datos + código: Nombres y Apellidos, RUT, Teléfono, Correo, Código de 12 dígitos
   - Sin dropdown de establecimiento (se quitó)
   - "Siguiente" valida campos y llama al backend para validar código+datos contra preregistro
   - Si falla → popup con error específico (qué dato falla) + "Intento X de 5"
   - Si 5 intentos → popup "Comuníquese con Portal Estudiantil" + bloqueo
   - Si OK → guarda datos del preregistro y pasa al paso 2
2. **Paso 2** — Establecimiento (readonly prellenado) + Contraseña
   - Al "Crear cuenta" → registra usuario + marca código como usado

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `server/routes/registro.js` | Nuevo endpoint `POST /api/registro/validar-codigo-admin` + modificado `POST /api/registro/admin` para usar código |
| `src/components/RegistroPage.jsx` | Estados intentosFallidos/datosPreregistro/bloqueado, handleSiguiente async con validación backend |
| `src/components/registro/FormularioDatos.jsx` | Dropdown establecimiento → input código 12 dígitos |
| `src/components/registro/FormularioPassword.jsx` | Nueva prop `establecimiento` (input readonly) |
| `src/components/registro/ModalResultado.jsx` | Nueva prop `intentos` (contador warning) |
| `src/components/registro/registroUtils.js` | validarPaso1Admin: `establecimiento` → `codigo` |
| `src/services/registroService.js` | Nueva función `validarCodigoAdmin(codigo, datos)` |
| `tech-admin/client/src/pages/RegistroAdmin.jsx` | Código con dashes, solo mayúsculas, botón se deshabilita tras generar |
| `tech-admin/routes/registro.js` | Normalización código (quita dashes/espacios) antes de guardar |

### Cambio en BD
```sql
ALTER TABLE tb_intentos_registro_fallidos_admin MODIFY COLUMN motivo_fallo VARCHAR(50) NOT NULL;
```
Cambiado de enum a varchar(50) para soportar los nuevos motivos de fallo.

### Normalización de códigos
Todos los puntos (TechPanel, app estudiantil, backend) normalizan el código quitando dashes y espacios antes de comparar/guardar. El código se almacena como 12 caracteres sin separadores (ej: `ABCDEFGHIJKL`), pero se muestra con dashes (ej: `ABC-DEF-GHI-JKL`).

### Deploy
- 4 archivos frontend + 1 backend copiados al servidor
- Build frontend principal + build TechPanel
- PM2 restart all (ambos servicios online)

### Verificación E2E (por API)
- TechPanel crea preregistro → guarda en ambas tablas (código id=4, preregistro id=4)
- App estudiantil valida código+datos correctos → `{success: true, datos: {establecimiento: "Colegio de Desarrollo"}}`
- Datos incorrectos → errores específicos ("El RUT no coincide", "El correo no coincide", "Código inválido")
- Intentos fallidos se registran en `tb_intentos_registro_fallidos_admin`
- Datos de prueba limpiados tras verificación

### PENDIENTE: Prueba completa en navegador
Falta probar el flujo completo desde el navegador:
1. Crear un preregistro real desde el TechPanel (https://45.236.130.25.sslip.io/tech/)
2. Ir al registro de admin en la plataforma estudiantil y completar el formulario con el código generado
3. Verificar que el paso 2 muestra el establecimiento prellenado y que se puede crear la cuenta exitosamente
4. Verificar que el código queda marcado como usado en la BD

---

## Sesión 25/02/2026 — Estructura de cursos y modalidad académica en pre-registro TechPanel

### Commit
- `b535f87` — Estructura cursos + modalidad académica en pre-registro TechPanel

### Resumen
Al crear un pre-registro de administrador en TechPanel, ahora se configura la estructura de cursos del establecimiento (niveles, secciones) y la modalidad académica (trimestral/semestral). Los cursos se crean automáticamente en `tb_cursos` dentro de la misma transacción.

### Cambios en BD
```sql
ALTER TABLE tb_establecimientos ADD COLUMN modalidad_academica ENUM('trimestral','semestral') NOT NULL DEFAULT 'trimestral' AFTER nivel_educativo;
```
- Establecimientos existentes quedan como `trimestral` (default)
- Cada establecimiento nuevo puede tener su propia modalidad

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `tech-admin/client/src/pages/RegistroAdmin.jsx` | UI: modalidad (radio trimestral/semestral) + estructura de cursos (4 checkboxes en fila: Pre-Kinder, Kinder, Básica 1°-8°, Media 1°-4°) + select secciones (1-4) visible al activar + resumen total |
| `tech-admin/routes/registro.js` | Recibe `modalidad_academica` + `estructura_cursos`, crea cursos en `tb_cursos` y actualiza `nivel_educativo` en `tb_establecimientos` (solo para establecimientos nuevos) |
| `tech-admin/client/src/styles/techpanel.css` | Estilos: modalidad-row, niveles-grid (4 cols), nivel-col, nivel-opciones, estructura-resumen |

### UI del formulario
```
Configuración Académica

Modalidad:  (o) Trimestral (3 periodos)  ( ) Semestral (2 periodos)

Estructura de Cursos
[ ] Pre-Kinder    [ ] Kinder    [ ] Básica 1°a8°    [ ] Media 1°a4°
```
- Nada seleccionado por defecto (el usuario debe marcar explícitamente)
- Al activar un checkbox aparece el select de secciones debajo
- Resumen dinámico: "Total: 20 cursos (16 básica + 4 media)"

### Convención de nombres de cursos generados
| Nivel | Nombre ejemplo | Código |
|-------|---------------|--------|
| parvularia | Pre-Kinder A | PKA |
| parvularia | Kinder B | KB |
| basica | 1° Basico A | 1BA |
| basica | 8° Basico C | 8BC |
| media | 1° Medio A | 1MA |
| media | 4° Medio D | 4MD |

### Lógica backend
- Solo crea cursos si el establecimiento es **nuevo** (no existente)
- INSERT masivo en `tb_cursos` con `anio_academico = año actual`
- UPDATE `tb_establecimientos.nivel_educativo` con niveles seleccionados (SET: parvularia,basica,media)
- `modalidad_academica` se guarda en el INSERT del establecimiento (sanitizada: solo 'semestral' o default 'trimestral')
- Todo dentro de la transacción existente (rollback si algo falla)

### Verificación por API
- Pre-registro con estructura básica (2 secciones) + media (1 sección) → 20 cursos creados correctamente
- Pre-registro con modalidad semestral → `modalidad_academica = 'semestral'` en BD
- Establecimiento existente → no se crean cursos duplicados
- Establecimiento 1 mantiene sus 12 cursos originales sin cambios
- Datos de prueba limpiados tras verificación

### Deploy
- Archivos copiados al servidor vía SCP (3 archivos)
- Build TechPanel: `cd tech-admin/client && npx vite build`
- PM2 restart tech-admin

### PENDIENTE: Prueba completa en navegador
No se ha probado aún el funcionamiento completo desde el navegador. Falta verificar:
1. Crear pre-registro en TechPanel seleccionando niveles y modalidad
2. Verificar que los cursos aparecen en BD con nombres/códigos correctos
3. Completar registro del admin desde la plataforma estudiantil
4. Login como nuevo admin → verificar que los cursos aparecen en filtros de Gestión de Alumnos
5. Verificar que la modalidad se respeta en la configuración del establecimiento

---

## Sesión 25/02/2026 (2) — Soporte dinámico trimestral/semestral + limpieza BD

### Commits
- `859b716` — Soporte dinámico trimestral/semestral en todo el sistema
- `7e8e21b` — Fix: usar periodos.notasPorPeriodo como default en admin (14 para semestral)
- `fee89c7` — Fix: label Trimestre hardcodeado en ProgresoTab desktop → usar periodos.nombreGenerico
- `84a54c7` — Eliminar labels "trimestre" hardcodeados: usar periodos dinámicos en toda la UI
- `0a303ea` — Pre-registro admin en TechPanel: estructura cursos y modalidad académica

### Resumen
Toda la UI ahora se adapta dinámicamente según la `modalidad_academica` del establecimiento (trimestral: 3 periodos × 8 notas, semestral: 2 periodos × 14 notas). Se eliminaron 11 tablas sin uso de la BD.

### Nueva utilidad: `src/utils/periodos.js`
Función `getPeriodos(modalidad)` que centraliza toda la configuración de periodos:
- `cantidad`: 2 o 3
- `notasPorPeriodo`: 14 o 8
- `ids`: [1,2] o [1,2,3]
- `labels`, `labelsCortos` (S1/S2 o T1/T2/T3), `labelsFiltro`, `nombreGenerico`, `promedioPrefix`

### Flujo de datos
1. **Backend** (`server/routes/auth.js`): login y `/me` incluyen `modalidad_academica` en `datosAdicionales` para admin, docente y apoderado
2. **Pages** (AdminPage, DocentePage, ApoderadoPage): pasan `modalidad={usuario?.modalidad_academica}` a cada tab
3. **Tabs**: usan `getPeriodos(modalidad)` vía `useMemo` para generar toda la configuración dinámica

### Archivos modificados (13 + 1 nuevo)

| Archivo | Cambio |
|---------|--------|
| `src/utils/periodos.js` | **NUEVO** — utilidad central getPeriodos() |
| `server/routes/auth.js` | `modalidad_academica` en SELECT + datosAdicionales (login + /me, 3 tipos usuario) |
| `server/index.js` | Asistencia: periodo dinámico (semestral: mes≤7→1, else→2). Notas/por-curso: arrays dinámicos por modalidad |
| `src/components/admin/AdminPage.jsx` | Pasa `modalidad` a NotasPorCursoTab + desc menú dinámica |
| `src/components/docente/DocentePage.jsx` | Pasa `modalidad` a AgregarNota, ModificarNota, VerNotas, Progreso |
| `src/components/apoderado/ApoderadoPage.jsx` | Pasa `modalidad` a NotasTab + desc menú dinámica |
| `src/components/NotasPorCursoTab.jsx` | Columnas, headers, default cols → todo dinámico via periodos |
| `src/components/docente/VerNotasTab.jsx` | Headers, celdas, promedios, colSpan → dinámico |
| `src/components/docente/AgregarNotaTab.jsx` | Selector trimestre/semestre dinámico |
| `src/components/docente/ModificarNotaTab.jsx` | Modal editar + header tabla ("Trim."/"Sem.") → dinámico |
| `src/components/docente/ProgresoTab.jsx` | Filtros, gráfico evolución, labels → dinámico |
| `src/components/docente/shared/FiltrosDocente.jsx` | Label periodo + opciones → dinámico via prop `periodos` |
| `src/components/apoderado/NotasTab.jsx` | Libro calificaciones: columnas, headers, promedios → dinámico |
| `src/data/landingData.js` | "Notas por trimestre" → "Notas por periodo" (genérico, sin contexto escuela) |

### Fixes aplicados durante la sesión
1. **Default 8 columnas en admin** (NotasPorCursoTab L182): `return 8` → `return periodos.notasPorPeriodo` — causaba que semestral mostrara 8 cols en vez de 14
2. **Label "Trimestre" hardcodeado en ProgresoTab desktop** (L420): → `periodos.nombreGenerico`
3. **Headers "T1/T2" en admin** (NotasPorCursoTab L313): `T{trim.id}` → `periodos.labelsCortos[idx]` (S1/S2 para semestral)
4. **Header "Trim." en ModificarNotaTab** (L770): → dinámico "Sem."/"Trim."
5. **Descripciones menú admin y apoderado**: "filtrar por trimestre" → dinámico según modalidad

### Limpieza de BD — 11 tablas eliminadas

Se realizó análisis cruzando las 54 tablas en BD con todas las referencias en código (server/ + tech-admin/).

**Tablas eliminadas (0 referencias en código, 0 registros):**
| Tabla | Propósito original (nunca implementado) |
|-------|----------------------------------------|
| `tb_claves_provisorias` | Claves temporales |
| `tb_documentos_requeridos` | Catálogo docs matrícula |
| `tb_facturas` | Facturación |
| `tb_historial_suscripciones` | Historial planes |
| `tb_horarios` | Horarios de clase |
| `tb_pagos` | Sistema pagos genérico |
| `tb_plan_funcionalidades` | Features por plan SaaS |
| `tb_planes` | Planes suscripción |
| `tb_promociones` | Códigos promocionales |
| `tb_suscripcion_promocion` | Relación suscripción-promo |
| `tb_suscripciones` | Suscripciones establecimientos |

Todas correspondían a un sistema de monetización/SaaS que nunca se implementó.

**BD ahora tiene 43 tablas** (antes 54).

### Estado de la BD (actualizado 25/02/2026)
- **43 tablas** (37 activas + 6 conectadas esperando funcionalidad futura)
- 480 alumnos, 31 apoderados, 11 docentes, 77760 notas, 94560 asistencia
- Establecimiento id=1 "Colegio de Desarrollo" → trimestral (3 periodos × 8 notas)
- Establecimiento id=11 "nuevo colegio" → semestral (2 periodos × 14 notas)

### Deploy
- Push vía git (`git push origin master`)
- Pull en servidor + `npm run build` + `pm2 restart colegio-backend`
- Tablas eliminadas directamente en BD del servidor con `SET FOREIGN_KEY_CHECKS = 0`

---

## Sesión 25/02/2026 (3) — Limpieza archivos BD + regenerar documentación tablas

### Archivos eliminados del proyecto (11)

Se verificó exhaustivamente que ninguno estaba siendo usado por código en producción (sin require, import, fs.read, ni referencia en package.json, PM2 o Vite).

**Archivos de datos/estructura:**
- `estructuras_tb.sql` — dump antiguo de estructuras
- `server/db_structure_analysis.json` — análisis JSON de 7286 líneas

**Scripts de utilidad (one-time, ya ejecutados):**
- `server/analyze_db_structures.js`
- `server/check_db_schema.js`
- `server/check_schema_matriculas.js`
- `server/consolidar_schema.js`
- `fix_mysql_schema.ps1`
- `comparar_tablas.js`
- `generar_doc_db.js`
- `migrar_sql_a_doc.js`

**Total eliminado:** ~10.150 líneas de código/datos muertos.

### Regeneración de `docs/TABLAS_BASE_DATOS.md`

Se reemplazó el contenido completo del archivo con las estructuras actualizadas:
- Extraído desde BD de producción via `mysqldump --no-data portal_estudiantil`
- 43 tablas con CREATE TABLE limpio (sin AUTO_INCREMENT values ni boilerplate mysqldump)
- Incluye: índice descriptivo, FK, índices compuestos, CHECK constraints, COMMENTs
- Sección final con registro de las 11 tablas eliminadas y sus motivos
- Nota sobre FK huérfana en `tb_documentos_matricula` → `tb_documentos_requeridos` (eliminada)

### Commit y deploy
- Commit: `acf9cfb` — "Limpiar archivos BD huérfanos y regenerar docs/TABLAS_BASE_DATOS.md"
- Push: `git push origin master`

---

## Sesión 26/02/2026 — Toggle Real/Demo en Login

### Problema
Los botones de tipo usuario (Admin, Docente, Apoderado) en el login siempre autollenaban credenciales demo. No había forma de usar el login con credenciales reales sin borrar manualmente los campos.

### Solución implementada
Toggle pill "Real / Demo" encima de los botones de tipo usuario:
- **Modo Demo** (default, naranja): click en tipo → autollena credenciales demo
- **Modo Real** (azul): click en tipo → campos quedan vacíos para login real
- Cambiar a Real limpia campos automáticamente
- Cambiar a Demo con tipo ya seleccionado → autollena

### Archivos modificados
- `src/components/LoginPage.jsx` — estado `modoDemo`, lógica `toggleModoDemo()`, JSX del toggle
- `src/styles/login.css` — estilos toggle pill compacto (36x20px desktop, 32x18px mobile)

### Commit y deploy
- Commit: `69c37fc` — "Toggle Real/Demo en login: elegir entre credenciales demo o campos vacíos"
- Push: `git push origin master`
- Deploy: archivos subidos vía SCP + `npm run build` + `pm2 restart colegio-backend`

---

## Sesión 26/02/2026 (2) — Sub-pestaña Docente en TechPanel

### Funcionalidad implementada
Pre-registro de docentes desde TechPanel (`/tech/` → Registros → Docente), con dos pestañas: "Agregar Docente" y "Modificar Docente" (placeholder).

### Flujo "Agregar Docente"
1. Seleccionar establecimiento (carga lista desde BD)
2. Llenar datos: nombres*, apellidos*, RUT* (auto-formateado), teléfono, email
3. Al seleccionar establecimiento se cargan sus asignaturas como checkboxes (grid 4 columnas)
4. Click "Confirmar pre registro" → crea fila en `tb_preregistro_docentes` + asignaturas en `tb_preregistro_docente_asignatura`
5. Si el RUT ya existe en `tb_docentes` → error (se manejará desde pestaña "Modificar" futura)
6. Si ya tiene pre-registro activo para ese establecimiento → error

### Cuando el docente se registra (flujo existente en plataforma)
- `tb_preregistro_docentes` → `tb_usuarios` + `tb_docentes` + `tb_docente_establecimiento`
- `tb_preregistro_docente_asignatura` → `tb_docente_asignatura`
- Pre-registro se marca como `usado = 1`

### Archivos nuevos
- `tech-admin/client/src/pages/RegistroDocente.jsx` — componente con pestañas Agregar/Modificar, formulario con select establecimiento, campos docente, checkboxes asignaturas

### Archivos modificados
- `tech-admin/routes/registro.js` — 3 endpoints: `GET /establecimientos`, `GET /asignaturas/:id`, `POST /docente-tech`
- `tech-admin/client/src/App.jsx` — import RegistroDocente, reemplazo placeholder
- `tech-admin/client/src/styles/techpanel.css` — `.asignaturas-grid-tech` (grid 4 columnas)

### Fix aplicado durante deploy
- `tipo_usuario` en `tb_log_actividades` es `enum('administrador','docente','apoderado','sistema')` — se usó `'sistema'` en vez de `'techpanel'`

### Commit y deploy
- Commit: `9687920` — "Sub-pestaña Docente en TechPanel: pre-registro con asignaturas"
- Push: `git push origin master`
- Deploy: archivos vía SCP + `npm run build` + `pm2 restart tech-admin`

## Sesión 27/02/2026 — Modificar Docente editable + eliminar docente + cubo bienvenida

### Funcionalidad "Modificar Docente" (completada)
La pestaña Modificar Docente ahora es totalmente funcional:

1. **Datos del docente**: RUT con botón Buscar integrado al lado, Nombres, Apellidos, Email, Teléfono, Cargo (readonly), Establecimiento (readonly) + botón "Guardar datos"
2. **Asignaturas**: checkboxes editables de todas las asignaturas del establecimiento + botón "Guardar asignaturas"
3. **Cursos asignados**: tabla interactiva (filas=cursos, columnas=asignaturas del docente) con checkboxes para asignar/desasignar + botón "Guardar cursos" (solo se habilita con cambios pendientes)
4. **Eliminar docente**: botón rojo al final con confirmación popup (nombre + establecimiento). Soft delete en cadena: tb_docentes, tb_usuarios, tb_docente_establecimiento, tb_docente_asignatura, tb_asignaciones

### Cubo 3D de bienvenida
- Al cargar/recargar TechPanel siempre muestra cubo giratorio con letra "E" en 6 caras
- Sidebar inicia con "Registros" cerrado
- Contenido solo aparece al navegar desde el sidebar
- Cubo 220px, centrado en el área de contenido, colores del tema

### Endpoints nuevos en `tech-admin/routes/registro.js`
- `GET /registro/cursos/:establecimientoId` — cursos de un establecimiento
- `POST /registro/docente-asignacion` — crear asignaciones (docente + curso + asignaturas[])
- `DELETE /registro/docente-asignacion/:id` — eliminar asignación (soft delete)
- `DELETE /registro/docente/:id` — eliminar docente completo (soft delete en cadena)

### Endpoint modificado
- `GET /registro/docente-by-rut` — ahora incluye `asignacion_id` y `asignatura_id` en cada curso

### Archivos modificados
- `tech-admin/routes/registro.js` — 4 endpoints nuevos + 1 modificado
- `tech-admin/client/src/pages/RegistroDocente.jsx` — Modificar Docente completo
- `tech-admin/client/src/styles/techpanel.css` — tabla cursos-asignaturas + cubo 3D
- `tech-admin/client/src/App.jsx` — WelcomeCube + redirect a / al montar
- `tech-admin/client/src/components/Sidebar.jsx` — Registros cerrado por defecto

### Commit y deploy
- Commit: `7899284` — "Modificar Docente: cursos editables, eliminar docente, cubo bienvenida"
- Push: `git push origin master`
- Deploy: archivos vía SCP + `vite build` + `pm2 restart tech-admin`
