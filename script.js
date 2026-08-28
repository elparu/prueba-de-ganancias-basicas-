// ==========================================
// CONFIGURACIÓN DE CONEXIÓN CON SUPABASE
// ==========================================
const SUPABASE_URL = 'https://hkqhswejzxnzqmuedctq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcWhzd2VqenhuenFtdWVkY3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MjY1NTEsImV4cCI6MjEwMzUwMjU1MX0.nlxjIKo4eIAWIoMpys93Yvh8tF5nFh8rd_V7XB2SmzM';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ESTADO GLOBAL DE LA APLICACIÓN
let estado = {
  rolActual: 'operador',
  saldoBanco: 0.00,
  saldoCaja: 0.00,
  totalGastosExtrasUSD: 0.00,
  tipoCambioUSD: 36.5,
  juegos: [],
  ventas: [],
  enlaces: [],
  depositos: []
};

let historialPermanenteClientes = [];
const DEV_PASSWORD = "123";

// ==========================================
// CARGA Y SINCRONIZACIÓN EN TIEMPO REAL
// ==========================================
async function cargarDatosDesdeSupabase() {
  // 1. Configuración y Fondos
  const { data: config } = await _supabase.from('configuracion_sistema').select('*').eq('id', 'config_principal').single();
  if (config) {
    estado.tipoCambioUSD = config.tipo_cambio || 36.5;
    estado.saldoBanco = parseFloat(config.fondo_banco) || 0.00;
    estado.saldoCaja = parseFloat(config.fondo_efectivo) || 0.00;
    
    if (document.getElementById('tipoCambio')) document.getElementById('tipoCambio').value = estado.tipoCambioUSD;
  }

  // 2. Juegos Registrados
  const { data: juegos } = await _supabase.from('juegos_registrados').select('*').order('id', { ascending: true });
  if (juegos) {
    estado.juegos = juegos.map(j => ({ id: j.id, nombre: j.nombre, costo: parseFloat(j.costo || 0), precio: parseFloat(j.precio || 0) }));
    renderizarJuegosEnSelect();
    renderizarTablaJuegosDev();
  }

  // 3. Enlaces
  const { data: enlaces } = await _supabase.from('enlaces_dev').select('*').order('id', { ascending: true });
  if (enlaces) {
    estado.enlaces = enlaces;
    renderizarEnlaces();
  }

  // 4. Historial Permanente de Clientes
  const { data: clientes } = await _supabase.from('historial_clientes').select('*').order('id', { ascending: false });
  if (clientes) {
    historialPermanenteClientes = clientes.map(c => ({
      idDb: c.id,
      fecha: c.fecha,
      clienteNombre: c.cliente_nombre,
      clienteId: c.cliente_id,
      juegoNombre: c.juego_nombre,
      precioVenta: parseFloat(c.precio_venta || 0),
      metodo: c.metodo
    }));
    renderizarHistorialPermanente();
  }

  // 5. Transacciones Operativas
  const { data: transacciones } = await _supabase.from('historial_transacciones').select('*').order('id', { ascending: false });
  if (transacciones) {
    estado.ventas = transacciones.map(t => ({
      id: t.id,
      clienteNombre: t.cliente_nombre,
      clienteId: t.cliente_id,
      juegoNombre: t.juego_nombre,
      precioHistorico: parseFloat(t.precio_venta || 0),
      costoHistorico: parseFloat(t.costo || 0),
      ganancia: parseFloat(t.ganancia || 0),
      cuentaAfectada: t.metodo,
      fecha: t.fecha
    }));
  }

  // 6. Depósitos / Auditoría
  const { data: depositos } = await _supabase.from('auditoria_fondos').select('*').order('id', { ascending: false });
  if (depositos) {
    estado.depositos = depositos.map(d => ({
      id: d.id,
      concepto: d.concepto,
      monto: parseFloat(d.monto || 0),
      cuenta: d.cuenta_destino
    }));
    renderizarTablaDepositosDev();
  }

  actualizarUI();
}

// Escuchar cambios multidispositivo en tiempo real
_supabase.channel('cambios-sistema')
  .on('postgres_changes', { event: '*', schema: 'public' }, () => {
    cargarDatosDesdeSupabase();
  })
  .subscribe();

