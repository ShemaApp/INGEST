const app = document.querySelector('#app');

const state = {
  view: 'inicio',
  qrClienteHabilitado: false,
  jornadaObligatoria: true,
  cierreAutomatico: true,
  permitirOffline: true,
  solicitudesChofer: true,
  multiplesTambosIndustriales: true,
  clients: [
    { code: 'MOC025', name: 'Empacadora del Valle', type: 'Industrial', locality: 'Mochomera', tanks: 3, pending: 1 },
    { code: 'MOC026', name: 'Abarrotes La Entrada', type: 'Comercial', locality: 'Mochomera', tanks: 1, pending: 0 },
    { code: 'ROS011', name: 'Familia López', type: 'Comercial', locality: 'Rosario', tanks: 0, pending: 0 }
  ],
  tanks: [
    { code: 'TMB-0001', capacity: '250 L', client: 'Empacadora del Valle', status: 'Adherido' },
    { code: 'TMB-0002', capacity: '600 L', client: 'Empacadora del Valle', status: 'En devolución' },
    { code: 'TMB-0003', capacity: '750 L', client: 'Empacadora del Valle', status: 'Adherido' },
    { code: 'TMB-0004', capacity: '250 L', client: '—', status: 'Disponible' }
  ],
  returns: [
    { folio: 'DEV-2026-000021', tank: 'TMB-0002', client: 'Empacadora del Valle', status: 'Reportada', capacity: '600 L' },
    { folio: 'DEV-2026-000019', tank: 'TMB-0005', client: 'Campo San Rafael', status: 'En revisión', capacity: '1,100 L' },
    { folio: 'DEV-2026-000017', tank: 'TMB-0006', client: 'Abarrotes La Entrada', status: 'Validada', capacity: '250 L' }
  ]
};

const nav = [
  ['inicio', 'Inicio'], ['clientes', 'Clientes'], ['tambos', 'Activos / Tambos'],
  ['devoluciones', 'Devoluciones / Folios'], ['auditoria', 'Auditoría'], ['configuracion', 'Configuración general']
];
const icon = { inicio: '▦', clientes: '♙', tambos: '◉', devoluciones: '↔', auditoria: '≡', configuracion: '⚙' };
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const status = value => `<span class="badge badge-${value.toLowerCase().replaceAll(' ', '-').replaceAll('í', 'i')}">${esc(value)}</span>`;

function title(view) { return nav.find(item => item[0] === view)?.[1] || 'Inicio'; }
function action(label, name, extra = '') { return `<button class="btn ${extra}" data-action="${name}">${label}</button>`; }
function more(name) { return `<button class="more" aria-label="Más opciones" data-action="${name}">•••</button>`; }
function pageHeader(kicker, heading, copy, buttons = '') { return `<div class="page-header"><div><p class="eyebrow">${kicker}</p><h1>${heading}</h1><p class="lead">${copy}</p></div><div class="page-actions">${buttons}</div></div>`; }
function toolbar(placeholder) { return `<div class="toolbar"><label class="search"><span>⌕</span><input data-search placeholder="${placeholder}"></label><button class="btn btn-quiet">Filtros <small>⌄</small></button>${more('table-options')}</div>`; }
function table(rows, headers) { return `<div class="data-table"><div class="data-row head">${headers.map(header => `<span>${header}</span>`).join('')}</div>${rows}</div>`; }

