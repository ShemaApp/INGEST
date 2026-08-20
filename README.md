# INGEST — Inventario y Gestión

INGEST es la nueva base de una aplicación de inventario y gestión construida desde cero. El proyecto utiliza **JavaScript**, HTML y CSS sin TypeScript y sin bundler en el frontend.

## Decisión técnica inicial

La primera etapa utiliza módulos nativos del navegador (`<script type="module">`) para que cada archivo sea visible, fácil de probar y sencillo de depurar. No se reutilizan reglas, índices, colecciones ni lógica heredada de Firebase.

La base de datos prevista es MySQL/MariaDB, pero el navegador no se conectará directamente a ella. Cuando se apruebe el contrato de datos, se agregará una API backend en JavaScript que validará autenticación, permisos, entradas y transacciones SQL.

```text
Frontend PWA sin build
        |
        | HTTPS / JSON
        v
API Node.js en JavaScript
        |
        | SQL parametrizado
        v
MySQL / MariaDB
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

No se deben guardar contraseñas, credenciales SQL o secretos en el frontend ni en GitHub. Las variables privadas pertenecerán únicamente al backend y se cargarán mediante variables de entorno.

## Ejecutar localmente

El frontend no requiere instalación ni build. Desde la raíz del proyecto puede servirse con cualquier servidor HTTP estático. Por ejemplo, si Python está instalado:

```bash
python3 -m http.server 4173
```

Después abre `http://localhost:4173` en el navegador. No se recomienda abrir `index.html` directamente con `file://`, porque los módulos ES pueden estar restringidos por el navegador.

## Próximo paso

Antes de construir autenticación o base de datos se presentará el modelo visual de la pantalla de inicio de sesión y se aprobarán sus campos, estados y flujo de error.
