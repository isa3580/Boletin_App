    -- =========================================================================
    --1. TABLA: USUARIOS (Directores, Coordinadores, Profesores, Administradores)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        correo VARCHAR(150) UNIQUE NOT NULL,
        contrasena VARCHAR(100) NOT NULL DEFAULT 'escolar2025',
        rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'director', 'coordinador', 'profesor')),
        nivel_asignado VARCHAR(15) CHECK (nivel_asignado IN ('primaria', 'secundaria')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Agregar columna si la tabla ya existía antes de la migración
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena VARCHAR(100) NOT NULL DEFAULT 'escolar2025';

    -- =========================================================================
    -- 2. TABLA: CURSOS (Grados y Secciones con Docente Titular o Profesor Guía)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS cursos (
        id SERIAL PRIMARY KEY,
        nombre_grado VARCHAR(50) NOT NULL,
        seccion VARCHAR(5) NOT NULL,
        nivel VARCHAR(15) NOT NULL CHECK (nivel IN ('primaria', 'secundaria')),
        profesor_encargado_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_curso_seccion UNIQUE (nombre_grado, seccion)
    );

    -- Agregar columna si la tabla ya existía antes de la migración
    ALTER TABLE cursos ADD COLUMN IF NOT EXISTS profesor_encargado_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

    -- =========================================================================
    -- 3. TABLA: ALUMNOS (Estudiantes con correo del representante legal)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS alumnos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        curso_id INT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
        correo_representante VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- =========================================================================
    -- 4. TABLA: MATERIAS (Áreas de Formación Curricular)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS materias (
        id SERIAL PRIMARY KEY,
        nombre_materia VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- =========================================================================
    -- 5. TABLA: CARGA ACADEMICA (Asignación de Profesores a Materias y Cursos)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS carga_academica (
        id SERIAL PRIMARY KEY,
        profesor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        materia_id INT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
        curso_id INT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
        CONSTRAINT unique_carga UNIQUE (profesor_id, materia_id, curso_id)
    );

    -- =========================================================================
    -- 6. TABLA: CALIFICACIONES (Literales para Primaria y Numéricas para Secundaria)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS calificaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
        materia_id INT NOT NULL REFERENCES materias(id) ON DELETE RESTRICT,
        curso_id INT NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
        nota_literal CHAR(1) CHECK (nota_literal IN ('A', 'B', 'C', 'D', 'E')), 
        nota_num INT CHECK (nota_num >= 0 AND nota_num <= 20),                     
        periodo VARCHAR(50) NOT NULL,                                       
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_nota_periodo UNIQUE (alumno_id, materia_id, curso_id, periodo)
    );

    -- =========================================================================
    -- 7. TABLA: REPORTES (Ciclo del boletín: borrador -> revisión -> aprobación -> enviado)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS reportes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
        texto_cualitativo_ia TEXT NOT NULL, 
        periodo VARCHAR(50) NOT NULL,      
        estado VARCHAR(30) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'devuelto_profesor', 'en_revision_coordinador', 'aprobado_coordinador', 'enviado')),
        revisado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL, 
        notas_coordinacion TEXT, 
        fecha_revision TIMESTAMP WITH TIME ZONE,
        aprobado_por_director UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        fecha_aprobacion_director TIMESTAMP WITH TIME ZONE,
        fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_reporte_periodo UNIQUE (alumno_id, periodo) 
    );

    -- =========================================================================
    -- 8. TABLA: PERIODOS CERRADOS (Control administrativo de cierre de lapsos)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS periodos_cerrados (
        id SERIAL PRIMARY KEY,
        periodo VARCHAR(50) NOT NULL,
        anio_escolar VARCHAR(20) NOT NULL,
        cerrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        fecha_cierre TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_periodo_cerrado UNIQUE (periodo, anio_escolar)
    );

    -- =========================================================================
    -- 9. TABLA: CONFIGURACION DEL SISTEMA (Parámetros globales)
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS configuracion_sistema (
        id SERIAL PRIMARY KEY,
        clave VARCHAR(50) UNIQUE NOT NULL,
        valor TEXT NOT NULL,
        descripcion TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Configuración por defecto (no sobreescribe si ya existe)
    INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES 
    ('sistema_bloqueado', 'false', 'Bloquea todo el sistema impidiendo ediciones'),
    ('periodo_activo', '1er Momento', 'Período escolar actual activo'),
    ('anio_escolar', '2026-2027', 'Año escolar vigente')
    ON CONFLICT (clave) DO NOTHING;


    -- =========================================================================
    -- DATOS SEMILLA INICIALES (Con ON CONFLICT para inserción segura)
    -- =========================================================================

    -- 1. Usuarios Directivos y Docentes
    INSERT INTO usuarios (id, nombre, apellido, correo, contrasena, rol, nivel_asignado) VALUES 
    ('40000000-0000-0000-0000-000000000004', 'Luisa', 'Pérez', 'director@colegio.com', '123456', 'director', NULL),
    ('50000000-0000-0000-0000-000000000005', 'Roberto', 'Gómez', 'coordinador@colegio.com', '123456', 'coordinador', 'primaria'),
    ('10000000-0000-0000-0000-000000000001', 'Carmen', 'Rivas', 'carmen@colegio.com', '123456', 'profesor', 'primaria'), 
    ('20000000-0000-0000-0000-000000000002', 'José', 'Silva', 'jose@colegio.com', '123456', 'profesor', 'secundaria'),
    ('30000000-0000-0000-0000-000000000003', 'Control', 'Estudios', 'control@colegio.com', '123456', 'admin', NULL)
    ON CONFLICT (id) DO NOTHING;

    -- 2. Cursos (Con Docente Titular en Primaria y Profesor Guía en Secundaria)
    INSERT INTO cursos (id, nombre_grado, seccion, nivel, profesor_encargado_id) VALUES 
    (1, '6to Grado', 'A', 'primaria', '10000000-0000-0000-0000-000000000001'), -- Carmen Rivas: Docente Titular
    (2, '4to Año', 'B', 'secundaria', '20000000-0000-0000-0000-000000000002') -- José Silva: Profesor Guía
    ON CONFLICT (id) DO NOTHING;

    -- 3. Materias
    INSERT INTO materias (id, nombre_materia) VALUES 
    (1, 'Matemáticas'), 
    (2, 'Castellano'), 
    (3, 'Ciencias Naturales'), 
    (4, 'Física'),
    (5, 'Educación Física'),
    (6, 'Historia'),
    (7, 'Geografía'),
    (8, 'Inglés'),
    (9, 'Quimica'),
    (10, 'Biología'),
    (11, 'Ciencias Sociales')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Estudiantes
    INSERT INTO alumnos (id, nombre, apellido, curso_id, correo_representante) VALUES 
    ('aaaa1111-1111-1111-1111-111111111111', 'Diego', 'Mendoza', 1, 'representante.diego@correo.com'), 
    ('bbbb2222-2222-2222-2222-222222222222', 'Valentina', 'Rojas', 2, 'representante.valentina@correo.com')
    ON CONFLICT (id) DO NOTHING;

    -- =========================================================================
    -- AJUSTES PARA BASES DE DATOS EXISTENTES (idempotentes, no pisan cambios)
    -- =========================================================================

    -- Contraseñas semilla (solo si siguen en el valor por defecto 'escolar2025')
    UPDATE usuarios SET contrasena = 'director2025'   WHERE correo = 'director@colegio.com'      AND contrasena = 'escolar2025';
    UPDATE usuarios SET contrasena = 'coord2025'      WHERE correo = 'coordinador@colegio.com'   AND contrasena = 'escolar2025';
    UPDATE usuarios SET contrasena = 'profe2025'      WHERE correo IN ('carmen@colegio.com', 'jose@colegio.com') AND contrasena = 'escolar2025';
    UPDATE usuarios SET contrasena = 'control2025'    WHERE correo = 'control@colegio.com'       AND contrasena = 'escolar2025';

    -- Nivel de docencia de profesores (solo si aún está sin asignar)
    UPDATE usuarios SET nivel_asignado = 'primaria'   WHERE id = '10000000-0000-0000-0000-000000000001' AND nivel_asignado IS NULL;
    UPDATE usuarios SET nivel_asignado = 'secundaria' WHERE id = '20000000-0000-0000-0000-000000000002' AND nivel_asignado IS NULL;

    -- Carga académica de 4to Año B apuntando al Profesor Guía (solo materias de ese salón)
    UPDATE carga_academica SET profesor_id = '20000000-0000-0000-0000-000000000002' WHERE curso_id = 2 AND materia_id IN (3, 4);

    -- =========================================================================
    -- LAPSOS CERRADOS POR DEFECTO (solo el admin puede abrirlos)
    -- =========================================================================
    INSERT INTO periodos_cerrados (periodo, anio_escolar) VALUES 
    ('1er Momento', '2026-2027'),
    ('2do Momento', '2026-2027'),
    ('3er Momento', '2026-2027')
    ON CONFLICT (periodo, anio_escolar) DO NOTHING;

    -- =========================================================================
    -- RESINCRONIZAR SECUENCIAS SERIAL (los id explícitos del semilla no avanzan
    -- la secuencia; sin esto el próximo INSERT daría "duplicate ... pkey")
    -- =========================================================================
    SELECT setval(pg_get_serial_sequence('cursos', 'id'), COALESCE((SELECT MAX(id) FROM cursos), 1));
    SELECT setval(pg_get_serial_sequence('materias', 'id'), COALESCE((SELECT MAX(id) FROM materias), 1));
    SELECT setval(pg_get_serial_sequence('carga_academica', 'id'), COALESCE((SELECT MAX(id) FROM carga_academica), 1));