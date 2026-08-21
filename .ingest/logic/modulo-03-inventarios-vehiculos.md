# Módulo 3 — Inventario de ventas y vehículos

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** documentación funcional previa al desarrollo
**Versión:** 2.0

> Este documento define la relación entre vehículo, medidor, responsable operativo y el control configurable de garrafones vendidos. El agua no se trata como existencia física limitante: la operación parte de que la purificación continúa. No crea código, colecciones reales ni reglas de producción.

## 1. Objetivo

El módulo administra los vehículos operativos, sus medidores físicos y un contador de ventas de garrafones exclusivamente por chofer. El administrador define el modo de conteo para situaciones operativas, como un resumen parcial de viernes o un cierre al mediodía del sábado; este módulo no calcula nómina, comisiones ni pagos al chofer. El chofer opera con su vehículo, medidor, localidad y clientes asignados.

El inventario de agua no debe bloquear una venta por saldo físico. En esta etapa, el concepto de inventario significa **control histórico y operativo de garrafones vendidos**, no una bodega que impida vender porque el saldo llegue a cero.

El módulo conservará dos tipos de información:

1. **Configuración actual:** vehículo, medidor, chofer responsable y modo de conteo vigente.
2. **Historial inmutable:** ventas, lecturas, conteos, reinicios, cierres y cambios administrativos.

Un cambio posterior de vehículo, medidor, periodo o modo de conteo no modifica las ventas ni los cierres anteriores.

## 2. Relaciones principales

```text
usuarios/{choferUid}
  └── vehiculoId actual
          ↓
vehiculos/{vehiculoId}
  └── medidorId actual
          ↓
medidores/{medidorId}

usuarios/{choferUid}
  └── contador de ventas según configuración
          ↓
ventas/{ventaId}
          ↓
resumen_ventas_chofer/{resumenId}
          ↓
cierres_turno/{cierreId}
```

La localidad sigue perteneciendo al chofer mediante la asignación permanente documentada en el Módulo 2. El vehículo y el medidor son el contexto físico de la operación. El contador consolida ventas, pero no sustituye los tickets ni las lecturas originales.

## 3. Reglas de negocio aprobadas

| Regla | Definición |
|---|---|
| Administración | Solo `admin` configura vehículos, medidores y modo de conteo. |
| Chofer | Opera con el vehículo y medidor que administración le asignó. |
| Agua | No existe un límite físico de agua que bloquee la venta. |
| Contador | El sistema cuenta garrafones vendidos por chofer y periodo configurado. |
| Periodo | Administración puede elegir `diario`, `semanal` o `manual`. |
| Manual | El conteo manual exige acción explícita, cantidad o confirmación de reinicio y motivo. |
| Historial | Ventas, lecturas, conteos, reinicios y cierres no se editan ni eliminan. |
| Auditoría | Toda acción administrativa queda respaldada, incluso si la ejecuta un admin. |
| Medidor | La lectura final debe ser mayor que la lectura inicial cuando se use el medidor. |
| Precio | La venta conserva una copia del precio aplicado en ese momento. |
| Presentación | Los productos y presentaciones se cuentan por separado; no se mezclan por tener el mismo contenido. |
| Cierre | El cierre conserva vehículo, medidor, ventas comerciales, industriales, créditos y contador del periodo. |
| Acciones | Las acciones secundarias se muestran mediante botones dinámicos o menús colapsables. |

## 4. Colección `vehiculos`

Ruta:

```text
vehiculos/{vehiculoId}
```

