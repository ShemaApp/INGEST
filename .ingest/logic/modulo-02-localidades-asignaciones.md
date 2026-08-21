# Módulo 2 — Localidades y asignaciones permanentes

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** documentación funcional previa al desarrollo
**Versión:** 1.0

> Este documento define el contrato de localidades, clientes territoriales y asignaciones permanentes. No crea colecciones, datos, pantallas ni reglas de producción.

## 1. Objetivo

El módulo organiza la cartera territorial de INGEST. Cada cliente pertenece a una localidad. Administración asigna una localidad a un solo chofer activo. El chofer conserva esa localidad y sus clientes de forma permanente hasta que administración la reasigne, la retire o desactive la localidad.

La asignación no es diaria y no depende de una jornada, turno u horario. El vehículo y el medidor son relaciones operativas del chofer y se documentan en el módulo correspondiente; las operaciones históricas conservarán sus identificadores para no cambiar el pasado cuando exista una reasignación.

## 2. Reglas de negocio aprobadas

| Regla | Definición |
|---|---|
| Cliente territorial | Todo cliente debe tener una `localidadId`. |
| Cartera | El chofer ve clientes a través de sus localidades asignadas. |
| Exclusividad | Una localidad puede tener cero o un chofer activo. Nunca dos simultáneamente. |
| Permanencia | La asignación no vence diariamente. |
| Reasignación | Solo administración puede cambiar el chofer responsable. |
| Conservación | Reasignar una localidad no modifica ni duplica sus clientes. |
| Historial | Las ventas y operaciones anteriores conservan su contexto original. |
| Auditoría | Toda creación, cambio, retiro o desactivación queda respaldada. |
| Eliminación | No se eliminan localidades, asignaciones ni clientes con operaciones históricas. |

## 3. Colección `localidades`

Ruta:

```text
localidades/{localidadId}
```

### Campos

| Campo | Tipo | Obligatorio | Editable | Descripción |
|---|---|---:|---:|---|
| `nombre` | string | Sí | Admin | Nombre oficial de la localidad. |
| `nombreNormalizado` | string | Sí | Automático | Versión para búsqueda y evitar duplicados por mayúsculas. |
| `estado` | enum | Sí | Admin | `activa`, `inactiva` o `pendiente`. |
| `choferActivoUid` | string/null | No | Automático/admin | Referencia de lectura rápida al responsable actual. |
| `clientesActivosCount` | number | Automático | No | Resumen no autoritativo de clientes activos. |
| `creadaPorUid` | string | Sí | No | Administrador que la creó. |
| `creadaEn` | timestamp | Sí | No | Fecha de creación. |
| `actualizadaPorUid` | string | Sí | Automático | Último administrador que la modificó. |
| `actualizadaEn` | timestamp | Sí | Automático | Fecha de última modificación. |
| `motivoInactivacion` | string/null | Condicional | Admin | Obligatorio si pasa a `inactiva`. |
| `inactivadaPorUid` | string/null | Condicional | Automático | Administrador que la inactivó. |
| `inactivadaEn` | timestamp/null | Condicional | Automático | Fecha de inactivación. |

`choferActivoUid` es una referencia de consulta rápida, no la única fuente de integridad. La autoridad histórica será `asignaciones_localidades`.

## 4. Colección `clientes`

El cliente pertenece al catálogo global y no guarda un chofer permanente.

Ruta:

```text
clientes/{clienteId}
```

### Campos mínimos relacionados con este módulo

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `nombre` | string | Sí | Nombre del comprador o empresa. |
| `telefono` | string | No | Contacto normalizado. |
| `localidadId` | string | Sí | Localidad de pertenencia. |
| `tipo` | enum | Sí | `comercial` o `industrial`. |
| `activo` | boolean | Sí | Estado del cliente. |
| `creadoPorUid` | string | Sí | Usuario que lo registró. |
| `creadoEn` | timestamp | Sí | Fecha de alta. |
| `actualizadoPorUid` | string | Sí | Último usuario autorizado. |
| `actualizadoEn` | timestamp | Sí | Fecha de modificación. |

No se permite crear o guardar un cliente sin `localidadId`. Cambiar de chofer no implica modificar el cliente; cambiar de localidad será una acción administrativa auditada y deberá conservar historial.

## 5. Colección `asignaciones_localidades`

Ruta:

```text
asignaciones_localidades/{asignacionId}
```

Cada cambio de responsable genera una nueva asignación. La anterior se finaliza; nunca se edita para ocultar el historial.

### Campos

