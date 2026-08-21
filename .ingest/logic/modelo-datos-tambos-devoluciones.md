# Modelo de datos Firestore — Tambos, folios y devoluciones parciales

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** propuesta técnica previa a implementación
**Versión:** 1.0
**Motor:** Cloud Firestore

> La fuente de verdad del activo físico es `activos_tambos`. La fuente de verdad de cada devolución es `devoluciones_tambos`. El documento del cliente solo mantiene una proyección de sus tambos vigentes; no sustituye el historial ni autoriza por sí mismo una devolución.

## 1. Decisión estructural

El modelo debe separar tres conceptos que no deben mezclarse:

| Concepto | Colección | Propósito |
|---|---|---|
| Estado actual del tambo | `activos_tambos` | Saber dónde está ahora, a quién está adherido y si puede asignarse. |
| Operación de devolución | `devoluciones_tambos` | Registrar el folio individual y su flujo administrativo. |
| Historial inmutable | `movimientos_activos_tambos` | Explicar cada alta, asignación, devolución, revisión, rechazo o baja. |

La relación con el cliente se mantiene en `clientes` como referencia de consulta rápida. Para clientes comerciales se permite como máximo un activo; para clientes industriales se permiten varios.

## 2. Colección `activos_tambos`

Ruta:

```text
activos_tambos/{activoId}
```

Cada documento representa **un tambo físico individual**. Nunca se crea un segundo documento para el mismo código físico.

```js
{
  activoId: "tambo_001",
  codigoFisico: "TMB-0001",
  capacidadLitros: 250,
  modelo: "estandar",
  estado: "adherido",

  clienteId: "cliente_001",
  localidadId: "localidad_mochomera",

  fechaAsignacion: Timestamp,
  fechaDevolucion: null,

  creadoPorUid: "admin_uid",
  creadoEn: Timestamp,
  actualizadoPorUid: "admin_uid",
  actualizadoEn: Timestamp
}
```

### Estados permitidos

```text
disponible
adherido
en_devolucion
en_revision
baja
```

### Invariantes

| Estado | `clienteId` | `localidadId` | Regla |
|---|---|---|---|
| `disponible` | `null` | `null` | Puede asignarse. |
| `adherido` | Obligatorio | Obligatorio | Está con un cliente. |
| `en_devolucion` | Obligatorio | Obligatorio | Hay un folio abierto; todavía no se libera. |
| `en_revision` | Depende del caso | Depende del caso | No puede asignarse. |
| `baja` | `null` | `null` | Retirado definitivamente; conserva historial. |

`codigoFisico` y `activoId` son permanentes. No se editan para corregir duplicados. Una discrepancia se resuelve mediante revisión e incidencia.

## 3. Colección `clientes`

Ruta:

```text
clientes/{clienteId}
```

El cliente conserva el resumen de activos vigentes:

### Cliente comercial

```js
{
  tipo: "comercial",
  requiereTambo: true,
  activoTamboIds: ["tambo_001"],
  cantidadTambosAsignados: 1,
  capacidadTotalTambosLitros: 250
}
```

### Cliente industrial

```js
{
  tipo: "industrial",
  requiereTambo: true,
  activoTamboIds: ["tambo_001", "tambo_002", "tambo_003"],
  cantidadTambosAsignados: 3,
  capacidadTotalTambosLitros: 1450
}
```

`activoTamboIds` es una proyección para cargar la ficha del cliente rápidamente. La fuente de verdad es el conjunto de documentos en `activos_tambos` que tienen `clienteId` igual al cliente y `estado` igual a `adherido` o `en_devolucion` según el flujo.

La aplicación no debe confiar exclusivamente en `cantidadTambosAsignados`. Antes de archivar, reasignar o cambiar el tipo de cliente, debe comprobarse el estado real de los activos mediante una operación autorizada.

## 4. Colección `devoluciones_tambos`

Ruta:

```text
devoluciones_tambos/{devolucionId}
```

Cada documento representa la devolución de **un solo tambo**. Incluso si el cliente industrial devuelve cinco unidades en una misma visita, se crean cinco documentos y cinco folios.

