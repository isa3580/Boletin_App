'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { PERIODOS } from '../../../lib/constants';
import { 
  IconBuilding, 
  IconUsers, 
  IconBook, 
  IconSettings, 
  IconCheck, 
  IconLock, 
  IconUnlock,
  IconSearch,
  IconAlertCircle, 
  IconShield, 
  IconEdit, 
  IconTrash, 
  IconPlus, 
  IconDocument,
  IconSend,
  IconMail
} from '../../../components/Icons';
import { generarHtmlBoletin, generarPdfBase64, construirMensajeRepresentante } from '../../../lib/generarPdfBoletin';

interface UsuarioItem {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  nivel_asignado?: string | null;
  created_at?: string;
}

interface CursoItem {
  id: number;
  nombre_grado: string;
  seccion: string;
  nivel: string;
  profesor_encargado_id?: string | null;
}

interface MateriaItem {
  id: number;
  nombre_materia: string;
}

interface AlumnoConReporte {
  id: string;
  nombre: string;
  apellido: string;
  cedula_escolar?: string;
  correo_representante?: string;
  curso_id: number;
  cursos?: CursoItem;
  reporte?: {
    id: string;
    estado: string;
    informe_cualitativo?: string;
    notas_coordinacion?: string;
    fecha_revision?: string;
  };
}