| Campo | Tipo | Obligatorio | Editable | Descripción |
|---|---|---:|---:|---|
| `localidadId` | string | Sí | No | Localidad asignada. |
| `choferUid` | string | Sí | No | Chofer responsable. |
| `estado` | enum | Sí | Automático | `activa`, `finalizada` o `retirada`. |
| `asignadoPorUid` | string | Sí | No | Admin que creó la asignación. |
| `asignadoEn` | timestamp | Sí | No | Fecha de asignación permanente. |
| `finalizadoPorUid` | string/null | Condicional | No | Admin que terminó la relación. |
| `finalizadoEn` | timestamp/null | Condicional | No | Fecha de finalización. |
| `motivoFinalizacion` | string/null | Condicional | No | Obligatorio al finalizar o retirar. |
| `vehiculoIdSnapshot` | string/null | No | No | Vehículo del chofer al asignar, si aplica. |
| `medidorIdSnapshot` | string/null | No | No | Medidor relacionado al contexto inicial, si aplica. |

La asignación es permanente en términos de negocio, pero su historial se expresa mediante `asignadoEn` y una acción administrativa explícita de finalización. No se usa vencimiento automático.

## 6. Regla de exclusividad

Antes de crear una asignación activa se debe verificar que no exista otra con:

```text
localidadId == localidadSeleccionada
estado == "activa"
```

La cantidad máxima es uno. Si existe una asignación activa, el sistema no debe crear otra directamente. Debe obligar a utilizar el flujo de reasignación.

La actualización de `localidades.choferActivoUid` y la creación o finalización de la asignación deben formar parte de una operación atómica o de un proceso idempotente que no deje dos responsables activos.

## 7. Flujo de alta de localidad

```text
Administración
  → Localidades
  → Nueva localidad
  → nombre
  → validar duplicado normalizado
  → guardar localidad activa o pendiente
  → auditoría
```

Una localidad nueva puede quedar sin chofer. En ese caso sus clientes pueden existir en el catálogo, pero ningún chofer la verá hasta una asignación activa.

## 8. Flujo de asignación

```text
Administración
  → seleccionar localidad
  → comprobar chofer activo actual
  → seleccionar chofer
  → confirmar asignación permanente
  → crear asignación activa
  → actualizar referencia rápida de localidad
  → crear auditoría
```

El chofer debe estar activo y tener el perfil válido. La asignación no crea clientes ni duplica la cartera.

## 9. Flujo de reasignación

```text
Localidad con Chofer 1
  → administración selecciona "Reasignar"
  → selecciona Chofer 2
  → motivo obligatorio
  → finaliza asignación de Chofer 1
  → crea asignación activa para Chofer 2
  → actualiza localidad
  → registra auditoría completa
```

Las ventas, créditos, activos y cierres históricos continúan vinculados al `choferUid`, `vehiculoId`, `medidorId` y `localidadId` capturados al momento de cada operación.

## 10. Flujo de retiro

Retirar una localidad significa dejarla sin chofer activo. No borra la localidad ni sus clientes.

El sistema debe exigir un motivo y registrar:

```text
localidadId
asignacionId
choferUid anterior
retiradoPorUid
retiradoEn
motivo
```

## 11. Colección `auditoria_localidades`

Ruta:

```text
auditoria_localidades/{eventoId}
```

Todo evento administrativo es inmutable.

```text
auditoria_localidades/{eventoId}
{
  tipo: "crear_localidad | editar_localidad | asignar | reasignar | retirar | inactivar | cambiar_cliente_localidad",
  localidadId,
  asignacionId: null,
  objetivoClienteId: null,
  ejecutadoPorUid,
  valoresAnteriores: {},
  valoresNuevos: {},
  motivo: "texto cuando aplique",
  creadoEn: timestamp
}
```

La auditoría debe registrar acciones de cualquier administrador. No existe un administrador exento de auditoría.

## 12. Pantallas administrativas

### 12.1 Lista de localidades

Debe mostrar nombre, estado, chofer activo, cantidad aproximada de clientes y fecha de actualización. Los filtros previstos son estado, chofer y búsqueda por nombre.

### 12.2 Detalle de localidad

Debe mostrar clientes agrupados, chofer actual, historial de asignaciones, actividad reciente y acciones permitidas según estado.

### 12.3 Crear localidad

Campos: nombre y estado inicial. El nombre normalizado debe evitar duplicados lógicos.

### 12.4 Asignar localidad

Muestra solo choferes activos elegibles. Si ya existe un responsable, no muestra una asignación directa como alternativa: ofrece reasignación.

### 12.5 Reasignar localidad

Muestra responsable anterior, responsable nuevo, impacto esperado, motivo obligatorio y confirmación explícita.

### 12.6 Historial de asignaciones

Es de solo lectura para administración. Ninguna fila histórica debe tener botón de editar o eliminar.

## 13. Vista del chofer

