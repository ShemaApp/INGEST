# Módulo 4 — Clientes por localidad, tipo y precio

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** documentación funcional previa al desarrollo
**Versión:** 1.0

> Este módulo define el catálogo general de clientes, su pertenencia obligatoria a una localidad y la clasificación comercial o industrial que determina el precio aplicable. No crea código, colecciones reales ni reglas de producción.

## 1. Objetivo

El sistema tendrá un catálogo único de clientes. Cada cliente pertenece obligatoriamente a una localidad y no se asigna directamente a un chofer. El chofer obtiene sus clientes porque administración le asigna permanentemente la localidad correspondiente.

La clasificación del cliente determina el flujo de venta:

```text
cliente comercial → precio comercial
cliente industrial → precio industrial por garrafón equivalente de 19 L
```

El cliente no cambia de localidad diariamente. Si administración cambia la responsabilidad territorial, se reasigna la localidad al nuevo chofer y las ventas históricas conservan el contexto con el que fueron realizadas.

## 2. Relación con módulos aprobados

```text
usuarios/{choferUid}
        ↓
asignaciones_localidades/{asignacionId}
        ↓
localidades/{localidadId}
        ↓
clientes/{clienteId}
        ↓
ventas/{ventaId}
```

El vehículo y medidor del chofer provienen del Módulo 3. La venta debe guardar una fotografía histórica de `choferUid`, `localidadId`, `vehiculoId` y `medidorId` cuando corresponda.

## 3. Colección `clientes`

Ruta:

```text
clientes/{clienteId}
```

### Campos

| Campo | Tipo | Obligatorio | Editable | Descripción |
|---|---|---:|---:|---|
| `nombre` | string | Sí | Admin; creación operativa limitada | Nombre del cliente o razón social. |
| `telefono` | string | Sí | Según permiso documentado | Teléfono de contacto normalizado. |
| `localidadId` | string | Sí | Admin | Localidad a la que pertenece. |
| `tipo` | enum | Sí | Admin | `comercial` o `industrial`. |
| `precioAplicado` | number | Sí | Admin | Precio vigente según el tipo autorizado. |
| `precioComercial` | number/null | Condicional | Admin | Precio comercial vigente si aplica. |
| `precioIndustrial` | number/null | Condicional | Admin | Precio industrial por garrafón equivalente de 19 L. |
| `estado` | enum | Sí | Admin; desactivación auditada | `activo`, `inactivo` o `pendiente_revision`. |
| `codigoInterno` | string/null | No | Admin | Identificador interno si se utiliza. |
| `notasAdministrativas` | string/null | No | Admin | Observaciones no operativas. |
| `creadoPorUid` | string | Sí | No | Usuario que creó el registro. |
| `creadoEn` | timestamp | Sí | No | Fecha de creación. |
| `actualizadoPorUid` | string | Sí | Automático | Último usuario que modificó el registro. |
| `actualizadoEn` | timestamp | Sí | Automático | Fecha de modificación. |
| `desactivadoPorUid` | string/null | No | Automático | Usuario que desactivó. |
| `desactivadoEn` | timestamp/null | No | Automático | Fecha de desactivación. |
| `motivoEstado` | string/null | Condicional | Admin | Obligatorio al desactivar o reactivar con observación. |

`localidadId`, `tipo` y el precio correspondiente son obligatorios para activar un cliente. No se debe permitir un cliente activo sin localidad.

## 4. Precio por tipo de cliente

El contrato de esta etapa conserva en el cliente el precio vigente que utilizará la venta. La venta debe guardar también una copia del precio aplicado para que un cambio futuro no altere el historial.

### Comercial

```text
precioComercial = precio por garrafón comercial
```

### Industrial

```text
precioIndustrial = precio por garrafón equivalente de 19 L

garrafonesEquivalentes = litrosVendidos / 19

totalIndustrial = garrafonesEquivalentes × precioIndustrial
```

El precio industrial no se calcula como precio por litro. La lectura del medidor se expresa en litros, se convierte a equivalentes de 19 L y después se aplica el precio industrial.

