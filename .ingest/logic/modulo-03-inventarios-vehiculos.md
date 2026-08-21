# Módulo 3 — Inventarios y vehículos

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** documentación funcional previa al desarrollo
**Versión:** 1.0

> Este documento define la relación entre vehículo, medidor, responsable operativo, existencias y movimientos de inventario. No crea código, colecciones reales ni reglas de producción.

## 1. Objetivo

El módulo administra los vehículos operativos, sus medidores físicos y el inventario que se encuentra en cada unidad. El administrador configura los vehículos y medidores; el chofer utiliza el contexto asignado para vender y cerrar su turno.

El módulo debe conservar dos tipos de información diferentes:

1. **Estado actual:** qué vehículo, medidor e inventario están activos ahora.
2. **Historial inmutable:** qué vehículo, medidor, lectura y existencia participaron en cada operación anterior.

Un cambio administrativo futuro nunca debe modificar la interpretación histórica de una venta, un cierre o un movimiento.

## 2. Relaciones principales

```text
usuarios/{choferUid}
  └── vehiculoId actual
          ↓
vehiculos/{vehiculoId}
  └── medidorId actual
          ↓
medidores/{medidorId}

vehiculos/{vehiculoId}
  └── unidad operativa de inventario
          ↓
inventario_saldos/{saldoId}
          ↓
movimientos_inventario/{movimientoId}
```

La localidad sigue perteneciendo al chofer por la asignación permanente documentada en el Módulo 2. El vehículo y el medidor son el contexto físico de la operación y se guardan como fotografías históricas en ventas, lecturas, movimientos y cierres.

## 3. Reglas de negocio aprobadas

| Regla | Definición |
|---|---|
| Administración | Solo `admin` crea, activa, desactiva y configura vehículos y medidores. |
| Chofer | Opera con el vehículo y medidor que administración le asignó. |
| Asignación | El chofer no cambia vehículo ni medidor desde su pantalla. |
| Historial | Vehículos, medidores, lecturas y movimientos no se editan ni eliminan. |
| Medidor | La lectura final debe ser mayor que la lectura inicial. |
| Inventario | El saldo actual se modifica mediante movimientos, no mediante edición manual. |
| Auditoría | Toda acción administrativa queda respaldada, incluso si la ejecuta un admin. |
| Reasignación | Cambiar vehículo o medidor no modifica operaciones anteriores. |
| Unidad | El inventario debe distinguir presentación y producto; no mezcla productos por contenido equivalente. |
| Cierre | El cierre conserva vehículo, medidor, lectura inicial, lectura final e inventario involucrado. |

## 4. Colección `vehiculos`

Ruta:

```text
vehiculos/{vehiculoId}
```

### Campos

| Campo | Tipo | Obligatorio | Editable | Descripción |
|---|---|---:|---:|---|
| `nombre` | string | Sí | Admin | Nombre visible, por ejemplo `Pipa 01`. |
| `codigoInterno` | string | Sí | Admin una vez | Identificador interno único. |
| `placa` | string/null | No | Admin | Placa o identificación física cuando aplique. |
| `tipo` | enum | Sí | Admin | `vehiculo`, `planta` u otra unidad aprobada. |
| `estado` | enum | Sí | Admin | `activo`, `mantenimiento`, `inactivo` o `baja`. |
| `medidorId` | string/null | Condicional | Admin | Medidor físico actualmente vinculado. |
| `choferUidActual` | string/null | No | Automático/admin | Responsable operativo actual. |
| `inventarioUbicacionId` | string | Sí | No | Identificador de la ubicación operativa del inventario. |
| `creadoPorUid` | string | Sí | No | Admin que creó el vehículo. |
| `creadoEn` | timestamp | Sí | No | Fecha de alta. |
| `actualizadoPorUid` | string | Sí | Automático | Último admin que modificó configuración. |
| `actualizadoEn` | timestamp | Sí | Automático | Última modificación. |
| `motivoEstado` | string/null | Condicional | Admin | Obligatorio al pasar a mantenimiento, inactivo o baja. |
| `desactivadoEn` | timestamp/null | No | Automático | Fecha de baja lógica, si aplica. |

No se debe eliminar un vehículo con ventas, cierres, lecturas o movimientos. Se cambia su estado.

## 5. Colección `medidores`

Ruta:

```text
medidores/{medidorId}
```

### Campos

