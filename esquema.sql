DROP TABLE IF EXISTS reportes CASCADE;
DROP TABLE IF EXISTS calificaciones CASCADE;
DROP TABLE IF EXISTS carga_academica CASCADE;
DROP TABLE IF EXISTS materias CASCADE;
DROP TABLE IF EXISTS alumnos CASCADE;
DROP TABLE IF EXISTS cursos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- =========================================================================
-- 1. TABLA: USUARIOS (Directores, Coordinadores, Profesores)
-- =========================================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'director', 'coordinador', 'profesor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 2. TABLA: CURSOS (Grados y Secciones)
-- =========================================================================
CREATE TABLE cursos (
    id SERIAL PRIMARY KEY,
    nombre_grado VARCHAR(50) NOT NULL,
    seccion VARCHAR(5) NOT NULL,
    nivel VARCHAR(15) NOT NULL CHECK (nivel IN ('primaria', 'secundaria')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_curso_seccion UNIQUE (nombre_grado, seccion)
);

-- =========================================================================
-- 3. TABLA: ALUMNOS (Con correo del representante integrado)
-- =========================================================================
CREATE TABLE alumnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    curso_id INT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    correo_representante VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 4. TABLA: MATERIAS (Áreas de Formación)
-- =========================================================================
CREATE TABLE materias (
    id SERIAL PRIMARY KEY,
    nombre_materia VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 5. TABLA: CARGA ACADEMICA (Asignación de Profesores a Materias y Cursos)
-- =========================================================================
CREATE TABLE carga_academica (
    id SERIAL PRIMARY KEY,
    profesor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    materia_id INT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    curso_id INT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    CONSTRAINT unique_carga UNIQUE (profesor_id, materia_id, curso_id)
);

-- =========================================================================
-- 6. TABLA: CALIFICACIONES (Soporta Literales para Primaria y Numéricas para Secundaria)
-- =========================================================================
CREATE TABLE calificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
    materia_id INT NOT NULL REFERENCES materias(id) ON DELETE RESTRICT,
    curso_id INT NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
    nota_literal CHAR(1) CHECK (nota_literal IN ('A', 'B', 'C', 'D', 'E', 'F')), 
    nota_num INT CHECK (nota_num >= 0 AND nota_num <= 20),                     
    periodo VARCHAR(50) NOT NULL,                                       
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_nota_periodo UNIQUE (alumno_id, materia_id, curso_id, periodo)
);

-- =========================================================================
-- 7. TABLA: REPORTES (Ciclo completo: borrador -> revisión -> aprobación -> enviado)
-- =========================================================================
CREATE TABLE reportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
    texto_cualitativo_ia TEXT NOT NULL, 
    periodo VARCHAR(50) NOT NULL,      
    estado VARCHAR(30) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en_revision_coordinador', 'aprobado_coordinador', 'aprobado', 'enviado')),
    revisado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL, 
    notas_coordinacion TEXT, 
    fecha_revision TIMESTAMP WITH TIME ZONE,
    aprobado_por_director UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_aprobacion_director TIMESTAMP WITH TIME ZONE,
    fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_reporte_periodo UNIQUE (alumno_id, periodo) 
);


-- =========================================================================
-- DATOS SEMILLA (SEED DATA PARA PRUEBAS INICIALES)
-- =========================================================================

-- 1. Usuarios Directivos y Docentes
INSERT INTO usuarios (id, nombre, apellido, correo, rol) VALUES 
('40000000-0000-0000-0000-000000000004', 'Luisa', 'Pérez', 'director@colegio.com', 'director'),
('50000000-0000-0000-0000-000000000005', 'Roberto', 'Gómez', 'coordinador@colegio.com', 'coordinador'),
('10000000-0000-0000-0000-000000000001', 'Carmen', 'Rivas', 'carmen@colegio.com', 'profesor'), 
('20000000-0000-0000-0000-000000000002', 'José', 'Silva', 'jose@colegio.com', 'profesor');

-- 2. Cursos
INSERT INTO cursos (id, nombre_grado, seccion, nivel) VALUES 
(1, '6to Grado', 'A', 'primaria'),
(2, '4to Año', 'B', 'secundaria');

-- 3. Materias
INSERT INTO materias (id, nombre_materia) VALUES 
(1, 'Matemáticas'), (2, 'Castellano'), (3, 'Ciencias Naturales'), (4, 'Física');

-- 4. Estudiantes (con correos de representantes reales para tus pruebas)
INSERT INTO alumnos (id, nombre, apellido, curso_id, correo_representante) VALUES 
('aaaa1111-1111-1111-1111-111111111111', 'Diego', 'Mendoza', 1, 'tucorreo@gmail.com'), 
('bbbb2222-2222-2222-2222-222222222222', 'Valentina', 'Rojas', 2, 'tucorreo@gmail.com'); 

-- 5. Carga Académica (Asignando materias al profesor Carmen Rivas ID: 10000000-0000-0000-0000-000000000001)
INSERT INTO carga_academica (id, profesor_id, materia_id, curso_id) VALUES 
(1, '10000000-0000-0000-0000-000000000001', 1, 1), 
(2, '10000000-0000-0000-0000-000000000001', 2, 1), 
(3, '10000000-0000-0000-0000-000000000001', 3, 2), 
(4, '10000000-0000-0000-0000-000000000001', 4, 2);