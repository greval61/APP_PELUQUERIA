import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './App.css';

const CATEGORIAS = { 'Corte de Pelo': '#1a1a1a', 'Afeitado': '#8b5e3c', 'Afeitado y corte': '#2b3613', 'Arreglo de barba y corte': '#123036', 'Teñir': '#8b5e3c', 'Teñir y corte': '#8b5e3c', 'Lavar y peinar': '#5a6b5a', 'Cortar y peinar': '#2b3613', 'Permanente': '#123036', 'Permanente y corte': '#7dd80d', 'Mechas': '#eae442', 'Mechas Balayage': '#ea4641', 'Tratamiento': '#2af805', 'Cejas': '#d44cbd', 'Cejas y bigote': '#aa128c' };

const generarTramosHorarios = () => {
  const tramos = [];
  for (let h = 9; h <= 20; h++) {
    const hora = h < 10 ? `0${h}` : h;
    tramos.push(`${hora}:00`);
    if (h < 20) tramos.push(`${hora}:30`);
  }
  return tramos;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [events, setEvents] = useState([]);
  const [filtroEmpleado, setFiltroEmpleado] = useState('Todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [verReportes, setVerReportes] = useState(false);
  const [datosEconomicos, setDatosEconomicos] = useState([]);
  const [filtroReporte, setFiltroReporte] = useState('Todas');
  const [filtroPago, setFiltroPago] = useState('Todas');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('mes');
  const [exportPayment, setExportPayment] = useState('Todas');
  const [exportMonth, setExportMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));
  const [exportQuarter, setExportQuarter] = useState('0'); 
  // Estados para selección rápida en la vista de informes
  const [reportMonth, setReportMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [reportQuarter, setReportQuarter] = useState('0');
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [pdfData, setPdfData] = useState(null);
  const [showHiddenReport, setShowHiddenReport] = useState(false);
  const pdfRef = useRef(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalAppointments, setReportModalAppointments] = useState([]);
  const [periodoTop, setPeriodoTop] = useState('mes');
  const [topMonth, setTopMonth] = useState(String(new Date().getMonth() + 1).padStart(2,'0'));
  const [topQuarter, setTopQuarter] = useState('0');
  const [topYear, setTopYear] = useState(String(new Date().getFullYear()));

  // Abre una ventana independiente (popup) con el listado de Top servicios
  const openTopServicesWindow = () => {
    try {
      const w = window.open('', '_blank', 'width=820,height=740,scrollbars=yes');
      if (!w) return toast.error('No se pudo abrir la ventana. Comprueba el bloqueador de popups.');
      // Calcular totales generales y totales que entran en los criterios actuales
      const allMap = events.reduce((acc, e) => {
        const cat = e.category || 'Sin categoría';
        acc[cat] = acc[cat] || { count: 0, total: 0 };
        acc[cat].count += 1;
        acc[cat].total += (parseFloat(e.price) || 0);
        return acc;
      }, {});

      // Filtrar eventos según criterios actuales (empleado, pago y periodo seleccionado)
      const periodo = periodoTop || (verReportes ? 'mes' : null);
      const selM = topMonth || reportMonth;
      const selQ = topQuarter || reportQuarter;
      const selY = topYear || reportYear;

      const filteredEvents = (events || []).filter(ev => {
        // empleado
        if (filtroReporte && filtroReporte !== 'Todas' && String(ev.employeeId) !== String(filtroReporte)) return false;
        // pago
        if (filtroPago && filtroPago !== 'Todas') {
          const lower = String(filtroPago).toLowerCase();
          if (lower === 'contado') { if (!ev.isPaid && String(ev.paymentType || '').toUpperCase() !== 'CONTADO') return false; }
          else if (lower === 'tarjeta') { if (!ev.ptv && String(ev.paymentType || '').toUpperCase() !== 'TARJETA') return false; }
          else if (lower === 'nopagados' || lower === 'no pagados') { if (ev.isPaid || ev.ptv || (ev.paymentType && String(ev.paymentType).trim() !== '')) return false; }
        }
        // periodo (usar reportMonth/reportYear cuando estemos en vista de reportes)
        // periodo: soporta 'mes', 'trimestre', 'anio'
        if (periodo) {
          const st = ev.start || ev.fecha || ev.startStr || ev.date || '';
          const d = (typeof st === 'string' && st.includes('T')) ? st.split('T')[0] : (typeof st === 'string' ? st : '');
          if (!d) return false;
          const mm = d.substring(5,7);
          const yy = d.substring(0,4);
          if (periodo === 'mes') {
            if (mm !== String(selM).padStart(2,'0') || yy !== String(selY)) return false;
          } else if (periodo === 'trimestre') {
            const q = Number(selQ);
            const months = [q*3+1, q*3+2, q*3+3].map(n => String(n).padStart(2,'0'));
            if (yy !== String(selY) || !months.includes(mm)) return false;
          } else if (periodo === 'anio') {
            if (yy !== String(selY)) return false;
          }
        }
        return true;
      });

      const filteredMap = filteredEvents.reduce((acc, e) => {
        const cat = e.category || 'Sin categoría';
        acc[cat] = acc[cat] || { count: 0, total: 0 };
        acc[cat].count += 1;
        acc[cat].total += (parseFloat(e.price) || 0);
        return acc;
      }, {});

      // Merge keys and build rows sorted by filtered count/total
      const keys = Array.from(new Set([...Object.keys(filteredMap), ...Object.keys(allMap)]));
      const rows = keys.map(k => ({
        category: k,
        filteredCount: filteredMap[k] ? filteredMap[k].count : 0,
        filteredTotal: filteredMap[k] ? filteredMap[k].total : 0,
        totalCount: allMap[k] ? allMap[k].count : 0,
        total: allMap[k] ? allMap[k].total : 0
      })).sort((a,b) => (b.filteredCount - a.filteredCount) || (b.filteredTotal - a.filteredTotal));

      // Mostrar solo servicios que tienen contribución en el periodo/criterios (filteredCount > 0)
      const rowsDisplayed = rows.filter(r => r.filteredCount > 0);
      const fallbackRows = rowsDisplayed.length ? rowsDisplayed : rows.slice(0, 10);

      const rowsHtml = fallbackRows.slice(0, 10).map(s => (
        '<tr>' +
          '<td style="padding:10px 6px">' + (new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'})).format(s.filteredTotal) + '</td>' +
          '<td style="padding:10px 6px">' + (s.category || 'Sin categoría') + ' (' + (s.filteredCount || 0) + ')</td>' +
          '<td style="padding:10px 6px;text-align:right">' + (new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'})).format(s.total) + '</td>' +
        '</tr>'
      )).join('');

      const totalShown = fallbackRows.reduce((sum, x) => sum + (x.filteredTotal || 0), 0);
      const totalAllShown = fallbackRows.reduce((sum, x) => sum + (x.total || 0), 0);
      const servicesFound = Object.keys(filteredMap).reduce((sum, k) => sum + (filteredMap[k] ? filteredMap[k].count : 0), 0);
      const servicesShown = fallbackRows.length;

      // HTML con botón para exportar a PDF; inyectamos scripts CDN y la función exportPdf
      const html = '<!doctype html><html><head><meta charset="utf-8"><title>Top servicios</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
        'body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,\'Helvetica Neue\',Arial; background:#f7f7f9; color:#0f172a; margin:0; padding:24px}' +
        '.card{background:linear-gradient(180deg,#ffffff,#fbfbfb);border-radius:12px;padding:22px;box-shadow:0 20px 50px rgba(2,6,23,0.12);max-width:780px;margin:0 auto;border:1px solid rgba(15,23,42,0.04)}' +
        'table{width:100%;border-collapse:collapse;margin-top:10px}' +
        'th{font-size:13px;color:#374151;text-align:left;padding:10px 8px;border-bottom:1px solid #eef2f6;font-weight:700}' +
        'td{font-size:14px;padding:12px 8px;border-bottom:1px solid #fbfbfb}' +
        '.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}' +
        '.title{font-size:20px;font-weight:800;color:#0f172a}' +
        '.muted{color:#6b7280;font-size:13px}' +
        '.summary{margin-top:14px;font-size:13px;color:#0f172a}' +
        '.btn{display:inline-block;padding:8px 14px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700}' +
        '.controls{display:flex;gap:8px;align-items:center}' +
      '</style></head><body><div class="card" id="top-services-root"><div class="header"><div><div class="title">Top servicios</div><div class="muted">Servicios más solicitados por volumen e ingresos</div></div><div class="controls"><a href="#" id="exportPdfBtn" class="btn">Exportar PDF</a></div></div>' +
      '<table><thead><tr><th>Ingresos (filtrado)</th><th>Servicio (veces)</th><th style="text-align:right">Total general</th></tr></thead><tbody>' + (rowsHtml || '<tr><td colspan="3" style="padding:12px;color:#6b7280">No hay datos disponibles</td></tr>') + '</tbody></table>' +
      '<div class="summary">Servicios encontrados: <strong>' + servicesFound + '</strong> — Mostrando: <strong>' + servicesShown + '</strong><br/>Total ingresos (filtrado): <strong>' + (new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'})).format(totalShown) + '</strong> — Total general: <strong>' + (new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'})).format(totalAllShown) + '</strong></div>' +
      '</div>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>' +
      '<script>' +
        'function waitForLibraries(cb){var i=0;function ok(){ i++; if(i===2) cb(); }if(window.html2canvas) ok(); else {var s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"; s.onload=ok; document.head.appendChild(s);} if(window.jspdf) ok(); else {var s2=document.createElement("script"); s2.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; s2.onload=ok; document.head.appendChild(s2);} }' +
        'waitForLibraries(function(){ const exportBtn = document.getElementById("exportPdfBtn"); exportBtn.addEventListener("click", async function(ev){ ev.preventDefault(); var filename = prompt("Nombre de archivo (sin extensión)", "top-servicios"); if(filename === null) return; filename = filename.trim() || "top-servicios"; var orientation = "p"; try{ const controls = document.querySelectorAll(".controls"); const prevDisplay = []; controls.forEach((c, i) => { prevDisplay[i] = c.style.display || ""; c.style.display = "none"; }); const node = document.getElementById("top-services-root"); const canvas = await html2canvas(node, {scale:2, useCORS:true}); const imgData = canvas.toDataURL("image/png"); const { jsPDF } = window.jspdf || window.jspdf || window.jspdf; const pdf = new jsPDF(orientation, "mm", "a4"); const pageWidth = pdf.internal.pageSize.getWidth(); const imgWidth = pageWidth; const imgHeight = (canvas.height * imgWidth) / canvas.width; pdf.addImage(imgData,"PNG",0,0,imgWidth,imgHeight); pdf.save(filename + ".pdf"); controls.forEach((c, i) => { c.style.display = prevDisplay[i] || ""; }); }catch(err){ console.error("Export PDF error", err); alert("Error al generar PDF"); }finally{ exportBtn.style.opacity = "1"; exportBtn.style.pointerEvents = "auto"; } }); });' +
      '</script></body></html>';
      w.document.write(html);
      w.document.close();
    } catch (err) {
      console.error('openTopServicesWindow error', err);
      toast.error('Error al abrir la ventana de Top servicios');
    }
  };

  // ---- Buscador de clientes (nombre / teléfono) con filtro por fechas ----
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchFromRef = useRef(null);
  const searchToRef = useRef(null);

  const performSearch = () => {
    const q = (searchQuery || '').trim().toLowerCase();
    const from = searchFrom ? new Date(searchFrom) : null;
    const to = searchTo ? new Date(searchTo) : null;
    const results = (events || []).filter(ev => {
      const name = (ev.title || '').toString().toLowerCase();
      const phone = (ev.clientPhone || '').toString().toLowerCase();
      if (q && !name.includes(q) && !phone.includes(q)) return false;
      const st = new Date(ev.start || ev.fecha || ev.startStr || ev.date || ev._start || null);
      if (isNaN(st)) return false;
      if (from && st < from) return false;
      if (to) { const endOf = new Date(to); endOf.setHours(23,59,59,999); if (st > endOf) return false; }
      return true;
    }).map(ev => ({ id: ev.id, title: ev.title, clientPhone: ev.clientPhone, start: ev.start || ev.fecha || ev.startStr || ev.date, end: ev.end || ev.endStr || ev._end || null, employeeId: ev.employeeId, category: ev.category, price: ev.price, isPaid: ev.isPaid, ptv: ev.ptv, formula: ev.formula }));
    results.sort((a,b) => new Date(a.start) - new Date(b.start));
    setSearchResults(results);
  };

  const cancelSearch = () => {
    setSearchQuery('');
    setSearchFrom('');
    setSearchTo('');
    setSearchResults([]);
  };

  const openResultAppointment = (res) => {
    try {
      const st = res.start || '';
      const en = res.end || '';
      const fecha = (st && typeof st === 'string' && st.includes('T')) ? st.split('T')[0] : (st && typeof st === 'string' ? st : (en && typeof en === 'string' && en.includes('T') ? en.split('T')[0] : ''));
      const hora = (st && typeof st === 'string' && st.includes('T')) ? st.split('T')[1].substring(0,5) : (st && typeof st === 'string' ? st : '09:00');
      const horaFinFromEnd = (en && typeof en === 'string' && en.includes('T')) ? en.split('T')[1].substring(0,5) : (en && typeof en === 'string' ? en : null);
      const parseBool = (v) => (v === true || v === 'true' || v === 1 || v === '1');
      const loaded = {
        title: res.title || '',
        fecha: fecha,
        horaInicio: hora,
        horaFin: horaFinFromEnd || hora || '09:30',
        employeeId: res.employeeId || '1',
        category: res.category || 'Corte de pelo',
        clientPhone: res.clientPhone || '',
        formula: res.formula || '',
        price: res.price || '',
        isPaid: parseBool(res.isPaid),
        ptv: parseBool(res.ptv)
      };
      setEditandoId(res.id != null ? String(res.id) : null);
      loaded.id = res.id != null ? String(res.id) : res.id;
      setCita(loaded);
      setOriginalCita(loaded);
      setFormError('');
      setModalOpen(true);
    } catch (err) {
      console.error('openResultAppointment error', err);
      toast.error('Error al abrir la cita');
    }
  };

  // Nuevo estado para errores de formulario
  const [formError, setFormError] = useState('');

  // Nuevo helper: parsea mensajes de error desde una Response
  const parseErrorFromResponse = async (resp) => {
    try {
      const ct = resp.headers && resp.headers.get ? resp.headers.get('content-type') || '' : '';
      if (ct.includes('application/json')) {
        const body = await resp.json().catch(() => null);
        if (body) return body.message || body.error || JSON.stringify(body);
      }
      const text = await resp.text().catch(() => null);
      return text || resp.statusText || 'Error desconocido';
    } catch (e) {
      return resp && resp.statusText ? resp.statusText : 'Error desconocido';
    }
  };

  // Restaurar isCitaDirty (usa originalCita para comparar)
  const isCitaDirty = () => {
    const base = originalCita || EMPTY_CITA;
    return Object.keys(EMPTY_CITA).some(k => String(cita[k] || '') !== String(base[k] || ''));
  };

  const [cita, setCita] = useState({ 
    title: '', fecha: '', horaInicio: '09:00', horaFin: '09:30', 
    employeeId: '1', category: 'Corte de pelo', clientPhone: '', formula: '',
    price: '', isPaid: false, ptv: false 
  });
  const [originalCita, setOriginalCita] = useState(null);

  const EMPTY_CITA = { title: '', fecha: '', horaInicio: '09:00', horaFin: '09:30', employeeId: '1', category: 'Corte de Pelo', clientPhone: '', formula: '', price: '', isPaid: false, ptv: false };

  const tramosHorarios = generarTramosHorarios();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Render personalizado de evento: mostrar hora, título y categoría en tres filas
  const renderEventContent = (arg) => {
    const ev = arg.event;
    const ext = ev.extendedProps || {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.05em' }}>
        <div style={{ fontSize: '0.90em', color: '#011a4c' }}>{arg.timeText}</div>
        <div style={{ fontSize: '0.95em', fontWeight: 600, color: 'inherit' }}>{ev.title}</div>
        <div style={{ fontSize: '0.90em', color: '#011a4c', opacity: 0.9 }}>{ext.category || ''}</div>
      </div>
    );
  };

  const cargarCitas = () => {
    fetch(`http://localhost:5000/api/appointments?t=${new Date().getTime()}`)
      .then(res => {
        if (!res.ok) throw new Error('Error en la respuesta del servidor');
        return res.json();
      })
      .then(data => setEvents(data.map(item => ({ 
        ...item, 
        id: item.id.toString(),
        backgroundColor: item.employeeId === '1' ? '#ec7be6' : '#cfb927',
        borderColor: item.employeeId === '1' ? '#ec7be6' : '#cfb927',
        color: item.employeeId === '1' ? '#ec7be6' : '#cfb927',
        textColor: '#000'
      }))))
      .catch(err => {
        console.error('Error al cargar citas:', err);
        toast.error("Error de carga: " + (err.message || err));
      });
  };

  const cargarReportes = useCallback(() => {
    const key = sessionStorage.getItem('reportKey');
    if (!key) return;
    const headers = { 'x-report-key': key };
    const mapPago = filtroPago === 'Todas' ? 'all' : (filtroPago === 'Contado' ? 'CONTADO' : (filtroPago === 'Tarjeta' ? 'TARJETA' : 'NONE'));
    const mapEmpleado = filtroReporte === 'Todas' ? 'all' : filtroReporte;
    const url = `http://localhost:5000/api/reports?payment=${encodeURIComponent(mapPago)}&employee=${encodeURIComponent(mapEmpleado)}`;
    
    fetch(url, { headers })
      .then(async res => {
        if (!res.ok) {
          const errorText = await res.text().catch(() => res.statusText);
          throw new Error(errorText || 'Error al obtener datos económicos');
        }
        return res.json();
      })
      .then(data => setDatosEconomicos(data))
      .catch((err) => {
        console.error('Error en informes:', err);
        toast.error("Error en informes: " + (err.message || err));
      });
  }, [filtroPago, filtroReporte]);

  const handleToggleReports = async () => {
    if (verReportes) { setVerReportes(false); return; }
    const stored = sessionStorage.getItem('reportKey');
    if (stored) { setVerReportes(true); cargarReportes(); return; }
    const key = window.prompt('Introduce la clave para ver el informe económico');
    if (!key) return;
    try {
      const resp = await fetch('http://localhost:5000/api/reports', { headers: { 'x-report-key': key } });
      if (!resp.ok) { toast.error('Clave incorrecta'); return; }
      sessionStorage.setItem('reportKey', key);
      setVerReportes(true);
      cargarReportes();
      toast.success('Acceso concedido');
    } catch (err) { 
      console.error('Error de acceso:', err);
      toast.error('Error de conexión'); 
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      cargarCitas();
      if (sessionStorage.getItem('reportKey')) cargarReportes();
    }
  }, [isLoggedIn, cargarReportes]);

  useEffect(() => {
    if (verReportes) cargarReportes();
  }, [filtroPago, verReportes, cargarReportes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!cita.title?.trim()) { setFormError('Cliente obligatorio'); toast.error('Cliente obligatorio'); return; }
    if (!cita.fecha) { setFormError('Fecha obligatoria'); toast.error('Fecha obligatoria'); return; }

    try {
      if (editandoId) {
        if (!window.confirm('¿Guardar cambios?')) return;
        const delResp = await fetch(`http://localhost:5000/api/appointments/${editandoId}`, { method: 'DELETE' });
        if (!delResp.ok) {
          const msg = await parseErrorFromResponse(delResp);
          setFormError(msg);
          toast.error('Error al eliminar antes de actualizar: ' + msg);
          return;
        }
      } else {
        if (!window.confirm('¿Crear cita?')) return;
      }

      const resp = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...cita, 
            start: `${cita.fecha}T${cita.horaInicio}:00`, 
            end: `${cita.fecha}T${cita.horaFin}:00`, 
            color: cita.employeeId === '1' ? '#f4a6f0' : '#f7e56a'
        })
      });

      if (resp.ok) {
        setFormError('');
        setModalOpen(false); setEditandoId(null); cargarCitas(); cargarReportes(); toast.success('Guardado');
      } else {
        const msg = await parseErrorFromResponse(resp);
        setFormError(msg);
        toast.error('Error al guardar: ' + msg);
      }
    } catch (err) { 
      console.error('Error al guardar:', err);
      const em = err.message || 'Error de conexión';
      setFormError(em);
      toast.error('Error al guardar: ' + em); 
    }
  };

  const handleDelete = async () => {
    if (!editandoId || !window.confirm('¿Eliminar cita?')) return;
    try {
      const resp = await fetch(`http://localhost:5000/api/appointments/${editandoId}`, { method: 'DELETE' });
      if (resp.ok) { setModalOpen(false); setEditandoId(null); setFormError(''); cargarCitas(); cargarReportes(); toast.success('Eliminada'); }
      else {
        const msg = await parseErrorFromResponse(resp);
        setFormError(msg);
        toast.error('Error al eliminar: ' + msg);
      }
    } catch (err) { 
      console.error('Error al eliminar:', err);
      const em = err.message || 'Error de conexión';
      setFormError(em);
      toast.error('Error al eliminar: ' + em); 
    }
  };

  // Limpiar error al cerrar modal
  const handleClose = () => {
    if (isCitaDirty() && !window.confirm('¿Descartar cambios?')) return;
    setModalOpen(false); setEditandoId(null); setOriginalCita(null); setCita(EMPTY_CITA); setFormError('');
  };

  // Asegurar limpiar errores al abrir modal
  const datosFiltrados = (function() {
    if (filtroReporte === 'Todas') {
      const grouped = datosEconomicos.reduce((acc, cur) => {
        const f = cur.fecha || '';
        acc[f] = (acc[f] || 0) + (parseFloat(cur.totalDia) || 0);
        return acc;
      }, {});
      return Object.keys(grouped).map(fecha => ({ fecha, totalDia: grouped[fecha] })).sort((a, b) => b.fecha.localeCompare(a.fecha));
    }
    return datosEconomicos.filter(d => d.employeeId === filtroReporte).sort((a, b) => b.fecha.localeCompare(a.fecha));
  })();

  const totalAnual = datosFiltrados.reduce((acc, curr) => acc + (parseFloat(curr.totalDia) || 0), 0);

  const handleGeneratePdf = async () => {
    try {
      const key = sessionStorage.getItem('reportKey');
      const mapPago = exportPayment === 'Todas' ? 'all' : (exportPayment === 'Contado' ? 'CONTADO' : 'TARJETA');
      const mapEmpleado = filtroReporte === 'Todas' ? 'all' : filtroReporte;
      const url = `http://localhost:5000/api/reports?payment=${encodeURIComponent(mapPago)}&employee=${encodeURIComponent(mapEmpleado)}`;

      const resp = await fetch(url, { headers: { 'x-report-key': key } });
      const data = await resp.json();
      const selYear = Number(exportYear);

      let rows = [];
      let title = '';
      let filters = { pago: exportPayment, empleado: mapEmpleado, year: exportYear };

      if (exportPeriod === 'mes') {
        const selMonth = exportMonth.padStart(2,'0');
        const filtered = data.filter(r => (r.fecha && r.fecha.startsWith(`${selYear}-${selMonth}`)) || (r.mes && String(r.mes).padStart(2,'0') === selMonth));
        const grouped = filtered.reduce((acc, cur) => {
          const d = cur.fecha || `${selYear}-${selMonth}`;
          acc[d] = (acc[d] || 0) + (parseFloat(cur.totalDia) || 0);
          return acc;
        }, {});
        rows = Object.keys(grouped).sort().map(k => ({ label: k, amount: grouped[k] }));
        title = `Informe - ${monthNames[Number(exportMonth)-1]} ${selYear}`;
        filters = { ...filters, periodo: 'Mes', month: exportMonth };
      } 
      else if (exportPeriod === 'trimestre') {
        const q = parseInt(exportQuarter);
        const months = [q*3+1, q*3+2, q*3+3].map(n => String(n).padStart(2,'0'));
        const monthsMap = {};
        months.forEach(mm => { monthsMap[mm] = { items: {}, total: 0 }; });

        data.forEach(r => {
          let rm = r.mes ? String(r.mes).padStart(2,'0') : (r.fecha ? r.fecha.substring(5,7) : '');
          let ry = r.anio ? Number(r.anio) : (r.fecha ? Number(r.fecha.substring(0,4)) : selYear);
          if (ry === selYear && months.includes(rm)) {
            const f = r.fecha || `${selYear}-${rm}`;
            monthsMap[rm].items[f] = (monthsMap[rm].items[f] || 0) + (parseFloat(r.totalDia) || 0);
            monthsMap[rm].total += (parseFloat(r.totalDia) || 0);
          }
        });

        rows = months.map(mm => ({
          monthLabel: monthNames[Number(mm)-1],
          items: Object.keys(monthsMap[mm].items).sort().map(d => ({ label: d, amount: monthsMap[mm].items[d] })),
          total: monthsMap[mm].total
        }));

        const labels = ['Primer', 'Segundo', 'Tercer', 'Cuarto'];
        title = `${labels[q]} Trimestre ${selYear}`;
        filters = { ...filters, periodo: 'Trimestre', trimestreLabel: labels[q], trimestreMonths: `${monthNames[q*3]} - ${monthNames[q*3+2]}` };
      } 
      else {
        // Agrupar por mes (etiqueta en español) y luego generar filas en orden Enero->Diciembre
        const grouped = {};
        data.forEach(r => {
          let rm = r.mes ? String(r.mes).padStart(2,'0') : (r.fecha ? r.fecha.substring(5,7) : '');
          let ry = r.anio ? Number(r.anio) : (r.fecha ? Number(r.fecha.substring(0,4)) : selYear);
          if (ry !== selYear) return;
          const label = monthNames[Number(rm)-1] || rm;
          grouped[label] = (grouped[label] || 0) + (parseFloat(r.totalDia) || 0);
        });
        // Garantizar orden de Enero a Diciembre; incluir meses sin datos con importe 0
        rows = monthNames.map((m) => ({ label: m, amount: grouped[m] ? grouped[m] : 0 }));
        title = `Informe Anual ${selYear}`;
        filters = { ...filters, periodo: 'Año' };
      }

      setPdfData({ title, filters, rows, total: exportPeriod === 'trimestre' ? rows.reduce((s, m) => s + m.total, 0) : rows.reduce((s, r) => s + r.amount, 0) });
      setShowHiddenReport(true);
      
      await new Promise(r => setTimeout(r, 600));

      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const totalPages = Math.max(1, Math.ceil(imgHeight / pageHeight));
      const imgData = canvas.toDataURL('image/png');

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        // posicion vertical para mostrar la porción correspondiente de la imagen
        const y = - (pageHeight * i);
        pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
        // pie de página centrado: "Pag.: X/Y"
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        const footerText = `Pag.: ${i + 1}/${totalPages}`;
        pdf.text(footerText, imgWidth / 2, pageHeight - 10, { align: 'center' });
      }
      pdf.save(`informe-${new Date().toISOString().slice(0,10)}.pdf`);
      setShowHiddenReport(false); 
      setExportModalOpen(false); 
      toast.success('PDF generado con éxito');
    } catch (err) { 
      console.error('Error al generar PDF:', err);
      toast.error('Error al generar PDF'); 
      setShowHiddenReport(false); 
    }
  };

  // Abrir lista de citas para una fecha desde la vista de informes
  const openReportDate = (fecha) => {
    try {
      // Helper: obtener YYYY-MM-DD desde distintos formatos posibles
      const toYMD = (val) => {
        if (!val && val !== 0) return '';
        if (val instanceof Date && !isNaN(val)) return val.toISOString().slice(0,10);
        if (typeof val === 'string') {
          if (val.includes('T')) return val.split('T')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
          // intentar parsear fecha libre
          const parsed = new Date(val);
          if (!isNaN(parsed)) return parsed.toISOString().slice(0,10);
        }
        return '';
      };

      const matches = (events || []).filter(ev => {
        const candidates = [ev.start, ev.fecha, ev.startStr, ev.date, ev._start];
        let matchDate = false;
        for (const c of candidates) {
          const d = toYMD(c);
          if (d && d === fecha) { matchDate = true; break; }
        }
        if (!matchDate) return false;

        // Filtrar por empleado según filtroReporte
        if (filtroReporte && filtroReporte !== 'Todas') {
          if (String(ev.employeeId) !== String(filtroReporte)) return false;
        }

        // Filtrar por pago según filtroPago
        if (filtroPago && filtroPago !== 'Todas') {
          const lower = String(filtroPago).toLowerCase();
          if (lower === 'contado') {
            if (!ev.isPaid && !String(ev.paymentType).toUpperCase() === 'CONTADO') return false;
          } else if (lower === 'tarjeta') {
            if (!ev.ptv && !String(ev.paymentType).toUpperCase() === 'TARJETA') return false;
          } else if (lower === 'nopagados' || lower === 'no pagados' || lower === 'noPagados') {
            // considerar pagos nulos o vacíos
            if (ev.isPaid || ev.ptv || (ev.paymentType && String(ev.paymentType).trim() !== '')) return false;
          }
        }

        return true;
      }).map(ev => ({ ...ev, id: ev.id != null ? String(ev.id) : ev.id }));

      setReportModalAppointments(matches);
      setReportModalOpen(true);
    } catch (err) {
      console.error('openReportDate error', err);
      toast.error('Error al abrir lista de citas');
    }
  };

  // Formateador de euros local (ES)
  const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

  const getRowMonth = (r) => r.mes ? String(r.mes).padStart(2, '0') : (r.fecha ? r.fecha.substring(5,7) : '');

  // Total para mes seleccionado en la vista de informes (usa datos ya filtrados por filtroPago/filtroReporte)
  const totalMesSeleccionado = datosEconomicos
    .filter(r => {
      const rm = getRowMonth(r);
      const ry = r.anio ? Number(r.anio) : (r.fecha ? Number(r.fecha.substring(0,4)) : Number(reportYear));
      return rm === reportMonth && ry === Number(reportYear);
    })
    .reduce((s, r) => s + (parseFloat(r.totalDia || r.total || r.price) || 0), 0);

  // Total para trimestre seleccionado (trimestre 0..3)
  const totalTrimestreSeleccionado = (() => {
    const q = Number(reportQuarter);
    const months = [q*3+1, q*3+2, q*3+3].map(n => String(n).padStart(2,'0'));
    return datosEconomicos
      .filter(r => {
        const rm = getRowMonth(r);
        const ry = r.anio ? Number(r.anio) : (r.fecha ? Number(r.fecha.substring(0,4)) : Number(reportYear));
        return ry === Number(reportYear) && months.includes(rm);
      })
      .reduce((s, r) => s + (parseFloat(r.totalDia || r.total || r.price) || 0), 0);
  })();

  // --- Métricas solicitadas ---
  const today = new Date();
  const isSameDay = (d, day) => {
    const dt = new Date(d);
    return dt.getFullYear() === day.getFullYear() && dt.getMonth() === day.getMonth() && dt.getDate() === day.getDate();
  };

  const pendientesPorCobrar = events.reduce((s, e) => s + ((!e.isPaid && !e.ptv) ? (parseFloat(e.price) || 0) : 0), 0);

  const ingresosHoy = events.reduce((s, e) => {
    const st = new Date(e.start || e.fecha || e.startStr || e.date);
    if (isSameDay(st, today) && (e.isPaid || e.ptv)) return s + (parseFloat(e.price) || 0);
    return s;
  }, 0);

  const citasHoy = events.filter(e => {
    const st = new Date(e.start || e.fecha || e.startStr || e.date);
    return isSameDay(st, today);
  }).length;

  const proximaCitaObj = events
    .map(e => ({ ...e, _start: new Date(e.start || e.fecha || e.startStr || e.date) }))
    .filter(e => e._start > new Date())
    .sort((a, b) => a._start - b._start)[0];

  const proximaCita = proximaCitaObj ? `${proximaCitaObj.title} — ${proximaCitaObj._start.toLocaleString()}` : '—';

  const serviciosMap = events.reduce((acc, e) => {
    const cat = e.category || 'Sin categoría';
    acc[cat] = acc[cat] || { count: 0, total: 0 };
    acc[cat].count += 1;
    acc[cat].total += (parseFloat(e.price) || 0);
    return acc;
  }, {});

  // Top servicios (puede usarse en la UI si se desea)
  const topServiciosByCount = Object.entries(serviciosMap)
    .map(([category, v]) => ({ category, count: v.count, total: v.total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  void topServiciosByCount;
  const headerPagoLabel = filtroPago === 'Todas' ? 'Ingresos (Total)' : (filtroPago === 'Contado' ? 'Ingresos (Contado)' : (filtroPago === 'Tarjeta' ? 'Ingresos (Tarjeta)' : 'Ingresos (No pagados)'));
  if (!isLoggedIn) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
      <Toaster />
      {/* IZQUIERDA - 50% FIJO */}
      <div style={{ 
        flex: '0 0 50%', 
        padding: '100px 80px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        maxWidth: '500px'
      }}>
        <div className="flex flex-col items-center mb-6">
          <img src="/images/TarjetasVisitaPB.png" alt="Logo Peluquería" 
               className="w-32 h-32 md:w-48 md:h-48 mx-auto mb-3 rounded-2xl shadow-2xl object-cover border-4 border-amber-200/50 scale-40 md:scale-50 hover:scale-50 md:hover:scale-60 transition-transform origin-center"/>
        </div>
        <h1 className="agenda-logo text-6xl mb-4">Pelayo y Blanca</h1>
        <h4 className="text-slate-800 text-lg mb-2">Bienvenido a nuestra peluquería unisex...</h4>
        <form onSubmit={(e) => {e.preventDefault(); setIsLoggedIn(true);}} className="max-w-xs space-y-8">
          <input type="password" placeholder="PASSWORD" className="input-minimal w-full" autoFocus />
          <button className="btn-boutique w-full">Entrar</button>
        </form>
      </div>
      
      {/* DERECHA - IMAGEN  ALTA*/}
      <div style={{ 
        flex: '0 0 50%', 
        backgroundImage: `url('/images/Peluqueria-Mexico.jpeg')`,
        backgroundSize: 'auto 100%',  /* ← ALTO 100%, ancho proporcional */
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh'  /* ← Asegura altura completa */
      }}></div>
    </div>
  );
}


  return (
    <div className="app-root min-h-screen bg-[#fdfcfb]">
      <Toaster position="top-right" />
      <header className="px-10 py-10 flex flex-col lg:flex-row justify-between items-center border-b border-slate-100 mb-8">
        <div>
          <h2 className="agenda-logo text-4xl">Pelayo y Blanca</h2>
          <p className="text-[9px] uppercase tracking-[0.5em] text-slate-400 mt-1 font-bold">Agenda Profesional</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleToggleReports} className="btn-nav-boutique" style={{ backgroundColor: '#b5935b', color: 'white' }}>
            {verReportes ? 'VOLVER A AGENDA' : 'INFORME ECONÓMICO'}
          </button>
          {!verReportes && (
            <div className="nav-group">
              {['Todas', '1', '2'].map(emp => (
                <button key={emp} onClick={() => setFiltroEmpleado(emp)} className={`btn-nav-boutique ${filtroEmpleado === emp ? 'active' : ''}`}>
                  {emp === 'Todas' ? 'VISTA GENERAL' : (emp === '1' ? 'Blanca' : 'Natalia')}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => { if(verReportes) sessionStorage.removeItem('reportKey'); setIsLoggedIn(false); setVerReportes(false); }} className="btn-nav-boutique btn-nav-exit">SALIR</button>
        </div>
      </header>

      <main className="px-10 pb-20 max-w-[1600px] mx-auto">
        {verReportes ? (
          <div className="reports-view bg-white p-10 rounded shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-10">
              <h3 className="agenda-logo text-3xl italic">Resumen de Facturación</h3>
              <div className="flex items-center gap-4">
                <select className="input-minimal py-2 px-4" value={filtroReporte} onChange={e => setFiltroReporte(e.target.value)}>
                  <option value="Todas">Toda la Peluquería</option>
                  <option value="1">Blanca</option>
                  <option value="2">Natalia</option>
                </select>
                <select className="input-minimal py-2 px-4" value={filtroPago} onChange={e => setFiltroPago(e.target.value)}>
                  <option value="Todas">Todas (Contado + Tarjeta)</option>
                  <option value="Contado">Contado</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="NoPagados">No pagados</option>
                </select>
                <hr></hr>
                <button onClick={() => setExportModalOpen(true)} className="btn-nav-boutique" style={{ backgroundColor: '#111827', color: 'white' }}>EXPORTAR PDF</button>
              </div>
            </div>
            {/* Métricas trasladadas: Pendiente, Ingresos hoy, Top servicios (misma fila) */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ background: '#ffffff', border: '1px solid #ececec', padding: '10px 14px', borderRadius: 10, minWidth: 160, boxShadow: '0 6px 18px rgba(15,23,42,0.04)' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Pendiente por cobrar</div>
                <div style={{ fontSize: 16, color: '#111827', marginTop: 8 }}>{euro.format(pendientesPorCobrar)}</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #ececec', padding: '10px 14px', borderRadius: 10, minWidth: 140, boxShadow: '0 6px 18px rgba(15,23,42,0.04)' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Ingresos hoy</div>
                <div style={{ fontSize: 16, color: '#111827', marginTop: 8 }}>{euro.format(ingresosHoy)}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select className="input-minimal" value={periodoTop} onChange={e => setPeriodoTop(e.target.value)} style={{ width: 120 }}>
                  <option value="mes">Mes</option>
                  <option value="trimestre">Trimestre</option>
                  <option value="anio">Año</option>
                </select>
                {periodoTop === 'mes' && (
                  <select className="input-minimal" value={topMonth} onChange={e => setTopMonth(e.target.value)}>
                    {monthNames.map((m, idx) => <option key={idx} value={String(idx+1).padStart(2,'0')}>{m}</option>)}
                  </select>
                )}
                {periodoTop === 'trimestre' && (
                  <select className="input-minimal" value={topQuarter} onChange={e => setTopQuarter(e.target.value)}>
                    <option value="0">T1 (Ene-Mar)</option>
                    <option value="1">T2 (Abr-Jun)</option>
                    <option value="2">T3 (Jul-Sep)</option>
                    <option value="3">T4 (Oct-Dic)</option>
                  </select>
                )}
                <select className="input-minimal" value={topYear} onChange={e => setTopYear(e.target.value)} style={{ width: 110 }}>
                  {Array.from({length:6}).map((_,i)=> {
                    const y = new Date().getFullYear() - i;
                    return <option key={y} value={String(y)}>{y}</option>;
                  })}
                </select>
                <div style={{ marginLeft: 'auto' }}>
                  <button onClick={() => openTopServicesWindow(periodoTop, topMonth, topQuarter, topYear)} style={{ background: '#111827', color: '#fff', padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Ver Top servicios</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              {/* Tarjeta Mes — con borde derecho más ancho para separar de la tarjeta Trimestre */}
              <div className="p-8 bg-slate-50 border-l-4 border-[#b5935b]" style={{ borderRight: '4px solid #ab6a03' }}>
                <div className="flex flex-col">
                  <div>
                  <div style={{ marginTop: 18, textAlign: 'left', borderTop: '3px solid #ab6a03', paddingTop: 12 }}>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Mes</label>
                    <div className="flex gap-3 items-center mt-2">
                      <select className="input-minimal" value={reportMonth} onChange={e => setReportMonth(e.target.value)}>
                        {monthNames.map((m, idx) => <option key={idx} value={String(idx+1).padStart(2,'0')}>{m}</option>)}
                      </select>
                      <select className="input-minimal" value={reportYear} onChange={e => setReportYear(e.target.value)}>
                        {Array.from({length:6}).map((_,i)=> {
                          const y = new Date().getFullYear() - i;
                          return <option key={y} value={String(y)}>{y}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Recaudado</span>
                    <p className="text-3xl font-light mt-2">{euro.format(totalMesSeleccionado)}</p>
                  </div>
                </div>
              </div>
              {/* Tarjeta Trimestre */}
              <div className="p-8 bg-slate-50 border-l-4 border-[#1a1a1a]">
                <div className="flex flex-col">
                  <div>
                  <div style={{ marginTop: 18, textAlign: 'left', borderTop: '3px solid #ab6a03', paddingTop: 12 }}>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Trimestre</label>
                    <div className="flex gap-3 items-center mt-2">
                      <select className="input-minimal" value={reportQuarter} onChange={e => setReportQuarter(e.target.value)}>
                        <option value="0">Primer (Ene - Mar)</option>
                        <option value="1">Segundo (Abr - Jun)</option>
                        <option value="2">Tercer (Jul - Sep)</option>
                        <option value="3">Cuarto (Oct - Dic)</option>
                      </select>
                      <select className="input-minimal" value={reportYear} onChange={e => setReportYear(e.target.value)}>
                        {Array.from({length:6}).map((_,i)=> {
                          const y = new Date().getFullYear() - i;
                          return <option key={y} value={String(y)}>{y}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Recaudado</span>
                    <p className="text-3xl font-light mt-2">{euro.format(totalTrimestreSeleccionado)}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Separador más grueso entre tarjetas y Total Acumulado */}
            <div style={{ height: 3, background: '#ab6a03', margin: '14px 0' }} />
            <div className="mb-12">
               <div className="p-8 bg-slate-50 border-l-4 border-[#1a1a1a]">
                 <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Acumulado {new Date().getFullYear()}</span>
                 <p className="text-4xl font-light mt-2">{euro.format(totalAnual)}</p>
               </div>
             </div>
             {/* Separador más grueso entre Total Acumulado y la tabla de detalles */}
             <div style={{ height: 3, background: '#ab6a03', margin: '14px 0' }} />
            <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
               <thead>
                 <tr className="border-b-2 border-slate-100">
                   <th style={{ padding: '2px 12px', width: '50%', wordBreak: 'break-word' }} className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Fecha</th>
                   <th style={{ padding: '2px 12px', width: '35%', textAlign: 'right' }} className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">{headerPagoLabel}</th>
                   <th style={{ padding: '2px 12px', width: '15%', textAlign: 'center' }} className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Acción</th>
                 </tr>
               </thead>
               <tbody>
                 {datosFiltrados.map((item, index) => (
                   <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td style={{ padding: '6px 12px' }} className="font-mono text-sm">{item.fecha}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right' }} className="text-lg font-medium">{euro.format(parseFloat(item.totalDia || 0))}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                      <button onClick={() => openReportDate(item.fecha)} className="btn-nav-boutique">Abrir</button>
                    </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             {reportModalOpen && (
               <div className="modal-overlay" style={{ zIndex: 1200 }}>
                 <div className="modal-content boutique-modal" style={{ width: '700px' }}>
                   <h3 className="agenda-logo text-xl">Citas del día {reportModalAppointments.length ? reportModalAppointments[0].fecha : ''}</h3>
                   <div style={{ maxHeight: '360px', overflow: 'auto', marginTop: 8 }}>
                     <table className="w-full">
                       <thead>
                         <tr>
                           <th style={{ textAlign: 'left', padding: 6 }}>Hora</th>
                           <th style={{ textAlign: 'left', padding: 6 }}>Cliente</th>
                           <th style={{ textAlign: 'left', padding: 6 }}>Servicio</th>
                           <th style={{ textAlign: 'right', padding: 6 }}>Acción</th>
                         </tr>
                       </thead>
                       <tbody>
                         {reportModalAppointments.map(a => (
                           <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                             <td style={{ padding: 8 }}>{a.horaInicio || (a.start ? (new Date(a.start)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</td>
                             <td style={{ padding: 8 }}>{a.title}</td>
                             <td style={{ padding: 8 }}>{a.category || ''}</td>
                            <td style={{ padding: 8, textAlign: 'right' }}><button onClick={() => { openResultAppointment(a); setTimeout(() => setReportModalOpen(false), 120); }} className="btn-boutique">Abrir</button></td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <div className="modal-actions"><button className="btn-boutique" onClick={() => setReportModalOpen(false)}>Cerrar</button></div>
                 </div>
               </div>
             )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ background: '#ffffff', border: '1px solid #ececec', padding: '8px 12px', borderRadius: 10, minWidth: 90, textAlign: 'right', boxShadow: '0 6px 18px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Citas hoy</div>
                  <div style={{ fontSize: 15, color: '#111827', marginTop: 6 }}>{citasHoy}</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #ececec', padding: '8px 12px', borderRadius: 10, minWidth: 180, textAlign: 'right', boxShadow: '0 6px 18px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Próxima cita</div>
                  <div style={{ fontSize: 12, color: '#111827', marginTop: 6 }}>{proximaCita}</div>
                </div>
              </div>
            </div>

            {/* Buscador de clientes: nombre / teléfono + rango de fechas (fechas con botón calendario y menor espaciado) */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 }}>
              <input placeholder="Buscar nombre o teléfono" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-minimal" style={{ minWidth: 220 }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input ref={searchFromRef} type="date" value={searchFrom} onChange={e => setSearchFrom(e.target.value)} className="input-minimal date-with-btn" />
                <button type="button" onClick={() => { if (searchFromRef.current && searchFromRef.current.showPicker) { searchFromRef.current.showPicker(); } else if (searchFromRef.current) { searchFromRef.current.focus(); } }} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e6e9ee', background: '#fff', cursor: 'pointer' }}>📅</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input ref={searchToRef} type="date" value={searchTo} onChange={e => setSearchTo(e.target.value)} className="input-minimal date-with-btn" />
                <button type="button" onClick={() => { if (searchToRef.current && searchToRef.current.showPicker) { searchToRef.current.showPicker(); } else if (searchToRef.current) { searchToRef.current.focus(); } }} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e6e9ee', background: '#fff', cursor: 'pointer' }}>📅</button>
              </div>

              <button onClick={performSearch} className="btn-nav-boutique" style={{ marginLeft: 8 }}>Buscar</button>
              <button onClick={cancelSearch} className="btn-nav-boutique" style={{ backgroundColor: '#e6edf3', color: '#0f172a', marginLeft: 6 }}>Cancelar</button>
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className="mb-4 bg-white p-3 rounded border" style={{ borderColor: '#eef2f6' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Resultados de búsqueda ({searchResults.length})</div>
                <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '6px 8px', width: '40%' }}>Cliente</th>
                      <th style={{ padding: '6px 8px', width: '25%' }}>Teléfono</th>
                      <th style={{ padding: '6px 8px', width: '25%' }}>Fecha / Hora</th>
                      <th style={{ padding: '6px 8px', width: '10%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map(res => (
                      <tr key={res.id} className="hover:bg-slate-50" style={{ cursor: 'pointer' }} onClick={() => openResultAppointment(res)}>
                        <td style={{ padding: '8px' }}>{res.title}</td>
                        <td style={{ padding: '8px' }}>{res.clientPhone || '—'}</td>
                        <td style={{ padding: '8px' }}>{res.start ? (new Date(res.start)).toLocaleString() : '—'}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}><button onClick={(e) => { e.stopPropagation(); openResultAppointment(res); }} className="btn-nav-boutique">Abrir</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            locale={esLocale}
            slotMinTime="09:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="00:30:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            allDaySlot={false}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            eventContent={renderEventContent}
            eventDidMount={(info) => {
              try {
                const ev = info.event;
                const el = info.el;
                const bg = ev.backgroundColor || ev.extendedProps?.backgroundColor || ev._def?.ui?.backgroundColor || ev.color;
                const txt = ev.textColor || ev.extendedProps?.textColor || ev._def?.ui?.textColor || '#000';
                if (bg) {
                  el.style.backgroundColor = bg;
                  el.style.borderColor = bg;
                }
                if (txt) el.style.color = txt;
              } catch (e) { console.warn('eventDidMount error', e); }
            }}
            events={filtroEmpleado === 'Todas' ? events : events.filter(e => e.employeeId === filtroEmpleado)}
            selectable={true}
            select={(info) => {
              const fecha = info.startStr.split('T')[0];
              const horaInicio = info.startStr.includes('T') ? info.startStr.split('T')[1].substring(0, 5) : '09:00';
              setEditandoId(null);
              setCita({ ...EMPTY_CITA, fecha, horaInicio });
              setFormError('');
              setModalOpen(true);
            }}
            eventClick={(info) => {
              try {
                const ev = info.event;
                const ext = ev.extendedProps || {};
                const parseBool = (v) => (v === true || v === 'true' || v === 1 || v === '1');
                const loaded = {
                  title: ev.title,
                  fecha: ev.startStr.split('T')[0],
                  horaInicio: ev.startStr.split('T')[1].substring(0,5),
                  horaFin: ev.endStr ? ev.endStr.split('T')[1].substring(0,5) : '09:30',
                  employeeId: ext.employeeId || '1',
                  category: ext.category || 'Corte de pelo',
                  clientPhone: ext.clientPhone || '',
                  formula: ext.formula || '',
                  price: ext.price || '',
                  isPaid: parseBool(ext.isPaid),
                  ptv: parseBool(ext.ptv)
                };
                setEditandoId(ev.id);
                setCita(loaded);
                setOriginalCita(loaded);
                setFormError('');
                setModalOpen(true);
              } catch (err) {
                console.error('Error al abrir evento:', err);
                toast.error('Error al abrir la cita: ' + (err.message || err));
              }
            }}
            />
          </>
        )}
      </main>

      {/* MODAL EXPORTACIÓN */}
                  <div style={{ marginTop: 18, textAlign: 'left', borderTop: '3px solid #ab6a03', paddingTop: 12 }}></div>
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h4 className="text-lg font-bold mb-6 italic">Configurar Exportación PDF</h4>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-bold uppercase" style={{ color: '#a86105' }}>Periodo</label>
                <select className="input-minimal w-full" value={exportPeriod} onChange={e => setExportPeriod(e.target.value)}>
                  <option value="mes">Mensual</option>
                  <option value="trimestre">Trimestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase" style={{ color: '#a86105' }}>Año</label>
                <input type="number" className="input-minimal w-full" value={exportYear} onChange={e => setExportYear(e.target.value)} />
              </div>
              
              {exportPeriod === 'mes' && (
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase" style={{ color: '#a86105' }}>Seleccionar Mes</label>
                  <select className="input-minimal w-full" value={exportMonth} onChange={e => setExportMonth(e.target.value)}>
                    {monthNames.map((m, idx) => <option key={idx} value={String(idx+1).padStart(2,'0')}>{m}</option>)}
                  </select>
                </div>
              )}

              {exportPeriod === 'trimestre' && (
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase" style={{ color: '#a86105' }}>Seleccionar Trimestre</label>
                  <select className="input-minimal w-full" value={exportQuarter} onChange={e => setExportQuarter(e.target.value)}>
                    <option value="0">Primer Trimestre (Enero - Marzo)</option>
                    <option value="1">Segundo Trimestre (Abril - Junio)</option>
                    <option value="2">Tercer Trimestre (Julio - Septiembre)</option>
                    <option value="3">Cuarto Trimestre (Octubre - Diciembre)</option>
                  </select>
                </div>
              )}

              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase" style={{ color: '#a86105' }}>Método de Pago</label>
                <select className="input-minimal w-full" value={exportPayment} onChange={e => setExportPayment(e.target.value)}>
                  <option value="Todas">Todos los pagos</option>
                  <option value="Contado">Solo Contado</option>
                  <option value="Tarjeta">Solo Tarjeta</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setExportModalOpen(false)} className="btn-boutique" style={{ backgroundColor: '#3d5ea4', color: '#fff' }}>Cancelar</button>
              <button onClick={handleGeneratePdf} className="btn-boutique" style={{backgroundColor:'#111', color:'#fff'}}>Generar PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* PDF HIDDEN PREVIEW - BLOQUE FISCAL RESTAURADO */}
      {showHiddenReport && pdfData && (
        <div ref={pdfRef} style={{ position: 'fixed', left: '-10000px', width: '800px', padding: '40px', background: '#fff', color: '#111827' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #111', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#7de451', borderRadius: 8 }}>
                  <img 
                    src="/images/PB.png" 
                    alt="Logo PB" 
                    style={{ width: 48, height: 48, objectFit: 'contain' }} 
                  />
                </div>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{pdfData.title || 'Pelayo y Blanca - Informe'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Pelayo y Blanca · Agenda Profesional — {new Date().toLocaleDateString()}</div>
                    <div style={{ fontSize: 10, color: '#374151', marginTop: 4 }}>NIF: 71699880 · Tel: 984 045 180 · blancabatalla17@gmail.com</div>
                </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px' }}>Pago: <strong>{pdfData.filters.pago}</strong></div>
              <div style={{ fontSize: '11px' }}>Empleado: <strong>{pdfData.filters.empleado === 'all' ? 'Todos' : pdfData.filters.empleado}</strong></div>
              {pdfData.filters.periodo === 'Trimestre' ? (
                <>
                  <div style={{ fontSize: '11px' }}>Trimestre: <strong>{pdfData.filters.trimestreLabel} {pdfData.filters.year}</strong></div>
                  <div style={{ fontSize: '11px' }}>Meses: <strong>{pdfData.filters.trimestreMonths}</strong></div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '11px' }}>Periodo: <strong>{pdfData.filters.periodo}</strong></div>
                  {pdfData.filters.month && <div style={{ fontSize: '11px' }}>Mes: <strong>{monthNames[Number(pdfData.filters.month)-1]}</strong></div>}
                  {pdfData.filters.year && <div style={{ fontSize: '11px' }}>Año: <strong>{pdfData.filters.year}</strong></div>}
                </>
              )}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '2px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px' }}>Concepto</th>
                <th style={{ padding: '2px', textAlign: 'right', borderBottom: '1px solid #ddd', fontSize: '12px' }}>Importe (€)</th>
              </tr>
            </thead>
            <tbody>
              {exportPeriod === 'trimestre' ? (
                pdfData.rows.map((month, mi) => (
                  <React.Fragment key={mi}>
                    <tr>
                      <td colSpan="2" style={{ padding: '15px 10px 5px', background: '#f3f4f6', fontWeight: 'bold', fontSize: '13px' }}>
                        {month.monthLabel} — Total: {month.total.toFixed(2)} €
                      </td>
                    </tr>
                    {month.items.map((it, ii) => (
                      <tr key={ii}>
                        <td style={{ padding: '8px 20px', fontSize: '12px', borderBottom: '1px solid #eee' }}>{it.label}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{it.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                pdfData.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '1px', borderBottom: '1px solid #eee', fontSize: '12px' }}>{r.label}</td>
                    <td style={{ padding: '1px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '12px' }}>{r.amount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ padding: '4px 10px', fontSize: '16px', fontWeight: 'bold' }}>TOTAL</td>
                <td style={{ padding: '4px 10px', fontSize: '16px', fontWeight: 'bold', textAlign: 'right' }}>{pdfData.total.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
          <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
            Documento informativo generado por el sistema de gestión de Pelayo y Blanca.
          </div>
        </div>
      )}

      

      {/* MODAL CITA */}
      {modalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content boutique-modal" style={{ width: '700px' }}>
            <h2 className="agenda-logo text-center text-2xl mb-8 italic">{editandoId ? 'Gestión de Cita' : 'Nueva Cita'}</h2>

            {/* Mensaje de error del formulario visible dentro del modal */}
            {formError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <input type="text" className="input-minimal" placeholder="Cliente" style={{ flex: 3 }} value={cita.title} onChange={e => setCita({...cita, title: e.target.value})} />
                <input type="text" className="input-minimal" placeholder="Teléfono" style={{ flex: 2 }} value={cita.clientPhone} onChange={e => setCita({...cita, clientPhone: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <input type="date" className="input-minimal" style={{ flex: 2 }} value={cita.fecha} onChange={e => setCita({...cita, fecha: e.target.value})} />
                <select className="input-minimal" style={{ flex: 1 }} value={cita.horaInicio} onChange={e => setCita({...cita, horaInicio: e.target.value})}>{tramosHorarios.map(t => <option key={t} value={t}>{t}</option>)}</select>
                <select className="input-minimal" style={{ flex: 1 }} value={cita.horaFin} onChange={e => setCita({...cita, horaFin: e.target.value})}>{tramosHorarios.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <select value={cita.employeeId} className="input-minimal" style={{flex: 1}} onChange={e => setCita({...cita, employeeId: e.target.value})}>
                    <option value="1">Blanca</option>
                    <option value="2">Natalia</option>
                </select>
                <select value={cita.category} className="input-minimal" style={{flex: 1}} onChange={e => setCita({...cita, category: e.target.value})}>
                    {Object.keys(CATEGORIAS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <textarea className="input-minimal h-20" placeholder="Fórmula técnica" value={cita.formula} onChange={e => setCita({...cita, formula: e.target.value})} />
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: '#f8fafc', padding: '15px' }}>
                <input type="number" step="0.01" className="input-minimal" placeholder="Precio €" style={{ flex: 1 }} value={cita.price} onChange={e => setCita({...cita, price: e.target.value})} />
                <label className="text-[10px] font-bold"><input type="checkbox" checked={cita.isPaid} onChange={e => setCita({...cita, isPaid: e.target.checked, ptv: e.target.checked ? false : cita.ptv})} /> CONTADO</label>
                <label className="text-[10px] font-bold"><input type="checkbox" checked={cita.ptv} onChange={e => setCita({...cita, ptv: e.target.checked, isPaid: e.target.checked ? false : cita.isPaid})} /> TARJETA</label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-boutique" style={{ flex: 2, backgroundColor: '#1a1a1a', color: 'white' }}>GUARDAR</button>
                {editandoId && <button type="button" onClick={handleDelete} className="btn-boutique" style={{ flex: 1, backgroundColor: '#ff4d4f', color: 'white' }}>ELIMINAR</button>}
                <button type="button" onClick={handleClose} className="btn-boutique" style={{ flex: 1, backgroundColor: '#71a1ee', color: 'white' }}>CERRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
