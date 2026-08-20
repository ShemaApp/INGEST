import { firebaseApp, firebaseConfig } from './firebase-init.js';

const app = document.querySelector('#app');

const estadoInicial = {
  seccion: 'inicio',
  menuAbierto: true
};

function render() {
  app.innerHTML = `
    <header class="topbar">
      <button class="icon-button" type="button" data-action="toggle-menu" aria-label="Mostrar u ocultar menú">☰</button>
      <div>
        <p class="eyebrow">INGEST</p>
        <h1>Inventario y Gestión</h1>
      </div>
      <span class="status-pill">Firebase conectado</span>
    </header>
    <div class="layout ${estadoInicial.menuAbierto ? '' : 'layout-menu-collapsed'}">
      <aside class="sidebar" aria-label="Navegación principal">
        <nav>
          <button class="nav-item ${estadoInicial.seccion === 'inicio' ? 'nav-item-active' : ''}" type="button" data-section="inicio">Inicio</button>
          <button class="nav-item" type="button" data-section="productos" disabled>Productos</button>
          <button class="nav-item" type="button" data-section="ventas" disabled>Ventas</button>
          <button class="nav-item" type="button" data-section="inventario" disabled>Inventario</button>
          <button class="nav-item" type="button" data-section="caja" disabled>Caja</button>
        </nav>
      </aside>
      <main class="main-content">
        <section class="hero-section">
          <p class="eyebrow">PRIMERA ETAPA</p>
          <h2>Proyecto reiniciado con una base clara.</h2>
          <p class="lead">Aquí construiremos cada pantalla y función de forma independiente. No hay datos heredados, reglas de Firebase ni dependencias ocultas en esta base.</p>
        </section>
        <section class="status-grid" aria-label="Estado del proyecto">
          <article class="status-card"><span class="card-label">Frontend</span><strong>JavaScript</strong><p>HTML, CSS y módulos nativos.</p></article>
          <article class="status-card"><span class="card-label">Build</span><strong>Sin build</strong><p>Archivos visibles y fáciles de depurar.</p></article>
          <article class="status-card"><span class="card-label">Firebase</span><strong>${firebaseConfig.projectId}</strong><p>Proyecto aislado para INGEST.</p></article>
        </section>
        <section class="next-step">
          <h3>Siguiente función</h3>
          <p>Definir el modelo visual y el contrato de la pantalla de inicio de sesión antes de crear tablas o endpoints.</p>
        </section>
      </main>
    </div>
  `;

  app.querySelector('[data-action="toggle-menu"]').addEventListener('click', () => {
    estadoInicial.menuAbierto = !estadoInicial.menuAbierto;
    render();
  });
}

render();
