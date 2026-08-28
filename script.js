// ESTADO GLOBAL DE LA APLICACIÓN
let estado = {
  rolActual: 'operador',
  saldoBanco: 0.00,
  saldoCaja: 0.00,
  totalGastosExtrasUSD: 0.00,
  tipoCambioUSD: 36.5,
  juegos: [
    { id: 1, nombre: 'Genshin Impact - 60 Cristales', costo: 0.80, precio: 1.00 },
    { id: 2, nombre: 'Genshin Impact - Bendición Lunar', costo: 4.00, precio: 5.00 }
  ],
  ventas: [],
  enlaces: [],
  depositos: [] // Almacena el historial de depósitos manuales
};

// REGISTRO PERMANENTE DE CLIENTES (Persistencia en LocalStorage aislada de finanzas)
let historialPermanenteClientes = JSON.parse(localStorage.getItem('historialPermanenteClientes')) || [];

const DEV_PASSWORD = "123";

document.addEventListener('DOMContentLoaded', () => {
  renderizarJuegosEnSelect();
  renderizarTablaJuegosDev();
  renderizarEnlaces();
  renderizarTablaDepositosDev();
  renderizarHistorialPermanente();
  actualizarUI();
});

// GESTIÓN DE ROLES
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
      renderizarHistorialPermanente(); // Refresca para mostrar botones de borrado
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
    renderizarHistorialPermanente(); // Refresca para ocultar botones de borrado
  }
}
// CREAR O EDITAR JUEGO (DESARROLLADOR)
function guardarJuego() {
  const nombre = document.getElementById('devNombreJuego').value;
  const costo = parseFloat(document.getElementById('devCosto').value);
  const precio = parseFloat(document.getElementById('devPrecio').value);

  if (!nombre || isNaN(costo) || isNaN(precio)) {
    alert('Por favor complete todos los datos del juego.');
    return;
  }

  const juegoExistente = estado.juegos.find(j => j.nombre.toLowerCase() === nombre.toLowerCase());
  if (juegoExistente) {
    juegoExistente.costo = costo;
    juegoExistente.precio = precio;
    alert(`Juego "${nombre}" actualizado.`);
  } else {
    estado.juegos.push({ id: Date.now(), nombre, costo, precio });
    alert(`Juego "${nombre}" creado.`);
  }

  document.getElementById('devNombreJuego').value = '';
  document.getElementById('devCosto').value = '';
  document.getElementById('devPrecio').value = '';
  renderizarJuegosEnSelect();
  renderizarTablaJuegosDev();
}

function eliminarJuego(idJuego) {
  if (confirm("¿Estás seguro de eliminar este apartado?")) {
    estado.juegos = estado.juegos.filter(j => j.id !== idJuego);
    renderizarJuegosEnSelect();
    renderizarTablaJuegosDev();
  }
}

function cargarJuegoEnFormulario(idJuego) {
  const juego = estado.juegos.find(j => j.id === idJuego);
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

// GESTIÓN DE ENLACES DE COMPRA
function agregarEnlaceCompra() {
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

  estado.enlaces.push({ id: Date.now(), nombre, url });

  nombreInput.value = '';
  urlInput.value = '';

  renderizarEnlaces();
}

function eliminarEnlaceCompra(id) {
  estado.enlaces = estado.enlaces.filter(item => item.id !== id);
  renderizarEnlaces();
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
        <button class="btn btn-warning" style="padding:2px 6px; font-size:0.8rem;" onclick="cargarJuegoEnFormulario(${juego.id})">Editar</button>
        <button class="btn btn-danger" style="padding:2px 6px; font-size:0.8rem;" onclick="eliminarJuego(${juego.id})">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// REGISTRAR VENTA
function registrarVenta() {
  const juegoId = parseInt(document.getElementById('selectJuego').value);
  const clienteNombre = document.getElementById('clienteNombre').value.trim() || 'Cliente General';
  const clienteId = document.getElementById('clienteId').value.trim() || 'N/A';
  const cuentaIngreso = document.getElementById('ventaMetodoPago').value;

  const juego = estado.juegos.find(j => j.id === juegoId);
  if (!juego) {
    alert('Seleccione un juego válido.');
    return;
  }

  const gananciaNeta = juego.precio - juego.costo;
  const fechaActual = new Date().toLocaleString();

  const venta = {
    id: Date.now(),
    clienteNombre,
    clienteId,
    juegoNombre: juego.nombre,
    precioHistorico: juego.precio,
    costoHistorico: juego.costo,
    ganancia: gananciaNeta,
    cuentaAfectada: cuentaIngreso,
    fecha: fechaActual
  };

  // 1. Registro Operativo
  estado.ventas.push(venta);

  // 2. Transacción de Saldos
  estado.saldoBanco -= venta.costoHistorico;
  if (cuentaIngreso === 'banco') {
    estado.saldoBanco += venta.precioHistorico;
  } else {
    estado.saldoCaja += venta.precioHistorico;
  }

  // 3. Registro Permanente Aislado
  historialPermanenteClientes.push({
    fecha: fechaActual,
    clienteNombre,
    clienteId,
    juegoNombre: juego.nombre,
    precioVenta: juego.precio,
    metodo: cuentaIngreso
  });
  localStorage.setItem('historialPermanenteClientes', JSON.stringify(historialPermanenteClientes));

  actualizarUI();
  renderizarHistorialPermanente();

  document.getElementById('clienteNombre').value = '';
  document.getElementById('clienteId').value = '';
  document.getElementById('juegoSearchInput').value = '';
  document.getElementById('selectJuego').value = '';
}

// FUNCIÓN PARA COPIAR ID
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
  }).catch(err => {
    console.error('Error al copiar: ', err);
  });
}