El chofer no administra localidades. La app obtiene sus asignaciones activas mediante su UID y muestra los clientes agrupados por localidad. No puede cambiar la localidad de un cliente, asignarse una localidad ni ver localidades de otros choferes.

## 14. Botones

| Botón | Rol | Resultado | Colecciones afectadas |
|---|---|---|---|
| `Nueva localidad` | Admin | Abre formulario de alta. | `localidades`, auditoría |
| `Ver detalle` | Admin | Muestra clientes e historial. | Lectura |
| `Asignar chofer` | Admin | Crea asignación permanente si no existe activa. | `asignaciones_localidades`, `localidades`, auditoría |
| `Reasignar` | Admin | Finaliza anterior y crea nueva. | Asignaciones, localidad, auditoría |
| `Retirar asignación` | Admin | Deja localidad sin responsable. | Asignación, localidad, auditoría |
| `Inactivar localidad` | Admin | Impide nuevas operaciones territoriales. | `localidades`, auditoría |
| `Activar localidad` | Admin | Reactiva una localidad. | `localidades`, auditoría |
| `Ver historial` | Admin | Consulta eventos inmutables. | Auditoría, asignaciones |
| `Ver mis localidades` | Chofer | Muestra cartera permanente. | Lectura filtrada |
| `Ver clientes` | Chofer | Muestra clientes de sus localidades. | Lectura filtrada |

## 15. Reglas de acceso conceptuales

```text
localidades
  lectura completa: admin
  lectura propia: chofer solo si la localidad está asignada activamente
  creación: admin
  actualización: admin
  eliminación: prohibida desde la PWA

clientes
  lectura: admin o chofer con asignación activa a la localidad del cliente
  creación: según contrato del módulo de clientes; siempre con localidadId
  cambio de localidad: admin y auditado
  eliminación: prohibida; se desactiva o se sigue el flujo autorizado

asignaciones_localidades
  lectura completa e histórica: admin
  lectura propia activa: chofer con choferUid == auth.uid
  creación: admin
  finalización/retiro: admin
  actualización directa de históricos: prohibida
  eliminación: prohibida

auditoria_localidades
  lectura: admin
  creación: proceso autorizado de la operación
  actualización: prohibida
  eliminación: prohibida
```

Ocultar botones no es seguridad. Las reglas de Firestore deben impedir que un chofer lea localidades no asignadas o escriba una asignación propia.

## 16. Índices previstos

Los índices se crearán solo después de confirmar consultas reales. Las consultas probables son:

```text
asignaciones_localidades where choferUid == X and estado == "activa"
asignaciones_localidades where localidadId == X and estado == "activa"
clientes where localidadId == X and activo == true
localidades where estado == X orderBy nombreNormalizado
```

No se crearán combinaciones de índices sin una consulta implementada que las necesite.

## 17. Estados de pantalla

| Estado | Comportamiento |
|---|---|
| Sin localidades | Muestra catálogo vacío sin crear asignaciones. |
| Localidad sin chofer | Muestra “sin responsable activo”. |
| Localidad asignada | Muestra chofer y cartera. |
| Reasignación pendiente | Bloquea una segunda asignación activa. |
| Error de permiso | No revela datos ajenos. |
| Error de red | No afirma que la operación se guardó. |
| Guardado correcto | Confirma y muestra evento auditado. |
| Duplicado | Rechaza nombre o asignación duplicada. |
| Historial | Solo lectura. |

## 18. Criterios de aceptación

1. Una localidad puede existir sin chofer.
2. Un cliente no puede guardarse sin localidad.
3. Una localidad nunca tiene dos choferes activos.
4. La asignación no vence diariamente.
5. El chofer carga automáticamente sus localidades permanentes.
6. El chofer solo ve clientes de sus localidades.
7. Reasignar no duplica ni modifica clientes.
8. Las operaciones históricas conservan su contexto original.
9. Retirar una localidad no elimina clientes ni operaciones.
10. Toda acción administrativa crea una auditoría inmutable.
11. Los eventos históricos no tienen edición ni eliminación.
12. Un reintento no crea dos asignaciones activas.
13. Un administrador puede consultar actividad por localidad y chofer.
14. Las reglas del servidor coinciden con la separación visual.

## 19. Fuera de alcance

Este módulo no implementa todavía la ficha completa de clientes, vehículos, medidores, precios, ventas, créditos, activos, caja ni reportes. Solo establece la relación territorial y su administración.

## 20. Aprobación funcional

Antes de implementar deben quedar confirmadas estas decisiones:

- la localidad se asigna una sola vez y permanece activa hasta reasignación o retiro;
- una localidad solo tiene un chofer activo;
- el cliente pertenece a una localidad y no a un chofer;
- todo movimiento administrativo se audita, incluso el de un administrador;
- no se eliminan localidades, asignaciones ni clientes con historial.
