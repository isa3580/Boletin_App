/**
 * Script de Carga de Estudiantes (5 por Salón)
 * U.E. COLEGIO SAN FRANCISCO
 * 
 * Uso:
 *   node database/seed_alumnos.js
 */

const fs = require('fs');
const path = require('path');

// Leer variables de entorno desde .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
let supabaseUrl = 'https://nykbyzfhmageofabciyq.supabase.co';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
  });
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const ESTUDIANTES_POOL = [
  { nombre: "Gabriel Alejandro", apellido: "Mendoza Silva", email: "isabellarodri2345@gmail.com" },
  { nombre: "Valeria Sofia", apellido: "Rojas Castillo", email: "representante.rojas@gmail.com" },
  { nombre: "Santiago Jose", apellido: "Gutierrez Blanco", email: "representante.gutierrez@gmail.com" },
  { nombre: "Camila Victoria", apellido: "Hernandez Morales", email: "representante.hernandez@gmail.com" },
  { nombre: "Diego Andres", apellido: "Torres Ramirez", email: "representante.torres@gmail.com" },
  { nombre: "Isabella Maria", apellido: "Perez Alvarez", email: "isabellarodri2345@gmail.com" },
  { nombre: "Mateo David", apellido: "Gonzalez Medina", email: "representante.gonzalez@gmail.com" },
  { nombre: "Lucia Andrea", apellido: "Fernandez Castro", email: "representante.fernandez@gmail.com" },
  { nombre: "Sebastian Ignacio", apellido: "Vargas Delgado", email: "representante.vargas@gmail.com" },
  { nombre: "Mariana Valentina", apellido: "Navarro Suarez", email: "representante.navarro@gmail.com" },
  { nombre: "Alejandro Jose", apellido: "Ortega Paredes", email: "representante.ortega@gmail.com" },
  { nombre: "Paula Daniela", apellido: "Romero Benitez", email: "representante.romero@gmail.com" },
  { nombre: "Daniel Eduardo", apellido: "Guerrero Rivas", email: "representante.guerrero@gmail.com" },
  { nombre: "Elena Beatriz", apellido: "Molina Salazar", email: "representante.molina@gmail.com" },
  { nombre: "Lucas Emmanuel", apellido: "Pacheco Gil", email: "representante.pacheco@gmail.com" }
];

async function seed() {
  console.log("Verificando salones y estudiantes en Supabase...");

  try {
    const resCursos = await fetch(`${supabaseUrl}/rest/v1/cursos?select=*&order=id.asc`, { headers });
    const cursos = await resCursos.json();

    if (!Array.isArray(cursos)) {
      console.error("Error al obtener cursos:", cursos);
      return;
    }

    console.log(`Se encontraron ${cursos.length} salones registrados.`);

    for (const curso of cursos) {
      const resAlumnos = await fetch(`${supabaseUrl}/rest/v1/alumnos?curso_id=eq.${curso.id}&select=*`, { headers });
      const alumnosExistentes = await resAlumnos.json();

      const cantidadActual = Array.isArray(alumnosExistentes) ? alumnosExistentes.length : 0;
      console.log(`Salón: ${curso.nombre_grado} "${curso.seccion}" (${curso.nivel}) - Alumnos actuales: ${cantidadActual}`);

      const faltantes = 5 - cantidadActual;
      if (faltantes > 0) {
        console.log(`-> Insertando ${faltantes} alumnos faltantes...`);
        const nuevosParaInsertar = [];
        for (let i = 0; i < faltantes; i++) {
          const poolIndex = (curso.id * 3 + cantidadActual + i) % ESTUDIANTES_POOL.length;
          const plantilla = ESTUDIANTES_POOL[poolIndex];

          nuevosParaInsertar.push({
            curso_id: curso.id,
            nombre: plantilla.nombre,
            apellido: plantilla.apellido,
            correo_representante: plantilla.email
          });
        }

        const resInsert = await fetch(`${supabaseUrl}/rest/v1/alumnos`, {
          method: 'POST',
          headers,
          body: JSON.stringify(nuevosParaInsertar)
        });

        if (resInsert.ok) {
          console.log(`Alumnos insertados con éxito para ${curso.nombre_grado} "${curso.seccion}".`);
        } else {
          console.error("Error al insertar:", await resInsert.text());
        }
      } else {
        console.log(`Salón al día con 5 estudiantes.`);
      }
    }
    console.log("\nProceso finalizado con éxito.");
  } catch (err) {
    console.error("Error durante la ejecución:", err);
  }
}

seed();