## 5. Localidad obligatoria

Al crear un cliente, la pantalla debe exigir una localidad existente y activa:

```text
Selecciona localidad: [Mochomera]
Tipo de cliente: [Comercial | Industrial]
```

No se permite escribir una localidad libre como texto si ya existe en el catálogo. Esto evita duplicados como `Mochomera`, `mochomera` y `Mochomera `.

Si una localidad está sin chofer, los clientes siguen existiendo y permanecen en el catálogo administrativo, pero no aparecen en la cartera de ningún chofer hasta que administración realice la asignación.

## 6. Visibilidad por rol

### Administrador

Puede consultar todos los clientes, filtrar por localidad, tipo, estado y chofer responsable de la localidad. Puede crear, modificar, activar, desactivar y reasignar la localidad mediante acciones auditadas.

### Chofer

Puede consultar únicamente los clientes de las localidades activamente asignadas a su usuario. No puede cambiar la localidad del cliente ni consultar la cartera de otro chofer.

La creación o modificación de clientes por parte del chofer queda pendiente de decisión funcional. Si se autoriza crear en campo, el sistema debe obligarlo a seleccionar únicamente una de sus localidades y registrar auditoría con `creadoPorUid`.

## 7. Pantallas administrativas

### 7.1 Lista de clientes

Debe permitir filtros por:

```text
localidad
tipo comercial/industrial
estado activo/inactivo
chofer responsable de la localidad
nombre o teléfono
```

La lista no debe cargar todos los clientes sin paginación cuando el volumen crezca.

### 7.2 Alta de cliente

Campos mínimos:

```text
nombre
telefono
localidad
tipo
precio aplicable
```

La pantalla debe validar teléfono, localidad existente, tipo válido y precio no negativo. El botón `Guardar cliente` solo se habilita con los campos requeridos completos.

### 7.3 Detalle de cliente

Debe mostrar:

```text
datos de contacto
localidad actual
tipo
precio vigente
estado
chofer responsable de la localidad
historial de ventas
créditos relacionados
activos prestados, cuando el módulo de activos esté aprobado
```

El detalle administrativo no debe editar ventas, créditos ni préstamos históricos desde la ficha del cliente.

### 7.4 Cambio de localidad

Cambiar un cliente de localidad no debe sobrescribir silenciosamente la relación anterior. Debe exigir confirmación, motivo y auditoría. Las operaciones históricas conservan la localidad original.

### 7.5 Desactivar cliente

La desactivación debe impedir nuevas ventas, pero conservar ventas, créditos, activos y auditoría. La regla de activos pendientes se documentará en el módulo de préstamos y recuperación.

## 8. Pantalla del chofer

El chofer verá:

```text
Mis localidades
  └── Clientes de cada localidad
```

Al seleccionar un cliente activo, la pantalla debe mostrar claramente:

```text
tipo de cliente
precio aplicable
localidad
estado
```

El tipo no se debe cambiar desde la venta. Si el cliente fue configurado como industrial, el sistema dirige al flujo de medidor. Si es comercial, dirige al flujo de venta comercial.

## 9. Flujo de venta determinado por el cliente

```text
Seleccionar cliente
        ↓
Leer localidad y tipo
        ↓
¿Comercial o industrial?
   ├── Comercial → precio comercial → contado o crédito
   └── Industrial → lectura del medidor → litros ÷ 19 → precio industrial → contado o crédito
```

La venta guarda:

```text
clienteId
localidadId
choferUid
vehiculoId
medidorId cuando aplique
tipoCliente
precioAplicado
garrafonesEquivalentes
formaPago
total
periodoId
creadoEn
```

## 10. Auditoría

Colección conceptual:

```text
auditoria_clientes/{eventoId}
```

Cada evento debe registrar:

```text
{
  tipoEvento: "crear" | "actualizar" | "cambiar_localidad" | "cambiar_tipo" | "cambiar_precio" | "activar" | "desactivar",
  clienteId,
  ejecutadoPorUid,
  valoresAnteriores,
  valoresNuevos,
  motivo: null,
  operacionId: null,
  creadoEn
}
```