export default function AdminDashboard() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [materias, setMaterias] = useState<MateriaItem[]>([]);
  const [totalAlumnos, setTotalAlumnos] = useState(0);
  const [pestanaActiva, setPestanaActiva] = useState<'usuarios' | 'cursos' | 'materias' | 'despacho' | 'desbloqueo'>('usuarios');
  const [cargando, setCargando] = useState(true);
  const [sistemaBloqueado, setSistemaBloqueado] = useState(false);
  const [anioEscolar, setAnioEscolar] = useState('2026-2027');
  const [formAnioEscolar, setFormAnioEscolar] = useState('2026-2027');
  const [alertaExito, setAlertaExito] = useState<string | null>(null);
  const [periodosCerrados, setPeriodosCerrados] = useState<string[]>([]);
  const router = useRouter();

  // Filtros de búsqueda en catálogos
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [filtroRolUsuario, setFiltroRolUsuario] = useState('todos');
  const [busquedaCurso, setBusquedaCurso] = useState('');
  const [filtroNivelCurso, setFiltroNivelCurso] = useState('todos');
  const [busquedaMateria, setBusquedaMateria] = useState('');

  // Modal states para Usuarios / Cursos / Materias
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoModal, setTipoModal] = useState<'usuario' | 'curso' | 'materia'>('usuario');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [itemEditando, setItemEditando] = useState<any>(null);

  // Form states
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formCorreo, setFormCorreo] = useState('');
  const [formRol, setFormRol] = useState('profesor');
  const [formNivelAsignado, setFormNivelAsignado] = useState<string>('');
  const [formGrado, setFormGrado] = useState('');
  const [formSeccion, setFormSeccion] = useState('');
  const [formNivel, setFormNivel] = useState('primaria');
  const [formProfesorEncargado, setFormProfesorEncargado] = useState<string>('');
  const [formMateriasCurso, setFormMateriasCurso] = useState<number[]>([]);
  const [formMateria, setFormMateria] = useState('');
  const [procesando, setProcesando] = useState(false);

  // States para DESPACHO MASIVO
  const [periodoDespacho, setPeriodoDespacho] = useState<string>(PERIODOS[0]);
  const [firmaDirectorDespacho, setFirmaDirectorDespacho] = useState<boolean>(false);
  const [reportesDespacho, setReportesDespacho] = useState<any[]>([]);
  const [alumnosDespacho, setAlumnosDespacho] = useState<any[]>([]);
  const [calificacionesDespacho, setCalificacionesDespacho] = useState<any[]>([]);
  const [despachando, setDespachando] = useState(false);
  const [progresoDespacho, setProgresoDespacho] = useState<{ total: number; actual: number; exitosos: number; fallidos: number; mensaje: string } | null>(null);
  const offscreenContainerRef = useRef<HTMLDivElement>(null);

  // States para DESBLOQUEO DE EXPEDIENTES (Llave de Emergencia)
  const [periodoDesbloqueo, setPeriodoDesbloqueo] = useState<string>(PERIODOS[0]);
  const [filtroCursoDesbloqueo, setFiltroCursoDesbloqueo] = useState<string>('todos');
  const [busquedaDesbloqueo, setBusquedaDesbloqueo] = useState<string>('');
  const [alumnosConReportesDesbloqueo, setAlumnosConReportesDesbloqueo] = useState<AlumnoConReporte[]>([]);
  const [modalDesbloqueoAbierto, setModalDesbloqueoAbierto] = useState(false);
  const [alumnoADesbloquear, setAlumnoADesbloquear] = useState<AlumnoConReporte | null>(null);
  const [motivoDesbloqueo, setMotivoDesbloqueo] = useState('Corrección de calificaciones solicitada por el docente.');
  const [procesandoDesbloqueo, setProcesandoDesbloqueo] = useState(false);

  useEffect(() => {
    cargarDatosAdmin();
  }, []);

  useEffect(() => {
    if (pestanaActiva === 'despacho') {
      cargarDatosDespacho();
    } else if (pestanaActiva === 'desbloqueo') {
      cargarDatosDesbloqueo();
    }
  }, [pestanaActiva, periodoDespacho, periodoDesbloqueo]);

  const cargarDatosAdmin = async () => {
    try {
      setCargando(true);
      const { data: usersData } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
      setUsuarios(usersData || []);

      const { data: cursosData } = await supabase.from('cursos').select('*').order('id', { ascending: true });
      setCursos(cursosData || []);

      const { data: materiasData } = await supabase.from('materias').select('*').order('id', { ascending: true });
      setMaterias(materiasData || []);

      const { count: alumnosCount } = await supabase.from('alumnos').select('*', { count: 'exact', head: true });
      setTotalAlumnos(alumnosCount || 0);

      const { data: configData } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'sistema_bloqueado')
        .single();
      if (configData?.valor === 'true') setSistemaBloqueado(true);
      else setSistemaBloqueado(false);

      const { data: anioData } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'anio_escolar')
        .single();
      if (anioData?.valor) {
        setAnioEscolar(anioData.valor);
        setFormAnioEscolar(anioData.valor);
      }

      const { data: periodosData } = await supabase
        .from('periodos_cerrados')
        .select('periodo')
        .eq('anio_escolar', anioEscolar || '2026-2027');
      setPeriodosCerrados((periodosData || []).map(p => p.periodo));
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setCargando(false);
    }
  };

  const cargarDatosDespacho = async () => {
    try {
      // 1. Verificar firma de director
      const { data: firmaData } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', `firma_director_${periodoDespacho}`)
        .single();
      setFirmaDirectorDespacho(firmaData?.valor === 'true');

      // 2. Cargar alumnos con sus cursos
      const { data: alData } = await supabase.from('alumnos').select('*, cursos(*)');
      setAlumnosDespacho(alData || []);

      // 3. Cargar reportes para el periodo
      const { data: repData } = await supabase.from('reportes').select('*').eq('periodo', periodoDespacho);
      setReportesDespacho(repData || []);

      // 4. Cargar calificaciones para el periodo
      const { data: calData } = await supabase
        .from('calificaciones')
        .select('*, materias(id, nombre_materia)')
        .eq('periodo', periodoDespacho);
      setCalificacionesDespacho(calData || []);
    } catch (err) {
      console.error("Error al cargar datos de despacho:", err);
    }
  };

  const cargarDatosDesbloqueo = async () => {
    try {
      const { data: alData } = await supabase
        .from('alumnos')
        .select('id, nombre, apellido, cedula_escolar, correo_representante, curso_id, cursos(id, nombre_grado, seccion, nivel)')
        .order('apellido', { ascending: true });

      const { data: repData } = await supabase
        .from('reportes')
        .select('*')
        .eq('periodo', periodoDesbloqueo);

      const mapaReportes = new Map<string, any>();
      (repData || []).forEach(r => mapaReportes.set(r.alumno_id, r));

      const alumnosCombinados: AlumnoConReporte[] = (alData || []).map(al => ({
        id: al.id,
        nombre: al.nombre,
        apellido: al.apellido,
        cedula_escolar: al.cedula_escolar,
        correo_representante: al.correo_representante,
        curso_id: al.curso_id,
        cursos: (Array.isArray(al.cursos) ? al.cursos[0] : al.cursos) as unknown as CursoItem,
        reporte: mapaReportes.get(al.id) || {
          id: '',
          estado: 'borrador',
          informe_cualitativo: '',
          notas_coordinacion: ''
        }
      }));

      setAlumnosConReportesDesbloqueo(alumnosCombinados);
    } catch (err) {
      console.error("Error al cargar datos de desbloqueo:", err);
    }
  };

  const handleEjecutarDespacho = async (filtroCursoId?: number) => {
    if (!firmaDirectorDespacho) {
      alert(`La Dirección General aún no ha activado la autorización de firma para el ${periodoDespacho}. El despacho institucional está inhabilitado hasta que la Dirección active el interruptor maestro.`);
      return;
    }

    const targetAlumnos = alumnosDespacho.filter(al => {
      if (filtroCursoId && al.curso_id !== filtroCursoId) return false;
      const rep = reportesDespacho.find(r => r.alumno_id === al.id);
      return rep && rep.estado === 'aprobado_coordinador';
    });

    if (targetAlumnos.length === 0) {
      alert(`No hay boletines aprobados pendientes por despachar para ${filtroCursoId ? 'este salón' : 'el plantel'} en el ${periodoDespacho}.`);
      return;
    }

    const confirmacion = confirm(`¿Confirmar el despacho masivo de ${targetAlumnos.length} boletín(es) oficial(es) por correo electrónico a los representantes correspondientes al ${periodoDespacho}?`);
    if (!confirmacion) return;

    setDespachando(true);
    setProgresoDespacho({
      total: targetAlumnos.length,
      actual: 0,
      exitosos: 0,
      fallidos: 0,
      mensaje: 'Iniciando despacho masivo...'
    });

    const userActual = JSON.parse(localStorage.getItem('usuarioActual') || '{}');
    let exitosos = 0;
    let fallidos = 0;

    for (let i = 0; i < targetAlumnos.length; i++) {
      const alumno = targetAlumnos[i];
      const rep = reportesDespacho.find(r => r.alumno_id === alumno.id);
      const curso = alumno.cursos || cursos.find(c => c.id === alumno.curso_id);
      const docenteTitular = usuarios.find(u => u.id === curso?.profesor_encargado_id);
      const califsAlumno = calificacionesDespacho.filter(c => c.alumno_id === alumno.id);

      setProgresoDespacho({
        total: targetAlumnos.length,
        actual: i + 1,
        exitosos,
        fallidos,
        mensaje: `Procesando: ${alumno.nombre} ${alumno.apellido} (${i + 1}/${targetAlumnos.length})...`
      });

      if (!alumno.correo_representante) {
        fallidos++;
        continue;
      }

      try {
        const califsFormateadas = califsAlumno.map(c => ({
          materia: c.materias?.nombre_materia || 'Materia',
          nota: String(c.nota_literal || c.nota_num || '0'),
          apreciacion: c.apreciacion || ''
        }));

        const htmlContenido = generarHtmlBoletin({
          nombreInstitucion: 'UNIDAD EDUCATIVA COLEGIO SAN FRANCISCO',
          codigoPlantel: 'DEA-001234',
          rifPlantel: 'J-30492819-0',
          nombreAlumno: `${alumno.nombre} ${alumno.apellido}`,
          nombreGrado: curso?.nombre_grado || 'Grado',
          seccion: curso?.seccion || 'A',
          nivel: curso?.nivel || 'primaria',
          periodo: periodoDespacho,
          anioEscolar: anioEscolar,
          calificaciones: califsFormateadas,
          informeCualitativo: rep?.informe_cualitativo || 'Sin informe cualitativo emitido.',
          nombreDocente: docenteTitular ? `Prof. ${docenteTitular.nombre} ${docenteTitular.apellido}` : 'Docente Asignado',
          rolDocente: curso?.nivel?.toLowerCase() === 'primaria' ? 'Docente de Aula Titular' : 'Profesor Guía de Sección',
          nombreCoordinador: 'Lcdo. Roberto Gómez',
          coordinacionAprobada: true,
          nombreDirector: 'Lcda. Luisa Pérez',
          direccionSellada: true
        });

        if (offscreenContainerRef.current) {
          offscreenContainerRef.current.innerHTML = htmlContenido;
          const pdfBase64 = await generarPdfBase64(offscreenContainerRef.current);

          const mensaje = construirMensajeRepresentante(
            `${alumno.nombre} ${alumno.apellido}`,
            periodoDespacho,
            anioEscolar,
            `${curso?.nombre_grado} "${curso?.seccion}"`
          );

          const response = await fetch('/api/enviar-boletin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              correo_representante: alumno.correo_representante,
              nombre_alumno: `${alumno.nombre} ${alumno.apellido}`,
              periodo: periodoDespacho,
              anio_escolar: anioEscolar,
              nombre_grado: `${curso?.nombre_grado} "${curso?.seccion}"`,
              pdf_base64: pdfBase64,
              mensaje: mensaje
            })
          });

          if (!response.ok) {
            console.error(`Fallo envío para ${alumno.nombre} ${alumno.apellido}`);
            fallidos++;
          } else {
            await supabase
              .from('reportes')
              .update({
                estado: 'enviado',
                notas_coordinacion: 'Despachado oficialmente a los representantes por Control de Estudios con Sello y Firma de Dirección.',
                aprobado_por_director: userActual?.id || null,
                fecha_aprobacion_director: new Date().toISOString(),
                fecha_revision: new Date().toISOString()
              })
              .eq('id', rep.id);

            exitosos++;
          }
        }
      } catch (errLoop) {
        console.error("Error en despacho de alumno:", errLoop);
        fallidos++;
      }
    }

    setDespachando(false);
    setProgresoDespacho(null);
    setAlertaExito(`Despacho finalizado. ${exitosos} boletines enviados con éxito.${fallidos > 0 ? ` ${fallidos} con observaciones/sin correo.` : ''}`);
    await cargarDatosDespacho();
    setTimeout(() => setAlertaExito(null), 5000);
  };

  const abrirModalDesbloqueo = (alumno: AlumnoConReporte) => {
    setAlumnoADesbloquear(alumno);
    setMotivoDesbloqueo('Desbloqueo administrativo autorizado por Control de Estudios para corrección docente.');
    setModalDesbloqueoAbierto(true);
  };

  const handleEjecutarDesbloqueo = async () => {
    if (!alumnoADesbloquear || !alumnoADesbloquear.reporte?.id) {
      alert('No se puede desbloquear este expediente porque aún no posee un reporte guardado.');
      return;
    }

    setProcesandoDesbloqueo(true);
    try {
      const { error } = await supabase
        .from('reportes')
        .update({
          estado: 'devuelto_profesor',
          notas_coordinacion: motivoDesbloqueo.trim() || 'Desbloqueo de emergencia autorizado por Control de Estudios.',
          fecha_revision: new Date().toISOString()
        })
        .eq('id', alumnoADesbloquear.reporte.id);

      if (error) throw error;

      setAlertaExito(`Expediente de ${alumnoADesbloquear.nombre} ${alumnoADesbloquear.apellido} desbloqueado exitosamente. El docente ahora puede editar.`);
      setModalDesbloqueoAbierto(false);
      await cargarDatosDesbloqueo();
      setTimeout(() => setAlertaExito(null), 4000);
    } catch (err: any) {
      console.error("Error al desbloquear expediente:", err);
      alert(err.message || 'No se pudo desbloquear el expediente.');
    } finally {
      setProcesandoDesbloqueo(false);
    }
  };

  const getRolBadge = (rol: string) => {
    switch (rol.toLowerCase()) {
      case 'director': return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'coordinador': return 'bg-indigo-50 text-indigo-900 border-indigo-200';
      case 'admin': return 'bg-purple-50 text-purple-900 border-purple-200';
      default: return 'bg-blue-50 text-blue-900 border-blue-200';
    }
  };

  const getEstadoReporteBadge = (estado: string) => {
    switch (estado) {
      case 'enviado':
        return {
          clase: 'bg-purple-50 text-purple-800 border-purple-200',
          texto: 'Enviado a Representante',
          bloqueado: true
        };
      case 'aprobado_coordinador':
        return {
          clase: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          texto: 'Aprobado (Listo para envío)',
          bloqueado: true
        };
      case 'en_revision_coordinador':
        return {
          clase: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          texto: 'En Revisión Coordinación',
          bloqueado: true
        };
      case 'devuelto_profesor':
        return {
          clase: 'bg-amber-50 text-amber-800 border-amber-200',
          texto: 'Desbloqueado para Corrección',
          bloqueado: false
        };
      default:
        return {
          clase: 'bg-slate-100 text-slate-700 border-slate-200',
          texto: 'En Redacción Docente',
          bloqueado: false
        };
    }
  };

  const abrirModalCrear = (tipo: 'usuario' | 'curso' | 'materia') => {
    setTipoModal(tipo);
    setModoEdicion(false);
    setItemEditando(null);
    setFormNombre('');
    setFormApellido('');
    setFormCorreo('');
    setFormRol('profesor');
    setFormNivelAsignado('');
    setFormGrado('');
    setFormSeccion('');
    setFormNivel('primaria');
    setFormProfesorEncargado('');
    setFormMateriasCurso([]);
    setFormMateria('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (tipo: 'usuario' | 'curso' | 'materia', item: any) => {
    setTipoModal(tipo);
    setModoEdicion(true);
    setItemEditando(item);
    if (tipo === 'usuario') {
      setFormNombre(item.nombre || '');
      setFormApellido(item.apellido || '');
      setFormCorreo(item.correo || '');
      setFormRol(item.rol || 'profesor');
      setFormNivelAsignado(item.nivel_asignado || '');
    } else if (tipo === 'curso') {
      setFormGrado(item.nombre_grado || '');
      setFormSeccion(item.seccion || '');
      setFormNivel(item.nivel || 'primaria');
      setFormProfesorEncargado(item.profesor_encargado_id || '');
      supabase
        .from('carga_academica')
        .select('materia_id')
        .eq('curso_id', item.id)
        .then(({ data }) => {
          setFormMateriasCurso(data?.map(c => c.materia_id) || []);
        });
    } else {
      setFormMateria(item.nombre_materia || '');
    }
    setModalAbierto(true);
  };

  const handleGuardar = async () => {
    setProcesando(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (tipoModal === 'usuario') {
        const nombreLimpio = formNombre.trim();
        const apellidoLimpio = formApellido.trim();
        const correoLimpio = formCorreo.trim().toLowerCase();

        if (!nombreLimpio || !apellidoLimpio) {
          alert('Debes ingresar el nombre y apellido del usuario.');
          setProcesando(false);
          return;
        }

        if (!correoLimpio || !emailRegex.test(correoLimpio)) {
          alert('Por favor ingresa un formato de correo electrónico válido (ejemplo: usuario@colegio.com).');
          setProcesando(false);
          return;
        }

        if ((formRol === 'coordinador' || formRol === 'profesor') && !formNivelAsignado) {
          alert('Debes seleccionar un nivel de docencia (Primaria o Secundaria) para este usuario.');
          setProcesando(false);
          return;
        }

        const { data: usuarioExistente } = await supabase
          .from('usuarios')
          .select('id')
          .eq('correo', correoLimpio)
          .single();

        if (usuarioExistente && (!modoEdicion || usuarioExistente.id !== itemEditando?.id)) {
          alert('Ya existe un usuario registrado con este correo institucional. Usa otro correo.');
          setProcesando(false);
          return;
        }

        const datos = {
          nombre: nombreLimpio,
          apellido: apellidoLimpio,
          correo: correoLimpio,
          rol: formRol,
          nivel_asignado: (formRol === 'coordinador' || formRol === 'profesor') ? formNivelAsignado || null : null
        };
        if (modoEdicion) {
          const { error } = await supabase.from('usuarios').update(datos).eq('id', itemEditando.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('usuarios').insert(datos);
          if (error) throw error;
        }
      } else if (tipoModal === 'curso') {
        const gradoLimpio = formGrado.trim();
        const seccionLimpia = formSeccion.trim().toUpperCase();

        if (!gradoLimpio || !seccionLimpia) {
          alert('Debes indicar el nombre del grado/año y la letra de la sección.');
          setProcesando(false);
          return;
        }

        if (!formProfesorEncargado) {
          alert('Debes seleccionar un Docente Titular (primaria) o Profesor Guía (secundaria) para guardar el salón.');
          setProcesando(false);
          return;
        }

        const { data: cursoDuplicado } = await supabase
          .from('cursos')
          .select('id')
          .eq('nombre_grado', gradoLimpio)
          .eq('seccion', seccionLimpia)
          .eq('nivel', formNivel)
          .single();

        if (cursoDuplicado && (!modoEdicion || cursoDuplicado.id !== itemEditando?.id)) {
          alert(`Ya existe un salón registrado como ${gradoLimpio} "${seccionLimpia}" en Educación ${formNivel}.`);
          setProcesando(false);
          return;
        }

        if (modoEdicion && itemEditando?.profesor_encargado_id && itemEditando.profesor_encargado_id !== formProfesorEncargado) {
          const anterior = usuarios.find(u => u.id === itemEditando.profesor_encargado_id);
          const nuevo = usuarios.find(u => u.id === formProfesorEncargado);
          const ok = confirm(`Vas a reasignar el salón de ${anterior?.nombre || '—'} ${anterior?.apellido || ''} a ${nuevo?.nombre || ''} ${nuevo?.apellido || ''}. ¿Continuar?`);
          if (!ok) { setProcesando(false); return; }
        }

        const datos = { 
          nombre_grado: gradoLimpio, 
          seccion: seccionLimpia, 
          nivel: formNivel,
          profesor_encargado_id: formProfesorEncargado
        };
        let cursoIdDestino = itemEditando?.id;
        if (modoEdicion) {
          const { error } = await supabase.from('cursos').update(datos).eq('id', itemEditando.id);
          if (error) throw error;
        } else {
          const { data: nuevoCurso, error } = await supabase.from('cursos').insert(datos).select().single();
          if (error) throw error;
          cursoIdDestino = nuevoCurso.id;
        }

        if (cursoIdDestino) {
          const { data: cargasActuales, error: errCarga } = await supabase
            .from('carga_academica')
            .select('id, materia_id')
            .eq('curso_id', cursoIdDestino);
          if (errCarga) throw errCarga;

          const idsActuales = (cargasActuales || []).map(c => c.materia_id);
          const materiasAEliminar = (cargasActuales || []).filter(c => !formMateriasCurso.includes(c.materia_id)).map(c => c.id);
          const materiasAAgregar = formMateriasCurso.filter(id => !idsActuales.includes(id));

          if (materiasAEliminar.length > 0) {
            const { error: errDel } = await supabase.from('carga_academica').delete().in('id', materiasAEliminar);
            if (errDel) throw errDel;
          }

          if (materiasAAgregar.length > 0) {
            const nuevasCargas = materiasAAgregar.map(mId => ({
              curso_id: cursoIdDestino,
              materia_id: mId,
              profesor_id: formProfesorEncargado,
            }));
            const { error: errIns } = await supabase.from('carga_academica').insert(nuevasCargas);
            if (errIns) throw errIns;
          }

          const { error: errUpd } = await supabase
            .from('carga_academica')
            .update({ profesor_id: formProfesorEncargado })
            .eq('curso_id', cursoIdDestino);
          if (errUpd) throw errUpd;
        }
      } else {
        const materiaLimpia = formMateria.trim();
        if (!materiaLimpia) {
          alert('Debes indicar el nombre de la materia o asignatura.');
          setProcesando(false);
          return;
        }

        const { data: materiaExistente } = await supabase
          .from('materias')
          .select('id')
          .ilike('nombre_materia', materiaLimpia)
          .single();

        if (materiaExistente && (!modoEdicion || materiaExistente.id !== itemEditando?.id)) {
          alert('Ya existe una materia registrada con este nombre.');
          setProcesando(false);
          return;
        }

        const datos = { nombre_materia: materiaLimpia };
        if (modoEdicion) {
          const { error } = await supabase.from('materias').update(datos).eq('id', itemEditando.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('materias').insert(datos);
          if (error) throw error;
        }
      }
      setAlertaExito(modoEdicion ? 'Registro actualizado exitosamente.' : 'Registro creado exitosamente.');
      setModalAbierto(false);
      await cargarDatosAdmin();
      setTimeout(() => setAlertaExito(null), 3000);
    } catch (err: any) {
      console.error("Error:", err);
      alert(err.message || 'Hubo un error al guardar.');
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminar = async (tipo: 'usuario' | 'curso' | 'materia', id: any) => {
    const confirmacion = confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.');
    if (!confirmacion) return;

    try {
      if (tipo === 'usuario') {
        const { error } = await supabase.from('usuarios').delete().eq('id', id);
        if (error) throw error;
      } else if (tipo === 'curso') {
        const { error } = await supabase.from('cursos').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materias').delete().eq('id', id);
        if (error) throw error;
      }
      setAlertaExito('Registro eliminado exitosamente.');
      await cargarDatosAdmin();
      setTimeout(() => setAlertaExito(null), 3000);
    } catch (err: any) {
      console.error("Error:", err);
      alert(err.message || 'No se pudo eliminar. Puede tener registros asociados.');
    }
  };

  const handleGuardarAnioEscolar = async () => {
    const valor = formAnioEscolar.trim();
    if (!valor) {
      alert('El año escolar no puede estar vacío.');
      return;
    }
    try {
      const { error } = await supabase
        .from('configuracion_sistema')
        .update({ valor, updated_at: new Date().toISOString() })
        .eq('clave', 'anio_escolar');
      if (error) {
        const { error: insertErr } = await supabase
          .from('configuracion_sistema')
          .insert({ clave: 'anio_escolar', valor, descripcion: 'Año escolar vigente' });
        if (insertErr) throw insertErr;
      }
      setAnioEscolar(valor);
      setAlertaExito('Año escolar actualizado exitosamente.');
      setTimeout(() => setAlertaExito(null), 3000);
    } catch (err) {
      console.error("Error al guardar año escolar:", err);
      alert('Error al guardar el año escolar.');
    }
  };

  const handleToggleSistema = async () => {
    const nuevoEstado = !sistemaBloqueado;
    const accion = nuevoEstado ? 'bloquear' : 'desbloquear';
    const confirmacion = confirm(`¿Está seguro de ${accion} el sistema? ${nuevoEstado ? 'Nadie podrá editar calificaciones ni reportes.' : 'Se permitirán las ediciones nuevamente.'}`);
    if (!confirmacion) return;

    try {
      const { error } = await supabase
        .from('configuracion_sistema')
        .update({ valor: String(nuevoEstado), updated_at: new Date().toISOString() })
        .eq('clave', 'sistema_bloqueado');
      if (error) throw error;
      setSistemaBloqueado(nuevoEstado);
      setAlertaExito(nuevoEstado ? 'Sistema bloqueado exitosamente.' : 'Sistema desbloqueado exitosamente.');
      setTimeout(() => setAlertaExito(null), 3000);
    } catch (err) {
      console.error("Error:", err);
      alert('Error al cambiar estado del sistema.');
    }
  };

  const handleTogglePeriodo = async (periodo: string) => {
    const estaCerrado = periodosCerrados.includes(periodo);
    const accion = estaCerrado ? 'habilitar' : 'cerrar';
    const confirmacion = confirm(`¿Está seguro de ${accion} el lapso "${periodo}"?`);
    if (!confirmacion) return;

    try {
      if (estaCerrado) {
        const { error } = await supabase
          .from('periodos_cerrados')
          .delete()
          .eq('periodo', periodo)
          .eq('anio_escolar', anioEscolar);
        if (error) throw error;
        setPeriodosCerrados(prev => prev.filter(p => p !== periodo));
      } else {
        const { error } = await supabase
          .from('periodos_cerrados')
          .insert({ periodo, anio_escolar: anioEscolar });
        if (error) throw error;
        setPeriodosCerrados(prev => [...prev, periodo]);
      }
      setAlertaExito(`Lapso "${periodo}" ${accion === 'habilitar' ? 'habilitado' : 'cerrado'} exitosamente.`);
      setTimeout(() => setAlertaExito(null), 3000);
    } catch (err) {
      console.error("Error al cambiar estado del lapso:", err);
      alert('Error al cambiar estado del lapso.');
    }
  };

  // Filtrado de usuarios en catálogo
  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroRolUsuario !== 'todos' && u.rol !== filtroRolUsuario) return false;
    if (busquedaUsuario.trim()) {
      const q = busquedaUsuario.toLowerCase();
      const match = `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Filtrado de cursos en catálogo
  const cursosFiltrados = cursos.filter(c => {
    if (filtroNivelCurso !== 'todos' && c.nivel !== filtroNivelCurso) return false;
    if (busquedaCurso.trim()) {
      const q = busquedaCurso.toLowerCase();
      const match = `${c.nombre_grado} ${c.seccion}`.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Filtrado de materias en catálogo
  const materiasFiltradas = materias.filter(m => {
    if (busquedaMateria.trim()) {
      return m.nombre_materia.toLowerCase().includes(busquedaMateria.toLowerCase());
    }
    return true;
  });

  // Filtrado de alumnos para Desbloqueo de Expedientes
  const alumnosDesbloqueoFiltrados = alumnosConReportesDesbloqueo.filter(al => {
    if (filtroCursoDesbloqueo !== 'todos' && String(al.curso_id) !== filtroCursoDesbloqueo) {
      return false;
    }
    if (busquedaDesbloqueo.trim()) {
      const q = busquedaDesbloqueo.toLowerCase();
      const matchNombre = `${al.nombre} ${al.apellido}`.toLowerCase().includes(q);
      const matchCedula = al.cedula_escolar?.toLowerCase().includes(q);
      if (!matchNombre && !matchCedula) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      
      {/* Contenedor offscreen para renderizado y conversión de PDFs de forma limpia */}
      <div 
        ref={offscreenContainerRef} 
        style={{ position: 'fixed', left: '-9999px', top: 0, width: '800px', backgroundColor: '#ffffff', zIndex: -100 }} 
      />

      {/* Barra de Navegación Institucional */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <img 
              src="/logo.jpg" 
              alt="Logo Colegio San Francisco" 
              className="w-13 h-13 sm:w-14 sm:h-14 object-cover rounded-full shadow-md border-2 border-slate-700 bg-white flex-shrink-0" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white uppercase">U.E. COLEGIO SAN FRANCISCO</span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-extrabold bg-purple-500/20 text-purple-300 rounded-full border border-purple-400/30">
                  CONTROL DE ESTUDIOS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Gestión Académica Central y Secretaría</p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Administrador de Sistemas</span>
              <span className="text-[11px] text-purple-300 font-semibold">U.E. Colegio San Francisco</span>
            </div>
            <button 
              onClick={() => { localStorage.removeItem('usuarioActual'); document.cookie = 'portalActivo=; path=/; max-age=0'; router.push('/login'); }}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors font-semibold"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {alertaExito && (
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-bold">{alertaExito}</p>
            </div>
            <button onClick={() => setAlertaExito(null)} className="text-emerald-600 font-bold hover:text-emerald-800">✕</button>
          </div>
        )}

        {/* Encabezado Principal / Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-lg border border-slate-800">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold text-purple-300">
                <IconSettings className="w-3.5 h-3.5 text-purple-300" />
                <span>Centro de Operaciones Académicas</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Control de Estudios y Sistemas
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Administración de la estructura escolar, despacho masivo de boletines certificados por Dirección y gestión de llaves de desbloqueo administrativo para el cuerpo docente.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[280px]">
              <div className="p-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Usuarios</span>
                <span className="text-2xl font-black text-white">{usuarios.length}</span>
              </div>
              <div className="p-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Salones</span>
                <span className="text-2xl font-black text-white">{cursos.length}</span>
              </div>
              <div className="p-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Materias</span>
                <span className="text-2xl font-black text-slate-200">{materias.length}</span>
              </div>
              <div className="p-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Matrícula</span>
                <span className="text-2xl font-black text-emerald-300">{totalAlumnos}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Panel de Control Operativo del Sistema (3 Tarjetas) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Tarjeta 1: Estado del Sistema */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Estado del Sistema</span>
                <span className={`w-3 h-3 rounded-full ${sistemaBloqueado ? 'bg-rose-500 ring-4 ring-rose-100' : 'bg-emerald-500 ring-4 ring-emerald-100'}`} />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {sistemaBloqueado ? 'Bloqueo General Activo' : 'Sistema en Operación Normal'}
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {sistemaBloqueado 
                  ? 'Las ediciones de notas y redacción de informes están temporalmente inhabilitadas para todo el personal.' 
                  : 'Docentes y coordinadores pueden registrar notas y emitir informes pedagógicos.'}
              </p>
            </div>
            <button
              onClick={handleToggleSistema}
              className={`w-full py-2 px-4 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 ${
                sistemaBloqueado 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' 
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
              }`}
            >
              {sistemaBloqueado ? <IconUnlock className="w-4 h-4" /> : <IconLock className="w-4 h-4" />}
              <span>{sistemaBloqueado ? 'Desbloquear Todo el Sistema' : 'Bloquear Todo el Sistema'}</span>
            </button>
          </div>

          {/* Tarjeta 2: Año Escolar Vigente */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Período Lectivo</span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {anioEscolar}
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Año Escolar Oficial</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Etiqueta oficial que se imprimirá en los membretes y certificados de los boletines informativos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formAnioEscolar}
                onChange={(e) => setFormAnioEscolar(e.target.value)}
                placeholder="2026-2027"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleGuardarAnioEscolar}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex-shrink-0"
              >
                Guardar
              </button>
            </div>
          </div>

          {/* Tarjeta 3: Lapsos / Momentos */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Lapsos Pedagógicos</span>
              <h3 className="font-extrabold text-sm text-slate-900">Habilitación por Lapso</h3>
            </div>
            <div className="space-y-2">
              {PERIODOS.map((periodo) => {
                const cerrado = periodosCerrados.includes(periodo);
                return (
                  <div key={periodo} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cerrado ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      <span className="text-xs font-bold text-slate-800">{periodo}</span>
                    </div>
                    <button
                      onClick={() => handleTogglePeriodo(periodo)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                        cerrado 
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      {cerrado ? 'Habilitar' : 'Cerrar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </section>

        {/* Pestañas de Gestión Integral */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Barra de Pestañas */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPestanaActiva('usuarios')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  pestanaActiva === 'usuarios' 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <IconUsers className="w-3.5 h-3.5" />
                <span>Usuarios ({usuarios.length})</span>
              </button>
              
              <button
                onClick={() => setPestanaActiva('cursos')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  pestanaActiva === 'cursos' 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <IconBuilding className="w-3.5 h-3.5" />
                <span>Salones ({cursos.length})</span>
              </button>

              <button
                onClick={() => setPestanaActiva('materias')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  pestanaActiva === 'materias' 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <IconBook className="w-3.5 h-3.5" />
                <span>Materias ({materias.length})</span>
              </button>

              <button
                onClick={() => setPestanaActiva('despacho')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  pestanaActiva === 'despacho' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                    : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <IconSend className="w-3.5 h-3.5" />
                <span>Despacho Masivo de Boletines</span>
              </button>

              <button
                onClick={() => setPestanaActiva('desbloqueo')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  pestanaActiva === 'desbloqueo' 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20' 
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <IconUnlock className="w-3.5 h-3.5" />
                <span>Llave de Desbloqueo</span>
              </button>
            </div>

            {['usuarios', 'cursos', 'materias'].includes(pestanaActiva) && (
              <button
                onClick={() => abrirModalCrear(pestanaActiva === 'usuarios' ? 'usuario' : pestanaActiva === 'cursos' ? 'curso' : 'materia')}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm ml-auto lg:ml-0"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Crear Nuevo</span>
              </button>
            )}
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-56">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-purple-600 border-t-transparent" />
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando registros académicos...</p>
            </div>
          ) : (
            <div>

              {/* PESTAÑA: USUARIOS */}
              {pestanaActiva === 'usuarios' && (
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Barra de Filtros */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="w-full sm:w-80 relative">
                      <input
                        type="text"
                        placeholder="Buscar por nombre, apellido o correo..."
                        value={busquedaUsuario}
                        onChange={(e) => setBusquedaUsuario(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Filtrar Rol:</span>
                      <select
                        value={filtroRolUsuario}
                        onChange={(e) => setFiltroRolUsuario(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="todos">Todos los Roles</option>
                        <option value="profesor">Profesores</option>
                        <option value="coordinador">Coordinadores</option>
                        <option value="director">Directores</option>
                        <option value="admin">Administradores</option>
                      </select>
                    </div>
                  </div>

                  {/* Lista de Usuarios */}
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {usuariosFiltrados.map((usr) => (
                      <div key={usr.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shadow-inner">
                            {usr.nombre?.charAt(0)}{usr.apellido?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">{usr.nombre} {usr.apellido}</p>
                            <p className="text-xs text-slate-500 font-mono">{usr.correo}</p>
                            {usr.nivel_asignado && (
                              <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 mt-1 inline-block">
                                Nivel Asignado: {usr.nivel_asignado}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${getRolBadge(usr.rol)}`}>
                            {usr.rol}
                          </span>
                          <button onClick={() => abrirModalEditar('usuario', usr)} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors">Editar</button>
                          <button onClick={() => handleEliminar('usuario', usr.id)} className="text-xs font-bold text-rose-600 hover:text-rose-800 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors">Eliminar</button>
                        </div>
                      </div>
                    ))}

                    {usuariosFiltrados.length === 0 && (
                      <div className="p-8 text-center text-xs text-slate-400 italic">
                        No se encontraron usuarios con los criterios de búsqueda.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA: CURSOS */}
              {pestanaActiva === 'cursos' && (
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Barra de Filtros */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="w-full sm:w-80 relative">
                      <input
                        type="text"
                        placeholder="Buscar por grado o sección..."
                        value={busquedaCurso}
                        onChange={(e) => setBusquedaCurso(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Nivel Educativo:</span>
                      <select
                        value={filtroNivelCurso}
                        onChange={(e) => setFiltroNivelCurso(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="todos">Todos los Niveles</option>
                        <option value="primaria">Primaria</option>
                        <option value="secundaria">Secundaria</option>
                      </select>
                    </div>
                  </div>

                  {/* Lista de Cursos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cursosFiltrados.map((c) => {
                      const profeEncargado = usuarios.find(u => u.id === c.profesor_encargado_id);
                      const isPrimaria = c.nivel?.toLowerCase() === 'primaria';
                      const rolLabel = isPrimaria ? 'Docente de Aula Titular' : 'Profesor Guía de Sección';
                      return (
                        <div key={c.id} className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs border ${
                                isPrimaria ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}>
                                <IconBook className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-extrabold text-base text-slate-900">{c.nombre_grado} Sección "{c.seccion}"</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                                  isPrimaria ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-blue-50 text-blue-900 border-blue-200'
                                }`}>
                                  Educación {c.nivel}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => abrirModalEditar('curso', c)} className="text-xs font-bold text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                                <IconEdit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEliminar('curso', c.id)} className="text-xs font-bold text-rose-600 hover:text-rose-800 p-2 rounded-lg hover:bg-rose-50 transition-colors">
                                <IconTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">{rolLabel}:</span>
                            {profeEncargado ? (
                              <p className="font-bold text-slate-900 mt-0.5">
                                Prof. {profeEncargado.nombre} {profeEncargado.apellido} <span className="text-slate-400 font-normal">({profeEncargado.correo})</span>
                              </p>
                            ) : (
                              <span className="text-amber-800 font-bold text-[11px]">
                                Sin docente asignado
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {cursosFiltrados.length === 0 && (
                      <div className="col-span-2 p-8 text-center text-xs text-slate-400 italic">
                        No se encontraron salones con los criterios indicados.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA: MATERIAS */}
              {pestanaActiva === 'materias' && (
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Barra de Filtro */}
                  <div className="flex gap-3 items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="w-full sm:w-80 relative">
                      <input
                        type="text"
                        placeholder="Buscar materia o asignatura..."
                        value={busquedaMateria}
                        onChange={(e) => setBusquedaMateria(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  {/* Catálogo de Materias */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {materiasFiltradas.map((m) => (
                      <div key={m.id} className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                            <IconBook className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-slate-900">{m.nombre_materia}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => abrirModalEditar('materia', m)} className="text-xs font-bold text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                            <IconEdit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEliminar('materia', m.id)} className="text-xs font-bold text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {materiasFiltradas.length === 0 && (
                      <div className="col-span-3 p-8 text-center text-xs text-slate-400 italic">
                        No se encontraron materias registradas.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA: DESPACHO MASIVO */}
              {pestanaActiva === 'despacho' && (
                <div className="p-4 sm:p-6 space-y-6">
                  
                  {/* Selector de Lapso y Status de Autorización de Dirección */}
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                        Lapso / Período Pedagógico:
                      </span>
                      <select
                        value={periodoDespacho}
                        onChange={(e) => setPeriodoDespacho(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      >
                        {PERIODOS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                        firmaDirectorDespacho 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}>
                        <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${firmaDirectorDespacho ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-500 ring-4 ring-amber-100'}`} />
                        <div>
                          <p className="text-xs font-extrabold">
                            {firmaDirectorDespacho ? 'Firma de Dirección AUTORIZADA' : 'Firma de Dirección Pendiente'}
                          </p>
                          <p className="text-[11px] text-slate-600 font-medium">
                            {firmaDirectorDespacho 
                              ? `Sello y firma digital habilitados para el ${periodoDespacho}.` 
                              : `El Director General no ha autorizado el interruptor maestro del ${periodoDespacho}.`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleEjecutarDespacho()}
                        disabled={despachando || !firmaDirectorDespacho}
                        className={`font-bold text-xs px-5 py-3.5 rounded-2xl transition-all shadow-md flex items-center gap-2 ${
                          firmaDirectorDespacho && !despachando
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <IconSend className="w-4 h-4" />
                        <span>Despachar Todo el Colegio</span>
                      </button>
                    </div>
                  </div>

                  {/* Barra de Progreso animada si está despachando */}
                  {despachando && progresoDespacho && (
                    <div className="bg-blue-50 border-2 border-blue-300 p-5 rounded-3xl shadow-md space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                          {progresoDespacho.mensaje}
                        </span>
                        <span>{progresoDespacho.actual} de {progresoDespacho.total}</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3.5 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${(progresoDespacho.actual / progresoDespacho.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-blue-800 font-medium">Por favor, no cierres esta ventana mientras se compilan los PDFs oficiales y se transmiten a través del servidor de correos.</p>
                    </div>
                  )}

                  {/* Resumen de Salones para Despacho */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Estado de Aprobación y Despacho por Salón ({periodoDespacho})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cursos.map(c => {
                        const alumnosCurso = alumnosDespacho.filter(al => al.curso_id === c.id);
                        const totalSalon = alumnosCurso.length;
                        const aprobadosListos = alumnosCurso.filter(al => {
                          const rep = reportesDespacho.find(r => r.alumno_id === al.id);
                          return rep && rep.estado === 'aprobado_coordinador';
                        }).length;
                        const yaEnviados = alumnosCurso.filter(al => {
                          const rep = reportesDespacho.find(r => r.alumno_id === al.id);
                          return rep && rep.estado === 'enviado';
                        }).length;

                        return (
                          <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-base text-slate-900">{c.nombre_grado} "{c.seccion}"</span>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${
                                  c.nivel === 'primaria' ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-blue-50 text-blue-900 border-blue-200'
                                }`}>
                                  {c.nivel}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 font-medium">
                                Matrícula Total: <strong className="text-slate-800">{totalSalon} estudiantes</strong>
                              </p>

                              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Listos Envío</span>
                                  <span className="text-xl font-black text-emerald-950">{aprobadosListos}</span>
                                </div>
                                <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100">
                                  <span className="text-[10px] uppercase font-bold text-purple-800 block">Enviados</span>
                                  <span className="text-xl font-black text-purple-950">{yaEnviados}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleEjecutarDespacho(c.id)}
                              disabled={despachando || !firmaDirectorDespacho || aprobadosListos === 0}
                              className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                                firmaDirectorDespacho && aprobadosListos > 0 && !despachando
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                              }`}
                            >
                              <IconSend className="w-3.5 h-3.5" />
                              <span>{aprobadosListos > 0 ? `Despachar Salón (${aprobadosListos})` : 'Sin boletines listos'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA: DESBLOQUEO DE EXPEDIENTES (LLAVE DE EMERGENCIA) */}
              {pestanaActiva === 'desbloqueo' && (
                <div className="p-4 sm:p-6 space-y-6">
                  
                  {/* Encabezado explicativo de la Llave de Desbloqueo */}
                  <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center flex-shrink-0 shadow-inner">
                      <IconUnlock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-amber-950">
                        Llave de Desbloqueo y Prórroga de Emergencia (Control de Estudios)
                      </h3>
                      <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                        Esta herramienta permite a Control de Estudios revertir el estado de cualquier expediente que haya sido enviado a coordinación, aprobado o despachado, devolviéndolo al docente en modo editable para que pueda realizar correcciones extemporáneas de calificaciones o informes.
                      </p>
                    </div>
                  </div>

                  {/* Filtros de Búsqueda */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Momento / Lapso:</span>
                        <select
                          value={periodoDesbloqueo}
                          onChange={(e) => setPeriodoDesbloqueo(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {PERIODOS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Filtrar Salón:</span>
                        <select
                          value={filtroCursoDesbloqueo}
                          onChange={(e) => setFiltroCursoDesbloqueo(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="todos">Todos los Salones</option>
                          {cursos.map(c => (
                            <option key={c.id} value={String(c.id)}>{c.nombre_grado} "{c.seccion}" ({c.nivel})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="w-full md:w-80 relative">
                      <input
                        type="text"
                        placeholder="Buscar por estudiante o cédula..."
                        value={busquedaDesbloqueo}
                        onChange={(e) => setBusquedaDesbloqueo(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  {/* Tabla de Alumnos para Desbloquear */}
                  <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Estudiante ({alumnosDesbloqueoFiltrados.length} encontrados)</span>
                      <span>Acción de Desbloqueo</span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                      {alumnosDesbloqueoFiltrados.map(al => {
                        const estadoInfo = getEstadoReporteBadge(al.reporte?.estado || 'borrador');
                        const puedeDesbloquear = ['en_revision_coordinador', 'aprobado_coordinador', 'enviado'].includes(al.reporte?.estado || '');

                        return (
                          <div key={al.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                            <div className="flex items-center gap-3.5">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shadow-inner">
                                {al.nombre.charAt(0)}{al.apellido.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-xs sm:text-sm text-slate-900">
                                  {al.nombre} {al.apellido}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-slate-500 font-semibold">
                                    {al.cursos?.nombre_grado} "{al.cursos?.seccion}"
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${estadoInfo.clase}`}>
                                    {estadoInfo.texto}
                                  </span>
                                </div>
                                {al.reporte?.notas_coordinacion && (
                                  <p className="text-[10px] text-amber-800 font-medium italic mt-1 bg-amber-50/70 p-1.5 rounded-lg border border-amber-100">
                                    Observación: "{al.reporte.notas_coordinacion}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {puedeDesbloquear ? (
                                <button
                                  onClick={() => abrirModalDesbloqueo(al)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                                >
                                  <IconUnlock className="w-3.5 h-3.5" />
                                  <span>Desbloquear para Docente</span>
                                </button>
                              ) : al.reporte?.estado === 'devuelto_profesor' ? (
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl">
                                  Ya está Desbloqueado
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3.5 py-1.5 rounded-xl">
                                  Editable por Docente
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {alumnosDesbloqueoFiltrados.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs italic">
                          No se encontraron estudiantes con los filtros indicados.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </section>
      </main>

      {/* Modal Desbloqueo de Expediente */}
      {modalDesbloqueoAbierto && alumnoADesbloquear && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-amber-600 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <IconUnlock className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold">Autorizar Desbloqueo de Expediente</h3>
              </div>
              <button onClick={() => setModalDesbloqueoAbierto(false)} className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-950">
                <p className="font-bold">Estudiante: {alumnoADesbloquear.nombre} {alumnoADesbloquear.apellido}</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Salón: {alumnoADesbloquear.cursos?.nombre_grado} "{alumnoADesbloquear.cursos?.seccion}" | Lapso: {periodoDesbloqueo}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Motivo / Observación de Control de Estudios para el Docente:
                </label>
                <textarea
                  value={motivoDesbloqueo}
                  onChange={(e) => setMotivoDesbloqueo(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
                  placeholder="Ej: Corrección de nota autorizada por Control de Estudios..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setModalDesbloqueoAbierto(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEjecutarDesbloqueo}
                  disabled={procesandoDesbloqueo}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {procesandoDesbloqueo ? 'Desbloqueando...' : 'Confirmar Desbloqueo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Usuarios / Cursos / Materias */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">
                {modoEdicion ? 'Editar' : 'Crear'} {tipoModal === 'usuario' ? 'Usuario' : tipoModal === 'curso' ? 'Curso' : 'Materia'}
              </h3>
              <button onClick={() => setModalAbierto(false)} className="w-8 h-8 rounded-full bg-white/10 text-slate-300 hover:text-white flex items-center justify-center">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {tipoModal === 'usuario' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nombre</label>
                    <input type="text" value={formNombre} onChange={(e) => setFormNombre(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Apellido</label>
                    <input type="text" value={formApellido} onChange={(e) => setFormApellido(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Apellido" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                    <input type="email" value={formCorreo} onChange={(e) => setFormCorreo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="correo@ejemplo.com" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Rol Institucional</label>
                    <select value={formRol} onChange={(e) => setFormRol(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="profesor">Profesor</option>
                      <option value="coordinador">Coordinador</option>
                      <option value="director">Director</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  {(formRol === 'coordinador' || formRol === 'profesor') && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {formRol === 'profesor' ? 'Nivel de docencia:' : 'Nivel Asignado:'}
                      </label>
                      <select value={formNivelAsignado} onChange={(e) => setFormNivelAsignado(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Sin asignar</option>
                        <option value="primaria">Primaria</option>
                        <option value="secundaria">Secundaria</option>
                      </select>
                    </div>
                  )}
                </>
              )}
              {tipoModal === 'curso' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Grado / Año</label>
                    <input type="text" value={formGrado} onChange={(e) => setFormGrado(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="6to Grado" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Sección</label>
                    <input type="text" value={formSeccion} onChange={(e) => setFormSeccion(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="A" maxLength={5} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nivel Educativo</label>
                    <select value={formNivel} onChange={(e) => setFormNivel(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="primaria">Primaria</option>
                      <option value="secundaria">Secundaria</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {formNivel === 'primaria' ? 'Docente de Aula Titular (Primaria):' : 'Profesor Guía de Sección (Secundaria):'}
                    </label>
                    <select 
                      value={formProfesorEncargado} 
                      onChange={(e) => setFormProfesorEncargado(e.target.value)} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar docente (obligatorio)</option>
                      {usuarios
                        .filter(u => u.rol === 'profesor' && u.nivel_asignado === formNivel)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            Prof. {p.nombre} {p.apellido} ({p.correo})
                          </option>
                        ))}
                      {formProfesorEncargado && !usuarios.some(u => u.id === formProfesorEncargado && u.nivel_asignado === formNivel) && (() => {
                        const actual = usuarios.find(u => u.id === formProfesorEncargado);
                        return actual ? (
                          <option key={actual.id} value={actual.id}>
                            Prof. {actual.nombre} {actual.apellido} ({actual.correo}) — nivel no asignado
                          </option>
                        ) : null;
                      })()}
                    </select>
                    {usuarios.filter(u => u.rol === 'profesor' && u.nivel_asignado === formNivel).length === 0 && (
                      <p className="text-[10px] text-amber-700 font-bold mt-1">
                        No hay profesores con nivel "{formNivel}" asignado. Asigna el nivel de docencia desde la pestaña Usuarios.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Materias del Pensum (Asignaturas de este salón):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                      {materias.map((m) => {
                        const isSelected = formMateriasCurso.includes(m.id);
                        return (
                          <label 
                            key={m.id} 
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormMateriasCurso([...formMateriasCurso, m.id]);
                                } else {
                                  setFormMateriasCurso(formMateriasCurso.filter(id => id !== m.id));
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span>{m.nombre_materia}</span>
                          </label>
                        );
                      })}
                      {materias.length === 0 && (
                        <p className="col-span-2 text-xs text-slate-400 italic">No hay materias creadas en el catálogo aún.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
              {tipoModal === 'materia' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre de la Materia</label>
                  <input type="text" value={formMateria} onChange={(e) => setFormMateria(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Matemáticas" />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalAbierto(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all">Cancelar</button>
                <button
                  onClick={handleGuardar}
                  disabled={procesando}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {procesando ? 'Guardando...' : modoEdicion ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
