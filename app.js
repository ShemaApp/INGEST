const app = document.querySelector('#app');

function render() {
  app.innerHTML = `
    <header class="topbar">
      <div class="brand-mark" aria-hidden="true">I</div>
      <div>
        <p class="eyebrow">INGEST</p>
        <h1>Inventario y Gestión</h1>
      </div>
    </header>
    <main class="empty-workspace" aria-labelledby="screen-title">
      <p class="eyebrow">PANTALLA INICIAL</p>
      <h2 id="screen-title">Espacio de trabajo</h2>
      <p>La navegación y las funciones se definirán antes de implementarse.</p>
    </main>
  `;
}

render();
