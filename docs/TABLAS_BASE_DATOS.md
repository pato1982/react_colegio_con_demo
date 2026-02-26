# Estructura de Tablas - Base de Datos `portal_estudiantil`

> **Actualizado:** 25 de febrero de 2026
> **Total de tablas:** 43
> **Motor:** InnoDB | **Charset:** utf8mb4 | **Collation:** utf8mb4_unicode_ci

---

## Indice de tablas

| # | Tabla | Descripcion |
|---|-------|-------------|
| 1 | tb_administrador_establecimiento | Relacion administrador-establecimiento |
| 2 | tb_administradores | Datos de administradores |
| 3 | tb_alumno_establecimiento | Relacion alumno-establecimiento (matricula anual) |
| 4 | tb_alumnos | Datos personales y medicos de alumnos |
| 5 | tb_apoderado_alumno | Relacion apoderado-alumno con permisos |
| 6 | tb_apoderado_establecimiento | Relacion apoderado-establecimiento |
| 7 | tb_apoderados | Datos personales de apoderados |
| 8 | tb_asignaciones | Cargas academicas docente-curso-asignatura |
| 9 | tb_asignaturas | Catalogo de asignaturas por establecimiento |
| 10 | tb_asistencia | Registro diario de asistencia |
| 11 | tb_chat_conversaciones | Conversaciones del chat interno |
| 12 | tb_chat_mensajes | Mensajes del chat interno |
| 13 | tb_codigos_validacion | Codigos de registro para administradores |
| 14 | tb_comunicado_curso | Relacion comunicado-curso (destinatarios) |
| 15 | tb_comunicado_leido | Registro de lectura de comunicados |
| 16 | tb_comunicados | Comunicados enviados por administradores |
| 17 | tb_configuracion_establecimiento | Configuracion personalizada por establecimiento |
| 18 | tb_consultas_contacto | Consultas desde formulario de contacto landing |
| 19 | tb_cursos | Cursos por establecimiento y ano academico |
| 20 | tb_docente_asignatura | Especialidades de cada docente |
| 21 | tb_docente_establecimiento | Relacion docente-establecimiento con cargo |
| 22 | tb_docentes | Datos personales y profesionales de docentes |
| 23 | tb_documentos_matricula | Documentos subidos en proceso de matricula |
| 24 | tb_establecimientos | Establecimientos educacionales registrados |
| 25 | tb_intentos_login_fallidos | Log de intentos de login fallidos |
| 26 | tb_intentos_registro_fallidos | Intentos fallidos de registro de apoderados |
| 27 | tb_intentos_registro_fallidos_admin | Intentos fallidos de registro de administradores |
| 28 | tb_intentos_registro_fallidos_docentes | Intentos fallidos de registro de docentes |
| 29 | tb_log_actividades | Log de actividades del sistema |
| 30 | tb_matriculas | Procesos de matricula |
| 31 | tb_notas | Calificaciones de alumnos |
| 32 | tb_notificaciones | Notificaciones internas del sistema |
| 33 | tb_observaciones_alumno | Observaciones conductuales y academicas |
| 34 | tb_pagos_matricula | Pagos asociados a matriculas |
| 35 | tb_periodos_academicos | Periodos academicos (ano escolar) |
| 36 | tb_periodos_matricula | Periodos de matricula (ventanas de inscripcion) |
| 37 | tb_preregistro_administradores | Pre-registro de administradores (TechPanel) |
| 38 | tb_preregistro_docente_asignatura | Asignaturas asignadas en pre-registro docente |
| 39 | tb_preregistro_docentes | Pre-registro de docentes |
| 40 | tb_preregistro_relaciones | Pre-registro de relaciones apoderado-alumno |
| 41 | tb_sesiones | Sesiones activas de usuarios |
| 42 | tb_tipos_evaluacion | Tipos de evaluacion por establecimiento |
| 43 | tb_usuarios | Credenciales de acceso (login) |

---

## 1. tb_administrador_establecimiento