| Campo | Tipo | Obligatorio | Editable | Descripción |
|---|---|---:|---:|---|
| `nombre` | string | Sí | Admin | Nombre visible del medidor. |
| `codigoInterno` | string | Sí | Admin una vez | Identificador físico único. |
| `tipoFlujo` | string | Sí | Admin | Tipo de flujo configurado. |
| `unidadMedida` | string | Sí | Admin | Por ejemplo `litros`; configurable antes de operar. |
| `vehiculoId` | string/null | No | Admin | Vehículo actualmente vinculado. |
| `lecturaActual` | number | Sí | Solo operación autorizada | Última lectura confirmada. |
| `decimalesPermitidos` | number | Sí | Admin antes de operar | Precisión admitida por el medidor. |
| `estado` | enum | Sí | Admin | `activo`, `mantenimiento`, `inactivo` o `baja`. |
| `creadoPorUid` | string | Sí | No | Admin que lo registró. |
| `creadoEn` | timestamp | Sí | No | Fecha de alta. |
| `actualizadoEn` | timestamp | Sí | Automático | Última actualización válida. |
| `motivoEstado` | string/null | Condicional | Admin | Motivo al cambiar estado. |

La lectura actual no debe editarse desde una pantalla administrativa común. Debe avanzar mediante una operación de lectura autorizada que genere su registro inmutable.

## 6. Asignación de vehículo a chofer

Aunque el perfil del usuario puede mostrar `vehiculoId` actual, el historial debe utilizar una colección separada:

```text
asignaciones_vehiculos/{asignacionId}
```

### Campos

```text
{
  choferUid,
  vehiculoId,
  medidorId,
  estado: "activa" | "finalizada",
  asignadoPorUid,
  asignadoEn,
  finalizadoPorUid: null,
  finalizadoEn: null,
  motivoFinalizacion: null
}
```

La regla funcional inicial será que un chofer tenga como máximo un vehículo activo y que un vehículo operativo tenga como máximo un chofer actual. Si en el futuro se permite compartir un vehículo por turnos, se ampliará el contrato sin alterar los documentos históricos.

La asignación no se realiza diariamente. Permanece activa hasta que administración la cambie o finalice explícitamente.

## 7. Asignación de medidor a vehículo

El medidor se vincula al vehículo, no al cliente ni a la localidad:

```text
vehiculos/{vehiculoId}.medidorId == medidores/{medidorId}.vehiculoId
```

Si se cambia el medidor físico, se finaliza la relación anterior y se crea un evento auditado. Las ventas y cierres anteriores conservan el `medidorId` utilizado.

## 8. Lecturas y movimientos del medidor

Ruta conceptual:

```text
lecturas_medidor/{lecturaId}
```

### Campos

```text
{
  medidorId,
  vehiculoId,
  choferUid,
  jornadaId: null,
  lecturaInicial,
  lecturaFinal,
  diferencia,
  unidadMedida,
  equivalenteGarrafones19L: null,
  operacionId,
  creadoEn,
  estado: "confirmada"
}
```

La fórmula aprobada para agua es:

```text
litrosVendidos = lecturaFinal - lecturaInicial

garrafonesEquivalentes19L = litrosVendidos / 19
```

La lectura final debe ser estrictamente mayor. Una lectura igual o menor se rechaza, salvo un procedimiento administrativo de corrección documentado y auditado que no edite la lectura original.

Si la operación corresponde a una venta industrial, el precio se calcula por garrafón equivalente de 19 litros. La lectura se conserva en litros y el equivalente se guarda como resultado calculado.

## 9. Colección `inventario_saldos`

Ruta:

```text
inventario_saldos/{saldoId}
```

Esta colección contiene el saldo actual por producto, presentación y ubicación operativa. No representa el historial completo.

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `productoId` | string | Sí | Referencia al producto del módulo de productos. |
| `presentacionId` | string | Sí | Identifica tamaño o presentación exacta. |
| `ubicacionId` | string | Sí | Vehículo, planta, almacén u otra ubicación. |
| `cantidadDisponible` | number | Sí | Saldo actual. No negativo salvo contrato posterior. |
| `unidadMedida` | string | Sí | Unidad del producto. |
| `ultimaOperacionId` | string | Sí | Última operación que modificó el saldo. |
| `actualizadoEn` | timestamp | Sí | Fecha del último movimiento. |
| `actualizadoPorUid` | string | Sí | Usuario que generó el movimiento. |

El documento de saldo puede ser actualizado por una operación autorizada, pero cada cambio debe tener un movimiento inmutable que lo respalde.

## 10. Colección `movimientos_inventario`

Ruta:

```text
movimientos_inventario/{movimientoId}
```