Toda acción administrativa queda respaldada. El administrador tampoco puede modificar ni eliminar el registro de auditoría.

## 11. Botones y acciones dinámicas

Las acciones secundarias se mostrarán en un menú colapsable de opciones. El botón visible depende del estado del cliente y del rol.

| Botón | Rol | Resultado |
|---|---|---|
| `Nuevo cliente` | Admin; chofer si se aprueba | Abre alta y exige localidad. |
| `Ver cliente` | Admin/chofer con alcance | Abre detalle autorizado. |
| `Editar datos` | Admin | Modifica campos permitidos y audita. |
| `Cambiar localidad` | Admin | Finaliza contexto anterior y crea cambio auditado. |
| `Cambiar tipo` | Admin | Cambia comercial/industrial con motivo. |
| `Cambiar precio` | Admin | Actualiza precio futuro sin alterar ventas. |
| `Desactivar` | Admin | Bloquea nuevas ventas y exige motivo. |
| `Reactivar` | Admin | Devuelve estado activo y audita. |
| `Ver historial` | Admin/chofer con alcance | Consulta ventas y estados autorizados. |
| `Nueva venta` | Chofer activo | Dirige al flujo según tipo. |
| `Eliminar cliente` | Nadie | No se ofrece. |
| `Editar venta desde cliente` | Nadie | No se ofrece. |

Ocultar una opción no es una medida de seguridad. Las reglas deben impedir acciones no autorizadas aunque el usuario intente invocarlas directamente.

## 12. Reglas conceptuales de Firestore

```text
clientes
  lectura completa: admin
  lectura: chofer solo si la localidad está asignada activamente a auth.uid
  creación: admin; chofer solo si se aprueba alta en campo y dentro de su localidad
  actualización de datos: admin
  cambio de localidad/tipo/precio: admin
  desactivación: admin con motivo
  eliminación: prohibida

localidades
  lectura: admin y chofer de localidades asignadas
  modificación: admin

ventas
  lectura completa: admin
  lectura propia: chofer mediante cliente/localidad y choferUid
  creación: chofer con turno activo y cliente dentro de localidad asignada
  modificación/eliminación: prohibidas después de confirmar

auditoria_clientes
  lectura: admin; chofer solo de eventos permitidos de su alcance
  creación: operación autorizada
  modificación/eliminación: prohibidas
```

La regla de venta debe verificar simultáneamente `auth.uid`, localidad asignada, cliente activo, turno activo y coherencia del tipo de cliente.

## 13. Estados de pantalla

| Estado | Comportamiento |
|---|---|
| Sin clientes | Muestra localidad sin clientes y no inventa registros. |
| Sin localidad | El cliente no puede activarse. |
| Localidad sin chofer | Visible para admin; no aparece en cartera de chofer. |
| Cliente inactivo | Consulta histórica; no permite nueva venta. |
| Precio faltante | Bloquea activación o venta y solicita configuración administrativa. |
| Tipo comercial | Dirige al flujo comercial. |
| Tipo industrial | Dirige al flujo de medidor. |
| Sin permiso | No muestra datos fuera de la cartera. |
| Duplicado probable | Advierte por nombre/teléfono/localidad antes de guardar. |
| Sin conexión | Conserva borrador local, pero no confirma venta sin sincronización válida. |

## 14. Índices previstos

Solo se crearán después de probar consultas reales. Las consultas probables son:

```text
clientes where localidadId == X and estado == "activo"
clientes where localidadId == X and tipo == "industrial"
clientes where localidadId == X orderBy nombre
clientes where telefono == X
clientes where estado == X orderBy actualizadoEn desc
auditoria_clientes where clienteId == X orderBy creadoEn desc
```

## 15. Criterios de aceptación