```sql
CREATE TABLE `tb_administrador_establecimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `administrador_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `es_principal` tinyint(1) DEFAULT '0',
  `cargo` varchar(100) DEFAULT 'Administrador',
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

## 2. tb_administradores

```sql
CREATE TABLE `tb_administradores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `rut` varchar(12) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Masculino','Femenino','Otro') DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuario` (`usuario_id`),
  UNIQUE KEY `uk_rut` (`rut`),
  CONSTRAINT `fk_admin_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 3. tb_alumno_establecimiento

```sql
CREATE TABLE `tb_alumno_establecimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `curso_id` int DEFAULT NULL,
  `anio_academico` int NOT NULL,
  `numero_matricula` varchar(20) DEFAULT NULL,
  `numero_lista` int DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `fecha_retiro` date DEFAULT NULL,
  `motivo_retiro` enum('transferencia','egreso','retiro_voluntario','expulsion','otro') DEFAULT NULL,
  `observacion_retiro` text,
  `establecimiento_destino` varchar(255) DEFAULT NULL,
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

## 4. tb_alumnos

```sql
CREATE TABLE `tb_alumnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rut` varchar(12) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Masculino','Femenino','Otro') DEFAULT NULL,
  `nacionalidad` varchar(50) DEFAULT 'Chilena',
  `direccion` varchar(255) DEFAULT NULL,
  `comuna` varchar(100) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `alergias` text,
  `enfermedades_cronicas` text,
  `medicamentos` text,
  `grupo_sanguineo` varchar(10) DEFAULT NULL,
  `contacto_emergencia_nombre` varchar(200) DEFAULT NULL,
  `contacto_emergencia_telefono` varchar(20) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rut` (`rut`),
  KEY `idx_activo` (`activo`),
  KEY `idx_apellidos` (`apellidos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 5. tb_apoderado_alumno

```sql
CREATE TABLE `tb_apoderado_alumno` (
  `id` int NOT NULL AUTO_INCREMENT,
  `apoderado_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `parentesco` enum('padre','madre','abuelo','abuela','tio','tia','hermano','hermana','tutor_legal','otro') NOT NULL,
  `parentesco_otro` varchar(50) DEFAULT NULL,
  `es_apoderado_titular` tinyint(1) DEFAULT '1',
  `es_apoderado_suplente` tinyint(1) DEFAULT '0',
  `es_contacto_emergencia` tinyint(1) DEFAULT '0',
  `puede_retirar` tinyint(1) DEFAULT '1',
  `recibe_comunicados` tinyint(1) DEFAULT '1',
  `recibe_notas` tinyint(1) DEFAULT '1',
  `vive_con_alumno` tinyint(1) DEFAULT '1',
  `orden_prioridad` int DEFAULT '1',
  `observaciones` text,
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

## 7. tb_apoderados