```js
{
  devolucionId: "devolucion_001",
  folioDevolucion: "DEV-2026-000001",

  activoId: "tambo_001",
  codigoFisicoReportado: "TMB-0001",
  codigoFisicoRecibido: null,
  capacidadLitrosEsperada: 250,
  capacidadLitrosObservada: null,
  modeloEsperado: "estandar",
  modeloObservado: null,

  clienteId: "cliente_industrial_001",
  localidadId: "localidad_mochomera",
  tipoCliente: "industrial",

  estado: "reportada",
  motivo: "Terminación de relación",
  observacionesChofer: "",
  observacionesAdministrativas: "",
  resultadoRevision: null,

  reportadoPorUid: "chofer_uid",
  recibidoPorUid: null,
  validadoPorUid: null,
  creadoEn: Timestamp,
  recibidoEn: null,
  validadoEn: null,
  actualizadoEn: Timestamp
}
```

### Unicidad del folio

Firestore no ofrece una restricción SQL `UNIQUE` sobre un campo arbitrario. Para garantizar unicidad se recomienda que el proceso de generación reserve el folio mediante una transacción o una función segura:

```text
contadores_folios/devoluciones
{
  prefijo: "DEV",
  periodo: "2026",
  ultimoConsecutivo: 1
}
```

La transacción incrementa el contador y escribe el documento con el folio resultante. Si la escritura falla, la operación debe poder reintentarse sin crear una segunda devolución para el mismo `idempotencyKey`.

## 5. Colección `movimientos_activos_tambos`

Ruta:

```text
movimientos_activos_tambos/{movimientoId}
```

Los movimientos son append-only. No representan el estado actual; representan el historial.

```js
{
  movimientoId: "mov_001",
  activoId: "tambo_001",
  clienteId: "cliente_001",
  localidadId: "localidad_mochomera",
  tipoMovimiento: "devolucion_validada",
  folioDevolucion: "DEV-2026-000001",
  estadoAnteriorActivo: "en_devolucion",
  estadoNuevoActivo: "disponible",
  ejecutadoPorUid: "admin_uid",
  motivo: "Código y capacidad coinciden",
  creadoEn: Timestamp
}
```

Tipos mínimos:

```text
alta
asignacion
devolucion_reportada
devolucion_recibida
devolucion_validada
rechazo_devolucion
enviar_revision
resolver_revision
sustitucion
baja
```

## 6. Relación para devoluciones parciales industriales

La devolución parcial se modela eliminando únicamente el activo validado de la proyección del cliente. Ejemplo inicial:

```text
Cliente industrial
activoTamboIds = [TMB-001, TMB-002, TMB-003]
```

Se valida el folio de `TMB-002`:

```text
TMB-002 → disponible
activoTamboIds = [TMB-001, TMB-003]
cantidadTambosAsignados = 2
```

`TMB-001` y `TMB-003` no se modifican. Cada devolución mantiene su folio, estado y auditoría independiente.

## 7. Colección de auditoría

Ruta:

```text
auditoria_activos_tambos/{eventoId}
```

Campos:

```js
{
  eventoId: "evento_001",
  entidad: "devolucion_tambo",
  entidadId: "devolucion_001",
  folioDevolucion: "DEV-2026-000001",
  activoId: "tambo_001",
  clienteId: "cliente_001",
  accion: "validar",
  estadoAnterior: "recibida",
  estadoNuevo: "validada",
  valoresAnteriores: {...},
  valoresNuevos: {...},
  ejecutadoPorUid: "admin_uid",
  motivo: "Recepción física confirmada",
  creadoEn: Timestamp
}
```

Los documentos de auditoría no se actualizan ni se eliminan.

## 8. Transacciones principales

### A. Reportar devolución

El chofer o usuario operativo autorizado debe:

1. Leer el cliente y el activo.
2. Verificar que el activo esté adherido al cliente.
3. Generar `devolucionId`, `folioDevolucion` e `idempotencyKey`.
4. Cambiar el activo de `adherido` a `en_devolucion`.
5. Crear la devolución con estado `reportada`.
6. Crear el movimiento y la auditoría correspondiente.

Si alguna escritura falla, no debe quedar una devolución visible sin el cambio coherente del activo.

### B. Recibir y validar devolución

El administrador debe:

1. Leer la devolución y el activo dentro de una transacción.
2. Confirmar que el folio esté en estado `reportada` o `recibida`.
3. Comparar código, capacidad, modelo y cliente.
4. Decidir `validada`, `en_revision` o `rechazada`.
5. Actualizar el activo y la devolución.
6. Actualizar la proyección de activos del cliente.
7. Crear movimiento y auditoría.

### C. Devolución parcial industrial