function shell(content) {
  app.innerHTML = `<div class="app-frame"><aside class="sidebar"><div class="brand"><span class="brand-mark">I</span><span><b>INGEST</b><small>Inventario y Gestión</small></span></div><p class="workspace">PANEL ADMINISTRATIVO</p><nav>${nav.map(([id, label]) => `<button class="nav-item ${state.view === id ? 'active' : ''}" data-view="${id}"><i>${icon[id]}</i><span>${label}</span>${id === 'devoluciones' ? '<b class="counter">2</b>' : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="connected"><i></i> Conectado a INGEST</div><div class="user"><span class="avatar">AM</span><span><b>Administrador</b><small>Sesión activa</small></span></div></div></aside><main class="main"><header class="topbar"><button class="mobile-menu" data-action="menu">☰</button><div class="crumb">Administración <span>/</span> <b>${title(state.view)}</b></div><div class="top-user">● <span>Administrador</span><span class="avatar">AM</span></div></header><div class="content">${content}</div></main></div><div id="toast" class="toast"></div>`;
  bind();
}

function renderHome() {
  shell(`${pageHeader('VISTA GENERAL', 'Buen día, administrador', 'Control operativo de clientes, tambos y devoluciones desde un solo lugar.', action('Actualizar datos', 'refresh', 'btn-quiet'))}<div class="stats"><div><small>CLIENTES ACTIVOS</small><strong>128</strong><em class="up">+8 este mes</em></div><div><small>TAMBOS ADHERIDOS</small><strong>164</strong><em class="warn">12 en revisión</em></div><div><small>DEVOLUCIONES PENDIENTES</small><strong>02</strong><em class="warn">requieren atención</em></div><div><small>SOLICITUDES DE ALTA</small><strong>06</strong><em class="up">4 de hoy</em></div></div><div class="home-grid"><section class="panel"><div class="panel-head"><div><p class="eyebrow">ATENCIÓN REQUERIDA</p><h2>Actividad que necesita una decisión</h2></div>${action('Ver devoluciones', 'go:devoluciones', 'btn-link')}</div><div class="attention"><div><b>!</b><span><strong>2 devoluciones esperan validación</strong><small>Revisa el estado físico antes de liberar los tambos.</small></span>${more('go:devoluciones')}</div><div><b>+</b><span><strong>6 solicitudes de alta pendientes</strong><small>Los choferes esperan una respuesta administrativa.</small></span>${more('go:configuracion')}</div></div></section><section class="panel quick"><p class="eyebrow">ACCESOS RÁPIDOS</p><h2>Operación administrativa</h2><button data-action="new-client">＋ <span>Nuevo cliente</span> ›</button><button data-action="new-tank">◉ <span>Registrar tambo</span> ›</button><button data-action="go:devoluciones">↔ <span>Revisar folios</span> ›</button></section></div><section class="panel recent"><div class="panel-head"><div><p class="eyebrow">ACTIVIDAD RECIENTE</p><h2>Últimos movimientos</h2></div>${action('Ver todo', 'go:auditoria', 'btn-link')}</div><div class="activity"><div><b>Devolución reportada</b><small>DEV-2026-000021 · TMB-0002</small><span>Carlos M. · Hoy 10:42</span>${status('Reportada')}</div><div><b>Cliente industrial creado</b><small>MOC025 · 3 tambos asignados</small><span>Administrador · Hoy 09:18</span>${status('Completado')}</div></div></section>`);
}

function renderClients() {
  const rows = state.clients.map(client => `<div class="data-row" data-row="${esc(client.name)} ${client.code} ${client.locality}"><span class="person"><span class="avatar pale">${client.name.slice(0,2).toUpperCase()}</span><span><b>${esc(client.name)}</b><small>${client.code}</small></span></span><span>${status(client.type)}</span><span>${client.locality}</span><span><b>${client.tanks}</b>${client.pending ? `<small class="pending"> · ${client.pending} pendiente</small>` : ''}</span><span>${status('Activo')}</span><span>${action('Ver ficha', `client:${client.code}`, 'btn-small')}${more('client-menu')}</span></div>`).join('');
  shell(`${pageHeader('GESTIÓN DE CLIENTES', 'Clientes', 'Expedientes generales agrupados por localidad, tipo y activos prestados.', action('Nuevo cliente', 'new-client', 'btn-primary') + more('client-options'))}${toolbar('Buscar por nombre, código, RFC o teléfono')}<section class="panel table-panel"><div class="table-meta"><b>${state.clients.length}</b> expedientes mostrados <span>Última actualización: hace 2 min</span></div>${table(rows, ['Cliente', 'Tipo', 'Localidad', 'Tambos', 'Estado', ''])}</section>`);
}

function renderTanks() {
  const rows = state.tanks.map(tank => `<div class="data-row"><span class="person"><span class="tank-mark">◉</span><span><b>${tank.code}</b><small>activo físico único</small></span></span><span><b>${tank.capacity}</b><small>Modelo estándar</small></span><span>${tank.client}</span><span>${status(tank.status)}</span><span>${action('Ver detalle', `tank:${tank.code}`, 'btn-small')}${more('tank-menu')}</span></div>`).join('');
  shell(`${pageHeader('CONTROL FÍSICO', 'Activos / Tambos', 'Cada tambo conserva una identidad, capacidad, estado e historial propio.', action('Nuevo tambo', 'new-tank', 'btn-primary') + more('tank-options'))}${toolbar('Buscar por código físico o cliente')}<section class="panel table-panel"><div class="table-meta"><b>${state.tanks.length}</b> activos en el catálogo <span><i class="dot green"></i> Disponible &nbsp; <i class="dot blue"></i> Adherido &nbsp; <i class="dot orange"></i> Revisión</span></div>${table(rows, ['Identificador físico', 'Capacidad / modelo', 'Cliente actual', 'Estado', ''])}</section>`);
}

function renderReturns() {
  const rows = state.returns.map(item => `<div class="data-row"><span class="person"><span class="folio">#</span><span><b>${item.folio}</b><small>Hoy · operación individual</small></span></span><span><b>${item.client}</b><small>Cliente industrial</small></span><span><b>${item.tank}</b><small>${item.capacity}</small></span><span>${status(item.status)}</span><span>${action(item.status === 'Reportada' ? 'Revisar' : 'Detalle', `return:${item.folio}`, 'btn-small')}${more('return-menu')}</span></div>`).join('');
  shell(`${pageHeader('CONTROL ADMINISTRATIVO', 'Devoluciones / Folios', 'Cada folio representa un solo tambo y requiere una decisión administrativa.', action('Actualizar bandeja', 'refresh', 'btn-quiet'))}${toolbar('Buscar por folio, cliente o código físico')}<section class="panel table-panel"><div class="table-meta"><b>${state.returns.length}</b> folios localizados <span>Los históricos son inmutables</span></div>${table(rows, ['Folio', 'Cliente', 'Tambo', 'Estado', ''])}</section>`);
}

function renderAudit() {
  shell(`${pageHeader('TRAZABILIDAD', 'Auditoría', 'Registro de cambios administrativos y decisiones sobre activos y folios.', action('Exportar consulta', 'refresh', 'btn-quiet'))}${toolbar('Buscar por usuario, entidad, folio o acción')}<section class="panel table-panel"><div class="table-meta"><b>48</b> eventos recientes <span>Los eventos son de solo lectura.</span></div><div class="activity"><div><b>Devolución validada</b><small>DEV-2026-000017 · TMB-0006 pasó a disponible</small><span>Administrador · Hoy 11:04</span>${status('Validada')}</div><div><b>Configuración actualizada</b><small>Se modificó una opción operativa</small><span>Administrador · Hoy 10:16</span>${status('Completado')}</div><div><b>Cliente industrial creado</b><small>MOC025 · 3 tambos asignados</small><span>Administrador · Hoy 09:18</span>${status('Completado')}</div></div></section>`);
}

function renderConfig() {
  const sw = (key, label, text, locked = false) => `<div class="setting"><div><b>${label}${locked ? '<small class="locked">Control protegido</small>' : ''}</b><p>${text}</p></div><label class="switch"><input type="checkbox" data-setting="${key}" ${state[key] ? 'checked' : ''} ${locked ? 'disabled' : ''}><span></span></label></div>`;
  shell(`${pageHeader('CONTROL DEL SISTEMA', 'Configuración general', 'Administra funciones opcionales sin alterar registros históricos ni reglas de seguridad.', action('Guardar cambios', 'save-settings', 'btn-primary'))}<div class="settings-layout"><aside class="settings-nav"><b>Configuración</b><button class="selected">Operación</button><button>Identificación</button><button>Clientes</button><button>Medidores y ventas</button><button>Devoluciones y tambos</button><button>Notificaciones</button><button>Seguridad</button></aside><div class="settings-main"><div class="config-status"><span>✓</span><div><b>Configuración sincronizada</b><small>Última actualización: hoy a las 10:16 · Administrador</small></div><button data-action="config-history">Ver historial</button></div><section class="settings-section"><p class="eyebrow">OPERACIÓN</p><h2>Comportamiento de la jornada</h2><p class="section-copy">Estas opciones definen qué puede hacer un usuario durante un turno.</p>${sw('jornadaObligatoria', 'Jornada obligatoria antes de operar', 'Impide ventas y devoluciones sin turno abierto', true)}${sw('cierreAutomatico', 'Cierre automático de jornada', 'Cierra operaciones abiertas al cambio de día')}${sw('permitirOffline', 'Permitir operación offline', 'Conserva operaciones pendientes para sincronizarlas después')}</section><section class="settings-section"><p class="eyebrow">IDENTIFICACIÓN</p><h2>Folio físico y QR opcional</h2><p class="section-copy">El identificador principal siempre es el folio o código físico del tambo.</p><div class="qr-setting"><div><b>QR único por cliente</b><p>Activa una vía adicional de identificación rápida. No sustituye el folio físico.</p></div><label class="switch large"><input type="checkbox" data-setting="qrClienteHabilitado" ${state.qrClienteHabilitado ? 'checked' : ''}><span></span></label></div><div class="fixed-rule">Regla fija <b>El folio del tambo continúa siendo la referencia operativa principal.</b></div></section><section class="settings-section"><p class="eyebrow">CLIENTES Y TAMBOS</p><h2>Reglas de asignación</h2><p class="section-copy">La configuración no puede romper los límites por tipo de cliente.</p>${sw('solicitudesChofer', 'Solicitudes de alta por chofer', 'El chofer solicita; administración aprueba')}${sw('multiplesTambosIndustriales', 'Múltiples tambos industriales', 'Solo aplica a industriales; comerciales conservan máximo uno')}</section></div></div>`);
}

function render() { ({ inicio: renderHome, clientes: renderClients, tambos: renderTanks, devoluciones: renderReturns, auditoria: renderAudit, configuracion: renderConfig }[state.view] || renderHome)(); }
function toast(message) { const node = document.querySelector('#toast'); if (!node) return; node.textContent = message; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2200); }
function modal(titleText, body, buttons) { document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop"><div class="modal"><div class="modal-title"><div><p class="eyebrow">ADMINISTRACIÓN</p><h2>${titleText}</h2></div><button class="close" data-action="close">×</button></div><div class="modal-body">${body}</div><div class="modal-actions">${buttons || action('Cerrar', 'close', 'btn-quiet')}</div></div></div>`); bind(); }
function bind() {
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => { state.view = button.dataset.view; render(); });
  document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => {
    const [name, id] = button.dataset.action.split(':');
    if (name === 'go') { state.view = id; return render(); }
    if (name === 'close') return document.querySelector('.modal-backdrop')?.remove();
    if (name === 'new-client') return modal('Nuevo cliente', '<div class="form-grid"><label>Tipo<select><option>Industrial</option><option>Comercial</option></select></label><label>Nombre o razón social<input placeholder="Ej. Empacadora del Valle"></label><label>Localidad<select><option>Mochomera</option><option>Rosario</option></select></label><label>RFC<input placeholder="RFC del cliente"></label></div><div class="fixed-rule">Industrial puede tener múltiples tambos. Comercial máximo uno.</div>', action('Cancelar', 'close', 'btn-quiet') + action('Crear cliente', 'preview', 'btn-primary'));
    if (name === 'new-tank') return modal('Registrar nuevo tambo', '<div class="form-grid"><label>Código físico<input placeholder="TMB-0007"></label><label>Capacidad<select><option>250 L</option><option>600 L</option><option>750 L</option><option>1,100 L</option><option>2,500 L</option></select></label><label>Modelo<input placeholder="Estándar"></label></div>', action('Cancelar', 'close', 'btn-quiet') + action('preview', 'preview', 'btn-primary'));
    if (name === 'client' || name === 'tank' || name === 'return') return modal(name === 'return' ? `Folio ${id}` : `Detalle ${id}`, `<div class="detail-note"><b>Vista de demostración</b><p>La operación real consultará Firestore y aplicará el alcance administrativo correspondiente.</p><p>La identidad física del tambo y su historial no se pueden editar ni eliminar.</p></div>`, action('Cerrar', 'close', 'btn-primary'));
    if (name === 'save-settings') return modal('Confirmar cambios', '<div class="detail-note"><b>Se guardarán únicamente las opciones modificadas.</b><p>El cambio será registrado en la auditoría y no afectará operaciones históricas.</p></div>', action('Cancelar', 'close', 'btn-quiet') + action('Confirmar y guardar', 'preview', 'btn-primary'));
    if (name === 'config-history') return modal('Historial de configuración', '<div class="history"><b>QR por cliente</b><span>Desactivado · Administrador · hoy 10:16</span></div><div class="history"><b>Margen de lectura</b><span>5 dígitos · Administrador · ayer 18:42</span></div>');
    if (name === 'preview') { document.querySelector('.modal-backdrop')?.remove(); return toast('Vista preparada para conectar con Firestore'); }
    if (name === 'refresh') return toast('Información actualizada');
    if (name === 'menu') return document.querySelector('.sidebar')?.classList.toggle('open');
    if (name.includes('options') || name.includes('menu')) return toast('Menú de opciones preparado');
    toast('Acción disponible en la siguiente etapa');
  });
  document.querySelectorAll('[data-setting]').forEach(input => input.onchange = event => { state[event.target.dataset.setting] = event.target.checked; toast('Cambio guardado como borrador local'); });
  document.querySelectorAll('[data-search]').forEach(input => input.oninput = event => { const term = event.target.value.toLowerCase(); document.querySelectorAll('[data-row]').forEach(row => row.hidden = !row.dataset.row.toLowerCase().includes(term)); });
}
render();