| Campo | Tipo | Obligatorio | Editable | Descripción |
|---|---|---:|---:|---|
| `nombre` | string | Sí | Admin | Nombre visible, por ejemplo `Pipa 01`. |
| `codigoInterno` | string | Sí | Admin una vez | Identificador interno único. |
| `placa` | string/null | No | Admin | Placa o identificación física cuando aplique. |
| `tipo` | enum | Sí | Admin | `vehiculo`, `planta` u otra unidad aprobada. |
| `estado` | enum | Sí | Admin | `activo`, `mantenimiento`, `inactivo` o `baja`. |
| `medidorId` | string/null | Condicional | Admin | Medidor físico actualmente vinculado. |
| `choferUidActual` | string/null | No | Automático/admin | Responsable operativo actual. |
| `creadoPorUid` | string | Sí | No | Admin que creó el vehículo. |
| `creadoEn` | timestamp | Sí | No | Fecha de alta. |
| `actualizadoPorUid` | string | Sí | Automático | Último admin que modificó configuración. |
| `actualizadoEn` | timestamp | Sí | Automático | Última modificación. |
| `motivoEstado` | string/null | Condicional | Admin | Obligatorio al pasar a mantenimiento, inactivo o baja. |

No se elimina un vehículo con operaciones históricas. Se cambia su estado y se audita.

## 5. Colección `medidores`

Ruta:

```text
medidores/{medidorId}
```

| Campo | Tipo | Obligatorio | Editable | Descripción |
|---|---|---:|---:|---|
| `nombre` | string | Sí | Admin | Nombre visible del medidor. |
| `codigoInterno` | string | Sí | Admin una vez | Identificador físico único. |
| `tipoFlujo` | string | Sí | Admin | Tipo de flujo configurado. |
| `unidadMedida` | string | Sí | Admin | Por ejemplo `litros`. |
| `vehiculoId` | string/null | No | Admin | Vehículo actualmente vinculado. |
| `lecturaActual` | number | Sí | Operación autorizada | Última lectura confirmada. |
| `decimalesPermitidos` | number | Sí | Admin antes de operar | Precisión admitida por el medidor. |
| `estado` | enum | Sí | Admin | `activo`, `mantenimiento`, `inactivo` o `baja`. |
| `creadoPorUid` | string | Sí | No | Admin que lo registró. |
| `creadoEn` | timestamp | Sí | No | Fecha de alta. |
| `actualizadoEn` | timestamp | Sí | Automático | Última actualización válida. |
| `motivoEstado` | string/null | Condicional | Admin | Motivo al cambiar estado. |

La lectura actual no se edita directamente desde una pantalla común. Avanza mediante una operación confirmada que deja lectura histórica.

## 6. Asignación de vehículo a chofer

Ruta:

```text
asignaciones_vehiculos/{asignacionId}
```

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

La asignación no se realiza diariamente. Permanece activa hasta que administración la cambie o finalice explícitamente. En el contrato inicial, un chofer tiene como máximo un vehículo activo y un vehículo tiene como máximo un chofer actual.

## 7. Lecturas del medidor

Ruta conceptual:

```text
lecturas_medidor/{lecturaId}
```

```text
{
  medidorId,
  vehiculoId,
  choferUid,
  clienteId: null,
  ventaId: null,
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

Para agua:

```text
litrosVendidos = lecturaFinal - lecturaInicial

