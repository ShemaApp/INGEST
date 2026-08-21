# Contrato de API — Clientes industriales, tambos y devoluciones foliadas

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** propuesta técnica previa a implementación
**Versión:** 1.0
**Arquitectura actual:** Firebase Auth + Firestore + Vanilla JS, sin build

> En INGEST, estos endpoints son contratos lógicos. Como el proyecto actualmente no tiene un backend REST separado, se recomienda implementarlos como **Cloud Functions HTTPS callable** o funciones HTTPS equivalentes. La interfaz no debe escribir directamente estados sensibles como `disponible`, `validada`, `rechazada` o `baja`.

## 1. Principios del diseño

La API debe proteger cinco invariantes:

| Invariante | Aplicación |
|---|---|
| Un tambo físico es único | `activoId` y `codigoFisico` nunca se duplican ni se reutilizan. |
| Un folio representa una sola devolución | Una solicitud de devolución solo contiene un `activoId`. |
| Los industriales pueden tener múltiples tambos | Cada activo conserva su documento, estado e historial independientes. |
| La devolución parcial no afecta otros activos | La transacción modifica únicamente el activo incluido en el folio. |
| El archivado requiere devolución total | No se archiva un cliente si existe cualquier tambo `adherido` o `en_devolucion`. |

Todas las operaciones que cambien activos, folios o relaciones deben comprobar el usuario autenticado, el alcance operativo, el estado actual y una clave de idempotencia.

## 2. Convención general

Base conceptual:

```text
/api/v1
```

Encabezados obligatorios en solicitudes que cambien datos:

```http
Authorization: Bearer <Firebase ID token>
Content-Type: application/json
Idempotency-Key: <clave estable por operación>
```

Respuesta exitosa estándar:

```json
{
  "ok": true,
  "data": {},
  "requestId": "req_01J..."
}
```

Respuesta de error estándar:

```json
{
  "ok": false,
  "error": {
    "code": "ASSET_ALREADY_ASSIGNED",
    "message": "El tambo ya está adherido a otro cliente.",
    "details": {}
  },
  "requestId": "req_01J..."
}
```

La API debe usar fechas Firestore `Timestamp` en almacenamiento. En transporte puede usar ISO 8601 UTC.

## 3. Autorización por operación

| Operación | Admin | Repartidor | Vendedor de planta |
|---|---:|---:|---:|
| Consultar clientes de su alcance | Sí | Sí | Sí, según pantalla y alcance definido |
| Crear solicitud de alta de cliente | Sí | Sí | Según contrato de planta |
| Crear tambo físico en catálogo | Sí | No | No |
| Asignar tambo a cliente | Sí | Solicita; no fuerza estado final | No, salvo autorización futura |
| Reportar devolución | Sí | Sí | Según alcance operativo |
| Recibir físicamente devolución | Sí | No | No, salvo autorización futura |
| Validar devolución | Sí | No | No |
| Rechazar devolución | Sí | No | No |
| Enviar a revisión | Sí | No | No |
| Archivar cliente | Sí, después de devolución total | Solicita; no ejecuta | No |

El servidor debe basarse en el perfil de Firestore y no en un campo genérico como `isStaff`.

## 4. Endpoints de clientes

### 4.1 Crear cliente industrial

```http
POST /api/v1/clientes
```

El endpoint crea el expediente del cliente y, opcionalmente, asigna tambos ya disponibles. Para evitar operaciones parciales, la creación del cliente y la asignación inicial deben ejecutarse en una única transacción. Si el cliente se crea sin tambos, se envía `activoTamboIds: []`.

Solicitud:

```json
{
  "tipo": "industrial",
  "nombre": "Cliente Industrial Ejemplo",
  "telefono": "6690000000",
  "localidadId": "localidad_mochomera",
  "datosFiscales": {
    "razonSocial": "Cliente Industrial Ejemplo S.A. de C.V.",
    "rfc": "XAXX010101000",
    "codigoPostalFiscal": "80000",
    "regimenFiscal": "601",
    "usoCfdi": "G03",
    "correoFiscal": "facturacion@example.com"
  },
  "activoIdsIniciales": ["tambo_001", "tambo_002"],
  "origen": "administracion"
}
```

Reglas:

1. `tipo` debe ser `industrial`.
2. Todos los `activoIdsIniciales` deben existir y estar `disponible`.
3. No se permite repetir un `activoId` en la misma solicitud.
4. No se permite asignar un activo ya adherido, en devolución, en revisión o dado de baja.
5. El cliente recibe su código de localidad según el contrato del Módulo 4.
6. La respuesta incluye el cliente, los activos asignados y los movimientos generados.

Respuesta:

```json
{
  "ok": true,
  "data": {
    "clienteId": "cliente_industrial_001",
    "tipo": "industrial",
    "codigoCliente": "MOC025",
    "activoTamboIds": ["tambo_001", "tambo_002"],
    "cantidadTambosAsignados": 2,
    "asignaciones": [
      {"activoId": "tambo_001", "estado": "adherido"},
      {"activoId": "tambo_002", "estado": "adherido"}
    ]
  }
}
```

### 4.2 Consultar cliente con activos

```http
GET /api/v1/clientes/{clienteId}?include=activos,devoluciones_pendientes
```

La respuesta debe obtener los activos reales desde `activos_tambos`, no confiar únicamente en `activoTamboIds`.

### 4.3 Agregar un tambo a un cliente industrial

```http
POST /api/v1/clientes/{clienteId}/activos
```

Solicitud:

```json
{
  "activoId": "tambo_003",
  "motivo": "Aumento de capacidad operativa"
}
```

Solo se permite cuando el cliente está activo y es `industrial`. Para un cliente `comercial`, la operación falla si ya tiene un activo adherido.

### 4.4 Solicitar archivado

```http
POST /api/v1/clientes/{clienteId}/archivado
```

La operación no debe borrar el cliente. Debe cambiarlo a `archivado` únicamente cuando la consulta transaccional confirme que no existen tambos `adherido` ni `en_devolucion`.

Solicitud:

```json
{
  "motivo": "Terminación de relación comercial"
}
```

Si quedan activos pendientes, responder:

```json
{
  "ok": false,
  "error": {
    "code": "CLIENT_HAS_ASSIGNED_TANKS",
    "message": "El cliente no puede archivarse mientras conserve tambos asignados.",
    "details": {
      "activosPendientes": ["tambo_001", "tambo_004"],
      "cantidadPendiente": 2
    }
  }
}
```

## 5. Endpoints de activos físicos

### 5.1 Crear activo físico

```http
POST /api/v1/activos-tambos
```

Solo administración puede crear el registro maestro.

Solicitud:

```json
{
  "codigoFisico": "TMB-0007",
  "capacidadLitros": 600,
  "modelo": "estandar",
  "observaciones": "Alta de almacén"
}
```

El servidor debe comprobar que `codigoFisico` no exista. La capacidad no identifica por sí sola al activo: dos tambos de 600 litros siguen siendo dos activos distintos.

### 5.2 Consultar disponibilidad

```http
GET /api/v1/activos-tambos?estado=disponible&capacidadLitros=600
```

### 5.3 Consultar historial del activo

```http
GET /api/v1/activos-tambos/{activoId}/historial
```

La respuesta reúne `movimientos_activos_tambos`, devoluciones y auditoría relacionada. No permite editar el historial.

## 6. Endpoints de devoluciones foliadas

### 6.1 Reportar devolución por un tambo

```http
POST /api/v1/devoluciones-tambos
```

Este es el endpoint que utiliza el chofer. No recibe una lista de tambos: recibe un único `activoId`.

Solicitud:

```json
{
  "clienteId": "cliente_industrial_001",
  "activoId": "tambo_002",
  "codigoFisicoReportado": "TMB-0002",
  "observacionesChofer": "Entregado en almacén",
  "motivo": "Terminación de relación"
}
```

La transacción debe:

1. Confirmar que el cliente existe y está activo.
2. Confirmar que el activo pertenece al cliente.
3. Confirmar que el activo está `adherido`.
4. Generar un `devolucionId`, `folioDevolucion` e `idempotencyKey`.
5. Cambiar el activo a `en_devolucion`.
6. Crear la devolución en estado `reportada`.
7. Crear movimiento y auditoría.

Respuesta:

```json
{
  "ok": true,
  "data": {
    "devolucionId": "devolucion_001",
    "folioDevolucion": "DEV-2026-000001",
    "activoId": "tambo_002",
    "estado": "reportada"
  }
}
```

Si un cliente industrial devuelve tres tambos, la aplicación llama tres veces al endpoint o a una operación de lote explícita; nunca se guarda un folio ambiguo que represente varios activos.

### 6.2 Reportar varias devoluciones industriales en una visita

Este endpoint es opcional. Se recomienda como comodidad de interfaz, pero internamente debe crear una operación individual por activo.

```http
POST /api/v1/devoluciones-tambos/lote
```

Solicitud:

```json
{
  "clienteId": "cliente_industrial_001",
  "activos": [
    {"activoId": "tambo_001", "codigoFisicoReportado": "TMB-0001"},
    {"activoId": "tambo_002", "codigoFisicoReportado": "TMB-0002"}
  ],
  "motivo": "Terminación de relación parcial",
  "observacionesChofer": "Se entregan dos de cinco tambos"
}
```

