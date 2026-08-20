# Matriz de navegación y datos — INGEST

**Estado:** propuesta previa a implementación
**Regla:** ningún botón, colección o consulta se implementa hasta aprobar su fila correspondiente.

## 1. Principios

La interfaz se construirá por pantallas y funciones verticales. Cada acción tendrá un destino único, una colección explícita, una operación permitida y un conjunto de datos definido. La pantalla no mostrará botones de módulos que todavía no tengan contrato aprobado.

Firestore será la única fuente de datos de INGEST. La aplicación no creará colecciones automáticamente durante la primera etapa; las colecciones se crearán cuando exista una función aprobada que las use.

## 2. Primera pantalla limpia

| Elemento | Estado inicial | Acción o colección |
|---|---|---|
| Marca INGEST | Visible | Ninguna. Solo identidad visual. |
| Menú lateral | No se muestra todavía | Pendiente de aprobar navegación. |
| Tarjetas de estado | Retiradas | No llaman colecciones. |
| Texto provisional de arquitectura | Retirado | No forma parte de la aplicación. |
| Botón de menú | Retirado temporalmente | Se agregará únicamente al aprobar el mapa de navegación. |

## 3. Propuesta de navegación pendiente de aprobación

| ID | Botón/pantalla | Destino | Colección principal | Operación | Datos que mostraría |
|---|---|---|---|---|---|
| NAV-01 | Iniciar sesión | `pantalla-login` | Firebase Authentication | `signInWithEmailAndPassword` | Correo, contraseña, estado de sesión y error. |
| NAV-02 | Inicio | `pantalla-inicio` | Ninguna en la primera versión | Lectura de sesión | Nombre, rol y accesos aprobados. |
| NAV-03 | Productos | `pantalla-productos` | `productos` | Lectura; alta/edición solo tras aprobar permisos | Nombre, presentación, unidad, precio y estado. |
| NAV-04 | Nuevo producto | `modal-producto` | `productos` | Crear | Nombre, unidad de medida, tamaño, precio y activo. |
| NAV-05 | Inventario | `pantalla-inventario` | `productos`, `movimientos_inventario` | Lectura | Existencia por producto y movimientos inmutables. |
| NAV-06 | Venta directa | `pantalla-venta` | `ventas`, `movimientos_inventario`, `movimientos_caja` | Transacción | Productos, cantidades, total, forma de pago y fecha. |
| NAV-07 | Caja abierta | `pantalla-caja` | `movimientos_caja`, `cierres_caja` | Lectura y cierre aprobado | Total actual, movimientos posteriores al último cierre e histórico. |
| NAV-08 | Cerrar caja | `modal-cierre-caja` | `cierres_caja` | Crear cierre inmutable | Total declarado, total calculado, diferencia, usuario y fecha. |
| NAV-09 | Usuarios | `pantalla-usuarios` | Firebase Authentication, `usuarios` | Administración | Correo, nombre, rol, activo y última actividad. |
| NAV-10 | Configuración | `pantalla-configuracion` | `_meta/branding`, `_meta/system_setup` | Lectura/edición administrativa | Nombre comercial, logo, teléfonos y preferencias. |

## 4. Colecciones que no deben crearse todavía

Mientras no se aprueben las pantallas correspondientes, no se crearán `productos`, `ventas`, `movimientos_inventario`, `movimientos_caja`, `cierres_caja`, `clientes`, `rutas`, `vehiculos`, `medidores`, `creditos`, `llenados_planta` ni otras colecciones de negocio.

La primera excepción será la colección `usuarios`, únicamente cuando se apruebe el flujo de perfil y rol. La cuenta de Authentication y su perfil Firestore serán conceptos separados: Authentication demuestra identidad; `usuarios/{uid}` almacena el perfil operativo.

## 5. Contrato de aprobación por pantalla

Antes de codificar una fila se deben aprobar:

| Pregunta | Respuesta necesaria |
|---|---|
| ¿Quién ve la pantalla? | Rol o usuario autenticado. |
| ¿Qué botón inicia la acción? | Nombre exacto y estado habilitado/deshabilitado. |
| ¿A qué pantalla dirige? | Ruta o componente destino. |
| ¿Qué colección consulta? | Colección y filtros. |
| ¿Qué puede escribir? | Campos permitidos y operación. |
| ¿Qué no puede hacer? | Edición, borrado o acceso fuera de alcance. |
| ¿Qué ocurre si falla? | Estado de error, reintento y persistencia. |
| ¿Cómo se prueba? | Caso válido, inválido y duplicado. |

## 6. Decisión pendiente

La siguiente aprobación recomendada es únicamente **NAV-01: Inicio de sesión**. Hasta aprobarla, la aplicación debe permanecer como una pantalla visual limpia sin menú funcional, sin consultas Firestore y sin botones de módulos.