```sql
CREATE TABLE `tb_apoderados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `rut` varchar(12) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `telefono_emergencia` varchar(20) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Masculino','Femenino','Otro') DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `comuna` varchar(100) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `ocupacion` varchar(100) DEFAULT NULL,
  `lugar_trabajo` varchar(200) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rut` (`rut`),
  UNIQUE KEY `uk_usuario` (`usuario_id`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_apoderado_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

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

## 9. tb_asignaturas

```sql
CREATE TABLE `tb_asignaturas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `codigo` varchar(20) DEFAULT NULL,
  `descripcion` text,
  `nivel` set('parvularia','basica','media') DEFAULT 'basica,media',
  `horas_semanales` int DEFAULT '2',
  `es_electivo` tinyint(1) DEFAULT '0',
  `es_taller` tinyint(1) DEFAULT '0',
  `color` varchar(7) DEFAULT '#2196F3',
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

## 10. tb_asistencia

```sql
CREATE TABLE `tb_asistencia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `curso_id` int NOT NULL,
  `fecha` date NOT NULL,
  `anio_academico` int NOT NULL,
  `trimestre` int NOT NULL,
  `estado` enum('presente','ausente','justificado','atrasado','retirado','suspendido') NOT NULL DEFAULT 'presente',
  `hora_llegada` time DEFAULT NULL,
  `minutos_atraso` int DEFAULT '0',
  `motivo_ausencia` varchar(255) DEFAULT NULL,
  `justificativo_id` int DEFAULT NULL,
  `registrado_por` int DEFAULT NULL,
  `observacion` text,
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
  KEY `idx_asist_est_anio_activo` (`establecimiento_id`,`anio_academico`,`activo`,`estado`),
  KEY `idx_asist_curso_anio_activo` (`curso_id`,`anio_academico`,`activo`,`estado`),
  CONSTRAINT `fk_asist_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `tb_alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asist_curso` FOREIGN KEY (`curso_id`) REFERENCES `tb_cursos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asist_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asist_registrador` FOREIGN KEY (`registrado_por`) REFERENCES `tb_usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_asist_trimestre` CHECK ((`trimestre` >= 1) AND (`trimestre` <= 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 11. tb_chat_conversaciones

```sql
CREATE TABLE `tb_chat_conversaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `usuario1_id` int NOT NULL,
  `usuario2_id` int NOT NULL,
  `asunto` varchar(255) DEFAULT NULL,
  `contexto_tipo` enum('general','alumno','curso','asignatura') DEFAULT 'general',
  `contexto_id` int DEFAULT NULL,
  `iniciada_por` int NOT NULL,
  `mensajes_count` int DEFAULT '0',
  `ultimo_mensaje_id` int DEFAULT NULL,
  `ultimo_mensaje_fecha` datetime DEFAULT NULL,
  `usuario1_archivado` tinyint(1) DEFAULT '0',
  `usuario2_archivado` tinyint(1) DEFAULT '0',
  `usuario1_eliminado` tinyint(1) DEFAULT '0',
  `usuario2_eliminado` tinyint(1) DEFAULT '0',
  `respuesta_habilitada` tinyint(1) DEFAULT '1',
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

## 12. tb_chat_mensajes

```sql
CREATE TABLE `tb_chat_mensajes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversacion_id` int NOT NULL,
  `remitente_id` int NOT NULL,
  `mensaje` text NOT NULL,
  `tipo_mensaje` enum('texto','imagen','archivo','sistema') DEFAULT 'texto',
  `archivo_url` varchar(500) DEFAULT NULL,
  `archivo_nombre` varchar(255) DEFAULT NULL,
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

## 13. tb_codigos_validacion

```sql
CREATE TABLE `tb_codigos_validacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int DEFAULT NULL,
  `codigo` varchar(50) NOT NULL,
  `tipo` enum('administrador','docente','especial') DEFAULT 'administrador',
  `descripcion` varchar(255) DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

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

## 15. tb_comunicado_leido

```sql
CREATE TABLE `tb_comunicado_leido` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comunicado_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha_lectura` datetime DEFAULT CURRENT_TIMESTAMP,
  `confirmado` tinyint(1) DEFAULT '0',
  `fecha_confirmacion` datetime DEFAULT NULL,
  `respuesta` text,
  `fecha_respuesta` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_comunicado_usuario` (`comunicado_id`,`usuario_id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_fecha_lectura` (`fecha_lectura`),
  CONSTRAINT `fk_comleido_comunicado` FOREIGN KEY (`comunicado_id`) REFERENCES `tb_comunicados` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comleido_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `tb_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 16. tb_comunicados

```sql
CREATE TABLE `tb_comunicados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `remitente_id` int NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje` text NOT NULL,
  `tipo` enum('informativo','urgente','reunion','evento','academico','administrativo') NOT NULL DEFAULT 'informativo',
  `prioridad` enum('baja','normal','alta','critica') DEFAULT 'normal',
  `para_todos_cursos` tinyint(1) DEFAULT '0',
  `para_docentes` tinyint(1) DEFAULT '0',
  `para_apoderados` tinyint(1) DEFAULT '1',
  `requiere_confirmacion` tinyint(1) DEFAULT '0',
  `permite_respuesta` tinyint(1) DEFAULT '0',
  `fecha_evento` date DEFAULT NULL,
  `hora_evento` time DEFAULT NULL,
  `lugar_evento` varchar(255) DEFAULT NULL,
  `archivo_adjunto_url` varchar(500) DEFAULT NULL,
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

## 17. tb_configuracion_establecimiento

```sql
CREATE TABLE `tb_configuracion_establecimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `color_primario` varchar(7) DEFAULT '#1976d2',
  `color_secundario` varchar(7) DEFAULT '#424242',
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
  `zona_horaria` varchar(50) DEFAULT 'America/Santiago',
  `idioma` varchar(5) DEFAULT 'es-CL',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_establecimiento` (`establecimiento_id`),
  CONSTRAINT `fk_config_establecimiento` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 18. tb_consultas_contacto

```sql
CREATE TABLE `tb_consultas_contacto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_solicitante` varchar(200) NOT NULL,
  `establecimiento` varchar(200) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `correo` varchar(255) NOT NULL,
  `consulta` text NOT NULL,
  `estado` enum('pendiente','en_proceso','respondida','cerrada') DEFAULT 'pendiente',
  `respuesta` text,
  `respondido_por` int DEFAULT NULL,
  `fecha_respuesta` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `fecha_envio` datetime DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_envio` (`fecha_envio`),
  KEY `idx_correo` (`correo`),
  KEY `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 19. tb_cursos

```sql
CREATE TABLE `tb_cursos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nivel` enum('parvularia','basica','media') NOT NULL,
  `grado` int DEFAULT NULL,
  `letra` varchar(5) DEFAULT NULL,
  `jornada` enum('manana','tarde','completa') DEFAULT 'completa',
  `capacidad_maxima` int DEFAULT '45',
  `sala` varchar(50) DEFAULT NULL,
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

## 20. tb_docente_asignatura

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

## 21. tb_docente_establecimiento

```sql
CREATE TABLE `tb_docente_establecimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `docente_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `cargo` enum('titular','reemplazo','part-time','honorarios') DEFAULT 'titular',
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

## 22. tb_docentes

```sql
CREATE TABLE `tb_docentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `rut` varchar(12) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Masculino','Femenino','Otro') DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `titulo_profesional` varchar(200) DEFAULT NULL,
  `especialidad` varchar(200) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
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

## 23. tb_documentos_matricula

```sql
CREATE TABLE `tb_documentos_matricula` (
  `id` int NOT NULL AUTO_INCREMENT,
  `matricula_id` int NOT NULL,
  `documento_requerido_id` int NOT NULL,
  `nombre_archivo` varchar(255) NOT NULL,
  `nombre_original` varchar(255) NOT NULL,
  `tipo_archivo` varchar(50) NOT NULL,
  `tamano_bytes` int NOT NULL,
  `ruta_archivo` varchar(500) NOT NULL,
  `url_archivo` varchar(500) DEFAULT NULL,
  `estado` enum('pendiente','aprobado','rechazado','vencido') DEFAULT 'pendiente',
  `motivo_rechazo` varchar(255) DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `revisado_por` int DEFAULT NULL,
  `observaciones` text,
  `version` int DEFAULT '1',
  `es_ultima_version` tinyint(1) DEFAULT '1',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_matricula` (`matricula_id`),
  KEY `idx_documento` (`documento_requerido_id`),
  KEY `idx_estado` (`estado`),
  CONSTRAINT `fk_docmat_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `tb_matriculas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Nota:** La FK original `fk_docmat_docreq` referenciaba `tb_documentos_requeridos` (eliminada). Pendiente de limpiar cuando se reimplemente el modulo de documentos.

## 24. tb_establecimientos

```sql
CREATE TABLE `tb_establecimientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL COMMENT 'Nombre oficial del establecimiento',
  `rbd` varchar(20) DEFAULT NULL COMMENT 'Rol Base de Datos (identificador MINEDUC)',
  `direccion` varchar(255) DEFAULT NULL,
  `comuna` varchar(100) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `sitio_web` varchar(255) DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL COMMENT 'URL del logo del establecimiento',
  `tipo_establecimiento` enum('municipal','particular_subvencionado','particular_pagado','otro') DEFAULT 'particular_subvencionado',
  `nivel_educativo` set('parvularia','basica','media') DEFAULT 'basica,media' COMMENT 'Niveles que imparte',
  `modalidad_academica` enum('trimestral','semestral') NOT NULL DEFAULT 'trimestral',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rbd` (`rbd`),
  KEY `idx_activo` (`activo`),
  KEY `idx_region_ciudad` (`region`,`ciudad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 25. tb_intentos_login_fallidos

```sql
CREATE TABLE `tb_intentos_login_fallidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email_ingresado` varchar(255) NOT NULL,
  `tipo_usuario_intentado` enum('administrador','docente','apoderado') DEFAULT NULL,
  `establecimiento_id` int DEFAULT NULL,
  `motivo_fallo` enum('email_no_existe','password_incorrecta','cuenta_inactiva','cuenta_bloqueada','establecimiento_incorrecto','otro') NOT NULL,
  `password_ingresada_hash` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `dispositivo` varchar(100) DEFAULT NULL,
  `navegador` varchar(100) DEFAULT NULL,
  `fecha_intento` datetime DEFAULT CURRENT_TIMESTAMP,
  `es_sospechoso` tinyint(1) DEFAULT '0',
  `revisado` tinyint(1) DEFAULT '0',
  `revisado_por` int DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `notas` text,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email_ingresado`),
  KEY `idx_ip` (`ip_address`),
  KEY `idx_motivo` (`motivo_fallo`),
  KEY `idx_fecha` (`fecha_intento`),
  KEY `idx_sospechoso` (`es_sospechoso`),
  KEY `idx_revisado` (`revisado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 26. tb_intentos_registro_fallidos

```sql
CREATE TABLE `tb_intentos_registro_fallidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut_apoderado` varchar(12) NOT NULL,
  `nombres_apoderado` varchar(100) NOT NULL,
  `apellidos_apoderado` varchar(100) NOT NULL,
  `email_apoderado` varchar(255) DEFAULT NULL,
  `telefono_apoderado` varchar(20) DEFAULT NULL,
  `rut_alumno` varchar(12) DEFAULT NULL,
  `nombres_alumno` varchar(100) DEFAULT NULL,
  `apellidos_alumno` varchar(100) DEFAULT NULL,
  `curso_indicado` varchar(50) DEFAULT NULL,
  `parentesco` varchar(50) DEFAULT NULL,
  `motivo_fallo` enum('rut_no_preregistrado','email_no_coincide','alumno_no_encontrado','datos_incorrectos','ya_registrado','otro') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `fecha_intento` datetime DEFAULT CURRENT_TIMESTAMP,
  `revisado` tinyint(1) DEFAULT '0',
  `revisado_por` int DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `accion_tomada` enum('agregado_preregistro','contactado','rechazado','pendiente') DEFAULT 'pendiente',
  `notas` text,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_rut_apoderado` (`rut_apoderado`),
  KEY `idx_rut_alumno` (`rut_alumno`),
  KEY `idx_fecha` (`fecha_intento`),
  KEY `idx_revisado` (`revisado`),
  CONSTRAINT `fk_intento_apod_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 27. tb_intentos_registro_fallidos_admin

```sql
CREATE TABLE `tb_intentos_registro_fallidos_admin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut_admin` varchar(12) NOT NULL,
  `nombres_admin` varchar(100) NOT NULL,
  `apellidos_admin` varchar(100) NOT NULL,
  `email_admin` varchar(255) DEFAULT NULL,
  `telefono_admin` varchar(20) DEFAULT NULL,
  `codigo_ingresado` varchar(50) DEFAULT NULL,
  `motivo_fallo` varchar(50) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `fecha_intento` datetime DEFAULT CURRENT_TIMESTAMP,
  `es_sospechoso` tinyint(1) DEFAULT '0',
  `revisado` tinyint(1) DEFAULT '0',
  `revisado_por` int DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `accion_tomada` enum('agregado_preregistro','contactado','rechazado','pendiente') DEFAULT 'pendiente',
  `notas` text,
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

## 28. tb_intentos_registro_fallidos_docentes

```sql
CREATE TABLE `tb_intentos_registro_fallidos_docentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut_docente` varchar(12) NOT NULL,
  `nombres_docente` varchar(100) NOT NULL,
  `apellidos_docente` varchar(100) NOT NULL,
  `email_docente` varchar(255) DEFAULT NULL,
  `telefono_docente` varchar(20) DEFAULT NULL,
  `especialidad_indicada` varchar(200) DEFAULT NULL,
  `motivo_fallo` enum('rut_no_preregistrado','email_no_coincide','datos_incorrectos','ya_registrado','otro') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `fecha_intento` datetime DEFAULT CURRENT_TIMESTAMP,
  `revisado` tinyint(1) DEFAULT '0',
  `revisado_por` int DEFAULT NULL,
  `fecha_revision` datetime DEFAULT NULL,
  `accion_tomada` enum('agregado_preregistro','contactado','rechazado','pendiente') DEFAULT 'pendiente',
  `notas` text,
  PRIMARY KEY (`id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_rut` (`rut_docente`),
  KEY `idx_email` (`email_docente`),
  KEY `idx_fecha` (`fecha_intento`),
  KEY `idx_revisado` (`revisado`),
  CONSTRAINT `fk_intento_doc_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 29. tb_log_actividades

```sql
CREATE TABLE `tb_log_actividades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `tipo_usuario` enum('administrador','docente','apoderado','sistema') NOT NULL,
  `nombre_usuario` varchar(200) NOT NULL,
  `accion` enum('crear','editar','eliminar','activar','desactivar','login','logout','login_fallido','enviar','leer','aprobar','rechazar','asignar','desasignar','transferir','exportar','importar','restaurar','cambiar_password') NOT NULL,
  `modulo` enum('auth','usuarios','administradores','docentes','apoderados','alumnos','cursos','asignaturas','asignaciones','notas','asistencia','comunicados','chat','matriculas','suscripciones','configuracion','reportes','preregistro','observaciones') NOT NULL,
  `descripcion` text NOT NULL,
  `entidad_tipo` varchar(50) DEFAULT NULL,
  `entidad_id` int DEFAULT NULL,
  `datos_anteriores` json DEFAULT NULL,
  `datos_nuevos` json DEFAULT NULL,
  `establecimiento_id` int NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
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

## 30. tb_matriculas

```sql
CREATE TABLE `tb_matriculas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `periodo_matricula_id` int NOT NULL,
  `alumno_id` int DEFAULT NULL,
  `apoderado_id` int NOT NULL,
  `anio_academico` int NOT NULL,
  `numero_matricula` varchar(20) DEFAULT NULL,
  `tipo_matricula` enum('nuevo','antiguo','traslado','reingreso') NOT NULL,
  `estado` enum('borrador','pendiente','documentos_pendientes','pago_pendiente','en_revision','aprobada','rechazada','cancelada') DEFAULT 'borrador',
  `curso_solicitado_id` int DEFAULT NULL,
  `curso_asignado_id` int DEFAULT NULL,
  `nivel_solicitado` enum('parvularia','basica','media') DEFAULT NULL,
  `grado_solicitado` int DEFAULT NULL,
  `ncontacto_emergencia_nombre` varchar(200) DEFAULT NULL,
  `contacto_emergencia_telefono` varchar(20) DEFAULT NULL,
  `observaciones_apoderado` text,
  `observaciones_admin` text,
  `motivo_rechazo` text,
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

## 31. tb_notas

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
  `descripcion` varchar(255) DEFAULT NULL,
  `comentario` text,
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
  KEY `idx_notas_est_anio_activo` (`establecimiento_id`,`anio_academico`,`activo`,`nota`),
  KEY `idx_notas_curso_anio_activo` (`curso_id`,`anio_academico`,`activo`,`nota`),
  KEY `idx_notas_docente_asig_anio` (`docente_id`,`asignatura_id`,`anio_academico`,`activo`),
  KEY `idx_notas_asig_est_anio` (`asignatura_id`,`establecimiento_id`,`anio_academico`,`activo`),
  KEY `idx_notas_est_anio_fecha` (`establecimiento_id`,`anio_academico`,`activo`,`fecha_evaluacion`),
  CONSTRAINT `fk_nota_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `tb_alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nota_asignatura` FOREIGN KEY (`asignatura_id`) REFERENCES `tb_asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nota_curso` FOREIGN KEY (`curso_id`) REFERENCES `tb_cursos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nota_docente` FOREIGN KEY (`docente_id`) REFERENCES `tb_docentes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_nota_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nota_original` FOREIGN KEY (`nota_original_id`) REFERENCES `tb_notas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_nota_tipo` FOREIGN KEY (`tipo_evaluacion_id`) REFERENCES `tb_tipos_evaluacion` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_nota_rango` CHECK ((`nota` IS NULL) OR ((`nota` >= 1.0) AND (`nota` <= 7.0))),
  CONSTRAINT `chk_trimestre` CHECK ((`trimestre` >= 1) AND (`trimestre` <= 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 32. tb_notificaciones

```sql
CREATE TABLE `tb_notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `tipo` enum('nota_nueva','nota_modificada','comunicado','mensaje','observacion','asistencia','matricula','sistema','recordatorio') NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje` text NOT NULL,
  `icono` varchar(50) DEFAULT 'notifications',
  `color` varchar(7) DEFAULT '#2196F3',
  `url_destino` varchar(500) DEFAULT NULL,
  `entidad_tipo` varchar(50) DEFAULT NULL,
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

## 33. tb_observaciones_alumno

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
  `tipo` enum('positiva','negativa','neutra','felicitacion','amonestacion','suspension') NOT NULL,
  `categoria` enum('academica','conductual','asistencia','uniforme','responsabilidad','convivencia','destacado','otro') DEFAULT 'conductual',
  `gravedad` enum('leve','moderada','grave','muy_grave') DEFAULT 'leve',
  `titulo` varchar(200) NOT NULL,
  `descripcion` text NOT NULL,
  `accion_tomada` text,
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
  CONSTRAINT `chk_obs_trimestre` CHECK ((`trimestre` >= 1) AND (`trimestre` <= 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 34. tb_pagos_matricula

```sql
CREATE TABLE `tb_pagos_matricula` (
  `id` int NOT NULL AUTO_INCREMENT,
  `matricula_id` int NOT NULL,
  `establecimiento_id` int NOT NULL,
  `tipo_pago` enum('matricula','reserva','mensualidad','otro') DEFAULT 'matricula',
  `concepto` varchar(200) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `descuento` decimal(10,2) DEFAULT '0.00',
  `monto_final` decimal(10,2) NOT NULL,
  `moneda` varchar(3) DEFAULT 'CLP',
  `estado` enum('pendiente','procesando','pagado','fallido','reembolsado','anulado') DEFAULT 'pendiente',
  `metodo_pago` enum('transferencia','tarjeta_credito','tarjeta_debito','efectivo','cheque','webpay','otro') DEFAULT NULL,
  `referencia_pago` varchar(100) DEFAULT NULL,
  `numero_comprobante` varchar(100) DEFAULT NULL,
  `banco_origen` varchar(100) DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  `comprobante_url` varchar(500) DEFAULT NULL,
  `notas` text,
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

## 35. tb_periodos_academicos

```sql
CREATE TABLE `tb_periodos_academicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `anio` int NOT NULL COMMENT 'Ej: 2024, 2025',
  `nombre` varchar(50) DEFAULT NULL COMMENT 'Ej: Ano Academico 2024',
  `fecha_inicio` date NOT NULL COMMENT 'Inicio del ano escolar',
  `fecha_fin` date NOT NULL COMMENT 'Fin del ano escolar',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 36. tb_periodos_matricula

```sql
CREATE TABLE `tb_periodos_matricula` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `anio_academico` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('regular','anticipada','rezagada','traslado') DEFAULT 'regular',
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `fecha_inicio_pago` date DEFAULT NULL,
  `fecha_limite_pago` date DEFAULT NULL,
  `cupos_disponibles` int DEFAULT NULL,
  `cupos_ocupados` int DEFAULT '0',
  `niveles_habilitados` set('parvularia','basica','media') DEFAULT 'parvularia,basica,media',
  `cursos_habilitados` text,
  `requiere_documentos` tinyint(1) DEFAULT '1',
  `requiere_pago` tinyint(1) DEFAULT '1',
  `monto_matricula` decimal(10,2) DEFAULT '0.00',
  `permite_reserva` tinyint(1) DEFAULT '0',
  `monto_reserva` decimal(10,2) DEFAULT '0.00',
  `instrucciones` text,
  `mensaje_confirmacion` text,
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

## 37. tb_preregistro_administradores

```sql
CREATE TABLE `tb_preregistro_administradores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int DEFAULT NULL,
  `nombre_establecimiento` varchar(255) DEFAULT NULL,
  `direccion_establecimiento` varchar(255) DEFAULT NULL,
  `comuna_establecimiento` varchar(100) DEFAULT NULL,
  `region_establecimiento` varchar(100) DEFAULT NULL,
  `telefono_establecimiento` varchar(20) DEFAULT NULL,
  `email_establecimiento` varchar(255) DEFAULT NULL,
  `modalidad_academica` varchar(20) DEFAULT NULL,
  `estructura_cursos` json DEFAULT NULL,
  `rut` varchar(12) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `cargo` varchar(100) DEFAULT 'Administrador',
  `codigo_validacion_id` int DEFAULT NULL,
  `usado` tinyint(1) DEFAULT '0',
  `usuario_creado_id` int DEFAULT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `notas` text,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `reemplaza_admin_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_preregistro_admin` (`rut`,`establecimiento_id`),
  KEY `idx_establecimiento` (`establecimiento_id`),
  KEY `idx_email` (`email`),
  KEY `idx_usado` (`usado`),
  KEY `idx_activo` (`activo`),
  CONSTRAINT `fk_preadmin_est` FOREIGN KEY (`establecimiento_id`) REFERENCES `tb_establecimientos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 38. tb_preregistro_docente_asignatura

```sql
CREATE TABLE `tb_preregistro_docente_asignatura` (
  `id` int NOT NULL AUTO_INCREMENT,
  `preregistro_docente_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_preregistro_asignatura` (`preregistro_docente_id`,`asignatura_id`),
  KEY `idx_preregistro_docente` (`preregistro_docente_id`),
  KEY `idx_asignatura` (`asignatura_id`),
  CONSTRAINT `fk_prereg_asignatura` FOREIGN KEY (`asignatura_id`) REFERENCES `tb_asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prereg_docente` FOREIGN KEY (`preregistro_docente_id`) REFERENCES `tb_preregistro_docentes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 39. tb_preregistro_docentes

```sql
CREATE TABLE `tb_preregistro_docentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut` varchar(12) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `especialidad` varchar(200) DEFAULT NULL,
  `cargo` enum('titular','reemplazo','part-time','honorarios') DEFAULT 'titular',
  `usado` tinyint(1) DEFAULT '0',
  `usuario_creado_id` int DEFAULT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `notas` text,
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

## 40. tb_preregistro_relaciones

```sql
CREATE TABLE `tb_preregistro_relaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `rut_apoderado` varchar(12) NOT NULL,
  `nombres_apoderado` varchar(100) NOT NULL,
  `apellidos_apoderado` varchar(100) NOT NULL,
  `email_apoderado` varchar(255) DEFAULT NULL,
  `telefono_apoderado` varchar(20) DEFAULT NULL,
  `rut_alumno` varchar(12) NOT NULL,
  `nombres_alumno` varchar(100) NOT NULL,
  `apellidos_alumno` varchar(100) NOT NULL,
  `curso_nombre` varchar(50) DEFAULT NULL,
  `parentesco` enum('padre','madre','abuelo','abuela','tio','tia','hermano','hermana','tutor_legal','otro') DEFAULT 'padre',
  `es_apoderado_titular` tinyint(1) DEFAULT '1',
  `usado` tinyint(1) DEFAULT '0',
  `usuario_creado_id` int DEFAULT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `notas` text,
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

## 41. tb_sesiones

```sql
CREATE TABLE `tb_sesiones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `establecimiento_id` int DEFAULT NULL,
  `tipo_usuario` enum('administrador','docente','apoderado') NOT NULL,
  `token_sesion` varchar(512) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `dispositivo` varchar(100) DEFAULT NULL,
  `navegador` varchar(100) DEFAULT NULL,
  `sistema_operativo` varchar(100) DEFAULT NULL,
  `ubicacion` varchar(255) DEFAULT NULL,
  `fecha_login` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_ultima_actividad` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_logout` datetime DEFAULT NULL,
  `tipo_logout` enum('manual','expiracion','forzado','otra_sesion') DEFAULT NULL,
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

## 42. tb_tipos_evaluacion

```sql
CREATE TABLE `tb_tipos_evaluacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `establecimiento_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `abreviatura` varchar(10) DEFAULT NULL,
  `descripcion` text,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 43. tb_usuarios

```sql
CREATE TABLE `tb_usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL COMMENT 'Email unico para login',
  `password_hash` varchar(255) NOT NULL COMMENT 'Contrasena encriptada (bcrypt)',
  `tipo_usuario` enum('administrador','docente','apoderado') NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `email_verificado` tinyint(1) DEFAULT '0' COMMENT 'Si verifico su email',
  `debe_cambiar_password` tinyint(1) DEFAULT '0' COMMENT 'Forzar cambio en proximo login',
  `intentos_fallidos` int DEFAULT '0' COMMENT 'Contador de intentos fallidos',
  `bloqueado_hasta` datetime DEFAULT NULL COMMENT 'Fecha hasta cuando esta bloqueado',
  `ultimo_acceso` datetime DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expira` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `reset_token` (`reset_token`),
  KEY `idx_tipo_usuario` (`tipo_usuario`),
  KEY `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Tablas eliminadas (25/02/2026)

Las siguientes 11 tablas fueron eliminadas por no estar en uso:

| Tabla | Motivo |
|-------|--------|
| tb_claves_provisorias | Sin uso, reemplazada por flujo de pre-registro |
| tb_documentos_requeridos | Modulo documentos no implementado |
| tb_facturas | Sistema SaaS de facturacion no implementado |
| tb_historial_suscripciones | Sistema SaaS no implementado |
| tb_horarios | Modulo horarios no implementado |
| tb_pagos | Sistema SaaS de pagos no implementado |
| tb_plan_funcionalidades | Sistema SaaS no implementado |
| tb_planes | Sistema SaaS no implementado |
| tb_promociones | Sistema SaaS no implementado |
| tb_suscripcion_promocion | Sistema SaaS no implementado |
| tb_suscripciones | Sistema SaaS no implementado |
