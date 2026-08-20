const fs = require('fs');

const archivo = process.argv[2] || '/tmp/firebase_projects_ingest.json';
const contenido = JSON.parse(fs.readFileSync(archivo, 'utf8'));
const proyectos = contenido.result?.projects || contenido.projects || [];
const proyecto = proyectos.find(item => item.projectId === 'ingest-manu');

if (!proyecto) {
  console.error('PROJECT_NOT_FOUND');
  process.exit(2);
}

console.log(JSON.stringify({
  projectId: proyecto.projectId,
  displayName: proyecto.displayName,
  state: proyecto.lifecycleState
}, null, 2));