garrafonesEquivalentes19L = litrosVendidos / 19
```

Cuando el cliente industrial se cobra por medidor, el precio industrial se aplica por garrafón equivalente de 19 litros. La lectura final debe ser estrictamente mayor; una lectura igual o menor se rechaza. La lectura confirmada es inmutable.

## 8. Nuevo concepto de inventario: contador de ventas

El agua no se maneja como una existencia física que bloquee la venta. No se utilizará `cantidadDisponible` de agua para impedir una operación, porque la purificación continúa durante el servicio.

El control operativo será:

```text
garrafonesVendidos
periodoDeConteo
choferUid
localidadId opcional
vehiculoId
```

El contador sirve para control, reportes, cierres y comparaciones con el medidor. La fuente detallada de verdad siguen siendo los tickets, las líneas de venta, las lecturas y los movimientos de caja.

## 9. Configuración administrativa del conteo

Colección conceptual:

```text
configuracion_contadores/{configuracionId}
```

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `alcance` | enum | Sí | Siempre `porChofer`; el vehículo solo se conserva como contexto histórico. |
| `choferUid` | string | Sí | Chofer al que aplica. |
| `vehiculoId` | string/null | No | Contexto actual; no define el propietario del contador. |
| `modo` | enum | Sí | `diario`, `semanal` o `manual`; el modo manual permite cortes operativos en cualquier fecha u hora. |
| `diaInicioSemana` | number/null | Condicional | Día de inicio si el modo es semanal. |
| `zonaHoraria` | string | Sí | Zona usada para cortar el día. |
| `reinicioAutomatico` | boolean | Sí | Si el periodo reinicia automáticamente. |
| `activo` | boolean | Sí | Configuración vigente. |
| `configuradoPorUid` | string | Sí | Admin responsable. |
| `configuradoEn` | timestamp | Sí | Fecha de configuración. |
| `motivoCambio` | string/null | Condicional | Obligatorio cuando reemplaza una configuración anterior. |

La configuración nunca debe cambiar silenciosamente un periodo ya cerrado. Al cambiar el modo de conteo, la configuración anterior se conserva en historial y la nueva inicia un periodo claramente identificado. El modo no representa nómina ni pago: solo define cómo se agrupan las ventas y cuándo se genera un resumen operativo.

## 10. Modos de conteo

### 10.1 Diario

El conteo diario se organiza por chofer y fecha operativa. A las 23:59 se congela el resumen de la fecha, pero el periodo solo queda definitivamente cerrado cuando el chofer confirma el cierre de caja y la lectura física de cierre.

El sistema agrupa las ventas del chofer por fecha operativa y zona horaria configurada. No se agrupa por vehículo como propietario del contador; el vehículo queda como contexto de las operaciones.

```text
periodoId = choferUid + fechaLocal
```

El cambio de fecha abre un nuevo resumen lógico. El historial del día anterior permanece cerrado y no vuelve a sumarse al día actual.

### 10.2 Semanal

El sistema agrupa las ventas entre el día de inicio y el día anterior al siguiente periodo.

```text
periodoId = choferUid + semana + año
```

El administrador define el primer día de la semana y la zona horaria. El conteo semanal no borra el detalle de tickets ni las ventas históricas.

### 10.3 Manual

El administrador controla el periodo. Puede solicitar un resumen operativo en cualquier momento, pero esa acción no registra nómina ni pago al chofer. Puede:

- solicitar un conteo actual;
- confirmar el número observado;
- establecer un nuevo punto de inicio;
- reiniciar el contador;
- cerrar el periodo manual;
- registrar un motivo obligatorio.

Un reinicio manual no elimina ventas. Crea un evento de corte y hace que las ventas posteriores pertenezcan a un nuevo periodo.

## 11. Estados de sesión del chofer

Después de cerrar un periodo, el chofer no entra directamente a una pantalla operativa. La aplicación inicia en **modo lectura**, que permite consultar el resumen y preparar el siguiente turno, pero bloquea ventas, créditos, movimientos y cualquier operación que consuma o registre actividad.

Los estados funcionales son:

| Estado | Qué puede hacer el chofer | Qué queda bloqueado |
|---|---|---|
| `modo_lectura` | Consultar resumen, último vehículo usado, última lectura y periodos anteriores. | Ventas, créditos, caja, lecturas operativas y movimientos. |
| `inicio_turno_pendiente` | Pulsar `Iniciar turno`, elegir vehículo y capturar lectura actual. | Toda operación hasta confirmar la lectura. |
| `turno_activo` | Operar clientes, ventas, créditos, carrito y caja. | Cambiar vehículo, medidor, localidad o configuración. |
| `cierre_pendiente` | Revisar resumen y capturar dos veces la lectura de cierre. | Nuevas ventas después de solicitar el cierre. |
| `periodo_cerrado` | Consultar recibo e historial. | Cualquier modificación del periodo cerrado. |

## 12. Flujo de inicio de turno

### 12.1 Entrada inicial en modo lectura

Al iniciar sesión después de un periodo cerrado, la pantalla principal mostrará una banda superior visible:

```text
MODO LECTURA
Resumen disponible — operaciones bloqueadas

