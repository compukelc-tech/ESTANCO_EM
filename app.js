// ============================================================================
// MÓDULO DE PÉRDIDAS Y MERMAS - compukelc
// ============================================================================

let artEncontradosPerdida = [];
let perdidasGlobalesParaPDF = [];

function abrirModalPerdida() {
  document.getElementById('txtBuscarPerdida').value = '';
  document.getElementById('resPerdida').style.display = 'none';
  document.getElementById('btnConfirmarPerdida').style.display = 'none';
  document.getElementById('modalRegistrarPerdida').style.display = 'flex';
}

async function buscarParaPerdida() {
  const query = document.getElementById('txtBuscarPerdida').value.trim();
  if(!query) return alert("Escribe un término de búsqueda válido.");
  
  try {
    // Asegúrate de que urlGAS sea la variable global donde tienes tu URL del script
    const res = await fetch(`${urlGAS}?action=buscarProductos&crit=${encodeURIComponent(query)}`);
    const data = await res.json();
    artEncontradosPerdida = data.data;
    
    if(artEncontradosPerdida.length === 0) return alert("No se encontraron productos con ese criterio.");
    
    const sel = document.getElementById('selArticuloPerdida');
    sel.innerHTML = artEncontradosPerdida.map(p => `<option value="${p.sku}">${p.nombre} (SKU: ${p.sku})</option>`).join('');
    
    document.getElementById('resPerdida').style.display = 'block';
    mostrarStockPerdida();
    document.getElementById('btnConfirmarPerdida').style.display = 'block';
  } catch(e) { 
    alert("Error conectando con la base de datos compukelc: " + e.message); 
  }
}

function mostrarStockPerdida() {
  const sku = document.getElementById('selArticuloPerdida').value;
  const prod = artEncontradosPerdida.find(p => p.sku === sku);
  document.getElementById('lblStockActualPerdida').innerText = prod ? prod.stock : 0;
}

async function confirmarPerdida() {
  const sku = document.getElementById('selArticuloPerdida').value;
  const cant = document.getElementById('txtCantPerdida').value;
  const motivo = document.getElementById('txtMotivoPerdida').value.trim();
  
  if(!cant || cant <= 0) return alert("Ingresa una cantidad válida mayor a 0.");
  if(!motivo) return alert("El motivo es obligatorio para el registro de auditoría.");
  
  const sesionActiva = JSON.parse(localStorage.getItem('sesion_activa'));
  const miUsuario = sesionActiva ? sesionActiva.nombres : 'Desconocido';

  document.getElementById('btnConfirmarPerdida').disabled = true;
  document.getElementById('btnConfirmarPerdida').innerText = "Procesando...";

  try {
    const respuesta = await fetch(urlGAS, {
      method: 'POST',
      body: JSON.stringify({
        action: 'registrarPerdida',
        operador: miUsuario,
        perdida: { sku: sku, cantidad: cant, motivo: motivo }
      })
    });
    const res = await respuesta.json();
    if(res.data.success) {
      alert("La pérdida ha sido auditada y el stock actualizado exitosamente.");
      document.getElementById('modalRegistrarPerdida').style.display = 'none';
    } else {
      alert("Fallo en la operación: " + res.data.error);
    }
  } catch(e) { 
    alert("Error de red."); 
  } finally {
    document.getElementById('btnConfirmarPerdida').disabled = false;
    document.getElementById('btnConfirmarPerdida').innerText = "🚨 Registrar Pérdida";
  }
}

async function cargarPerdidasEnReporte(fechaInicio, fechaFin) {
  try {
    const res = await fetch(`${urlGAS}?action=obtenerPerdidas`);
    const data = await res.json();
    const todasLasPerdidas = data.data;
    
    const perdidasFiltradas = todasLasPerdidas.filter(p => p.fecha >= fechaInicio && p.fecha <= fechaFin);
    perdidasGlobalesParaPDF = perdidasFiltradas;
    
    const totalPerdidaDinero = perdidasFiltradas.reduce((sum, p) => sum + p.perdidaTotal, 0);
    
    const lblPerdidas = document.getElementById('txtPerdidasReporte');
    if(lblPerdidas) lblPerdidas.innerText = "$" + totalPerdidaDinero.toLocaleString('es-CO');
    
    return totalPerdidaDinero;
  } catch (e) {
    console.error("Error obteniendo mermas:", e);
    return 0;
  }
}