1. Todo cliente activo tiene una localidad válida.
2. El cliente no tiene un chofer permanente almacenado como propietario directo.
3. El chofer ve solo clientes de sus localidades activas.
4. El administrador ve clientes de todas las localidades.
5. El tipo comercial o industrial dirige al flujo de venta correcto.
6. El precio industrial se interpreta por garrafón equivalente de 19 L.
7. El precio aplicado queda congelado en cada venta.
8. Cambiar el precio no altera ventas anteriores.
9. Cambiar la localidad no altera operaciones históricas.
10. Desactivar un cliente bloquea nuevas ventas y conserva el historial.
11. Toda creación, cambio de localidad, tipo, precio o estado queda auditado.
12. Ninguna acción dinámica permite eliminar clientes o editar ventas históricas.
13. Un cliente sin localidad o precio válido no puede quedar activo.
14. La creación duplicada probable genera advertencia sin borrar datos.
15. Las reglas mantienen el aislamiento del chofer aunque se manipule la interfaz.

## 16. Fuera de alcance

Este módulo no implementa todavía activos prestados, créditos, notas PDF, ventas, inventario de agua, reportes Excel ni el código de QR. Esos módulos utilizarán `clienteId`, `localidadId`, `tipo` y el precio aplicado definidos aquí.

## 17. Decisiones pendientes antes de implementar

1. Confirmar si el chofer podrá crear clientes nuevos dentro de sus localidades o si solo administración los crea.
2. Confirmar si el precio se mantendrá directamente en el cliente o si después se trasladará a una tabla histórica de tarifas.
3. Confirmar qué datos mínimos adicionales requiere un cliente industrial, como razón social o datos fiscales.
4. Confirmar si se utilizará código interno o QR para el cliente en esta nueva versión.

No se implementará código ni se crearán colecciones hasta aprobar estas decisiones.


# Enmienda aprobada — Versión 2.0

Esta sección **sustituye cualquier decisión anterior en conflicto** dentro de este documento. La versión vigente del Módulo 4 queda definida por las siguientes reglas.

## A. Alta de cliente mediante solicitud

El chofer puede iniciar una solicitud de alta únicamente para una localidad que tenga asignada permanentemente. No crea directamente el cliente activo.

Colección conceptual:

```text
solicitudes_alta_clientes/{solicitudId}
```

Campos mínimos:

```text
solicitadoPorUid
localidadId
nombre
telefono
tipo: comercial | industrial
datosFiscales
autorizadoPorUid
estado: pendiente | aprobada | rechazada | requiere_correccion
motivoResolucion
clienteId
creadoEn
resueltoEn
```

El administrador dispone de un panel de **Solicitudes**. Puede aprobar, rechazar con motivo obligatorio o solicitar corrección. Solo una solicitud aprobada puede originar `clientes/{clienteId}`. Todas estas acciones quedan auditadas.

## B. Datos fiscales para México

Cuando el cliente solicite factura, la solicitud o el expediente aprobado debe incluir los datos típicos de facturación mexicana:

```text
razonSocial
rfc
codigoPostalFiscal
regimenFiscal
usoCfdi
correoFiscal opcional
```

Los datos fiscales pueden quedar incompletos para un cliente que no solicita factura, pero la aplicación debe bloquear la emisión o solicitud de comprobante fiscal mientras falte un dato requerido.

## C. Tarifas globales administradas

El precio no se define individualmente por cliente. Administración controla las tarifas desde configuración:

```text
tarifas/{tarifaId}
{
  nombre: "Comercial",
  codigo: "comercial",
  unidadCobro: "garrafon_equivalente_19l",
  precio: 15,
  estado: "activa",
  version: 1,
  actualizadoPorUid,
  actualizadoEn
}
```

Las tarifas iniciales son:

```text
tarifa comercial
tarifa industrial
```

El diseño permite agregar posteriormente otros conceptos. Si administración cambia una tarifa, el cambio aplica a todos los clientes de ese concepto para ventas nuevas. Cada venta conserva una copia inmutable de `tarifaId`, `versionTarifa`, `precioAplicado` y `tipoCliente`; por ello las ventas anteriores no cambian.