[Iniciar turno]
```

La acción `Iniciar turno` debe estar en la parte superior de la pantalla principal, no escondida únicamente dentro de configuración. Esto reduce el riesgo de que el chofer intente vender sin haber confirmado la lectura del día. Un menú colapsable puede repetir la acción, pero no reemplaza el botón principal.

En modo lectura se mostrarán:

```text
último periodo cerrado
última lectura registrada
vehículo de referencia
resumen de garrafones
contado comercial
contado industrial
crédito comercial
crédito industrial
efectivo operativo del periodo anterior
```

### 12.2 Selección del vehículo

Al pulsar `Iniciar turno`, el sistema presenta los vehículos autorizados y activos para ese chofer. Si solo existe uno, puede aparecer preseleccionado, pero el chofer debe confirmarlo. El chofer nunca puede elegir un vehículo ajeno a su asignación administrativa.

```text
Selecciona tu vehículo
[ Pipa 01 — Medidor M-001 ]

[Regresar] [Continuar]
```

El sistema conserva la última lectura conocida del vehículo seleccionado como referencia.

### 12.3 Captura de lectura actual

Después de elegir vehículo, se solicita:

```text
Última lectura registrada: 10,500.00

Lectura actual del vehículo:
[                         ]

[Regresar] [Confirmar lectura]
```

La lectura inicial de referencia del vehículo se asigna una sola vez en administración. Las capturas diarias no reemplazan esa referencia original; crean lecturas de inicio de día y mantienen la continuidad del historial.

La validación recomendada es:

```text
lecturaActual >= ultimaLecturaConocida
```

Se permite igualdad si el vehículo no tuvo salida desde el último cierre. Si la lectura actual es menor, el sistema bloquea el inicio, muestra el desfase y solicita revisión administrativa o un motivo conforme al procedimiento aprobado. Una lectura mayor se acepta y se registra como inicio del nuevo periodo.

### 12.4 Activación del turno

Solo después de confirmar el vehículo y la lectura se crea el inicio de turno y se cambia el estado a `turno_activo`:

```text
inicio_turno
  ├── choferUid
  ├── vehiculoId
  ├── medidorId
  ├── lecturaReferenciaAnterior
  ├── lecturaActualInicio
  ├── periodoId
  └── creadoEn