La transacción solo toca el `activoId` del folio actual y retira ese valor de `activoTamboIds`. Nunca recalcula ni sobrescribe la lista sin volver a comprobar los activos vigentes.

## 9. Idempotencia

Toda operación de devolución debe incluir un identificador idempotente generado por el cliente o por el servidor:

```text
idempotencyKey = usuario + dispositivo + operaciónLocalId
```

Se recomienda una colección:

```text
operaciones_idempotencia/{idempotencyKey}
```

Si se repite la misma operación por doble toque, reconexión u operación offline, se devuelve el resultado existente. No se crea otro folio, no se descuenta dos veces el mismo activo y no se genera un segundo movimiento equivalente.

## 10. Archivado y cambios de tipo

Un cliente solo puede archivarse si no existen activos adheridos ni en devolución relacionados con él. Para clientes industriales, `activoTamboIds` debe estar vacío y no debe existir un documento de activo con `clienteId` igual al cliente y estado operativo pendiente.

Un cliente industrial no puede cambiar a comercial mientras conserve más de un activo. Los activos excedentes deben tener devoluciones foliadas y validadas antes del cambio.

## 11. Índices compuestos previstos

```json
{
  "collectionGroup": "devoluciones_tambos",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "estado", "order": "ASCENDING"},
    {"fieldPath": "creadoEn", "order": "DESCENDING"}
  ]
}
```

```json
{
  "collectionGroup": "devoluciones_tambos",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "clienteId", "order": "ASCENDING"},
    {"fieldPath": "estado", "order": "ASCENDING"},
    {"fieldPath": "creadoEn", "order": "DESCENDING"}
  ]
}
```

```json
{
  "collectionGroup": "activos_tambos",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "clienteId", "order": "ASCENDING"},
    {"fieldPath": "estado", "order": "ASCENDING"},
    {"fieldPath": "capacidadLitros", "order": "ASCENDING"}
  ]
}
```

```json
{
  "collectionGroup": "activos_tambos",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "estado", "order": "ASCENDING"},
    {"fieldPath": "capacidadLitros", "order": "ASCENDING"},
    {"fieldPath": "actualizadoEn", "order": "DESCENDING"}
  ]
}
```

Los índices definitivos deben confirmarse con las consultas reales de la interfaz.

## 12. Reglas conceptuales

```text
activos_tambos
  lectura: admin completa; usuario operativo dentro de su alcance
  creación: admin
  cambio adherido → en_devolucion: operación autorizada con folio
  cambio en_devolucion → disponible: admin y devolución validada
  eliminación: prohibida

devoluciones_tambos
  creación: usuario operativo autorizado
  validación/rechazo/revisión: admin
  actualización libre: prohibida
  eliminación: prohibida

movimientos_activos_tambos
  creación: operaciones autorizadas
  actualización/eliminación: prohibidas

auditoria_activos_tambos
  lectura: admin y alcance autorizado
  creación: operación autorizada
  actualización/eliminación: prohibidas
```

Las reglas de producción deben verificar que el usuario no pueda validar una devolución de manera directa si no tiene permiso de administrador, que un folio no pueda cambiarse a dos estados finales y que el archivado del cliente se rechace si queda cualquier tambo pendiente.

## 13. Criterios de aceptación

1. Cada tambo físico tiene un documento único.
2. Un código físico no se duplica ni se reutiliza.
3. Cada devolución representa un solo tambo y tiene un folio único.
4. Una devolución múltiple industrial genera un folio por activo.
5. Validar un folio libera solo el activo indicado.
6. Los demás tambos industriales permanecen adheridos.
7. Un comercial no puede tener más de un activo adherido.
8. Un industrial puede tener múltiples activos.
9. El historial de movimientos nunca se edita ni se elimina.
10. El archivado se rechaza mientras existan activos adheridos o en devolución.
11. Los reintentos no crean folios ni movimientos duplicados.
12. Toda transición de estado deja auditoría.

## 14. Pendientes antes de implementar

1. Confirmar el formato final de `folioDevolucion`.
2. Confirmar si se utilizará Cloud Function o un proceso administrativo seguro para reservar folios.
3. Confirmar la política de recepción física del vendedor de planta.
4. Confirmar si se permitirán fotografías en `en_revision`.
5. Definir la estrategia de migración desde `activoTamboId` singular a `activoTamboIds` para clientes existentes.

No se crearán colecciones ni código de producción hasta aprobar este modelo.