document.addEventListener('DOMContentLoaded', cargarDatosDesdeSupabase);

// ==========================================
// GESTIÓN DE ROLES
// ==========================================
function cambiarRol() {
  const select = document.getElementById('roleSelect');
  const panelDev = document.getElementById('panelDev');

  if (select.value === 'desarrollador') {
    const pass = prompt('Ingrese la clave de Desarrollador:');
    if (pass === DEV_PASSWORD) {
      estado.rolActual = 'desarrollador';
      if (panelDev) panelDev.classList.remove('hidden');
      renderizarTablaJuegosDev();
      renderizarEnlaces();
      renderizarTablaDepositosDev();
      renderizarHistorialPermanente();
    } else {
      alert('Contraseña incorrecta');
      select.value = 'operador';
      estado.rolActual = 'operador';
      if (panelDev) panelDev.classList.add('hidden');
      renderizarHistorialPermanente();
    }
  } else {
    estado.rolActual = 'operador';
    if (panelDev) panelDev.classList.add('hidden');
    renderizarEnlaces();
    renderizarHistorialPermanente();
  }
}

// ==========================================
// GESTIÓN DE JUEGOS (NUEVA VERSIÓN CORREGIDA)
// ==========================================
async function guardarJuego() {
  const nombre = document.getElementById('devNombreJuego').value.trim();
  const costo = parseFloat(document.getElementById('devCosto').value);
  const precio = parseFloat(document.getElementById('devPrecio').value);

  if (!nombre || isNaN(costo) || isNaN(precio)) {
    alert('Por favor complete todos los datos del juego.');
    return;
  }

  const juegoExistente = estado.juegos.find(j => j.nombre.toLowerCase() === nombre.toLowerCase());
  
  if (juegoExistente) {
    const { error } = await _supabase
      .from('juegos_registrados')
      .update({ costo: costo, precio: precio })
      .eq('id', juegoExistente.id);

    if (error) {
      console.error('Error al actualizar juego:', error);
      alert('Error al actualizar el juego: ' + error.message);
      return;
    }
    alert(`Juego "${nombre}" actualizado con éxito.`);
  } else {
    const { error } = await _supabase
      .from('juegos_registrados')
      .insert([{ nombre: nombre, costo: costo, precio: precio }]);

    if (error) {
      console.error('Error al insertar juego:', error);
      alert('Error al guardar el juego: ' + error.message);
      return;
    }
    alert(`Juego "${nombre}" creado con éxito.`);
  }

  document.getElementById('devNombreJuego').value = '';
  document.getElementById('devCosto').value = '';
  document.getElementById('devPrecio').value = '';

  await cargarDatosDesdeSupabase();
}

async function eliminarJuego(idJuego) {
  if (confirm("¿Estás seguro de eliminar este apartado?")) {
    const { error } = await _supabase
      .from('juegos_registrados')
      .delete()
      .eq('id', idJuego);

    if (error) {
      console.error('Error al eliminar juego:', error);
      alert('Error al eliminar el juego: ' + error.message);
      return;
    }

    await cargarDatosDesdeSupabase();
  }
}

function cargarJuegoEnFormulario(idJuego) {
  const juego = estado.juegos.find(j => String(j.id) === String(idJuego));
  if (juego) {
    document.getElementById('devNombreJuego').value = juego.nombre;
    document.getElementById('devCosto').value = juego.costo;
    document.getElementById('devPrecio').value = juego.precio;
  }
}

function renderizarJuegosEnSelect() {
  const select = document.getElementById('selectJuego');
  if (!select) return;
  select.innerHTML = '<option value="">-- Seleccionar Juego / Apartado --</option>';
  estado.juegos.forEach(juego => {
    const opt = document.createElement('option');
    opt.value = juego.id;
    opt.textContent = `${juego.nombre} (P: $${juego.precio.toFixed(2)} | C: $${juego.costo.toFixed(2)})`;
    select.appendChild(opt);
  });
}

