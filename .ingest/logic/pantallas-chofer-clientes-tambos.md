# Diseño de pantallas — Chofer y Clientes con activos prestados

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** propuesta funcional previa a implementación
**Versión:** 1.0
**Alcance:** interfaz y navegación; no autoriza todavía cambios de código ni creación de colecciones

> La pantalla debe reflejar la relación física real: el identificador operativo principal es el folio o identificador físico del tambo. Cada tambo es una unidad independiente ligada a un cliente, una localidad y, por la asignación territorial, a un chofer. Un cliente comercial puede tener como máximo uno y un cliente industrial puede tener varios. Las devoluciones son operaciones foliadas y el archivado exige que no queden tambos asignados. El QR único por cliente es una función opcional controlada desde Configuración.

## 1. Principios de interfaz

La pantalla no debe presentar el tambo como un número abstracto dentro del cliente. Debe mostrar cada activo con su código físico, capacidad, modelo y estado. De esta manera el chofer y administración pueden identificar exactamente qué unidad se entregó, cuál regresó y cuál continúa en poder del cliente.

Las acciones secundarias se colocarán en el menú de tres puntos aprobado para la aplicación. Las acciones no disponibles se mostrarán bloqueadas con una explicación breve cuando sea importante evitar errores operativos. La interfaz nunca debe confiar únicamente en ocultar botones: los permisos y las reglas de Firestore deberán imponer las mismas restricciones.

## 2. Pantalla Chofer — resumen principal

La pantalla del chofer conservará el contexto actual de usuario, vehículo, medidor, localidades y turno. Se añadirá un resumen operativo de activos sin convertirlo en una pantalla administrativa.

### Estructura propuesta

```text
[Encabezado]
Nombre del chofer | estado del turno | vehículo | medidor

[Resumen del turno]
Ventas comerciales | ventas industriales | créditos | efectivo esperado

[Mi cartera]
Localidad A
  Cliente 001
  Cliente 002
Localidad B
  Cliente 003

[Acciones principales]
Nueva venta | Clientes | Créditos | Cerrar turno

[Actividad pendiente]
Devoluciones reportadas | solicitudes de alta | incidencias
```

El chofer solo ve clientes de sus localidades asignadas. La identificación principal en campo es el identificador o folio físico del tambo. No ve activos, clientes ni devoluciones de otra cartera. El QR no sustituye al identificador físico: solo se muestra si la configuración global `qrClienteHabilitado` está activa.

## 3. Ficha del cliente dentro de Chofer

Al abrir un cliente, la ficha debe mostrar primero la información necesaria para atenderlo y después el estado de sus activos.

```text
Cliente: nombre o razón social
Identificador del tambo: TMB-001
Código de cliente: MOC001
Localidad: Mochomera
Tipo: Comercial | Industrial
Tarifa vigente
Teléfono
QR de cliente: disponible solo si está habilitado en Configuración

Activos prestados
  TMB-001 | 250 L | adherido
  TMB-002 | 600 L | adherido

[ Nueva venta ] [ Registrar devolución ] [ ⋮ ]
```

Para un cliente comercial se muestra como máximo un activo. Para un cliente industrial se muestra una lista de tambos, no un solo campo singular. Cada fila debe incluir un botón o menú para operar exclusivamente sobre ese tambo.

El chofer podrá consultar el activo y registrar una devolución física reportada. No podrá cambiar la capacidad, reasignar el tambo a otro cliente, validar la devolución ni archivar al cliente.

## 4. Flujo de devolución desde Chofer

El botón `Registrar devolución` abre un modal, no una pantalla que pierda el contexto del cliente. El modal debe identificar primero el tambo por su folio o código físico. El escaneo QR del cliente es opcional y solo aparece cuando `qrClienteHabilitado = true`. Si el QR está desactivado, se ocultan el botón y el lector QR, y se conserva la búsqueda manual por identificador del tambo.

### Cliente comercial

```text
Seleccionar el único tambo adherido
Confirmar código físico
Registrar observaciones
[Generar devolución]
```

### Cliente industrial

```text
Seleccionar uno o varios tambos a devolver
Cada tambo aparece como una fila independiente
Identificar cada unidad por folio o código físico
Confirmar código físico de cada unidad
Registrar observaciones por unidad
[Generar folios de devolución]
```

Aunque se seleccionen varios tambos en una misma visita, el sistema debe generar un folio independiente por cada `activoId`. La pantalla debe mostrar el resultado:

```text
DEV-2026-000021 | TMB-001 | 250 L | reportada
DEV-2026-000022 | TMB-002 | 600 L | reportada
```

El chofer puede consultar el folio después de guardarlo. El estado inicial no libera el tambo; la devolución debe ser recibida y validada por administración.

## 5. Pantalla Clientes — panel administrativo

La pantalla administrativa de clientes debe separar el expediente del cliente de los activos físicos adheridos.

### Lista y filtros

| Filtro | Resultado |
|---|---|
| Nombre, teléfono o código | Localiza el expediente general. |
| Localidad | Agrupa clientes por zona. |
| Tipo | Distingue comerciales e industriales. |
| Estado | Activo, pendiente, inactivo o archivado. |
| Tiene tambo | Con tambo, sin tambo o devolución pendiente. |
| Capacidad | Filtra por 250, 600, 750, 1,100 o 2,500 L. |
| Estado del activo | Adherido, disponible, en devolución, revisión o baja. |

La lista debe mostrar indicadores resumidos, no una tabla repetida por cada activo:

```text
Cliente industrial | MOC014 | 3 tambos adheridos | 1 devolución pendiente
Cliente comercial  | MOC015 | 1 tambo de 250 L  | sin devolución
```

## 6. Alta y edición de clientes

