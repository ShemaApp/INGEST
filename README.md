# INGEST — Inventario y Gestión

INGEST es la nueva base de una aplicación de inventario y gestión construida desde cero. El proyecto utiliza **JavaScript**, HTML y CSS sin TypeScript y sin bundler en el frontend.

## Decisión técnica inicial

La primera etapa utiliza módulos nativos del navegador (`<script type="module">`) para que cada archivo sea visible, fácil de probar y sencillo de depurar. El único proyecto Firebase autorizado es `ingest-manu`; no se reutilizan reglas, índices, colecciones ni lógica heredada de otros proyectos.

La base de datos será **Cloud Firestore** dentro del proyecto Firebase `ingest-manu`. La PWA utilizará los SDK modulares de Firebase por CDN, Authentication y reglas de seguridad. No se reutilizarán datos, colecciones ni reglas de otro proyecto.

```text
PWA Vanilla JavaScript sin build
        |
        | SDK modular Firebase
        v
Firebase Authentication + Cloud Firestore
```

## Estructura actual

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Documento HTML principal. |
| `app.js` | Renderizado y comportamiento inicial. |
| `styles.css` | Estilos responsivos sin framework. |
| `README.md` | Decisiones y reglas del proyecto. |

## Reglas de trabajo

Cada pantalla se diseñará antes de codificarse. Cada función deberá tener un contrato de datos, una validación y una prueba reproducible. No se agregará una colección, tabla o endpoint sin explicar qué pantalla lo utiliza.

Los módulos se implementarán en verticales pequeñas. El primer vertical será inicio de sesión, usuario administrador, producto, venta directa, caja e inventario. Clientes, QR, rutas, repartidores, créditos, jornadas, medidores y planta se incorporarán después de aprobar el núcleo.

No se deben guardar contraseñas, tokens administrativos ni claves privadas en el frontend ni en GitHub. La configuración web de Firebase identifica el proyecto, pero la autorización real se impondrá mediante Authentication y Firestore Security Rules.

## Ejecutar localmente

El frontend no requiere instalación ni build. Desde la raíz del proyecto puede servirse con cualquier servidor HTTP estático. Por ejemplo, si Python está instalado:

```bash
python3 -m http.server 4173
```

Después abre `http://localhost:4173` en el navegador. No se recomienda abrir `index.html` directamente con `file://`, porque los módulos ES pueden estar restringidos por el navegador.

## Próximo paso

Antes de construir módulos de negocio se presentará el modelo visual de la pantalla de inicio de sesión y se aprobarán sus campos, estados y flujo de error. Después se configurarán Authentication y las primeras reglas de Firestore.