Cada entrada o salida genera un movimiento inmutable.

### Campos

```text
{
  productoId,
  presentacionId,
  ubicacionId,
  tipo: "entrada" | "salida" | "ajuste_autorizado" | "transferencia_salida" | "transferencia_entrada",
  cantidad,
  unidadMedida,
  saldoAnterior,
  saldoPosterior,
  operacionId,
  ventaId: null,
  lecturaId: null,
  usuarioUid,
  creadoEn,
  motivo: null,
  estado: "confirmado"
}
```

No se corrige un movimiento editándolo. Si existe un error, se genera un movimiento compensatorio con motivo obligatorio y auditoría.

## 11. Relación con ventas

Una venta debe identificar el contexto operativo:

```text
venta
  ├── choferUid
  ├── vehiculoId
  ├── medidorId
  ├── localidadId
  ├── clienteId
  ├── lecturaId cuando aplique
  └── movimientos de inventario relacionados
```

Para venta comercial por cantidad se genera salida del producto correspondiente. Para venta industrial medida se genera la lectura, el cálculo de litros y garrafones equivalentes, el importe y los movimientos relacionados. El precio aplicado se congela dentro de la venta.

## 12. Pantallas administrativas

### 12.1 Lista de vehículos

Debe mostrar nombre, código, estado, chofer actual, medidor, ubicación de inventario y última actualización.

### 12.2 Alta de vehículo

Solo administración. Debe registrar datos mínimos y permitir vincular un medidor existente o dejarlo pendiente, según la decisión final del flujo.

### 12.3 Detalle de vehículo

Debe mostrar configuración actual, historial de choferes, historial de medidores, inventario actual, lecturas y operaciones relacionadas.

### 12.4 Lista de medidores

Debe mostrar código, tipo de flujo, unidad, lectura actual, vehículo, estado y fecha de última lectura.

### 12.5 Asignación de vehículo

Permite asignar o retirar un vehículo de un chofer. Exige confirmación y registra auditoría.

### 12.6 Inventario actual

Permite filtrar por ubicación, producto, presentación y estado de existencia. No ofrece edición directa del saldo.

### 12.7 Movimientos de inventario

Es una vista histórica de solo lectura con filtros por operación, producto, ubicación, usuario y fecha.

### 12.8 Lecturas de medidor

Vista histórica de lecturas confirmadas, con medidor, vehículo, chofer, lectura inicial, final, diferencia y operación relacionada.

## 13. Pantalla del chofer relacionada

El chofer verá su vehículo, su medidor, la lectura actual y el inventario operativo que le corresponde. No podrá editar configuración ni asignaciones. Sus ventas y cierres generarán lecturas y movimientos cuando el flujo lo requiera.

## 14. Botones

| Botón | Rol | Resultado | Colecciones afectadas |
|---|---|---|---|
| `Nuevo vehículo` | Admin | Abre alta de vehículo. | `vehiculos`, auditoría |
| `Editar configuración` | Admin | Modifica campos permitidos. | `vehiculos`, auditoría |
| `Cambiar estado` | Admin | Activa, mantenimiento, inactiva o baja. | `vehiculos`, auditoría |
| `Asignar vehículo` | Admin | Crea asignación permanente. | `asignaciones_vehiculos`, usuarios, auditoría |
| `Retirar vehículo` | Admin | Finaliza asignación. | asignación, usuario, auditoría |
| `Nuevo medidor` | Admin | Registra medidor físico. | `medidores`, auditoría |
| `Vincular medidor` | Admin | Vincula medidor a vehículo. | `vehiculos`, `medidores`, auditoría |
| `Ver lecturas` | Admin/chofer limitado | Consulta historial autorizado. | `lecturas_medidor` lectura |
| `Ver inventario` | Admin/chofer limitado | Consulta existencias permitidas. | `inventario_saldos` lectura |
| `Ajuste autorizado` | Admin | Genera movimiento compensatorio con motivo. | `movimientos_inventario`, saldo, auditoría |
| `Ver movimientos` | Admin/chofer limitado | Consulta historial. | `movimientos_inventario` lectura |
| `Editar movimiento` | Nadie | No se ofrece. | — |
| `Eliminar movimiento` | Nadie | No se ofrece. | — |

## 15. Reglas de acceso conceptuales