// RENDERIZAR Y FILTRAR HISTORIAL PERMANENTE
function renderizarHistorialPermanente(filtro = '') {
  const tbody = document.getElementById('tbodyHistorialPermanente');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (historialPermanenteClientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No hay registros históricos almacenados</td></tr>';
    return;
  }

  const filtrados = historialPermanenteClientes.filter(v =>
    v.clienteNombre.toLowerCase().includes(filtro.toLowerCase()) ||
    v.clienteId.toLowerCase().includes(filtro.toLowerCase()) ||
    v.juegoNombre.toLowerCase().includes(filtro.toLowerCase())
  );

  if (filtrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No se encontraron coincidencias</td></tr>';
    return;
  }

  filtrados.forEach(v => {
    const tr = document.createElement('tr');
    
    // Botón de copiado si existe un ID válido
    const idHtml = (v.clienteId && v.clienteId !== 'N/A') 
      ? `<div style="display: flex; align-items: center; gap: 0.5rem;">
           <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${v.clienteId}</code>
           <button type="button" class="btn btn-primary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="copiarTexto('${v.clienteId}', this)">📋 Copiar</button>
         </div>`
      : `<span style="color: #94a3b8;">N/A</span>`;

    tr.innerHTML = `
      <td>${v.fecha}</td>
      <td><b>${v.clienteNombre}</b></td>
      <td>${idHtml}</td>
      <td>${v.juegoNombre}</td>
      <td>$${v.precioVenta.toFixed(2)}</td>
      <td><span class="badge">${v.metodo.toUpperCase()}</span></td>
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

// ELIMINAR / ANULAR VENTA OPERATIVA
function eliminarVenta(idVenta) {
  const index = estado.ventas.findIndex(v => v.id === idVenta);
  if (index !== -1) {
    const venta = estado.ventas[index];

    estado.saldoBanco += venta.costoHistorico;

    if (venta.cuentaAfectada === 'banco') {
      estado.saldoBanco -= venta.precioHistorico;
    } else {
      estado.saldoCaja -= venta.precioHistorico;
    }

    estado.ventas.splice(index, 1);
    actualizarUI();
  }
}

// REGISTRAR DEPÓSITO EXTERNO Y AUDITORÍA
function registrarDeposito() {
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

  const deposito = {
    id: Date.now(),
    concepto,
    monto,
    cuenta
  };

  estado.depositos.push(deposito);

  if (cuenta === 'banco') {
    estado.saldoBanco += monto;
  } else {
    estado.saldoCaja += monto;
  }

  conceptoInput.value = '';
  montoInput.value = '';

  actualizarUI();
  renderizarTablaDepositosDev();
}

// ANULAR DEPÓSITO REALIZADO POR ERROR
function eliminarDeposito(idDeposito) {
  const index = estado.depositos.findIndex(d => d.id === idDeposito);
  if (index !== -1) {
    const dep = estado.depositos[index];

    if (confirm(`¿Deseas anular el depósito "${dep.concepto}" por $${dep.monto.toFixed(2)} USD?`)) {
      if (dep.cuenta === 'banco') {
        estado.saldoBanco -= dep.monto;
      } else {
        estado.saldoCaja -= dep.monto;
      }

      estado.depositos.splice(index, 1);
      actualizarUI();
      renderizarTablaDepositosDev();
    }
  }
}

// DIBUJAR TABLA DE DEPÓSITOS EN EL PANEL DEV
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
        <button class="btn btn-danger" style="padding:2px 6px; font-size:0.8rem;" onclick="eliminarDeposito(${dep.id})">Anular</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// REINICIAR REGISTROS Y CONTADORES DE VENTAS
function reiniciarContadorVentas() {
  if (confirm("⚠️ ¿Estás seguro de reiniciar las ventas? Esto borrará el historial de transacciones y dejará la métrica en $0.00 USD. Los saldos de Banco, Caja Chica y el Historial Permanente de Clientes NO se perderán.")) {
    estado.ventas = [];
    estado.totalGastosExtrasUSD = 0;
    actualizarUI();
    alert("El historial operativo de ventas se ha reiniciado correctamente.");
  }
}

// REGISTRAR GASTO EXTRA
function registrarGasto() {
  const concepto = document.getElementById('gastoConcepto').value;
  const montoLocal = parseFloat(document.getElementById('gastoLocal').value);
  const origen = document.getElementById('gastoOrigen').value;

  if (isNaN(montoLocal) || montoLocal <= 0) {
    alert('Ingrese un monto válido.');
    return;
  }

  const montoUSD = montoLocal / estado.tipoCambioUSD;

  if (origen === 'banco') {
    estado.saldoBanco -= montoUSD;
  } else {
    estado.saldoCaja -= montoUSD;
  }

  estado.totalGastosExtrasUSD += montoUSD;

  alert(`Gasto de -$${montoUSD.toFixed(2)} USD descontado de ${origen.toUpperCase()} (${concepto || 'Sin concepto'})`);
  document.getElementById('gastoConcepto').value = '';
  document.getElementById('gastoLocal').value = '';
  actualizarUI();
}

function actualizarTipoCambio() {
  const TC = parseFloat(document.getElementById('tipoCambio').value);
  if (!isNaN(TC) && TC > 0) estado.tipoCambioUSD = TC;
}

// REFRESCAR UI Y CÁLCULOS GLOBALES
function actualizarUI() {
  const totalVentasUSD = estado.ventas.reduce((acc, v) => acc + v.precioHistorico, 0);
  const gananciaBrutaVentas = estado.ventas.reduce((acc, v) => acc + v.ganancia, 0);
  const gananciaNetaReal = gananciaBrutaVentas - estado.totalGastosExtrasUSD;

  document.getElementById('saldoBanco').textContent = `$${estado.saldoBanco.toFixed(2)}`;
  document.getElementById('saldoCaja').textContent = `$${estado.saldoCaja.toFixed(2)}`;
  document.getElementById('totalVentas').textContent = `$${totalVentasUSD.toFixed(2)}`;

  const elGanancia = document.getElementById('totalGanancia');
  elGanancia.textContent = `$${gananciaNetaReal.toFixed(2)}`;

  if (gananciaNetaReal < 0) {
    elGanancia.style.color = '#dc2626';
  } else {
    elGanancia.style.color = '#16a34a';
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
        <button class="btn btn-danger" style="padding:2px 6px; font-size:0.8rem;" onclick="eliminarVenta(${v.id})">Anular</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// DROPDOWN Y BÚSQUEDA DE JUEGOS
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
// ELIMINAR REGISTRO PERMANENTE (EXCLUSIVO MODO DESARROLLADOR)
function eliminarRegistroPermanente(indexReal) {
  if (estado.rolActual !== 'desarrollador') {
    alert("Acceso denegado. Solo el Desarrollador puede eliminar registros del historial.");
    return;
  }

  const reg = historialPermanenteClientes[indexReal];
  if (confirm(`¿Eliminar de forma permanente el registro de "${reg.clienteNombre}" (${reg.juegoNombre})?\n\nNota: Esto no afectará los saldos de Banco ni Caja.`)) {
    historialPermanenteClientes.splice(indexReal, 1);
    localStorage.setItem('historialPermanenteClientes', JSON.stringify(historialPermanenteClientes));
    
    // Re-renderizar aplicando el filtro actual si lo hay
    const inputFiltro = document.getElementById('buscarClienteHistorial');
    renderizarHistorialPermanente(inputFiltro ? inputFiltro.value.trim() : '');
  }
}

// RENDERIZAR Y FILTRAR HISTORIAL PERMANENTE
function renderizarHistorialPermanente(filtro = '') {
  const tbody = document.getElementById('tbodyHistorialPermanente');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (historialPermanenteClientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No hay registros históricos almacenados</td></tr>';
    return;
  }

  // Mantenemos el índice real en localStorage al filtrar
  const filtrados = historialPermanenteClientes
    .map((item, indexReal) => ({ ...item, indexReal }))
    .filter(v =>
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
    
    // Botón de copiado para el ID de cliente
    const idHtml = (v.clienteId && v.clienteId !== 'N/A') 
      ? `<div style="display: flex; align-items: center; gap: 0.5rem;">
           <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${v.clienteId}</code>
           <button type="button" class="btn btn-primary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="copiarTexto('${v.clienteId}', this)">📋 Copiar</button>
         </div>`
      : `<span style="color: #94a3b8;">N/A</span>`;

    // Botón de borrado exclusivo para Desarrollador
    const colAccion = (estado.rolActual === 'desarrollador')
      ? `<button class="btn btn-danger" style="padding: 2px 6px; font-size: 0.75rem;" onclick="eliminarRegistroPermanente(${v.indexReal})">🗑️ Borrar</button>`
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
function sincronizarSelectConBuscador() {
  const juegoId = parseInt(document.getElementById('selectJuego').value);
  const juego = estado.juegos.find(j => j.id === juegoId);
  if (juego) {
    document.getElementById('juegoSearchInput').value = juego.nombre;
  } else {
    document.getElementById('juegoSearchInput').value = '';
  }
}

// Alternar visibilidad del panel de Control de Fondos
function toggleControlFondos() {
  const contenido = document.getElementById('contenidoControlFondos');
  if (contenido) {
    contenido.classList.toggle('hidden');
  }
}