Para industrial:

```text
garrafonesEquivalentes = litrosVendidos / 19
total = garrafonesEquivalentes × precioIndustrial
```

## D. Folios de nota y conciliación con factura física

La nota industrial de crédito recibe un folio interno generado por el sistema:

```text
nota_credito/{notaId}
{
  folioInterno,
  clienteId,
  localidadId,
  choferUid,
  ventaId,
  total,
  firma,
  estado: pendiente | conciliada | pagada,
  creadoEn
}
```

El segundo folio no lo genera INGEST. Lo captura el administrador al guardar el abono que concilia la nota de crédito con la factura realizada físicamente:

```text
abonos_credito/{abonoId}
{
  notaCreditoId,
  clienteId,
  importe,
  folioFacturaFisica,
  registradoPorUid,
  registradoEn,
  estado
}
```

El `folioFacturaFisica` es obligatorio para guardar el abono de conciliación. No reemplaza `folioInterno`; ambos permanecen vinculados. La captura del segundo folio genera un evento inmutable en `auditoria_creditos`.

## E. Identificador permanente por localidad

Cada cliente aprobado recibe un código generado por localidad. El formato es:

```text
<primeras tres letras normalizadas de localidad><consecutivo de localidad>
```

Ejemplo:

```text
MOC001
MOC002
MOC003
```

La secuencia es independiente por localidad, empieza en `001` y nunca disminuye. La desactivación de un cliente no libera ni reutiliza su código.

Colección conceptual del contador:

```text
contadores_localidad/{localidadId}
{
  prefijo: "MOC",
  ultimoConsecutivo: 3,
  actualizadoEn,
  actualizadoPorUid
}
```

La generación del código debe ejecutarse en una transacción o mecanismo idempotente para impedir duplicados. Si un cliente activo cambia de localidad, recibe un nuevo código con el prefijo de la nueva localidad; el código anterior queda como histórico y no se reutiliza.

El código se marca únicamente en el **tambo físico**. No se requiere todavía QR ni código de barras para esta función.

## F. Regla de cliente y localidad vigente

```text
clientes/{clienteId}
  localidadId obligatorio
  codigoLocalidad inmutable mientras permanezca en la localidad
  tipo comercial | industrial
  tarifaId obligatorio para activar
```

El cliente no contiene un `choferUid` permanente. La visibilidad del chofer se resuelve por la asignación permanente de su localidad.

## G. Auditoría obligatoria

Deben auditarse, como mínimo:

```text
solicitar_alta
aprobar_alta
rechazar_alta
corregir_solicitud
crear_cliente
cambiar_localidad
cambiar_tipo
cambiar_tarifa
cambiar_datos_fiscales
desactivar_cliente
reactivar_cliente
crear_nota_credito
registrar_abono
capturar_folio_factura_fisica
generar_codigo_localidad
```

La auditoría registra `ejecutadoPorUid`, fecha, entidad, identificador, valores anteriores, valores nuevos, motivo y referencia de operación. Ningún administrador puede editar o eliminar la auditoría.

## H. Decisiones que quedan cerradas

1. El chofer solicita altas; administración aprueba.
2. Las tarifas son globales por concepto y se administran desde configuración.
3. El precio industrial es por garrafón equivalente de 19 L.
4. La nota tiene folio interno del sistema.
5. El folio de la factura física lo captura administración al guardar el abono conciliatorio.
6. El código del cliente es por localidad y nunca se renumera hacia abajo.
7. El cambio de localidad genera un nuevo código.
8. El código se marca únicamente en el tambo físico.
9. No se manejará nómina ni pago al chofer en este módulo.
10. No se implementará nada hasta que esta enmienda sea aprobada.

## I. Decisiones fuera de este módulo

La firma digital, los activos prestados, el detalle de litros, las ventas industriales, los cierres de caja y el proceso completo de abonos se desarrollarán en sus módulos respectivos, utilizando los identificadores definidos aquí.
