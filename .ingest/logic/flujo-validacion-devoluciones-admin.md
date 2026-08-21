# Flujo administrativo — Validación de devoluciones de tambos

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** propuesta funcional previa a implementación
**Versión:** 1.0
**Dependencias:** Módulo 4 — Clientes; Módulo 5 — Activos e inmuebles prestados

> El folio de devolución es el vínculo operativo entre lo que el chofer reporta y lo que administración recibe físicamente. Validar una devolución libera únicamente el tambo identificado en ese folio; nunca libera automáticamente otros tambos del mismo cliente.

## 1. Objetivo

El administrador debe contar con una bandeja de devoluciones pendientes donde pueda revisar cada folio, comparar la información capturada por el chofer contra el tambo recibido y decidir entre **validar**, **rechazar** o **enviar a revisión**.

La validación debe actualizar de forma atómica la devolución, el activo físico y la relación vigente del cliente. Las operaciones confirmadas no se editan ni se eliminan. Si posteriormente se detecta un error, se genera un nuevo evento correctivo con auditoría.

## 2. Estados de la devolución

| Estado | Significado | ¿Libera el tambo? |
|---|---|---:|
| `reportada` | El chofer generó el folio, pero el activo aún no ha sido recibido por administración. | No |
| `recibida` | El tambo llegó físicamente y está pendiente de revisión administrativa. | No |
| `validada` | La identidad y condición del tambo fueron confirmadas. | Sí, como `disponible` o según resultado físico |
| `rechazada` | La devolución no puede aceptarse por inconsistencia o falta de entrega. | No |
| `en_revision` | Hay daño, diferencia de identidad, capacidad, código ilegible u otra incidencia. | No; el activo queda fuera de disponibilidad |
| `cancelada` | El folio fue anulado antes de recepción por una causa autorizada. | No |

Una devolución con estado final no debe regresar silenciosamente a un estado anterior. Si el tambo aparece posteriormente, se registra una nueva devolución o una incidencia vinculada.

## 3. Bandeja administrativa

La pantalla se llamará **Devoluciones de tambos** y estará separada del catálogo general de clientes.

### Filtros

| Filtro | Uso |
|---|---|
| Folio | Localizar una devolución específica. |
| Estado | Ver pendientes, validadas, rechazadas o en revisión. |
| Cliente | Revisar todas las devoluciones de un expediente. |
| Código físico | Buscar el tambo recibido. |
| Chofer o vendedor | Identificar quién reportó la devolución. |
| Localidad | Organizar la recepción por zona. |
| Capacidad | Comparar tambos de 250, 600, 750, 1,100 o 2,500 L. |
| Fecha | Revisar recepciones de un periodo. |

Cada fila debe mostrar:

```text
Folio | fecha | cliente | localidad | código físico | capacidad | estado | reportado por | acción
```

La bandeja debe ordenar primero los estados `recibida` y `en_revision`, porque requieren atención administrativa. Una devolución validada permanece consultable, pero ya no aparece como pendiente.

## 4. Apertura del folio

Al abrir un folio, el administrador verá un expediente dividido en cuatro bloques.

### A. Reporte original

```text
Folio de devolución
Cliente y código de cliente
Localidad
Chofer que reportó
Fecha y hora del reporte
Motivo de la devolución
Observaciones del chofer
```

### B. Activo esperado

```text
ActivoId
Código físico esperado
Capacidad registrada
Modelo
Estado antes de la devolución
Cliente actualmente relacionado
```

### C. Recepción física

```text
Código físico recibido
Capacidad observada
Modelo observado
Condición física
Sellos o marcas identificables
Observaciones administrativas
Usuario receptor
Fecha y hora de recepción
```

### D. Decisión

```text
[Validar devolución]
[Enviar a revisión]
[Rechazar devolución]
```

Los botones deben estar dentro del menú de acciones del folio, pero la decisión final debe requerir una confirmación explícita.

## 5. Verificaciones antes de decidir

El administrador debe revisar, como mínimo, las siguientes coincidencias:

| Verificación | Resultado esperado |
|---|---|
| Folio | Existe y no está duplicado. |
| ActivoId | Corresponde a un único activo registrado. |
| Código físico | Coincide con el código esperado o se documenta una incidencia. |
| Cliente | El activo estaba relacionado con el cliente reportado. |
| Localidad | Coincide con el contexto de la relación al momento de la devolución. |
| Capacidad | Coincide con el registro del activo o se envía a revisión. |
| Estado | El activo estaba `adherido` y no tenía otra devolución validada. |
| Usuario receptor | Está identificado y autorizado para recibir físicamente. |
| Evidencia | Las observaciones son suficientes para explicar la condición del activo. |

La pantalla debe mostrar una alerta crítica si el activo ya fue devuelto, reasignado, dado de baja o tiene otro folio pendiente. En esos casos el administrador no debe poder validar sin resolver primero la inconsistencia.

## 6. Decisión: validar devolución

El administrador selecciona `Validar devolución` cuando el tambo recibido coincide con el activo reportado y la revisión física es satisfactoria.

Debe confirmar:

```text
Folio
Código físico
Capacidad
Cliente
Resultado: aceptado
Estado posterior del activo: disponible
```

La operación debe realizar atómicamente estas acciones:

1. Cambiar el estado del folio a `validada`.
2. Registrar `validadoPorUid` y `validadoEn`.
3. Cambiar el activo a `disponible`.
4. Limpiar `clienteId` y `localidadId` vigentes del activo.
5. Retirar ese `activoId` de `clientes.activoTamboIds`.
6. Actualizar `cantidadTambosAsignados` y, si aplica, `capacidadTotalTambosLitros`.
7. Limpiar `activoTamboId` del cliente si era el modelo de un solo activo.
8. Crear un movimiento `devolucion_validada`.
9. Crear un evento en `auditoria_activos_tambos`.

La validación de un tambo industrial no cambia los demás activos del cliente. Si el cliente conserva otros tambos, continúa activo.

## 7. Decisión: enviar a revisión

Se debe usar `Enviar a revisión` cuando el tambo llegó, pero existe una condición que impide liberarlo como disponible. Ejemplos: código ilegible, capacidad distinta, daño, contaminación, pieza faltante o duda sobre la identidad.

El administrador debe capturar un motivo obligatorio y seleccionar el resultado provisional:

```text
[ ] Revisión de identidad
[ ] Revisión de capacidad
[ ] Revisión de daño
[ ] Revisión de limpieza
[ ] Revisión de faltantes
[ ] Otra incidencia
```

El activo pasa a `en_revision`, permanece relacionado con el cliente hasta que exista una resolución formal y no puede asignarse a otro cliente. El folio queda `en_revision` y puede resolverse posteriormente mediante una acción auditada.

La pantalla debe mostrar `Resolver revisión` solo a un administrador autorizado. La resolución podrá terminar en validación o rechazo, pero nunca borrará el folio original.

## 8. Decisión: rechazar devolución

Se debe usar `Rechazar devolución` cuando el tambo no fue entregado, el folio es incorrecto, el activo no corresponde al cliente o existe una razón documentada para no aceptar la devolución.

El motivo es obligatorio y debe ser específico. No se permiten motivos genéricos como “error” o “no procede” sin explicación adicional.

Al rechazar:

```text
folio.estado = "rechazada"
activo.estado = "adherido"
cliente conserva la relación vigente
```

Si el activo fue recibido físicamente pero la devolución se rechaza por daño o identidad, es preferible usar `en_revision` para no perder el control físico del objeto. `rechazada` debe reservarse para una devolución que no libera el activo y que no queda pendiente de recepción o peritaje.

## 9. Devoluciones parciales de clientes industriales

La pantalla debe mostrar el número de activos antes y después de cada decisión.

Ejemplo:

```text
Cliente industrial: Campo Norte
Activos antes: 5
Folio actual: DEV-2026-000021 → TMB-001
Resultado: validada
Activos después: 4
```