```text
vehiculos
  lectura completa: admin
  lectura propia: chofer solo de su vehiculoId
  creación: admin
  actualización: admin
  eliminación: prohibida desde la PWA

medidores
  lectura completa: admin
  lectura propia: chofer mediante su vehiculoId
  creación y vinculación: admin
  actualización de lectura: solo operación autorizada
  eliminación: prohibida

asignaciones_vehiculos
  lectura completa: admin
  lectura propia: chofer mediante choferUid == auth.uid
  creación y finalización: admin
  edición de históricos: prohibida
  eliminación: prohibida

inventario_saldos
  lectura completa: admin
  lectura operativa: chofer solo de su ubicación o vehiculoId
  actualización directa: prohibida
  actualización por operación autorizada: permitida

movimientos_inventario y lecturas_medidor
  lectura: admin o usuario con alcance operativo
  creación: operación autorizada
  actualización: prohibida
  eliminación: prohibida
```

Ocultar acciones no constituye seguridad. Las reglas de Firestore deben verificar usuario, rol, vehículo, ubicación, operación y referencia de auditoría.

## 16. Auditoría transversal

Colección conceptual:

```text
auditoria_inventarios_vehiculos/{eventoId}
```

Debe registrar, como mínimo:

```text
{
  tipoEvento,
  recursoTipo: "vehiculo | medidor | inventario | lectura | asignacion",
  recursoId,
  ejecutadoPorUid,
  valoresAnteriores,
  valoresNuevos,
  operacionId: null,
  motivo: null,
  creadoEn
}
```

Un administrador también genera auditoría. Ningún movimiento administrativo queda fuera del registro.

## 17. Índices previstos

Solo se crearán después de implementar y probar consultas reales. Las consultas probables son:

```text
vehiculos where estado == X orderBy nombre
medidores where vehiculoId == X
asignaciones_vehiculos where choferUid == X and estado == "activa"
inventario_saldos where ubicacionId == X and productoId == Y
movimientos_inventario where ubicacionId == X orderBy creadoEn desc
lecturas_medidor where medidorId == X orderBy creadoEn desc
```

## 18. Estados de pantalla

| Estado | Comportamiento |
|---|---|
| Sin vehículo | El chofer no puede iniciar una operación que requiera medidor. |
| Sin medidor | El vehículo aparece pendiente de configuración. |
| Vehículo en mantenimiento | No permite nuevas operaciones. |
| Sin inventario | Muestra existencia cero sin crear ajustes automáticos. |
| Lectura inválida | Rechaza final menor o igual al inicial. |
| Saldo insuficiente | Rechaza salida de inventario. |
| Operación repetida | Conserva el resultado original y no duplica movimientos. |
| Error de red | No afirma que la lectura o movimiento quedó guardado. |
| Histórico | Solo lectura, sin edición ni eliminación. |

## 19. Criterios de aceptación

1. Solo un administrador puede crear o configurar vehículos y medidores.
2. Un chofer ve únicamente su vehículo y su medidor operativos.
3. Un vehículo no puede tener dos medidores activos simultáneamente.
4. Un chofer no puede tener dos vehículos activos en el contrato inicial.
5. Las lecturas finales menores o iguales son rechazadas.
6. Cada lectura confirmada es inmutable.
7. Cada movimiento de inventario tiene operación, usuario y saldo anterior/posterior.
8. El saldo no se edita manualmente desde la PWA.
9. Las correcciones se registran como movimientos compensatorios.
10. Los cambios administrativos se auditan, incluidos los ejecutados por admin.
11. Cambiar vehículo o medidor no modifica ventas ni cierres históricos.
12. Un reintento idempotente no duplica lecturas, salidas ni entradas.
13. Las presentaciones distintas conservan saldos independientes.
14. El cierre puede recuperar vehículo, medidor, lecturas e inventario del turno.

## 20. Fuera de alcance

Este documento no define todavía el catálogo completo de productos, precios por tipo de cliente, venta comercial, venta industrial, créditos, notas PDF, caja ni reportes. Esos módulos consumirán `productoId`, `presentacionId`, `vehiculoId`, `medidorId` y los movimientos definidos aquí.

## 21. Decisiones pendientes

Antes de implementar se deben confirmar:

1. Si el inventario de agua cargada se controla como litros, garrafones equivalentes o ambos.
2. Si el vehículo y el medidor deben tener placa/código físico obligatorio.
3. Si un vehículo puede quedar sin chofer durante mantenimiento o reasignación.
4. Si el inventario se manejará por vehículo, por planta, por almacén o mediante una ubicación operativa común.
5. Si el chofer puede consultar el inventario completo de su vehículo o solo el saldo disponible para venta.

No se implementará el módulo hasta aprobar estas decisiones.