```

A partir de ese momento se habilitan las pantallas de clientes, ventas, crédito, carrito y caja. Si el usuario cierra la pestaña o pierde conexión, el estado local debe conservar el borrador, pero la activación definitiva depende de la confirmación persistida.

## 13. Ciclo operativo de fecha, lectura y cierre de caja

El medidor físico tiene una lectura inicial asignada una sola vez al vehículo o a la unidad operativa. Esa lectura es el punto de referencia histórico y no se vuelve a editar.

La lectura no se cierra después de cada venta. Mientras el turno está abierto, el sistema muestra en el dashboard la última lectura física declarada, las lecturas asociadas a ventas industriales y una lectura operativa acumulada para que el chofer compare la información digital con lo que observa en el medidor.

#### 13.1 Inicio del día

Al abrir la app en un nuevo día operativo, el sistema solicita:

```text
lectura_actual = [             ]
[Confirmar lectura]
```

La lectura se guarda como `lectura_inicio_dia` y se compara con la última referencia conocida. Si existe diferencia, el sistema muestra el desfase y exige motivo cuando corresponda; no modifica la lectura anterior.

#### 13.2 Durante las ventas

Cada venta industrial puede registrar las lecturas necesarias para calcular litros y garrafones equivalentes, pero no cierra el medidor general del vehículo. El dashboard actualiza el resumen del chofer con:

```text
última lectura confirmada
lectura operativa esperada
litros registrados
garrafones equivalentes
```

La lectura operativa esperada es un apoyo de memoria y detección de errores. No sustituye la lectura física de cierre.

#### 13.3 Cambio automático a las 23:59

A las 23:59 de la zona horaria configurada, el sistema cierra automáticamente el **periodo de fecha** para impedir que nuevas operaciones queden registradas con la fecha anterior. Este evento:

- congela el resumen del día;
- marca el periodo como `pendiente_cierre` si la caja todavía no fue cerrada;
- registra un evento auditado de cambio de fecha;
- no borra ventas ni créditos;
- no genera por sí solo el recibo final de caja;
- no inventa una lectura física de cierre.

El cierre automático de fecha no equivale al cierre confirmado de caja. Si el chofer todavía no realizó el cierre físico, administración verá el periodo como pendiente.

#### 13.4 Cierre manual de caja

El cierre definitivo ocurre cuando el chofer entra a `Cerrar caja` y confirma la operación. El sistema solicita nuevamente:

```text
lectura_cierre = [             ]
confirmar_lectura_cierre = [   ]
```

La segunda captura evita errores de dedo. Si los valores no coinciden, no se permite confirmar. Después de confirmar, se crea el recibo inmutable con el resumen de ventas, créditos, efectivo, vehículo, clientes atendidos, lectura inicial y lectura final.

El cierre manual puede hacerse antes de las 23:59 por una necesidad operativa, por ejemplo un resumen de viernes o un corte al mediodía del sábado. Esto no representa nómina ni registra pagos al chofer; solo cierra el periodo operativo y de caja.

#### 13.5 Nuevo día después de un cierre

Cuando el chofer abre la app al día siguiente, debe declarar la lectura actual del medidor. El nuevo periodo conserva la continuidad del medidor y comienza con esa lectura como referencia. Nunca se reinicia físicamente el medidor desde cero.

## 14. Colección `resumen_ventas_chofer`

Ruta conceptual:

```text
resumen_ventas_chofer/{resumenId}
```

El resumen es una vista operativa acumulada por periodo; no reemplaza el historial detallado.

```text
{
  periodoId,
  modoConteo: "diario" | "semanal" | "manual",
  choferUid,
  vehiculoId,
  medidorId,
  garrafonesComercialesContado,
  garrafonesIndustrialesContado,
  garrafonesComercialesCredito,
  garrafonesIndustrialesCredito,
  garrafonesTotales,
  efectivoComercial,
  efectivoIndustrial,
  efectivoTotalARecibir,
  lecturaInicialPeriodo: null,
  lecturaFinalPeriodo: null,
  estado: "abierto" | "pendiente_cierre" | "cerrado" | "reiniciado",
  tipoCierre: "automatico_fecha" | "manual_caja" | null,
  lecturaInicioDia: null,
  lecturaCierre: null,
  creadoEn,
  actualizadoEn,
  ultimaOperacionId
}
```

Las fórmulas aprobadas son:

```text
garrafonesTotales =
  comercialesContado
  + industrialesContado
  + comercialesCredito
  + industrialesCredito

efectivoTotalARecibir =
  efectivoComercial
  + efectivoIndustrial