El administrador debe validar un folio a la vez por activo. Una acción de recepción múltiple puede facilitar la captura, pero el sistema debe conservar un folio independiente para cada tambo y permitir validar o enviar a revisión cada unidad por separado.

Un folio validado no modifica los tambos que siguen en estado `adherido`. El cliente industrial solo podrá archivarse cuando todos los folios correspondientes estén validados y no queden activos adheridos.

## 10. Reglas contra duplicados e idempotencia

Antes de guardar una decisión, el sistema debe comprobar que el folio siga en el estado esperado y que el activo no haya sido procesado por otra sesión.

La operación debe ser idempotente:

```text
si el folio ya está validado:
  no crear otra devolución
  no volver a descontar el activo
  mostrar el resultado existente
```

Nunca se debe generar un segundo folio para el mismo `devolucionId`. Si el activo requiere una nueva devolución después de una devolución rechazada o cancelada, se creará un folio nuevo con una referencia al antecedente.

## 11. Archivado del cliente desde este flujo

La validación de una devolución no archiva automáticamente al cliente. Después de liberar un tambo, el sistema recalcula los activos vigentes.

```text
si cantidadTambosAsignados > 0:
  cliente permanece activo
  archivar bloqueado

si cantidadTambosAsignados == 0:
  archivar puede habilitarse para administración
```

En un cliente comercial, esto normalmente ocurre después de validar su único tambo. En un cliente industrial, puede ocurrir únicamente después de validar la devolución de todos sus tambos.

## 12. Auditoría

Cada decisión debe registrar:

```text
folioDevolucion
activoId
clienteId
accion: recibir | validar | rechazar | enviar_revision | resolver_revision
estadoAnterior
estadoNuevo
ejecutadoPorUid
motivo
creadoEn
```

El administrador que valida no puede cambiar el folio después. Una corrección posterior genera un evento nuevo y referencia al folio original.

## 13. Permisos y botones

| Acción | Chofer | Vendedor | Admin |
|---|---:|---:|---:|
| Crear reporte de devolución | Sí, dentro de su cartera | Según alcance de planta | Sí |
| Consultar folio propio | Sí | Sí | Sí |
| Recibir físicamente | No, salvo autorización posterior | Según autorización de planta | Sí |
| Validar devolución | No | No | Sí |
| Enviar a revisión | No | No | Sí |
| Resolver revisión | No | No | Sí |
| Rechazar con motivo | No | No | Sí |
| Archivar cliente | No | No | Sí, solo sin activos |

## 14. Criterios de aceptación

1. El administrador dispone de una bandeja filtrable de devoluciones.
2. Cada devolución tiene un folio único e inmutable.
3. El detalle del folio muestra reporte, activo esperado, recepción física y decisión.
4. No se puede validar un folio con activo inexistente o ya procesado.
5. Validar libera únicamente el tambo identificado en el folio.
6. Una devolución parcial industrial no afecta los demás tambos adheridos.
7. Un tambo con daño o identidad dudosa queda en revisión y no disponible.
8. Rechazar exige un motivo obligatorio y conserva la relación del activo.
9. El archivado del cliente se bloquea mientras existan activos adheridos.
10. La validación actualiza cliente, activo, movimiento y auditoría en una operación coherente.
11. Reintentar una validación no duplica movimientos ni folios.
12. El chofer no puede validar su propio reporte.
13. Los folios siguen consultables después de validar, rechazar o resolver.
14. No se elimina físicamente ningún cliente, activo, folio, movimiento o auditoría.

## 15. Pendientes antes de implementar

1. Confirmar si el vendedor de planta podrá marcar una devolución como `recibida` o si únicamente administración registrará la recepción.
2. Definir si se adjuntarán fotografías del tambo en revisión o si bastarán observaciones de texto.
3. Definir el formato final del folio de devolución.
4. Confirmar si el cambio de estado `en_revision` a `validada` requerirá un segundo usuario administrador para activos de alto valor.

No se modificará código ni se crearán colecciones reales hasta aprobar este flujo.