La sección de cliente debe incluir un bloque explícito llamado **Activos prestados**.

```text
Tipo de cliente: [Comercial ▼]

Activos prestados:
[ ] Requiere tambo
Capacidad: [250 L ▼]
Modelo: [modelo configurado ▼]
Activo disponible: [buscar por código físico]
[Asignar tambo]
```

Reglas del formulario:

| Condición | Comportamiento |
|---|---|
| Comercial | Permite cero o un tambo. El botón `Agregar otro tambo` no aparece. |
| Industrial | Permite agregar múltiples filas de tambo. |
| Tambo no disponible | Impide asignarlo y muestra su estado actual. |
| Cliente con devolución pendiente | Impide una asignación contradictoria hasta resolverla. |
| Cambio industrial a comercial con varios tambos | Bloquea el cambio y explica que deben devolverse los excedentes. |
| Capacidad no seleccionada | Impide guardar la asignación. |

El alta de un cliente comercial puede seleccionar 250 L por defecto, pero administración debe poder elegir otra capacidad autorizada. El alta de un cliente industrial puede agregar varios tambos con capacidades distintas.

## 7. Detalle administrativo del cliente

El detalle debe tener secciones independientes y colapsables:

```text
[Datos generales]
[Datos fiscales]
[Localidad y código del cliente]
[Activos prestados]
[Devoluciones y folios]
[Ventas y créditos]
[Auditoría]
```

En **Activos prestados**, cada unidad se muestra así:

| Código físico | Capacidad | Modelo | Estado | Folio pendiente |
|---|---:|---|---|---|
| TMB-001 | 250 L | estándar | adherido | — |
| TMB-002 | 600 L | reforzado | en devolución | DEV-2026-000022 |

En **Devoluciones y folios**, el administrador puede recibir, revisar, validar o rechazar una devolución. El rechazo exige motivo. La validación cambia el activo a `disponible` o `en_revision` y retira únicamente ese activo de la lista vigente del cliente.

## 8. Archivado del cliente

El botón debe llamarse `Archivar cliente`, no `Eliminar cliente`.

Antes de mostrar la confirmación, la pantalla debe consultar los activos vigentes. El resultado debe ser inequívoco:

```text
Cliente sin activos asignados
[Archivar cliente]
```

O bien:

```text
No se puede archivar todavía.
Este cliente conserva 2 tambos asignados:
TMB-001 — 250 L
TMB-002 — 600 L

Primero registra y valida sus devoluciones.
[Ver devoluciones]
```

Para un cliente industrial, devolver uno de varios tambos no habilita el archivado. El botón permanece bloqueado hasta que `activoTamboIds` esté vacío y no existan activos adheridos relacionados en Firestore.

## 9. Mapa de acciones, destinos y datos

| Acción | Pantalla destino | Colecciones leídas | Colecciones escritas | Rol |
|---|---|---|---|---|
| Ver cliente | Detalle de cliente | `clientes`, `activos_tambos`, `asignaciones_localidades` | Ninguna | Admin o chofer con alcance |
| Solicitar alta | Modal de solicitud | `localidades` | `solicitudes_alta_clientes` | Chofer |
| Asignar tambo | Detalle de cliente | `clientes`, `activos_tambos` | Cliente, activo, movimiento y auditoría mediante operación autorizada | Admin |
| Registrar devolución | Modal de devolución | Cliente, localidad y activos propios | `devoluciones_tambos`, movimiento y auditoría | Chofer o vendedor autorizado |
| Identificar con QR | Modal de identificación opcional | `clientes`, QR habilitado en configuración | Ninguna | Chofer, solo si `qrClienteHabilitado = true` |
| Validar devolución | Panel de devoluciones | `devoluciones_tambos`, activo y cliente | Estado de devolución, activo, cliente, movimiento y auditoría | Admin |
| Agregar tambo industrial | Detalle de cliente | Cliente y activos disponibles | Cliente, activo, movimiento y auditoría | Admin |
| Archivar cliente | Detalle de cliente | Cliente y activos adheridos | Estado del cliente y auditoría | Admin, solo sin activos |
| Consultar folio | Historial del cliente/activo | `devoluciones_tambos` | Ninguna | Según alcance |

## 10. Reglas de experiencia y errores

El borrado del contenido de un campo de cantidad no debe eliminar un activo ni una devolución. Los campos de folio y código físico deben validarse antes de guardar. Un folio ya existente debe mostrar un error de duplicado y conservar el formulario para corrección.

Cuando no haya conexión, la pantalla puede conservar un borrador local de la devolución, pero no debe presentar el folio como confirmado hasta que la operación haya sido aceptada por Firestore. El borrador debe identificar el cliente y los activos seleccionados para evitar una devolución accidental de otra cartera.

## 11. Criterios de aceptación visual

1. El chofer ve cada tambo individual con código físico, capacidad y estado.
2. El cliente comercial no presenta controles para agregar un segundo tambo.
3. El cliente industrial presenta una lista de activos y permite seleccionar devoluciones parciales.
4. Cada activo devuelto produce y muestra un folio independiente.
5. La devolución parcial no elimina los activos industriales restantes.
6. La pantalla impide visualmente intentar archivar un cliente con activos asignados.
7. El administrador puede consultar el historial de cada tambo sin mezclarlo con el historial de otro.
8. El código del cliente y el código físico del tambo aparecen como identificadores distintos.
9. El identificador principal de campo es el folio o código físico del tambo.
10. El QR por cliente aparece únicamente cuando Configuración lo habilita; apagado, no se muestra el botón ni el modal QR.
11. No se muestran mapas ni GPS en estas pantallas.
12. No se modifica código hasta aprobar esta propuesta.