```

El crédito cuenta como venta y como unidades entregadas, pero no forma parte del efectivo que el chofer entrega al cierre.

## 15. Colección `eventos_contador_ventas`

Ruta:

```text
eventos_contador_ventas/{eventoId}
```

Esta colección conserva cada corte, conteo y reinicio.

```text
{
  tipo: "inicio_periodo" | "corte" | "conteo_manual" | "reinicio_manual" | "cierre_periodo",
  periodoAnteriorId: null,
  periodoNuevoId: null,
  choferUid,
  vehiculoId,
  conteoAnterior,
  conteoObservado: null,
  conteoNuevo,
  modoConteo,
  motivo: null,
  ejecutadoPorUid,
  creadoEn,
  operacionId
}
```

Todo reinicio exige motivo, usuario y fecha. Ningún evento se edita o elimina.

## 16. Relación con ventas

Cada venta conserva su contexto:

```text
ventas/{ventaId}
{
  choferUid,
  vehiculoId,
  medidorId,
  localidadId,
  clienteId,
  tipoCliente: "comercial" | "industrial",
  formaPago: "contado" | "credito",
  garrafonesEquivalentes,
  precioAplicado,
  total,
  periodoId,
  resumenId,
  creadoEn
}
```

Una venta comercial puede registrar la cantidad acordada. Una venta industrial puede derivar los garrafones equivalentes a partir de la diferencia del medidor. Ambas incrementan el contador de ventas del periodo correspondiente.

El contador no modifica ni borra la venta. Si el resumen se reconstruye, debe poder recalcularse desde las ventas y sus detalles.

## 17. Botones dinámicos y acciones colapsables

La interfaz tendrá una acción principal visible y acciones secundarias dentro de un menú de opciones. El menú debe mostrar solo acciones permitidas por rol y estado.

| Acción | Visibilidad | Resultado |
|---|---|---|
| `Ver resumen` | Admin/chofer con alcance | Muestra conteo del periodo. |
| `Ver detalle` | Admin/chofer con alcance | Muestra ventas que forman el total. |
| `Configurar conteo` | Admin | Abre modo diario, semanal o manual. |
| `Solicitar conteo` | Admin | Pide confirmación del conteo actual. |
| `Reiniciar conteo` | Admin | Cierra el periodo y crea uno nuevo con motivo. |
| `Cerrar periodo` | Admin | Congela el resumen sin borrar ventas. |
| `Ver cortes` | Admin/chofer con alcance | Muestra historial de periodos y reinicios. |
| `Ver auditoría` | Admin | Consulta eventos inmutables. |
| `Editar contador` | Nadie | No se ofrece. |
| `Eliminar periodo` | Nadie | No se ofrece. |

Los tres puntos u otra acción colapsable no son un permiso. Las reglas de Firestore deben validar el rol y el estado aunque el botón no se muestre.

## 18. Pantallas administrativas

### 15.1 Vehículos y medidores

Muestra configuración, responsable, estado, medidor y relaciones históricas.

### 15.2 Configuración de conteo

Permite seleccionar el alcance y modo de conteo para cada chofer o vehículo. Exige confirmación y genera auditoría.

### 15.3 Resumen de ventas por chofer

Permite elegir chofer, periodo, modo y rango. Muestra:

```text
garrafones comerciales
 garrafones industriales
garrafones a crédito
garrafones totales
efectivo comercial
efectivo industrial
efectivo total a recibir
```

### 15.4 Cortes y reinicios

Vista inmutable de cortes diarios, semanales y manuales, con usuario, motivo, conteo anterior y conteo nuevo.

### 15.5 Movimientos y detalle

Muestra los tickets y operaciones que forman un resumen. No permite editar el detalle desde el resumen.

## 19. Pantalla del chofer

El chofer verá en su pantalla principal:

```text
contador actual del periodo
modo: diario | semanal | manual
fecha o rango del periodo
comerciales de contado
industriales de contado
comerciales a crédito
industriales a crédito
garrafones totales
efectivo total a recibir
```

No podrá elegir el modo, reiniciar el contador ni cambiar el periodo. Esas acciones pertenecen a administración. El chofer sí puede abrir el detalle de sus propias ventas autorizadas.

## 20. Reglas de acceso conceptuales

```text
vehiculos y medidores
  lectura completa: admin
  lectura propia: chofer mediante su asignación activa
  creación/configuración: admin
  eliminación: prohibida

configuracion_contadores
  lectura completa: admin
  lectura aplicada: chofer de su propio contexto
  creación/cambio: admin
  eliminación: prohibida

resumen_ventas_chofer
  lectura completa: admin
  lectura propia: chofer con choferUid == auth.uid
  actualización: operación autorizada o función controlada
  edición manual: prohibida

ventas
  lectura completa: admin
  lectura propia: chofer con choferUid == auth.uid
  creación: flujo autorizado
  actualización/eliminación: prohibidas después de confirmación

eventos_contador_ventas
  lectura completa: admin
  lectura propia: chofer de su contexto
  creación: acción autorizada de conteo o reinicio
  actualización/eliminación: prohibidas
