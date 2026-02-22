# Estructuras de Base de Datos - Portal Estudiantil

Este documento registra la estructura técnica de todas las tablas registradas en el proyecto.

*Actualizado automáticamente desde estructuras_tb.sql*

---

## Índice de Tablas (54 tablas)

1. [tb_administrador_establecimiento](#tb-administrador-establecimiento)
2. [tb_administradores](#tb-administradores)
3. [tb_alumno_establecimiento](#tb-alumno-establecimiento)
4. [tb_alumnos](#tb-alumnos)
5. [tb_apoderado_alumno](#tb-apoderado-alumno)
6. [tb_apoderado_establecimiento](#tb-apoderado-establecimiento)
7. [tb_apoderados](#tb-apoderados)
8. [tb_asignaciones](#tb-asignaciones)
9. [tb_asignaturas](#tb-asignaturas)
10. [tb_chat_conversaciones](#tb-chat-conversaciones)
11. [tb_chat_mensajes](#tb-chat-mensajes)
12. [tb_claves_provisorias](#tb-claves-provisorias)
13. [tb_codigos_validacion](#tb-codigos-validacion)
14. [tb_comunicado_curso](#tb-comunicado-curso)
15. [tb_comunicado_leido](#tb-comunicado-leido)
16. [tb_comunicados](#tb-comunicados)
17. [tb_configuracion_establecimiento](#tb-configuracion-establecimiento)
18. [tb_cursos](#tb-cursos)
19. [tb_docente_asignatura](#tb-docente-asignatura)
20. [tb_docente_establecimiento](#tb-docente-establecimiento)
21. [tb_docentes](#tb-docentes)
22. [tb_documentos_matricula](#tb-documentos-matricula)
23. [tb_documentos_requeridos](#tb-documentos-requeridos)
24. [tb_establecimientos](#tb-establecimientos)
25. [tb_facturas](#tb-facturas)
26. [tb_historial_suscripciones](#tb-historial-suscripciones)
27. [tb_horarios](#tb-horarios)
28. [tb_intentos_login_fallidos](#tb-intentos-login-fallidos)
29. [tb_intentos_registro_fallidos_admin](#tb-intentos-registro-fallidos-admin)
30. [tb_intentos_registro_fallidos_docentes](#tb-intentos-registro-fallidos-docentes)
31. [tb_log_actividades](#tb-log-actividades)
32. [tb_matriculas](#tb-matriculas)
33. [tb_notas](#tb-notas)
34. [tb_notificaciones](#tb-notificaciones)
35. [tb_observaciones_alumno](#tb-observaciones-alumno)
36. [tb_pagos](#tb-pagos)
37. [tb_periodos_academicos](#tb-periodos-academicos)
38. [tb_pagos_matricula](#tb-pagos-matricula)
39. [tb_periodos_matricula](#tb-periodos-matricula)
40. [tb_plan_funcionalidades](#tb-plan-funcionalidades)
41. [tb_planes](#tb-planes)
42. [tb_preregistro_administradores](#tb-preregistro-administradores)
43. [tb_preregistro_docentes](#tb-preregistro-docentes)
44. [tb_preregistro_docente_asignatura](#tb-preregistro-docente-asignatura)
45. [tb_preregistro_relaciones](#tb-preregistro-relaciones)
46. [tb_promociones](#tb-promociones)
47. [tb_sesiones](#tb-sesiones)
48. [tb_suscripcion_promocion](#tb-suscripcion-promocion)
49. [tb_suscripciones](#tb-suscripciones)
50. [tb_tipos_evaluacion](#tb-tipos-evaluacion)
51. [tb_usuarios](#tb-usuarios)
52. [tb_asistencia](#tb-asistencia)
53. [tb_intentos_registro_fallidos](#tb-intentos-registro-fallidos)
54. [tb_consultas_contacto](#tb-consultas-contacto)

---

## 1. tb_administrador_establecimiento

```sql
CREATE TABLE `tb_administrador_establecimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `administrador_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `es_principal` tinyint(1) DEFAULT '0',
  `cargo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Administrador',
  `fecha_asignacion` date NOT NULL,
  `fecha_termino` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_est` (`administrador_id`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_adminest_admin` FOREIGN KEY (`administrador_id`) REFERENCES `tb_administradores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_adminest_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_administrador_establecimiento`.

---

## 2. tb_administradores

```sql
CREATE TABLE `tb_administradores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `rut` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Masculino','Femenino','Otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuario` (`usuario_id`),
  UNIQUE KEY `uk_rut` (`rut`),
  CONSTRAINT `fk_admin_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_administradores`.

---

## 3. tb_alumno_establecimiento

```sql
CREATE TABLE `tb_alumno_establecimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `curso_id` int DEFAULT NULL,
  `anio_academico` int NOT NULL,
  `numero_matricula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_lista` int DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `fecha_retiro` date DEFAULT NULL,
  `motivo_retiro` enum('transferencia','egreso','retiro_voluntario','expulsion','otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observacion_retiro` text COLLATE utf8mb4_unicode_ci,
  `establecimiento_destino` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_alumno_est_anio` (`alumno_id`,`establecimiento_id`,`anio_academico`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_curso` (`curso_id`),
  KEY `idx_anio` (`anio_academico`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_alumnoest_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `tb_alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_alumnoest_curso` FOREIGN KEY (`curso_id`) REFERENCES `tb_cursos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_alumnoest_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_alumno_establecimiento`.

---

## 4. tb_alumnos

```sql
CREATE TABLE `tb_alumnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rut` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Masculino','Femenino','Otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nacionalidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Chilena',
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comuna` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alergias` text COLLATE utf8mb4_unicode_ci,
  `enfermedades_cronicas` text COLLATE utf8mb4_unicode_ci,
  `medicamentos` text COLLATE utf8mb4_unicode_ci,
  `grupo_sanguineo` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto_emergencia_nombre` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto_emergencia_telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rut` (`rut`),
  KEY `idx_activo` (`activo`),
  KEY `idx_apellidos` (`apellidos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_alumnos`.

---

## 5. tb_apoderado_alumno

```sql
CREATE TABLE `tb_apoderado_alumno` (
  `id` int NOT NULL AUTO_INCREMENT,
  `apoderado_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `parentesco` enum('padre','madre','abuelo','abuela','tio','tia','hermano','hermana','tutor_legal','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `parentesco_otro` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_apoderado_titular` tinyint(1) DEFAULT '1',
  `es_apoderado_suplente` tinyint(1) DEFAULT '0',
  `es_contacto_emergencia` tinyint(1) DEFAULT '0',
  `puede_retirar` tinyint(1) DEFAULT '1',
  `recibe_comunicados` tinyint(1) DEFAULT '1',
  `recibe_notas` tinyint(1) DEFAULT '1',
  `vive_con_alumno` tinyint(1) DEFAULT '1',
  `orden_prioridad` int DEFAULT '1',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_apoderado_alumno` (`apoderado_id`,`alumno_id`),
  KEY `idx_alumno` (`alumno_id`),
  KEY `idx_titular` (`es_apoderado_titular`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_apodalum_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `tb_alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_apodalum_apoderado` FOREIGN KEY (`apoderado_id`) REFERENCES `tb_apoderados` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_apoderado_alumno`.

---

## 6. tb_apoderado_establecimiento

```sql
CREATE TABLE `tb_apoderado_establecimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `apoderado_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `es_apoderado_activo` tinyint(1) DEFAULT '1',
  `fecha_registro` date NOT NULL,
  `fecha_retiro` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_apoderado_est` (`apoderado_id`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_apoderadoest_apoderado` FOREIGN KEY (`apoderado_id`) REFERENCES `tb_apoderados` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_apoderadoest_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_apoderado_establecimiento`.

---

## 7. tb_apoderados

```sql
CREATE TABLE `tb_apoderados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `rut` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_emergencia` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Masculino','Femenino','Otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comuna` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ocupacion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lugar_trabajo` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuario` (`usuario_id`),
  UNIQUE KEY `uk_rut` (`rut`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_apoderado_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_apoderados`.

---

## 8. tb_asignaciones

```sql
CREATE TABLE `tb_asignaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `docente_id` int NOT NULL,
  `curso_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `anio_academico` int NOT NULL,
  `horas_asignadas` int DEFAULT NULL,
  `es_titular` tinyint(1) DEFAULT '1',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_asignacion` (`docente_id`,`curso_id`,`asignatura_id`,`anio_academico`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_curso` (`curso_id`),
  KEY `idx_asignatura` (`asignatura_id`),
  KEY `idx_anio` (`anio_academico`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_asignacion_asignatura` FOREIGN KEY (`asignatura_id`) REFERENCES `tb_asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asignacion_curso` FOREIGN KEY (`curso_id`) REFERENCES `tb_cursos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asignacion_docente` FOREIGN KEY (`docente_id`) REFERENCES `tb_docentes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asignacion_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_asignaciones`.

---

## 9. tb_asignaturas

```sql
CREATE TABLE `tb_asignaturas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `nivel` set('parvularia','basica','media') COLLATE utf8mb4_unicode_ci DEFAULT 'basica,media',
  `horas_semanales` int DEFAULT '2',
  `es_electivo` tinyint(1) DEFAULT '0',
  `es_taller` tinyint(1) DEFAULT '0',
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#2196F3',
  `orden` int DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_asignatura_est` (`nombre`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_asignatura_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_asignaturas`.

---

## 10. tb_chat_conversaciones

```sql
CREATE TABLE `tb_chat_conversaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `usuario1_id` int NOT NULL,
  `usuario2_id` int NOT NULL,
  `asunto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contexto_tipo` enum('general','alumno','curso','asignatura') COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `contexto_id` int DEFAULT NULL,
  `iniciada_por` int NOT NULL,
  `mensajes_count` int DEFAULT '0',
  `ultimo_mensaje_id` int DEFAULT NULL,
  `ultimo_mensaje_fecha` datetime DEFAULT NULL,
  `usuario1_archivado` tinyint(1) DEFAULT '0',
  `usuario2_archivado` tinyint(1) DEFAULT '0',
  `usuario1_eliminado` tinyint(1) DEFAULT '0',
  `usuario2_eliminado` tinyint(1) DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conversacion` (`usuario1_id`,`usuario2_id`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_usuario2` (`usuario2_id`),
  KEY `idx_ultimo_mensaje` (`ultimo_mensaje_fecha`),
  KEY `idx_activo` (`activo`),
  KEY `fk_chat_iniciador` (`iniciada_por`),
  CONSTRAINT `fk_chat_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_iniciador` FOREIGN KEY (`iniciada_por`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_usuario1` FOREIGN KEY (`usuario1_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_usuario2` FOREIGN KEY (`usuario2_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_chat_conversaciones`.

---

## 11. tb_chat_mensajes

```sql
CREATE TABLE `tb_chat_mensajes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversacion_id` int NOT NULL,
  `remitente_id` int NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_mensaje` enum('texto','imagen','archivo','sistema') COLLATE utf8mb4_unicode_ci DEFAULT 'texto',
  `archivo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `archivo_nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `archivo_tamano` int DEFAULT NULL,
  `leido` tinyint(1) DEFAULT '0',
  `fecha_lectura` datetime DEFAULT NULL,
  `editado` tinyint(1) DEFAULT '0',
  `fecha_edicion` datetime DEFAULT NULL,
  `eliminado_remitente` tinyint(1) DEFAULT '0',
  `eliminado_destinatario` tinyint(1) DEFAULT '0',
  `fecha_envio` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conversacion` (`conversacion_id`),
  KEY `idx_remitente` (`remitente_id`),
  KEY `idx_fecha_envio` (`fecha_envio`),
  KEY `idx_leido` (`leido`),
  CONSTRAINT `fk_mensaje_conv` FOREIGN KEY (`conversacion_id`) REFERENCES `tb_chat_conversaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mensaje_remitente` FOREIGN KEY (`remitente_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_chat_mensajes`.

---

## 12. tb_claves_provisorias

```sql
CREATE TABLE `tb_claves_provisorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('recuperacion','verificacion_email','cambio_email') COLLATE utf8mb4_unicode_ci DEFAULT 'recuperacion',
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` datetime NOT NULL,
  `usado` tinyint(1) DEFAULT '0',
  `fecha_uso` datetime DEFAULT NULL,
  `ip_solicitud` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_uso` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `intentos_validacion` int DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_email` (`email`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_usado` (`usado`),
  KEY `idx_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_clave_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_claves_provisorias`.

---

## 13. tb_codigos_validacion

```sql
CREATE TABLE `tb_codigos_validacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('administrador','docente','especial') COLLATE utf8mb4_unicode_ci DEFAULT 'administrador',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usos_maximos` int DEFAULT '1',
  `usos_actuales` int DEFAULT '0',
  `fecha_expiracion` date DEFAULT NULL,
  `usado` tinyint(1) DEFAULT '0',
  `usado_por_id` int DEFAULT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_codigo` (`codigo`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_usado` (`usado`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_codigo_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_codigos_validacion`.

---

## 14. tb_comunicado_curso

```sql
CREATE TABLE `tb_comunicado_curso` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comunicado_id` int NOT NULL,
  `curso_id` int NOT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_comunicado_curso` (`comunicado_id`,`curso_id`),
  KEY `idx_curso` (`curso_id`),
  CONSTRAINT `fk_comcurso_comunicado` FOREIGN KEY (`comunicado_id`) REFERENCES `tb_comunicados` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comcurso_curso` FOREIGN KEY (`curso_id`) REFERENCES `tb_cursos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_comunicado_curso`.

---

## 15. tb_comunicado_leido

```sql
CREATE TABLE `tb_comunicado_leido` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comunicado_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha_lectura` datetime DEFAULT CURRENT_TIMESTAMP,
  `confirmado` tinyint(1) DEFAULT '0',
  `fecha_confirmacion` datetime DEFAULT NULL,
  `respuesta` text COLLATE utf8mb4_unicode_ci,
  `fecha_respuesta` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_comunicado_usuario` (`comunicado_id`,`usuario_id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_fecha_lectura` (`fecha_lectura`),
  CONSTRAINT `fk_comleido_comunicado` FOREIGN KEY (`comunicado_id`) REFERENCES `tb_comunicados` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comleido_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_comunicado_leido`.

---

## 16. tb_comunicados

```sql
CREATE TABLE `tb_comunicados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `remitente_id` int NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('informativo','urgente','reunion','evento','academico','administrativo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'informativo',
  `prioridad` enum('baja','normal','alta','critica') COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `para_todos_cursos` tinyint(1) DEFAULT '0',
  `para_docentes` tinyint(1) DEFAULT '0',
  `para_apoderados` tinyint(1) DEFAULT '1',
  `requiere_confirmacion` tinyint(1) DEFAULT '0',
  `permite_respuesta` tinyint(1) DEFAULT '0',
  `fecha_evento` date DEFAULT NULL,
  `hora_evento` time DEFAULT NULL,
  `lugar_evento` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `archivo_adjunto_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_envio` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` date DEFAULT NULL,
  `programado` tinyint(1) DEFAULT '0',
  `fecha_programada` datetime DEFAULT NULL,
  `enviado` tinyint(1) DEFAULT '1',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_remitente` (`remitente_id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_fecha_envio` (`fecha_envio`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_comunicado_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comunicado_remitente` FOREIGN KEY (`remitente_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_comunicados`.

---

## 17. tb_configuracion_establecimiento

```sql
CREATE TABLE `tb_configuracion_establecimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `color_primario` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#1976d2',
  `color_secundario` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#424242',
  `mostrar_logo_reportes` tinyint(1) DEFAULT '1',
  `nota_minima` decimal(2,1) DEFAULT '1.0',
  `nota_maxima` decimal(2,1) DEFAULT '7.0',
  `nota_aprobacion` decimal(2,1) DEFAULT '4.0',
  `decimales_notas` int DEFAULT '1',
  `permite_nota_pendiente` tinyint(1) DEFAULT '1',
  `hora_limite_atraso` time DEFAULT '08:15:00',
  `porcentaje_asistencia_minimo` int DEFAULT '85',
  `permite_respuesta_comunicados` tinyint(1) DEFAULT '0',
  `dias_vigencia_comunicado` int DEFAULT '30',
  `chat_habilitado` tinyint(1) DEFAULT '1',
  `chat_horario_inicio` time DEFAULT '08:00:00',
  `chat_horario_fin` time DEFAULT '20:00:00',
  `zona_horaria` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'America/Santiago',
  `idioma` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT 'es-CL',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_establecimiento` (`establecimiento_id`),
  CONSTRAINT `fk_config_establecimiento` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_configuracion_establecimiento`.

---

## 18. tb_cursos

```sql
CREATE TABLE `tb_cursos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel` enum('parvularia','basica','media') COLLATE utf8mb4_unicode_ci NOT NULL,
  `grado` int DEFAULT NULL,
  `letra` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jornada` enum('manana','tarde','completa') COLLATE utf8mb4_unicode_ci DEFAULT 'completa',
  `capacidad_maxima` int DEFAULT '45',
  `sala` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anio_academico` int NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_curso_est_anio` (`codigo`,`establecimiento_id`,`anio_academico`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_nivel` (`nivel`),
  KEY `idx_anio` (`anio_academico`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_curso_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_cursos`.

---

## 19. tb_docente_asignatura

```sql
CREATE TABLE `tb_docente_asignatura` (
  `id` int NOT NULL AUTO_INCREMENT,
  `docente_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `es_especialidad_principal` tinyint(1) DEFAULT '0',
  `certificado` tinyint(1) DEFAULT '0',
  `anios_experiencia` int DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_docente_asig` (`docente_id`,`asignatura_id`),
  KEY `idx_asignatura` (`asignatura_id`),
  CONSTRAINT `fk_docenteasig_asig` FOREIGN KEY (`asignatura_id`) REFERENCES `tb_asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_docenteasig_docente` FOREIGN KEY (`docente_id`) REFERENCES `tb_docentes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_docente_asignatura`.

---

## 20. tb_docente_establecimiento

```sql
CREATE TABLE `tb_docente_establecimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `docente_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `cargo` enum('titular','reemplazo','part-time','honorarios') COLLATE utf8mb4_unicode_ci DEFAULT 'titular',
  `horas_contrato` int DEFAULT NULL,
  `es_profesor_jefe` tinyint(1) DEFAULT '0',
  `curso_jefatura_id` int DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `fecha_termino` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_docente_est` (`docente_id`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_activo` (`activo`),
  KEY `idx_profesor_jefe` (`es_profesor_jefe`),
  KEY `fk_docenteest_curso_jef` (`curso_jefatura_id`),
  CONSTRAINT `fk_docenteest_curso_jef` FOREIGN KEY (`curso_jefatura_id`) REFERENCES `tb_cursos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_docenteest_docente` FOREIGN KEY (`docente_id`) REFERENCES `tb_docentes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_docenteest_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_docente_establecimiento`.

---

## 21. tb_docentes

```sql
CREATE TABLE `tb_docentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `rut` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Masculino','Femenino','Otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titulo_profesional` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especialidad` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rut` (`rut`),
  UNIQUE KEY `uk_usuario` (`usuario_id`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_docente_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_docentes`.

---

## 22. tb_documentos_matricula

```sql
CREATE TABLE `tb_documentos_matricula` (
  `id` int NOT NULL AUTO_INCREMENT,
  `matricula_id` int NOT NULL,
  `documento_requerido_id` int NOT NULL,
  `nombre_archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_original` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_archivo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tamano_bytes` int NOT NULL,
  `ruta_archivo` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url_archivo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('pendiente','aprobado','rechazado','vencido') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `motivo_rechazo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `revisado_por` int DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `version` int DEFAULT '1',
  `es_ultima_version` tinyint(1) DEFAULT '1',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_matricula` (`matricula_id`),
  KEY `idx_documento` (`documento_requerido_id`),
  KEY `idx_estado` (`estado`),
  CONSTRAINT `fk_docmat_docreq` FOREIGN KEY (`documento_requerido_id`) REFERENCES `tb_documentos_requeridos` (`id`),
  CONSTRAINT `fk_docmat_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `tb_matriculas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_documentos_matricula`.

---

## 23. tb_documentos_requeridos

```sql
CREATE TABLE `tb_documentos_requeridos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo_archivo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'pdf,jpg,jpeg,png',
  `tamano_maximo_mb` int DEFAULT '5',
  `obligatorio` tinyint(1) DEFAULT '1',
  `aplica_tipo_matricula` set('nuevo','antiguo','traslado','reingreso') COLLATE utf8mb4_unicode_ci DEFAULT 'nuevo,antiguo,traslado,reingreso',
  `aplica_nivel` set('parvularia','basica','media') COLLATE utf8mb4_unicode_ci DEFAULT 'parvularia,basica,media',
  `orden` int DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doc_est` (`establecimiento_id`,`nombre`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_obligatorio` (`obligatorio`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_docreq_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_documentos_requeridos`.

---

## 24. tb_establecimientos

```sql
CREATE TABLE `tb_establecimientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre oficial del establecimiento',
  `rbd` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Rol Base de Datos (identificador MINEDUC)',
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comuna` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sitio_web` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL del logo del establecimiento',
  `tipo_establecimiento` enum('municipal','particular_subvencionado','particular_pagado','otro') COLLATE utf8mb4_unicode_ci DEFAULT 'particular_subvencionado',
  `nivel_educativo` set('parvularia','basica','media') COLLATE utf8mb4_unicode_ci DEFAULT 'basica,media' COMMENT 'Niveles que imparte',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rbd` (`rbd`),
  KEY `idx_activo` (`activo`),
  KEY `idx_region_ciudad` (`region`,`ciudad`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_establecimientos`.

---

## 25. tb_facturas

```sql
CREATE TABLE `tb_facturas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `suscripcion_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `numero_factura` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` enum('factura','boleta','nota_credito','nota_debito') COLLATE utf8mb4_unicode_ci DEFAULT 'factura',
  `estado` enum('borrador','emitida','pagada','vencida','anulada') COLLATE utf8mb4_unicode_ci DEFAULT 'borrador',
  `subtotal` decimal(12,2) NOT NULL,
  `descuento` decimal(12,2) DEFAULT '0.00',
  `porcentaje_descuento` decimal(5,2) DEFAULT '0.00',
  `impuesto` decimal(12,2) DEFAULT '0.00',
  `porcentaje_impuesto` decimal(5,2) DEFAULT '19.00',
  `total` decimal(12,2) NOT NULL,
  `moneda` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'CLP',
  `cantidad_alumnos` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `periodo_inicio` date NOT NULL,
  `periodo_fin` date NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `fecha_pago` date DEFAULT NULL,
  `razon_social` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rut_facturacion` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion_facturacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `pdf_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enviada_email` tinyint(1) DEFAULT '0',
  `fecha_envio_email` datetime DEFAULT NULL,
  `factura_relacionada_id` int DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_numero_factura` (`numero_factura`),
  KEY `idx_suscripcion` (`suscripcion_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_emision` (`fecha_emision`),
  KEY `idx_fecha_vencimiento` (`fecha_vencimiento`),
  KEY `fk_factura_relacionada` (`factura_relacionada_id`),
  CONSTRAINT `fk_factura_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_factura_relacionada` FOREIGN KEY (`factura_relacionada_id`) REFERENCES `tb_facturas` (`id`),
  CONSTRAINT `fk_factura_suscripcion` FOREIGN KEY (`suscripcion_id`) REFERENCES `tb_suscripciones` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_facturas`.

---

## 26. tb_historial_suscripciones

```sql
CREATE TABLE `tb_historial_suscripciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `suscripcion_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `plan_anterior_id` int DEFAULT NULL,
  `plan_nuevo_id` int NOT NULL,
  `tipo_cambio` enum('alta','upgrade','downgrade','renovacion','cancelacion','reactivacion') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad_alumnos_anterior` int DEFAULT NULL,
  `cantidad_alumnos_nuevo` int DEFAULT NULL,
  `precio_anterior` decimal(12,2) DEFAULT NULL,
  `precio_nuevo` decimal(12,2) DEFAULT NULL,
  `motivo` text COLLATE utf8mb4_unicode_ci,
  `realizado_por` int DEFAULT NULL,
  `fecha_efectiva` date NOT NULL,
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_suscripcion` (`suscripcion_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_tipo_cambio` (`tipo_cambio`),
  KEY `idx_fecha` (`fecha_registro`),
  KEY `fk_histsus_plan_ant` (`plan_anterior_id`),
  KEY `fk_histsus_plan_new` (`plan_nuevo_id`),
  CONSTRAINT `fk_histsus_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_histsus_plan_ant` FOREIGN KEY (`plan_anterior_id`) REFERENCES `tb_planes` (`id`),
  CONSTRAINT `fk_histsus_plan_new` FOREIGN KEY (`plan_nuevo_id`) REFERENCES `tb_planes` (`id`),
  CONSTRAINT `fk_histsus_suscripcion` FOREIGN KEY (`suscripcion_id`) REFERENCES `tb_suscripciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_historial_suscripciones`.

---

## 27. tb_horarios

```sql
CREATE TABLE `tb_horarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `curso_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `docente_id` int DEFAULT NULL,
  `dia_semana` enum('lunes','martes','miercoles','jueves','viernes','sabado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `bloque` int NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `sala` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anio_academico` int NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_horario` (`curso_id`,`dia_semana`,`bloque`,`anio_academico`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_docente` (`docente_id`),
  KEY `idx_asignatura` (`asignatura_id`),
  KEY `idx_dia` (`dia_semana`),
  KEY `idx_anio` (`anio_academico`),
  CONSTRAINT `fk_horario_asig` FOREIGN KEY (`asignatura_id`) REFERENCES `tb_asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_horario_curso` FOREIGN KEY (`curso_id`) REFERENCES `tb_cursos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_horario_docente` FOREIGN KEY (`docente_id`) REFERENCES `tb_docentes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_horario_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_horarios`.

---

## 28. tb_intentos_login_fallidos

```sql
CREATE TABLE `tb_intentos_login_fallidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email_ingresado` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_usuario_intentado` enum('administrador','docente','apoderado') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `establecimiento_id` int DEFAULT NULL,
  `motivo_fallo` enum('email_no_existe','password_incorrecta','cuenta_inactiva','cuenta_bloqueada','establecimiento_incorrecto','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_ingresada_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `dispositivo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `navegador` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_intento` datetime DEFAULT CURRENT_TIMESTAMP,
  `es_sospechoso` tinyint(1) DEFAULT '0',
  `revisado` tinyint(1) DEFAULT '0',
  `revisado_por` int DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email_ingresado`),
  KEY `idx_ip` (`ip_address`),
  KEY `idx_motivo` (`motivo_fallo`),
  KEY `idx_fecha` (`fecha_intento`),
  KEY `idx_sospechoso` (`es_sospechoso`),
  KEY `idx_revisado` (`revisado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_intentos_login_fallidos`.

---

## 29. tb_intentos_registro_fallidos_admin

```sql
CREATE TABLE `tb_intentos_registro_fallidos_admin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut_admin` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres_admin` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos_admin` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_admin` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_admin` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_ingresado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motivo_fallo` enum('rut_no_preregistrado','email_no_coincide','codigo_invalido','codigo_expirado','codigo_usado','datos_incorrectos','ya_registrado','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `fecha_intento` datetime DEFAULT CURRENT_TIMESTAMP,
  `es_sospechoso` tinyint(1) DEFAULT '0',
  `revisado` tinyint(1) DEFAULT '0',
  `revisado_por` int DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `accion_tomada` enum('agregado_preregistro','contactado','rechazado','pendiente') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `notas` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_rut` (`rut_admin`),
  KEY `idx_codigo` (`codigo_ingresado`),
  KEY `idx_fecha` (`fecha_intento`),
  KEY `idx_sospechoso` (`es_sospechoso`),
  KEY `idx_revisado` (`revisado`),
  CONSTRAINT `fk_intento_admin_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_intentos_registro_fallidos_admin`.

---

## 30. tb_intentos_registro_fallidos_docentes

```sql
CREATE TABLE `tb_intentos_registro_fallidos_docentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut_docente` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres_docente` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos_docente` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_docente` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_docente` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especialidad_indicada` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motivo_fallo` enum('rut_no_preregistrado','email_no_coincide','datos_incorrectos','ya_registrado','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `fecha_intento` datetime DEFAULT CURRENT_TIMESTAMP,
  `revisado` tinyint(1) DEFAULT '0',
  `revisado_por` int DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `accion_tomada` enum('agregado_preregistro','contactado','rechazado','pendiente') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `notas` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_rut` (`rut_docente`),
  KEY `idx_email` (`email_docente`),
  KEY `idx_fecha` (`fecha_intento`),
  KEY `idx_revisado` (`revisado`),
  CONSTRAINT `fk_intento_doc_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_intentos_registro_fallidos_docentes`.

---

## 31. tb_log_actividades

```sql
CREATE TABLE `tb_log_actividades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `tipo_usuario` enum('administrador','docente','apoderado','sistema') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_usuario` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accion` enum('crear','editar','eliminar','activar','desactivar','login','logout','login_fallido','enviar','leer','aprobar','rechazar','asignar','desasignar','transferir','exportar','importar','restaurar','cambiar_password') COLLATE utf8mb4_unicode_ci NOT NULL,
  `modulo` enum('auth','usuarios','administradores','docentes','apoderados','alumnos','cursos','asignaturas','asignaciones','notas','asistencia','comunicados','chat','matriculas','suscripciones','configuracion','reportes','preregistro','observaciones') COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_tipo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entidad_id` int DEFAULT NULL,
  `datos_anteriores` json DEFAULT NULL,
  `datos_nuevos` json DEFAULT NULL,
  `establecimiento_id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_hora` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_tipo_usuario` (`tipo_usuario`),
  KEY `idx_accion` (`accion`),
  KEY `idx_modulo` (`modulo`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_fecha` (`fecha_hora`),
  KEY `idx_entidad` (`entidad_tipo`,`entidad_id`),
  CONSTRAINT `fk_log_establecimiento` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_log_actividades`.

---

## 32. tb_matriculas

```sql
CREATE TABLE `tb_matriculas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `periodo_matricula_id` int NOT NULL,
  `alumno_id` int DEFAULT NULL,
  `apoderado_id` int NOT NULL,
  `anio_academico` int NOT NULL,
  `numero_matricula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_matricula` enum('nuevo','antiguo','traslado','reingreso') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('borrador','pendiente','documentos_pendientes','pago_pendiente','en_revision','aprobada','rechazada','cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'borrador',
  `curso_solicitado_id` int DEFAULT NULL,
  `curso_asignado_id` int DEFAULT NULL,
  `nivel_solicitado` enum('parvularia','basica','media') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grado_solicitado` int DEFAULT NULL,
  `ncontacto_emergencia_nombre` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto_emergencia_telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones_apoderado` text COLLATE utf8mb4_unicode_ci,
  `observaciones_admin` text COLLATE utf8mb4_unicode_ci,
  `motivo_rechazo` text COLLATE utf8mb4_unicode_ci,
  `fecha_envio` datetime DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `revisado_por` int DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `aprobado_por` int DEFAULT NULL,
  `fecha_rechazo` datetime DEFAULT NULL,
  `rechazado_por` int DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_matricula` (`establecimiento_id`,`alumno_id`,`anio_academico`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_periodo` (`periodo_matricula_id`),
  KEY `idx_alumno` (`alumno_id`),
  KEY `idx_apoderado` (`apoderado_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_anio` (`anio_academico`),

  KEY `fk_matricula_curso_sol` (`curso_solicitado_id`),
  KEY `fk_matricula_curso_asig` (`curso_asignado_id`),
  CONSTRAINT `fk_matricula_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `tb_alumnos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_matricula_apoderado` FOREIGN KEY (`apoderado_id`) REFERENCES `tb_apoderados` (`id`),
  CONSTRAINT `fk_matricula_curso_asig` FOREIGN KEY (`curso_asignado_id`) REFERENCES `tb_cursos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_matricula_curso_sol` FOREIGN KEY (`curso_solicitado_id`) REFERENCES `tb_cursos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_matricula_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_matricula_periodo` FOREIGN KEY (`periodo_matricula_id`) REFERENCES `tb_periodos_matricula` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_matriculas`.

---

## 33. tb_notas

```sql
CREATE TABLE `tb_notas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `curso_id` int NOT NULL,
  `docente_id` int DEFAULT NULL,
  `tipo_evaluacion_id` int DEFAULT NULL,
  `anio_academico` int NOT NULL,
  `trimestre` int NOT NULL,
  `numero_evaluacion` int DEFAULT '1',
  `nota` decimal(3,1) DEFAULT NULL,
  `nota_maxima` decimal(3,1) DEFAULT '7.0',
  `ponderacion` decimal(5,2) DEFAULT '100.00',
  `es_pendiente` tinyint(1) DEFAULT '0',
  `es_recuperacion` tinyint(1) DEFAULT '0',
  `nota_original_id` int DEFAULT NULL,
  `fecha_evaluacion` date DEFAULT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comentario` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_alumno` (`alumno_id`),
  KEY `idx_asignatura` (`asignatura_id`),
  KEY `idx_curso` (`curso_id`),
  KEY `idx_docente` (`docente_id`),
  KEY `idx_trimestre` (`trimestre`),
  KEY `idx_anio` (`anio_academico`),
  KEY `idx_activo` (`activo`),
  KEY `fk_nota_tipo` (`tipo_evaluacion_id`),
  KEY `fk_nota_original` (`nota_original_id`),
  CONSTRAINT `fk_nota_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `tb_alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nota_asignatura` FOREIGN KEY (`asignatura_id`) REFERENCES `tb_asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nota_curso` FOREIGN KEY (`curso_id`) REFERENCES `tb_cursos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nota_docente` FOREIGN KEY (`docente_id`) REFERENCES `tb_docentes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_nota_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nota_original` FOREIGN KEY (`nota_original_id`) REFERENCES `tb_notas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_nota_tipo` FOREIGN KEY (`tipo_evaluacion_id`) REFERENCES `tb_tipos_evaluacion` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_nota_rango` CHECK (((`nota` is null) or ((`nota` >= 1.0) and (`nota` <= 7.0)))),
  CONSTRAINT `chk_trimestre` CHECK (((`trimestre` >= 1) and (`trimestre` <= 3)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_notas`.

---

## 34. tb_notificaciones

```sql
CREATE TABLE `tb_notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `tipo` enum('nota_nueva','nota_modificada','comunicado','mensaje','observacion','asistencia','matricula','sistema','recordatorio') COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `icono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'notifications',
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#2196F3',
  `url_destino` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entidad_tipo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entidad_id` int DEFAULT NULL,
  `leida` tinyint(1) DEFAULT '0',
  `fecha_lectura` datetime DEFAULT NULL,
  `enviada_email` tinyint(1) DEFAULT '0',
  `fecha_email` datetime DEFAULT NULL,
  `enviada_push` tinyint(1) DEFAULT '0',
  `fecha_push` datetime DEFAULT NULL,
  `expira` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_leida` (`leida`),
  KEY `idx_fecha` (`fecha_creacion`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_notif_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_notificaciones`.

---

## 35. tb_observaciones_alumno

```sql
CREATE TABLE `tb_observaciones_alumno` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `curso_id` int NOT NULL,
  `docente_id` int DEFAULT NULL,
  `anio_academico` int NOT NULL,
  `trimestre` int NOT NULL,
  `fecha` date NOT NULL,
  `tipo` enum('positiva','negativa','neutra','felicitacion','amonestacion','suspension') COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` enum('academica','conductual','asistencia','uniforme','responsabilidad','convivencia','destacado','otro') COLLATE utf8mb4_unicode_ci DEFAULT 'conductual',
  `gravedad` enum('leve','moderada','grave','muy_grave') COLLATE utf8mb4_unicode_ci DEFAULT 'leve',
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `accion_tomada` text COLLATE utf8mb4_unicode_ci,
  `requiere_citacion` tinyint(1) DEFAULT '0',
  `citacion_realizada` tinyint(1) DEFAULT '0',
  `fecha_citacion` date DEFAULT NULL,
  `notificado_apoderado` tinyint(1) DEFAULT '0',
  `fecha_notificacion` datetime DEFAULT NULL,
  `firma_apoderado` tinyint(1) DEFAULT '0',
  `visible_apoderado` tinyint(1) DEFAULT '1',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_alumno` (`alumno_id`),
  KEY `idx_curso` (`curso_id`),
  KEY `idx_docente` (`docente_id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_anio` (`anio_academico`),
  CONSTRAINT `fk_obs_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `tb_alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_obs_curso` FOREIGN KEY (`curso_id`) REFERENCES `tb_cursos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_obs_docente` FOREIGN KEY (`docente_id`) REFERENCES `tb_docentes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_obs_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_obs_trimestre` CHECK (((`trimestre` >= 1) and (`trimestre` <= 3)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_observaciones_alumno`.

---

## 36. tb_pagos

```sql
CREATE TABLE `tb_pagos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `factura_id` int NOT NULL,
  `suscripcion_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `moneda` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'CLP',
  `metodo_pago` enum('transferencia','tarjeta_credito','tarjeta_debito','efectivo','cheque','webpay','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendiente','procesando','completado','fallido','reembolsado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `referencia_externa` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_comprobante` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banco_origen` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ultimos_4_digitos` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_pago` datetime NOT NULL,
  `fecha_confirmacion` datetime DEFAULT NULL,
  `comprobante_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `procesado_por` int DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_factura` (`factura_id`),
  KEY `idx_suscripcion` (`suscripcion_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_pago` (`fecha_pago`),
  CONSTRAINT `fk_pago_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pago_factura` FOREIGN KEY (`factura_id`) REFERENCES `tb_facturas` (`id`),
  CONSTRAINT `fk_pago_suscripcion` FOREIGN KEY (`suscripcion_id`) REFERENCES `tb_suscripciones` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_pagos`.

---

## 37. tb_periodos_academicos

```sql
CREATE TABLE `tb_periodos_academicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `anio` int NOT NULL COMMENT 'Ej: 2024, 2025',
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ej: Año Academico 2024',
  `fecha_inicio` date NOT NULL COMMENT 'Inicio del año escolar',
  `fecha_fin` date NOT NULL COMMENT 'Fin del año escolar',
  `trimestre_1_inicio` date DEFAULT NULL,
  `trimestre_1_fin` date DEFAULT NULL,
  `trimestre_2_inicio` date DEFAULT NULL,
  `trimestre_2_fin` date DEFAULT NULL,
  `trimestre_3_inicio` date DEFAULT NULL,
  `trimestre_3_fin` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1' COMMENT 'Periodo actualmente en curso',
  `cerrado` tinyint(1) DEFAULT '0' COMMENT 'Periodo cerrado (no permite cambios)',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_establecimiento_anio` (`establecimiento_id`,`anio`),
  KEY `idx_activo` (`activo`),
  KEY `idx_anio` (`anio`),
  CONSTRAINT `fk_periodo_establecimiento` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_periodos_academicos`.

---

## 38. tb_pagos_matricula

```sql
CREATE TABLE `tb_pagos_matricula` (
  `id` int NOT NULL AUTO_INCREMENT,
  `matricula_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `tipo_pago` enum('matricula','reserva','mensualidad','otro') COLLATE utf8mb4_unicode_ci DEFAULT 'matricula',
  `concepto` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `descuento` decimal(10,2) DEFAULT '0.00',
  `monto_final` decimal(10,2) NOT NULL,
  `moneda` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'CLP',
  `estado` enum('pendiente','procesando','pagado','fallido','reembolsado','anulado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `metodo_pago` enum('transferencia','tarjeta_credito','tarjeta_debito','efectivo','cheque','webpay','otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia_pago` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_comprobante` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banco_origen` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  `comprobante_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `registrado_por` int DEFAULT NULL,
  `confirmado_por` int DEFAULT NULL,
  `fecha_confirmacion` datetime DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_matricula` (`matricula_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_tipo` (`tipo_pago`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_pago` (`fecha_pago`),
  CONSTRAINT `fk_pagomat_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pagomat_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `tb_matriculas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_pagos_matricula`.

---

## 39. tb_periodos_matricula

```sql
CREATE TABLE `tb_periodos_matricula` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `anio_academico` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('regular','anticipada','rezagada','traslado') COLLATE utf8mb4_unicode_ci DEFAULT 'regular',
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `fecha_inicio_pago` date DEFAULT NULL,
  `fecha_limite_pago` date DEFAULT NULL,
  `cupos_disponibles` int DEFAULT NULL,
  `cupos_ocupados` int DEFAULT '0',
  `niveles_habilitados` set('parvularia','basica','media') COLLATE utf8mb4_unicode_ci DEFAULT 'parvularia,basica,media',
  `cursos_habilitados` text COLLATE utf8mb4_unicode_ci,
  `requiere_documentos` tinyint(1) DEFAULT '1',
  `requiere_pago` tinyint(1) DEFAULT '1',
  `monto_matricula` decimal(10,2) DEFAULT '0.00',
  `permite_reserva` tinyint(1) DEFAULT '0',
  `monto_reserva` decimal(10,2) DEFAULT '0.00',
  `instrucciones` text COLLATE utf8mb4_unicode_ci,
  `mensaje_confirmacion` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_periodo_est_anio` (`establecimiento_id`,`anio_academico`,`tipo`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_anio` (`anio_academico`),
  KEY `idx_fechas` (`fecha_inicio`,`fecha_fin`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_periodomat_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_periodos_matricula`.

---

## 40. tb_plan_funcionalidades

```sql
CREATE TABLE `tb_plan_funcionalidades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `codigo_funcionalidad` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_funcionalidad` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modulo` enum('apoderado','docente','administrador','general') COLLATE utf8mb4_unicode_ci NOT NULL,
  `es_destacado` tinyint(1) DEFAULT '0',
  `es_premium` tinyint(1) DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_func` (`plan_id`,`codigo_funcionalidad`),
  KEY `idx_codigo` (`codigo_funcionalidad`),
  KEY `idx_modulo` (`modulo`),
  CONSTRAINT `fk_planfunc_plan` FOREIGN KEY (`plan_id`) REFERENCES `tb_planes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_plan_funcionalidades`.

---

## 41. tb_planes

```sql
CREATE TABLE `tb_planes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `precio_alumno_anual` decimal(10,2) NOT NULL,
  `precio_alumno_mensual` decimal(10,2) DEFAULT NULL,
  `moneda` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'CLP',
  `minimo_alumnos` int DEFAULT '1',
  `maximo_alumnos` int DEFAULT NULL,
  `es_destacado` tinyint(1) DEFAULT '0',
  `badge` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_primario` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#2196F3',
  `color_secundario` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#1976D2',
  `orden` int DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_codigo` (`codigo`),
  KEY `idx_activo` (`activo`),
  KEY `idx_orden` (`orden`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_planes`.

---

## 42. tb_preregistro_administradores

```sql
CREATE TABLE `tb_preregistro_administradores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Administrador',
  `codigo_validacion_id` int DEFAULT NULL,
  `usado` tinyint(1) DEFAULT '0',
  `usuario_creado_id` int DEFAULT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_preregistro_admin` (`rut`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_email` (`email`),
  KEY `idx_usado` (`usado`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_preadmin_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_preregistro_administradores`.

---

## 43. tb_preregistro_docentes

```sql
CREATE TABLE `tb_preregistro_docentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especialidad` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo` enum('titular','reemplazo','part-time','honorarios') COLLATE utf8mb4_unicode_ci DEFAULT 'titular',
  `usado` tinyint(1) DEFAULT '0',
  `usuario_creado_id` int DEFAULT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_preregistro_docente` (`rut`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_email` (`email`),
  KEY `idx_usado` (`usado`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_predocente_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_preregistro_docentes`.

---

## 44. tb_preregistro_docente_asignatura

```sql
CREATE TABLE `tb_preregistro_docente_asignatura` (
  `id` int NOT NULL AUTO_INCREMENT,
  `preregistro_docente_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_preregistro_asignatura` (`preregistro_docente_id`, `asignatura_id`),
  KEY `idx_preregistro_docente` (`preregistro_docente_id`),
  KEY `idx_asignatura` (`asignatura_id`),
  CONSTRAINT `fk_prereg_docente` FOREIGN KEY (`preregistro_docente_id`) REFERENCES `tb_preregistro_docentes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prereg_asignatura` FOREIGN KEY (`asignatura_id`) REFERENCES `tb_asignaturas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_preregistro_docente_asignatura`.

---

## 45. tb_preregistro_relaciones

```sql
CREATE TABLE `tb_preregistro_relaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut_apoderado` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres_apoderado` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos_apoderado` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_apoderado` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_apoderado` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rut_alumno` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres_alumno` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos_alumno` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `curso_nombre` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parentesco` enum('padre','madre','abuelo','abuela','tio','tia','tutor_legal','otro') COLLATE utf8mb4_unicode_ci DEFAULT 'padre',
  `es_apoderado_titular` tinyint(1) DEFAULT '1',
  `usado` tinyint(1) DEFAULT '0',
  `usuario_creado_id` int DEFAULT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_preregistro_rel` (`rut_apoderado`,`rut_alumno`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_rut_apoderado` (`rut_apoderado`),
  KEY `idx_rut_alumno` (`rut_alumno`),
  KEY `idx_email` (`email_apoderado`),
  KEY `idx_usado` (`usado`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_prerel_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_preregistro_relaciones`.

---

## 46. tb_promociones

```sql
CREATE TABLE `tb_promociones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('meses_gratis','porcentaje_descuento','monto_fijo','precio_especial') COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `aplica_a_planes` set('basico','intermedio','premium','todos') COLLATE utf8mb4_unicode_ci DEFAULT 'todos',
  `solo_nuevos` tinyint(1) DEFAULT '1',
  `usos_maximos` int DEFAULT NULL,
  `usos_actuales` int DEFAULT '0',
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_codigo` (`codigo`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_activo` (`activo`),
  KEY `idx_fechas` (`fecha_inicio`,`fecha_fin`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_promociones`.

---

## 47. tb_sesiones

```sql
CREATE TABLE `tb_sesiones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `tipo_usuario` enum('administrador','docente','apoderado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_sesion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `dispositivo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `navegador` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sistema_operativo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ubicacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_login` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_ultima_actividad` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_logout` datetime DEFAULT NULL,
  `tipo_logout` enum('manual','expiracion','forzado','otra_sesion') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activa` tinyint(1) DEFAULT '1',
  `recordar_sesion` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_token` (`token_sesion`),
  KEY `idx_activa` (`activa`),
  KEY `idx_fecha_login` (`fecha_login`),
  CONSTRAINT `fk_sesion_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sesion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_sesiones`.

---

## 48. tb_suscripcion_promocion

```sql
CREATE TABLE `tb_suscripcion_promocion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `suscripcion_id` int NOT NULL,
  `promocion_id` int NOT NULL,
  `valor_aplicado` decimal(10,2) NOT NULL,
  `meses_gratis_otorgados` int DEFAULT '0',
  `descuento_aplicado` decimal(12,2) DEFAULT '0.00',
  `fecha_inicio_beneficio` date NOT NULL,
  `fecha_fin_beneficio` date DEFAULT NULL,
  `aplicado_por` int DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_suscripcion_promo` (`suscripcion_id`,`promocion_id`),
  KEY `idx_promocion` (`promocion_id`),
  CONSTRAINT `fk_suspromo_promocion` FOREIGN KEY (`promocion_id`) REFERENCES `tb_promociones` (`id`),
  CONSTRAINT `fk_suspromo_suscripcion` FOREIGN KEY (`suscripcion_id`) REFERENCES `tb_suscripciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_suscripcion_promocion`.

---

## 49. tb_suscripciones

```sql
CREATE TABLE `tb_suscripciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `estado` enum('activa','suspendida','cancelada','prueba','vencida') COLLATE utf8mb4_unicode_ci DEFAULT 'activa',
  `cantidad_alumnos` int NOT NULL DEFAULT '0',
  `precio_total_anual` decimal(12,2) DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `fecha_proximo_cobro` date DEFAULT NULL,
  `ciclo_facturacion` enum('mensual','trimestral','semestral','anual') COLLATE utf8mb4_unicode_ci DEFAULT 'anual',
  `dias_gracia` int DEFAULT '15',
  `renovacion_automatica` tinyint(1) DEFAULT '1',
  `en_periodo_prueba` tinyint(1) DEFAULT '0',
  `fecha_fin_prueba` date DEFAULT NULL,
  `motivo_cancelacion` text COLLATE utf8mb4_unicode_ci,
  `fecha_cancelacion` datetime DEFAULT NULL,
  `cancelado_por` int DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_plan` (`plan_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_fin` (`fecha_fin`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_suscripcion_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_suscripcion_plan` FOREIGN KEY (`plan_id`) REFERENCES `tb_planes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_suscripciones`.

---

## 50. tb_tipos_evaluacion

```sql
CREATE TABLE `tb_tipos_evaluacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abreviatura` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `ponderacion_default` decimal(5,2) DEFAULT '100.00',
  `es_sumativa` tinyint(1) DEFAULT '1',
  `es_formativa` tinyint(1) DEFAULT '0',
  `permite_recuperacion` tinyint(1) DEFAULT '0',
  `orden` int DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tipo_est` (`nombre`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_tipoeval_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_tipos_evaluacion`.

---

## 51. tb_usuarios

```sql
CREATE TABLE `tb_usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Email unico para login',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Contrasena encriptada (bcrypt)',
  `tipo_usuario` enum('administrador','docente','apoderado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `email_verificado` tinyint(1) DEFAULT '0' COMMENT 'Si verifico su email',
  `debe_cambiar_password` tinyint(1) DEFAULT '0' COMMENT 'Forzar cambio en proximo login',
  `intentos_fallidos` int DEFAULT '0' COMMENT 'Contador de intentos fallidos',
  `bloqueado_hasta` datetime DEFAULT NULL COMMENT 'Fecha hasta cuando esta bloqueado',
  `ultimo_acceso` datetime DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_tipo_usuario` (`tipo_usuario`),
  KEY `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_usuarios`.

---

## 52. tb_asistencia

```sql
CREATE TABLE `tb_asistencia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `curso_id` int NOT NULL,
  `fecha` date NOT NULL,
  `anio_academico` int NOT NULL,
  `trimestre` int NOT NULL,
  `estado` enum('presente','ausente','justificado','atrasado','retirado','suspendido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'presente',
  `hora_llegada` time DEFAULT NULL,
  `minutos_atraso` int DEFAULT '0',
  `motivo_ausencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `justificativo_id` int DEFAULT NULL,
  `registrado_por` int DEFAULT NULL,
  `observacion` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_asistencia` (`alumno_id`,`fecha`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_curso` (`curso_id`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_estado` (`estado`),
  KEY `idx_anio` (`anio_academico`),
  KEY `idx_trimestre` (`trimestre`),
  KEY `fk_asist_registrador` (`registrado_por`),
  CONSTRAINT `fk_asist_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `tb_alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asist_curso` FOREIGN KEY (`curso_id`) REFERENCES `tb_cursos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asist_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asist_registrador` FOREIGN KEY (`registrado_por`) REFERENCES `tb_usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_asist_trimestre` CHECK (((`trimestre` >= 1) and (`trimestre` <= 3)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_asistencia`.

---

## 53. tb_intentos_registro_fallidos

```sql
CREATE TABLE `tb_intentos_registro_fallidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut_apoderado` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres_apoderado` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos_apoderado` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_apoderado` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_apoderado` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rut_alumno` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombres_alumno` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apellidos_alumno` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `curso_indicado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parentesco` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motivo_fallo` enum('rut_no_preregistrado','email_no_coincide','alumno_no_encontrado','datos_incorrectos','ya_registrado','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `fecha_intento` datetime DEFAULT CURRENT_TIMESTAMP,
  `revisado` tinyint(1) DEFAULT '0',
  `revisado_por` int DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `accion_tomada` enum('agregado_preregistro','contactado','rechazado','pendiente') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `notas` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_rut_apoderado` (`rut_apoderado`),
  KEY `idx_rut_alumno` (`rut_alumno`),
  KEY `idx_fecha` (`fecha_intento`),
  KEY `idx_revisado` (`revisado`),
  CONSTRAINT `fk_intento_apod_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_intentos_registro_fallidos`.

---

## 54. tb_consultas_contacto

```sql
CREATE TABLE `tb_consultas_contacto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_solicitante` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `establecimiento` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `consulta` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendiente','en_proceso','respondida','cerrada') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `respuesta` text COLLATE utf8mb4_unicode_ci,
  `respondido_por` int DEFAULT NULL,
  `fecha_respuesta` datetime DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `fecha_envio` datetime DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_envio` (`fecha_envio`),
  KEY `idx_correo` (`correo`),
  KEY `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Uso:** Estructura técnica de la tabla `tb_consultas_contacto`.

---