async function generarPDFPerdidas() {
  if (perdidasGlobalesParaPDF.length === 0) return alert("No existen registros de pérdidas auditados en este rango de fechas.");
  
  const sesionActiva = JSON.parse(localStorage.getItem('sesion_activa'));
  const emisor = sesionActiva ? sesionActiva.nombres : 'compukelc Admin';

  let filas = perdidasGlobalesParaPDF.map(p => `
    <tr>
      <td style="border:1px solid #ddd; padding:10px;">${new Date(p.fecha).toLocaleString()}</td>
      <td style="border:1px solid #ddd; padding:10px;">${p.nombre}<br><small style="color:#666;">SKU: ${p.sku}</small></td>
      <td style="border:1px solid #ddd; padding:10px; text-align:center;">${p.cantidad}</td>
      <td style="border:1px solid #ddd; padding:10px; color:#b91c1c; font-weight:bold;">$${p.perdidaTotal.toLocaleString('es-CO')}</td>
      <td style="border:1px solid #ddd; padding:10px;">${p.motivo}</td>
      <td style="border:1px solid #ddd; padding:10px;">${p.operador}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:'Segoe UI', Arial, sans-serif; padding:20px; color:#333;">
      <h2 style="color:#b91c1c; text-align:center; border-bottom:2px solid #b91c1c; padding-bottom:10px; margin-bottom:5px;">REPORTE OFICIAL DE MERMAS Y PÉRDIDAS</h2>
      <p style="text-align:center; font-size:12px; color:#666; margin-top:0;">Generado por el sistema central de compukelc<br>Auditor responsable: ${emisor}</p>
      
      <table style="width:100%; border-collapse:collapse; font-size:11px; margin-top:30px;">
        <thead>
          <tr style="background-color:#f4f4f5; text-align:left;">
            <th style="border:1px solid #ddd; padding:10px;">Fecha del Evento</th>
            <th style="border:1px solid #ddd; padding:10px;">Producto Afectado</th>
            <th style="border:1px solid #ddd; padding:10px;">Cant.</th>
            <th style="border:1px solid #ddd; padding:10px;">Impacto Financiero</th>
            <th style="border:1px solid #ddd; padding:10px;">Justificación Registrada</th>
            <th style="border:1px solid #ddd; padding:10px;">Usuario Operador</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
        </tbody>
      </table>
      <div style="margin-top:30px; text-align:right; font-size:14px;">
        <strong>Total Impacto Negativo: </strong>
        <span style="color:#b91c1c; font-size:18px;">$${perdidasGlobalesParaPDF.reduce((a,b)=>a+b.perdidaTotal, 0).toLocaleString('es-CO')}</span>
      </div>
    </div>
  `;
  
  const d = new Date();
  const payload = {
    action: 'guardarInformeDrive',
    html: html,
    tipo: 'Auditoria_Perdidas',
    mes: d.getMonth() + 1,
    anio: d.getFullYear()
  };
  
  const btn = document.getElementById('btnPdfPerdidas');
  btn.innerText = "⏳ Conectando con Google Drive...";
  btn.disabled = true;

  try {
    const r = await fetch(urlGAS, { method:'POST', body: JSON.stringify(payload) });
    const data = await r.json();
    if(data.data.success) {
      window.open(data.data.url, '_blank');
    } else {
      alert("Error en el motor de renderizado PDF: " + data.data.error);
    }
  } catch(e) { 
    alert("Error de enlace al generar el documento."); 
  } finally {
    btn.innerText = "📄 Descargar Reporte de Pérdidas (PDF)";
    btn.disabled = false;
  }
}