```

Ocultar acciones dinámicas no es seguridad. Las reglas deben impedir que un chofer modifique el modo, reinicie su contador o lea resúmenes de otro chofer.

## 21. Auditoría transversal

Colección conceptual:

```text
auditoria_inventarios_vehiculos/{eventoId}
```

Debe registrar:

```text
{
  tipoEvento,
  recursoTipo: "vehiculo | medidor | contador | periodo | corte",
  recursoId,
  ejecutadoPorUid,
  valoresAnteriores,
  valoresNuevos,
  motivo,
  operacionId,
  creadoEn
}
```

También se respaldan en `eventos_contador_ventas` los conteos y reinicios operativos. Todo admin genera auditoría, sin excepciones.

## 22. Estados de pantalla

| Estado | Comportamiento |
|---|---|
| Sin configuración | Muestra que administración debe elegir modo. |
| Diario activo | Muestra el periodo del día local. |
| Semanal activo | Muestra inicio y fin de la semana. |
| Manual activo | Muestra el último conteo y el responsable del corte. |
| Periodo cerrado | Solo lectura; las ventas nuevas van a otro periodo. |
| Reinicio pendiente | Exige motivo y confirmación. |
| Error de permiso | No revela datos de otro chofer. |
| Error de red | No afirma que el corte quedó guardado. |
| Duplicado | Un reintento no crea un segundo reinicio. |
| Sin ventas | Muestra cero sin fabricar movimientos. |

## 23. Criterios de aceptación

1. El inventario de agua no bloquea ventas por existencia física.
2. El administrador puede configurar conteo diario, semanal o manual.
3. El chofer no puede cambiar la configuración del contador.
4. El total incluye ventas comerciales, industriales y créditos.
5. El efectivo a recibir solo suma ventas comerciales e industriales de contado.
6. El crédito se muestra separado como unidades y deuda pendiente.
7. Un periodo cerrado no vuelve a sumarse al siguiente periodo.
8. Un reinicio manual no borra tickets ni modifica ventas anteriores.
9. Cada corte y reinicio queda auditado.
10. Cada venta queda vinculada a un periodo y resumen.
11. Los resúmenes pueden reconstruirse desde las ventas.
12. Los botones secundarios son colapsables, pero las reglas no dependen de ocultarlos.
13. El contador no mezcla choferes, vehículos ni periodos.
14. Los movimientos y lecturas históricas no se editan ni eliminan.
15. El contador pertenece al chofer, aunque el vehículo cambie.
16. La lectura inicial del vehículo se asigna una sola vez y queda auditada.
17. A las 23:59 se congela la fecha operativa sin fabricar una lectura de cierre.
18. El cierre de medidor solo se confirma dentro del cierre de caja.
19. El cierre solicita dos capturas coincidentes de la lectura física.
20. La aplicación no calcula ni registra nómina, comisiones o pagos al chofer.
15. Un reintento idempotente no duplica ventas, cortes ni reinicios.

## 24. Fuera de alcance

Este módulo no define todavía el catálogo completo de productos, precios, clientes, ventas detalladas, créditos, notas PDF, reportes Excel ni la implementación concreta de persistencia offline. Esos módulos utilizarán el periodo y contador definidos aquí.

## 25. Decisiones pendientes

Antes de implementar deben confirmarse:

1. Confirmar la zona horaria exacta que gobernará el cambio automático de las 23:59.
2. Confirmar si el chofer puede tener más de un vehículo activo disponible o si siempre habrá uno único.
3. Confirmar si una lectura actual igual a la anterior debe permitir iniciar turno, como está propuesto aquí.
2. Confirmar si un cierre manual antes de las 23:59 abre inmediatamente un nuevo periodo operativo o requiere una nueva lectura actual.
3. Confirmar si el conteo manual solicita solo reinicio o también captura de conteo observado.
4. Confirmar si el contador debe incluir todos los productos vendidos o solo garrafones de agua.
5. Confirmar si el resumen separará también comercial e industrial por localidad.

No se implementará código hasta aprobar estas decisiones.