Respuesta:

```json
{
  "ok": true,
  "data": {
    "devoluciones": [
      {"activoId": "tambo_001", "folioDevolucion": "DEV-2026-000010", "estado": "reportada"},
      {"activoId": "tambo_002", "folioDevolucion": "DEV-2026-000011", "estado": "reportada"}
    ],
    "activosQuePermanecenAdheridos": ["tambo_003", "tambo_004", "tambo_005"]
  }
}
```

El lote debe ser atómico respecto a la validación inicial: si un activo no pertenece al cliente, no se deben reportar parcialmente los demás sin informar claramente el resultado. La alternativa más simple y robusta es procesar cada operación con su propia clave idempotente y devolver resultados individuales.

### 6.3 Consultar un folio

```http
GET /api/v1/devoluciones-tambos/folio/{folioDevolucion}
```

La consulta debe devolver el folio, activo, cliente, estado actual, responsables, fechas, observaciones y decisión administrativa.

### 6.4 Consultar bandeja administrativa

```http
GET /api/v1/devoluciones-tambos?estado=reportada&orderBy=creadoEn&direction=desc
```

Filtros previstos:

```text
estado
clienteId
activoId
localidadId
tipoCliente
capacidadLitros
reportadoPorUid
fechaDesde
fechaHasta
```

### 6.5 Recibir físicamente una devolución

```http
POST /api/v1/devoluciones-tambos/{devolucionId}/recibir
```

Solo administración, o un rol futuro explícitamente autorizado, puede cambiar `reportada` a `recibida`.

Solicitud:

```json
{
  "codigoFisicoRecibido": "TMB-0002",
  "capacidadLitrosObservada": 600,
  "modeloObservado": "estandar",
  "observacionesAdministrativas": "Recibido para revisión"
}
```

La recepción no libera el activo. El activo continúa `en_devolucion`.

### 6.6 Validar devolución

```http
POST /api/v1/devoluciones-tambos/{devolucionId}/validar
```

Solicitud:

```json
{
  "resultadoRevision": "Código, capacidad y modelo coinciden.",
  "observacionesAdministrativas": "Activo apto para inventario"
}
```

La transacción exige que el folio esté `reportada` o `recibida`, que el usuario sea administrador y que no exista otra devolución finalizada para el mismo activo que contradiga el estado actual.

Resultado atómico:

```text
devoluciones_tambos.estado = validada
activos_tambos.estado = disponible
activos_tambos.clienteId = null
activos_tambos.localidadId = null
clientes.activoTamboIds = elimina únicamente activoId
clientes.cantidadTambosAsignados = recuento verificado
movimientos_activos_tambos = nuevo movimiento
auditoria_activos_tambos = nuevo evento
```

### 6.7 Enviar a revisión

```http
POST /api/v1/devoluciones-tambos/{devolucionId}/en-revision
```

Solicitud obligatoria:

```json
{
  "motivoRevision": "Capacidad observada no coincide con el registro",
  "observacionesAdministrativas": "Separar para inspección"
}
```

Resultado:

```text
devolucion.estado = en_revision
activo.estado = en_revision
activo no disponible para nueva asignación
relación con cliente se conserva hasta resolver
```

### 6.8 Rechazar devolución

```http
POST /api/v1/devoluciones-tambos/{devolucionId}/rechazar
```

El motivo es obligatorio. La devolución cambia a `rechazada` y el activo regresa a `adherido`. El cliente conserva el activo en su proyección.

### 6.9 Resolver una revisión

```http
POST /api/v1/devoluciones-tambos/{devolucionId}/resolver-revision
```

Solicitud:

```json
{
  "decision": "validar",
  "resultadoRevision": "Se confirmó la capacidad con inspección física.",
  "observacionesAdministrativas": "Liberar activo"
}
```

`decision` solo puede ser `validar` o `rechazar`. No se permite resolver una revisión sin motivo o sin conservar el historial de la revisión anterior.

## 7. Idempotencia y folios

### 7.1 Folio

El folio es legible por humanos, pero no debe ser el identificador técnico principal. Se recomienda:

```text
folioDevolucion = DEV-AAAA-######
```

El formato final debe aprobarse antes de implementación. La unicidad se reserva con `contadores_folios/devoluciones_{año}` o una Function transaccional.

### 7.2 Idempotencia

Cada operación mutante requiere `Idempotency-Key`. La API guarda el resultado asociado:

```text
operaciones_idempotencia/{idempotencyKey}
```

Campos mínimos:

```js
{
  idempotencyKey: "chofer_uid_dispositivo_abc_op_0042",
  endpoint: "POST /api/v1/devoluciones-tambos",
  recursoId: "devolucion_001",
  folioDevolucion: "DEV-2026-000001",
  resultado: "success",
  respuesta: {...},
  creadoEn: Timestamp
}
```

Un doble toque, reintento por mala conexión o sincronización offline debe devolver la respuesta original. No debe generar otro folio ni cambiar dos veces el estado del activo.

## 8. Errores funcionales mínimos

| Código | HTTP sugerido | Significado |
|---|---:|---|
| `UNAUTHENTICATED` | 401 | No hay sesión válida. |
| `FORBIDDEN` | 403 | El rol no puede ejecutar la operación. |
| `OUT_OF_SCOPE` | 403 | El usuario no tiene acceso al cliente o localidad. |
| `CLIENT_NOT_FOUND` | 404 | Cliente inexistente. |
| `ASSET_NOT_FOUND` | 404 | Tambo inexistente. |
| `ASSET_ALREADY_ASSIGNED` | 409 | El tambo ya está con otro cliente. |
| `ASSET_NOT_OWNED_BY_CLIENT` | 409 | El activo no pertenece al cliente indicado. |
| `INVALID_ASSET_STATE` | 409 | El estado actual no permite la transición. |
| `CLIENT_HAS_ASSIGNED_TANKS` | 409 | No se puede archivar todavía. |
| `COMMERCIAL_TANK_LIMIT` | 409 | Un comercial no puede superar un tambo. |
| `DUPLICATE_PHYSICAL_CODE` | 409 | Código físico ya registrado. |
| `DUPLICATE_RETURN_FOLIO` | 409 | Folio ya existente o reservado. |
| `IDEMPOTENCY_REPLAY` | 200 | Se devuelve el resultado de una operación ya procesada. |
| `VALIDATION_REQUIRED` | 422 | Falta un dato obligatorio o motivo. |

## 9. Reglas de implementación para el frontend

La pantalla del chofer solo debe llamar a `POST /devoluciones-tambos` y consultar sus propios folios. No debe llamar a validar, rechazar, resolver revisión, crear activos ni archivar clientes.

La pantalla administrativa puede consultar la bandeja y ejecutar las acciones de recepción y decisión. Los botones son una ayuda visual; la autorización real debe estar en la función y en las reglas de Firestore.

La ficha de un cliente industrial debe mostrar la lista de activos reales y el estado de cada uno. La acción de devolución debe estar disponible por fila, no como un botón ambiguo que represente a todos los tambos.

## 10. Criterios de aceptación del API

1. Se puede crear un industrial con cero, uno o varios tambos disponibles.
2. Un comercial nunca puede conservar más de un tambo adherido.
3. Cada tambo tiene un `activoId` y `codigoFisico` únicos.
4. Cada devolución individual recibe un folio único.
5. Un lote industrial produce un folio por tambo.
6. Validar un folio libera solo el activo de ese folio.
7. Los tambos restantes del industrial no cambian.
8. Un folio rechazado conserva la relación del activo con el cliente.
9. Un folio en revisión bloquea la disponibilidad del activo.
10. Un cliente no puede archivarse con activos adheridos o en devolución.
11. Los reintentos con la misma clave son idempotentes.
12. Las acciones administrativas dejan movimiento y auditoría.
13. Los activos, folios, movimientos y auditorías no se eliminan.
14. El usuario operativo nunca puede forzar desde la API un estado administrativo.

## 11. Orden recomendado de desarrollo

1. Crear funciones de autorización y alcance.
2. Crear `activos_tambos` y alta administrativa.
3. Implementar creación industrial y asignación transaccional.
4. Implementar generación de folios e idempotencia.
5. Implementar reporte de devolución.
6. Implementar bandeja y decisiones administrativas.
7. Implementar archivado condicionado.
8. Añadir pruebas de devolución parcial, reintentos y concurrencia.
9. Publicar reglas e índices después de validar las consultas reales.

No se debe implementar el endpoint de archivado ni la devolución múltiple como una escritura directa desde Vanilla JS sin una capa transaccional autorizada.

## 12. Decisiones pendientes

1. Confirmar si el backend será exclusivamente Cloud Functions callable o si se añadirá REST HTTPS.
2. Aprobar el formato final de `folioDevolucion`.
3. Confirmar si la recepción física la realiza exclusivamente administración.
4. Definir si se adjuntarán fotografías cuando el activo pase a `en_revision`.
5. Definir la migración del campo histórico singular `activoTamboId` hacia `activoTamboIds`.

No se modificó código ni se crearon endpoints reales; este archivo define el contrato previo a implementación.