function renderizarTablaJuegosDev() {
  const tbody = document.getElementById('tbodyJuegosDev');
  if (!tbody) return;
  tbody.innerHTML = '';
  estado.juegos.forEach(juego => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${juego.nombre}</b></td>
      <td>$${juego.costo.toFixed(2)}</td>
      <td>$${juego.precio.toFixed(2)}</td>
      <td>
        <button class="btn btn-warning" style="padding:2px 6px; font-size:0.8rem;" onclick="cargarJuegoEnFormulario('${juego.id}')">Editar</button>
        <button class="btn btn-danger" style="padding:2px 6px; font-size:0.8rem;" onclick="eliminarJuego('${juego.id}')">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// GESTIÓN DE ENLACES
// ==========================================
async function agregarEnlaceCompra() {
  const nombreInput = document.getElementById('linkNombreInput');
  const urlInput = document.getElementById('linkUrlInput');
  if (!nombreInput || !urlInput) return;

  const nombre = nombreInput.value.trim();
  let url = urlInput.value.trim();

  if (!nombre || !url) {
    alert('Por favor, ingresa tanto el nombre como la URL del enlace.');
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  await _supabase.from('enlaces_dev').insert([{ nombre, url }]);

  nombreInput.value = '';
  urlInput.value = '';
  cargarDatosDesdeSupabase();
}

async function eliminarEnlaceCompra(id) {
  await _supabase.from('enlaces_dev').delete().eq('id', id);
  cargarDatosDesdeSupabase();
}

function renderizarEnlaces() {
  const headerContainer = document.getElementById('headerLinksContainer');
  const devListContainer = document.getElementById('listaEnlacesDev');

  if (headerContainer) headerContainer.innerHTML = '';
  if (devListContainer) devListContainer.innerHTML = '';

  estado.enlaces.forEach(link => {
    if (headerContainer) {
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'btn-header-link';
      a.innerHTML = `🛒 ${link.nombre}`;
      headerContainer.appendChild(a);
    }

    if (devListContainer && estado.rolActual === 'desarrollador') {
      const devItem = document.createElement('div');
      devItem.className = 'link-dev-item';
      devItem.innerHTML = `
        <span><b>${link.nombre}</b> - <small style="color: #64748b;">${link.url}</small></span>
        <button class="btn btn-danger" style="padding: 2px 6px; font-size: 0.75rem;" onclick="eliminarEnlaceCompra(${link.id})">Eliminar</button>
      `;
      devListContainer.appendChild(devItem);
    }
  });
}

// ==========================================
// REGISTRO DE VENTAS Y FONDOS
// ==========================================
async function registrarVenta() {
  const juegoId = document.getElementById('selectJuego').value;
  const clienteNombre = document.getElementById('clienteNombre').value.trim() || 'Cliente General';
  const clienteId = document.getElementById('clienteId').value.trim() || 'N/A';
  const cuentaIngreso = document.getElementById('ventaMetodoPago').value;

  const juego = estado.juegos.find(j => String(j.id) === String(juegoId));
  if (!juego) {
    alert('Seleccione un juego válido.');
    return;
  }

  const gananciaNeta = juego.precio - juego.costo;
  const fechaActual = new Date().toLocaleString();

  await _supabase.from('historial_transacciones').insert([{
    cliente_nombre: clienteNombre,
    cliente_id: clienteId,
    juego_nombre: juego.nombre,
    precio_venta: juego.precio,
    costo: juego.costo,
    ganancia: gananciaNeta,
    metodo: cuentaIngreso,
    fecha: fechaActual
  }]);

  await _supabase.from('historial_clientes').insert([{
    fecha: fechaActual,
    cliente_nombre: clienteNombre,
    cliente_id: clienteId,
    juego_nombre: juego.nombre,
    precio_venta: juego.precio,
    metodo: cuentaIngreso
  }]);

  let nuevoBanco = estado.saldoBanco - juego.costo;
  let nuevaCaja = estado.saldoCaja;

  if (cuentaIngreso === 'banco') {
    nuevoBanco += juego.precio;
  } else {
    nuevaCaja += juego.precio;
  }

  await _supabase.from('configuracion_sistema').update({
    fondo_banco: nuevoBanco,
    fondo_efectivo: nuevaCaja
  }).eq('id', 'config_principal');

  document.getElementById('clienteNombre').value = '';
  document.getElementById('clienteId').value = '';
  document.getElementById('juegoSearchInput').value = '';
  document.getElementById('selectJuego').value = '';
  
  cargarDatosDesdeSupabase();
}

async function eliminarVenta(idVenta) {
  const venta = estado.ventas.find(v => String(v.id) === String(idVenta));
  if (!venta) return;

  let nuevoBanco = estado.saldoBanco + venta.costoHistorico;
  let nuevaCaja = estado.saldoCaja;

  if (venta.cuentaAfectada === 'banco') {
    nuevoBanco -= venta.precioHistorico;
  } else {
    nuevaCaja -= venta.precioHistorico;
  }

  await _supabase.from('historial_transacciones').delete().eq('id', idVenta);
  await _supabase.from('configuracion_sistema').update({
    fondo_banco: nuevoBanco,
    fondo_efectivo: nuevaCaja
  }).eq('id', 'config_principal');

  cargarDatosDesdeSupabase();
}

async function registrarDeposito() {
  const conceptoInput = document.getElementById('depositoConcepto');
  const montoInput = document.getElementById('depositoMonto');
  const cuentaSelect = document.getElementById('depositoCuenta');

  const concepto = conceptoInput.value.trim() || 'Depósito Directo';
  const monto = parseFloat(montoInput.value);
  const cuenta = cuentaSelect.value;

  if (isNaN(monto) || monto <= 0) {
    alert('Ingrese un monto válido.');
    return;
  }

  await _supabase.from('auditoria_fondos').insert([{
    concepto,
    monto,
    cuenta_destino: cuenta
  }]);

  let nuevoBanco = estado.saldoBanco;
  let nuevaCaja = estado.saldoCaja;

  if (cuenta === 'banco') nuevoBanco += monto;
  else nuevaCaja += monto;

  await _supabase.from('configuracion_sistema').update({
    fondo_banco: nuevoBanco,
    fondo_efectivo: nuevaCaja
  }).eq('id', 'config_principal');

  conceptoInput.value = '';
  montoInput.value = '';
  cargarDatosDesdeSupabase();
}

async function eliminarDeposito(idDeposito) {
  const dep = estado.depositos.find(d => String(d.id) === String(idDeposito));
  if (!dep) return;

  if (confirm(`¿Deseas anular el depósito "${dep.concepto}" por $${dep.monto.toFixed(2)} USD?`)) {
    let nuevoBanco = estado.saldoBanco;
    let nuevaCaja = estado.saldoCaja;

    if (dep.cuenta === 'banco') nuevoBanco -= dep.monto;
    else nuevaCaja -= dep.monto;

    await _supabase.from('auditoria_fondos').delete().eq('id', idDeposito);
    await _supabase.from('configuracion_sistema').update({
      fondo_banco: nuevoBanco,
      fondo_efectivo: nuevaCaja
    }).eq('id', 'config_principal');

    cargarDatosDesdeSupabase();
  }
}

function renderizarTablaDepositosDev() {
  const tbody = document.getElementById('tbodyDepositosDev');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (estado.depositos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No hay depósitos registrados</td></tr>';
    return;
  }

  estado.depositos.forEach(dep => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${dep.concepto}</b></td>
      <td>$${dep.monto.toFixed(2)}</td>
      <td><span class="badge">${dep.cuenta.toUpperCase()}</span></td>
      <td>
        <button class="btn btn-danger" style="padding:2px 6px; font-size:0.8rem;" onclick="eliminarDeposito('${dep.id}')">Anular</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function registrarGasto() {
  const concepto = document.getElementById('gastoConcepto').value;
  const montoLocal = parseFloat(document.getElementById('gastoLocal').value);
  const origen = document.getElementById('gastoOrigen').value;

  if (isNaN(montoLocal) || montoLocal <= 0) {
    alert('Ingrese un monto válido.');
    return;
  }

  const montoUSD = montoLocal / estado.tipoCambioUSD;
  let nuevoBanco = estado.saldoBanco;
  let nuevaCaja = estado.saldoCaja;

  if (origen === 'banco') nuevoBanco -= montoUSD;
  else nuevaCaja -= montoUSD;

  estado.totalGastosExtrasUSD += montoUSD;

  await _supabase.from('configuracion_sistema').update({
    fondo_banco: nuevoBanco,
    fondo_efectivo: nuevaCaja
  }).eq('id', 'config_principal');

  alert(`Gasto de -$${montoUSD.toFixed(2)} USD descontado de ${origen.toUpperCase()} (${concepto || 'Sin concepto'})`);
  document.getElementById('gastoConcepto').value = '';
  document.getElementById('gastoLocal').value = '';
  cargarDatosDesdeSupabase();
}

async function actualizarTipoCambio() {
  const TC = parseFloat(document.getElementById('tipoCambio').value);
  if (!isNaN(TC) && TC > 0) {
    estado.tipoCambioUSD = TC;
    await _supabase.from('configuracion_sistema').update({ tipo_cambio: TC }).eq('id', 'config_principal');
  }
}

async function reiniciarContadorVentas() {
  if (confirm("⚠️ ¿Estás seguro de reiniciar las ventas? Esto borrará el historial de transacciones. Los saldos de Banco, Caja Chica y el Historial Permanente de Clientes NO se perderán.")) {
    await _supabase.from('historial_transacciones').delete().neq('id', 0);
    estado.totalGastosExtrasUSD = 0;
    cargarDatosDesdeSupabase();
    alert("El historial operativo de ventas se ha reiniciado correctamente.");
  }
}

// ==========================================
// HISTORIAL PERMANENTE
// ==========================================
async function eliminarRegistroPermanente(idDb) {
  if (estado.rolActual !== 'desarrollador') {
    alert("Acceso denegado. Solo el Desarrollador puede eliminar registros del historial.");
    return;
  }

  if (confirm("¿Eliminar de forma permanente este registro?\n\nNota: Esto no afectará los saldos de Banco ni Caja.")) {
    await _supabase.from('historial_clientes').delete().eq('id', idDb);
    cargarDatosDesdeSupabase();
  }
}

function renderizarHistorialPermanente(filtro = '') {
  const tbody = document.getElementById('tbodyHistorialPermanente');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (historialPermanenteClientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No hay registros históricos almacenados</td></tr>';
    return;
  }

  const filtrados = historialPermanenteClientes.filter(v =>
    v.clienteNombre.toLowerCase().includes(filtro.toLowerCase()) ||
    v.clienteId.toLowerCase().includes(filtro.toLowerCase()) ||
    v.juegoNombre.toLowerCase().includes(filtro.toLowerCase())
  );

  if (filtrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No se encontraron coincidencias</td></tr>';
    return;
  }

  filtrados.forEach(v => {
    const tr = document.createElement('tr');

    const idHtml = (v.clienteId && v.clienteId !== 'N/A') 
      ? `<div style="display: flex; align-items: center; gap: 0.5rem;">
           <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${v.clienteId}</code>
           <button type="button" class="btn btn-primary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="copiarTexto('${v.clienteId}', this)">📋 Copiar</button>
         </div>`
      : `<span style="color: #94a3b8;">N/A</span>`;

    const colAccion = (estado.rolActual === 'desarrollador')
      ? `<button class="btn btn-danger" style="padding: 2px 6px; font-size: 0.75rem;" onclick="eliminarRegistroPermanente(${v.idDb})">🗑️ Borrar</button>`
      : `<span style="color: #cbd5e1; font-size: 0.75rem;">Protegido</span>`;

    tr.innerHTML = `
      <td>${v.fecha}</td>
      <td><b>${v.clienteNombre}</b></td>
      <td>${idHtml}</td>
      <td>${v.juegoNombre}</td>
      <td>$${v.precioVenta.toFixed(2)}</td>
      <td><span class="badge">${v.metodo.toUpperCase()}</span></td>
      <td>${colAccion}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarHistorialPermanente() {
  const input = document.getElementById('buscarClienteHistorial');
  if (input) {
    renderizarHistorialPermanente(input.value.trim());
  }
}

// ==========================================
// REFRESCAR INTERFAZ GLOBAL
// ==========================================
function actualizarUI() {
  const totalVentasUSD = estado.ventas.reduce((acc, v) => acc + v.precioHistorico, 0);
  const gananciaBrutaVentas = estado.ventas.reduce((acc, v) => acc + v.ganancia, 0);
  const gananciaNetaReal = gananciaBrutaVentas - estado.totalGastosExtrasUSD;

  if (document.getElementById('saldoBanco')) document.getElementById('saldoBanco').textContent = `$${estado.saldoBanco.toFixed(2)}`;
  if (document.getElementById('saldoCaja')) document.getElementById('saldoCaja').textContent = `$${estado.saldoCaja.toFixed(2)}`;
  if (document.getElementById('totalVentas')) document.getElementById('totalVentas').textContent = `$${totalVentasUSD.toFixed(2)}`;

  const elGanancia = document.getElementById('totalGanancia');
  if (elGanancia) {
    elGanancia.textContent = `$${gananciaNetaReal.toFixed(2)}`;
    elGanancia.style.color = gananciaNetaReal < 0 ? '#dc2626' : '#16a34a';
  }

  const tbody = document.getElementById('tbodyVentas');
  if (!tbody) return;
  tbody.innerHTML = '';

  estado.ventas.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${v.id.toString().slice(-4)}</td>
      <td>${v.clienteNombre} <small>(${v.clienteId})</small></td>
      <td>${v.juegoNombre}</td>
      <td>$${v.precioHistorico.toFixed(2)}</td>
      <td>$${v.costoHistorico.toFixed(2)}</td>
      <td style="color: green; font-weight: bold;">+$${v.ganancia.toFixed(2)}</td>
      <td><span class="badge">${v.cuentaAfectada.toUpperCase()}</span></td>
      <td>${v.fecha}</td>
      <td>
        <button class="btn btn-danger" style="padding:2px 6px; font-size:0.8rem;" onclick="eliminarVenta('${v.id}')">Anular</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// BUSCADOR Y AUXILIARES
// ==========================================
function copiarTexto(texto, btnElement) {
  if (texto === 'N/A' || !texto) return;

  navigator.clipboard.writeText(texto).then(() => {
    const textoOriginal = btnElement.innerText;
    btnElement.innerText = "¡Copiado!";
    btnElement.style.backgroundColor = "#16a34a";
    btnElement.style.color = "#ffffff";

    setTimeout(() => {
      btnElement.innerText = textoOriginal;
      btnElement.style.backgroundColor = "";
      btnElement.style.color = "";
    }, 1200);
  });
}

document.addEventListener('click', (e) => {
  const container = document.querySelector('.search-selector-container');
  if (container && !container.contains(e.target)) {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (dropdown) dropdown.classList.remove('active');
  }
});

function mostrarDropdownBuscador() {
  filtrarJuegosEnBuscador();
  const dropdown = document.getElementById('searchResultsDropdown');
  if (dropdown) dropdown.classList.add('active');
}

function filtrarJuegosEnBuscador() {
  const inputEl = document.getElementById('juegoSearchInput');
  const dropdown = document.getElementById('searchResultsDropdown');
  if (!inputEl || !dropdown) return;

  const input = inputEl.value.trim().toLowerCase();
  dropdown.innerHTML = '';

  if (input === '') {
    dropdown.classList.remove('active');
    return;
  }

  const juegosFiltrados = estado.juegos.filter(j => j.nombre.toLowerCase().includes(input));

  if (juegosFiltrados.length === 0) {
    dropdown.innerHTML = '<div class="result-item" style="color: #94a3b8;">No se encontraron coincidencias</div>';
  } else {
    juegosFiltrados.forEach(juego => {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML = `
        <span><b>${juego.nombre}</b></span>
        <small style="color:#2563eb; font-weight:bold;">$${juego.precio.toFixed(2)}</small>
      `;
      item.onclick = () => seleccionarJuegoDesdeBuscador(juego);
      dropdown.appendChild(item);
    });
  }

  dropdown.classList.add('active');
}

function seleccionarJuegoDesdeBuscador(juego) {
  document.getElementById('juegoSearchInput').value = juego.nombre;
  document.getElementById('selectJuego').value = juego.id;
  const dropdown = document.getElementById('searchResultsDropdown');
  if (dropdown) dropdown.classList.remove('active');
}

function sincronizarSelectConBuscador() {
  const juegoId = document.getElementById('selectJuego').value;
  const juego = estado.juegos.find(j => String(j.id) === String(juegoId));
  if (juego) {
    document.getElementById('juegoSearchInput').value = juego.nombre;
  } else {
    document.getElementById('juegoSearchInput').value = '';
  }
}

function toggleControlFondos() {
  const contenido = document.getElementById('contenidoControlFondos');
  if (contenido) {
    contenido.classList.toggle('hidden');
  }
}
