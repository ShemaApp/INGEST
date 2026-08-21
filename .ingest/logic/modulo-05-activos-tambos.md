# Módulo 5 — Activos e inmuebles prestados: tambos

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** documentación funcional previa al desarrollo
**Versión:** 1.0
**Dependencias:** Módulo 2 — Localidades y asignaciones; Módulo 4 — Clientes por localidad

> Este módulo controla los tambos físicos propiedad de la empresa que se entregan en préstamo para consumo de un cliente. El sistema no trata el tambo como inventario de agua: registra el activo físico, su capacidad, su cliente actual, su estado de disponibilidad y su historial de movimientos.

## 1. Objetivo

Cada cliente puede tener un tambo adherido para recibir el producto. Al crear o aprobar un cliente, administración debe especificar la capacidad del tambo que se le asignará. El sistema conservará esta relación y permitirá conocer dónde está cada activo de la empresa.

El contador de unidades físicas se basa en el **tipo o modelo de tambo**. Un tambo no se considera disponible cuando está adherido a un cliente. Solo vuelve a estar disponible después de una devolución registrada y validada.

El módulo no permitirá borrar movimientos históricos. Una devolución no elimina el activo: cambia su estado, separa la relación con el cliente y lo devuelve al inventario de activos disponibles.

## 2. Tipos y capacidades de tambo

La capacidad es una característica obligatoria del activo y del alta del cliente. La aplicación debe mostrar un selector de capacidades configuradas, acompañado de un recuadro blanco para confirmar o capturar la capacidad autorizada.

Capacidades iniciales:

| Capacidad | Uso inicial | Valor predeterminado |
|---:|---|---:|
| 250 L | Casa o cliente comercial doméstico | Sí |
| 600 L | Comercial de mayor capacidad | No |
| 750 L | Comercial de mayor capacidad | No |
| 1,100 L | Comercial o institucional | No |
| 2,500 L | Industrial o gran consumo | No |

La capacidad de 250 litros queda seleccionada por defecto únicamente como ayuda de captura. Administración puede elegir otra capacidad antes de guardar. No se debe asumir que el tipo de cliente determina automáticamente la capacidad: el tipo comercial o industrial y la capacidad del tambo son datos relacionados, pero independientes.

La configuración futura podrá agregar modelos o capacidades sin cambiar la estructura del módulo. El valor se almacenará en litros como número entero positivo (`capacidadLitros`) y se mostrará con formato local, por ejemplo `1,100 L`.

## 3. Alta del cliente y tambo adherido

En el alta administrativa o en la aprobación de una solicitud de cliente debe aparecer la sección **Activo prestado**:

```text
¿Requiere tambo prestado?       [Sí | No]
Capacidad del tambo             [250 L ▼]
Código físico del tambo         [TMB-_____]
Confirmar asignación            [ ]
```

Para un cliente que recibe un tambo, son obligatorios `requiereTambo = true`, `capacidadLitros`, `activoId` y la confirmación de asignación. El activo seleccionado debe estar disponible y no puede estar adherido a otro cliente.

Si el cliente no recibe un tambo, se crea con `requiereTambo = false` y sin activo adherido. El cliente puede ser atendido bajo las reglas comerciales correspondientes, pero no se contará como tenedor de un inmueble prestado.

El identificador marcado en el tambo es el código físico del activo, no el código de localidad del cliente. El código de localidad del cliente, como `MOC001`, identifica al cliente; el código del tambo identifica al activo de la empresa. Ambos deben quedar vinculados en el expediente, sin confundirse.

## 4. Colección `activos_tambos`

Ruta conceptual:

```text
activos_tambos/{activoId}
```

Campos:

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `activoId` | string | Sí | Identificador permanente del tambo. |
| `codigoFisico` | string | Sí | Código marcado físicamente en el tambo. |
| `capacidadLitros` | number | Sí | Capacidad del tambo, por ejemplo `250`, `600`, `750`, `1100` o `2500`. |
| `modelo` | string | Sí | Modelo o clasificación configurable. |
| `estado` | enum | Sí | `disponible`, `adherido`, `en_devolucion`, `en_revision`, `baja`. |
| `clienteId` | string/null | Condicional | Cliente al que está adherido actualmente. |
| `localidadId` | string/null | Condicional | Localidad vigente del cliente. |
| `fechaAsignacion` | timestamp/null | Condicional | Momento de la entrega o adhesión. |
| `fechaDevolucion` | timestamp/null | Condicional | Momento de la última devolución validada. |
| `motivoEstado` | string/null | Condicional | Motivo de devolución, revisión o baja. |
| `creadoPorUid` | string | Sí | Usuario que registró el activo. |
| `creadoEn` | timestamp | Sí | Fecha de alta del activo. |
| `actualizadoPorUid` | string | Sí | Último usuario que ejecutó una acción válida. |
| `actualizadoEn` | timestamp | Sí | Fecha de la última acción. |

Un activo con `estado = disponible` debe tener `clienteId = null` y `localidadId = null`. Un activo con `estado = adherido` debe tener ambos campos completos. La aplicación y las reglas deben rechazar estados contradictorios.

## 5. Relación en `clientes`

El documento del cliente conservará únicamente la relación vigente:

```text
clientes/{clienteId}
{
  requiereTambo: true,
  activoTamboId: "tambo_001",
  capacidadTamboLitros: 250,
  codigoTamboFisico: "TMB-001",
  localidadId: "localidad_mochomera"
}
```

La capacidad se copia en el cliente para consultas rápidas y para conservar el contexto operativo. La fuente de identidad del activo continúa siendo `activos_tambos/{activoId}`. Si la capacidad del activo se corrige administrativamente, el cambio debe actualizar la relación vigente y generar auditoría; no debe modificar ventas ni movimientos históricos.

## 6. Contabilización física por tipo

El módulo debe permitir consultar totales por capacidad y estado. Estos totales representan unidades físicas, no litros de agua disponibles:

| Indicador | Definición |
|---|---|
| Total registrados | Todos los tambos dados de alta, excepto registros eliminados, ya que no se eliminan. |
| Adheridos | Tambos actualmente vinculados a un cliente. |
| Disponibles | Tambos sin cliente adherido y en estado `disponible`. |
| En devolución | Tambos cuyo retorno fue reportado, pero aún no fue validado por administración. |
| En revisión | Tambos recibidos con daño, diferencia o identificación ilegible. |
| Baja | Activos retirados definitivamente, conservando su historial. |

El resumen debe poder filtrarse por `capacidadLitros` y `modelo`. Por ejemplo, administración podrá consultar cuántos tambos de 250 L están adheridos, disponibles o en revisión. La disponibilidad no se incrementa por una venta ni por el llenado del medidor; únicamente por una devolución validada o por el alta de un activo nuevo.

## 7. Flujo de asignación

```text
Crear o aprobar cliente
        ↓
Seleccionar “requiere tambo”
        ↓
Elegir capacidad y modelo
        ↓
Buscar activo disponible
        ↓
Confirmar código físico
        ↓
Asignar activo al cliente
        ↓
Activo = adherido
```

La asignación debe realizarse en una transacción para evitar que dos usuarios adhieran el mismo tambo simultáneamente. La transacción debe verificar que el activo siga en estado `disponible`, que el cliente no tenga otro tambo vigente y que la localidad del cliente sea la relación vigente de la asignación.

El repartidor puede consultar el tambo de sus clientes dentro de su alcance, pero no puede cambiar la capacidad, sustituir el activo ni marcar una devolución como validada. Esas funciones corresponden a administración. El vendedor de planta podrá consultar los datos necesarios para identificar al cliente y registrar una devolución recibida, pero la validación final corresponde a administración.

## 8. Flujo de devolución

La devolución se produce cuando termina la relación con el cliente, cuando se sustituye el tambo o cuando administración solicita recuperar el activo.

```text
Reportar devolución
        ↓
Registrar código físico y cliente
        ↓
Activo = en_devolucion
        ↓
Recibir físicamente en almacén o planta
        ↓
Revisar estado e integridad
        ↓
¿Aceptado?
  ├── Sí → activo = disponible; clienteId = null
  └── No → activo = en_revision; motivo obligatorio
```

La devolución debe exigir una referencia al cliente, al usuario que entrega, al usuario que recibe y a la fecha. Si el código físico no coincide con el activo esperado, no se debe borrar ni corregir silenciosamente: se registra una incidencia y el activo queda en revisión.

Una vez validada la devolución, el cliente queda sin activo adherido. El tambo vuelve a estar disponible para una nueva asignación, pero su historial anterior permanece intacto.

## 9. Cambio de localidad del cliente

Si un cliente cambia de localidad, el tambo no cambia automáticamente de propietario ni de ubicación operativa. Administración debe decidir entre:

1. conservar el tambo con el cliente y registrar la nueva localidad;
2. recuperar el tambo, validar la devolución y asignar otro activo disponible;
3. mantener el activo en revisión hasta aclarar la entrega física.

El cambio de localidad del cliente y cualquier cambio de activo deben quedar en eventos separados. El código del cliente se regenera conforme al Módulo 4; el código físico del tambo permanece permanente y no se renumera.

## 10. Historial de movimientos

Colección conceptual:

```text
movimientos_activos_tambos/{movimientoId}
```

Campos mínimos:

```text
activoId
codigoFisico
capacidadLitros
clienteId
localidadId
tipoMovimiento: alta | asignacion | devolucion_reportada | devolucion_validada | rechazo_devolucion | sustitucion | revision | baja
usuarioOrigenUid
usuarioReceptorUid
motivo
referenciaSolicitudId
referenciaClienteId
creadoEn
```

Los movimientos son inmutables. La disponibilidad actual se obtiene del documento del activo; el historial explica cómo llegó a ese estado. No se debe representar una devolución eliminando el campo del cliente sin crear antes el movimiento correspondiente.

## 11. Reglas conceptuales de Firestore

```text
activos_tambos
  lectura: admin completa; usuarios operativos según alcance
  creación: admin
  asignación: admin o función autorizada de aprobación
  devolución reportada: usuario operativo autorizado
  devolución validada: admin
  eliminación: prohibida

movimientos_activos_tambos
  creación: operación autorizada
  lectura: admin; usuarios operativos solo dentro de su alcance
  actualización/eliminación: prohibidas

clientes
  activoTamboId y capacidadTamboLitros solo se modifican mediante flujo autorizado
  un cliente no puede tener dos activos vigentes
```

Las reglas deben impedir simultáneamente que un activo disponible tenga cliente, que un activo adherido no tenga cliente o localidad, que un cliente tenga dos activos vigentes y que un usuario operativo valide su propia devolución sin intervención administrativa cuando la política así lo determine.

## 12. Auditoría

Colección conceptual:

```text
auditoria_activos_tambos/{eventoId}
```

Debe auditarse toda alta, asignación, devolución reportada, devolución validada, rechazo, sustitución, cambio de capacidad, cambio de estado, revisión y baja. Cada evento contiene valores anteriores, valores nuevos, actor, fecha, motivo y referencias al cliente y al activo.

Los administradores tampoco pueden editar o eliminar estos registros. Una corrección se realiza mediante un nuevo evento compensatorio.

## 13. Botones y acciones dinámicas

| Botón | Rol | Resultado |
|---|---|---|
| `Agregar tambo` | Admin | Registra un activo nuevo con capacidad, modelo y código físico. |
| `Asignar tambo` | Admin | Vincula un activo disponible a un cliente. |
| `Ver activo` | Admin/usuario con alcance | Muestra capacidad, código, estado y relaciones autorizadas. |
| `Reportar devolución` | Operativo autorizado | Registra que el activo fue entregado físicamente. |
| `Validar devolución` | Admin | Libera el activo y elimina la relación vigente con el cliente. |
| `Enviar a revisión` | Admin | Conserva el activo fuera de disponibilidad con motivo. |
| `Sustituir tambo` | Admin | Cierra una relación y crea otra sin perder historial. |
| `Dar de baja` | Admin | Retira el activo sin eliminar sus movimientos. |
| `Eliminar` | Nadie | No se ofrece. |

Las acciones secundarias deben aparecer en un menú colapsable de tres puntos, de acuerdo con la convención visual aprobada para la aplicación. Ocultar un botón no sustituye las reglas de Firestore.

## 14. Criterios de aceptación

1. Al crear o aprobar un cliente con tambo, la capacidad es obligatoria.
2. La capacidad predeterminada del formulario es 250 L, pero puede cambiarse por una capacidad configurada.
3. El sistema soporta inicialmente 250, 600, 750, 1,100 y 2,500 litros.
4. La capacidad se guarda como número en litros y no como texto libre no validado.
5. Cada tambo tiene un código físico permanente y distinto del código del cliente.
6. Un tambo adherido no aparece como disponible.
7. La disponibilidad solo aumenta mediante devolución validada o alta de activo nuevo.
8. Una venta, llenado o lectura de medidor no altera el conteo físico de tambos.
9. Un cliente no puede tener dos tambos adheridos al mismo tiempo.
10. Dos usuarios no pueden asignar simultáneamente el mismo tambo.
11. Una devolución conserva el historial y separa el activo del cliente únicamente después de validarse.
12. Una devolución con discrepancia de código queda en revisión y exige motivo.
13. Los totales pueden consultarse por capacidad, modelo y estado.
14. Los movimientos y auditorías no pueden editarse ni eliminarse.
15. Un cambio de localidad no renumera el tambo; solo puede generar una nueva relación auditada.

## 15. Fuera de alcance

Este módulo no controla litros de agua, producción, ventas, caja, nómina, rutas nuevas ni códigos QR. Tampoco decide por sí mismo si un cliente debe recibir agua a crédito o contado. Solo proporciona el activo físico y su trazabilidad para que ventas, créditos y cierres puedan referenciarlo.

## 16. Decisiones pendientes antes de implementar

1. Confirmar si la empresa utilizará un formato específico para el código físico del tambo, por ejemplo `TMB-0001`, o si ya existe una numeración física.
2. Confirmar si la devolución reportada por repartidor o vendedor requiere validación obligatoria de administrador en todos los casos.
3. Confirmar si un cliente puede tener más de un tambo en el futuro. La versión actual permite exactamente uno para evitar ambigüedad.
4. Confirmar los modelos comerciales de tambo, además de la capacidad en litros.

No se implementará código ni se crearán colecciones reales hasta aprobar estas decisiones.


# Enmienda aprobada — Identidad unitaria y archivado del cliente

Esta enmienda sustituye cualquier redacción anterior que pudiera interpretarse como eliminación del tambo junto con el cliente.

## 17. Identidad unitaria del tambo

El tambo es un activo físico individual de la empresa. Su `activoId`, `codigoFisico`, capacidad y modelo permanecen durante toda su vida útil. El sistema debe garantizar que un mismo tambo no tenga dos clientes adheridos simultáneamente.

La relación correcta es:

```text
un tambo físico → cero o un cliente activo
un cliente activo → cero o un tambo adherido
```

La capacidad del tambo no crea copias ni unidades virtuales. Dos tambos de 250 L son dos activos diferentes, aunque compartan el mismo modelo y capacidad.

## 18. Reasignación entre clientes

Cuando un cliente devuelve el tambo, se cierra la relación anterior. Después de validar la devolución, el activo queda disponible y puede adherirse a un cliente nuevo. La reasignación nunca reutiliza el expediente anterior ni sobrescribe el historial.

```text
Cliente A + TMB-001
        ↓ devolución validada
TMB-001 disponible
        ↓ nueva asignación
Cliente B + TMB-001
```

El tambo conserva su identidad; únicamente cambian `clienteId`, `localidadId`, `fechaAsignacion` y el estado actual. Cada asignación genera un nuevo movimiento en `movimientos_activos_tambos`.

## 19. Cambio de localidad del cliente

Si el cliente cambia de localidad, el tambo continúa siendo el mismo activo físico. Administración debe registrar el cambio de localidad y actualizar la relación vigente del activo. Si el tambo se devuelve y se entrega otro, se registran dos operaciones: devolución del activo anterior y asignación del nuevo.

El código del cliente puede cambiar conforme al Módulo 4, pero el `activoId` y el `codigoFisico` del tambo no cambian. Esto permite distinguir el historial del cliente del historial del inmueble prestado.

## 20. Archivado o eliminación lógica del cliente

Un cliente no se elimina físicamente de Firestore. Se archiva mediante un estado, por ejemplo:

```text
clientes/{clienteId}
{
  estado: "archivado",
  archivadoEn,
  archivadoPorUid,
  motivoEstado: "relación terminada"
}
```

Al archivar al cliente, el sistema debe quitar la relación activa del documento del cliente:

```text
requiereTambo: false
activoTamboId: null
capacidadTamboLitros: null
codigoTamboFisico: null
```

Antes de completar el archivado debe existir una devolución validada del tambo, si el cliente tenía uno adherido. El activo no se archiva ni se elimina junto con el cliente: pasa a `disponible` si fue recibido correctamente, o a `en_revision` si existe una incidencia física.

El historial de ventas, créditos, notas, solicitudes, activos y auditoría conserva `clienteId` como referencia histórica. El hecho de que el cliente esté archivado no borra las relaciones históricas ni modifica operaciones anteriores.

## 21. Reglas actualizadas

```text
al archivar cliente:
  exigir devolución validada si existe activoTamboId
  retirar la relación activa del cliente
  no eliminar el documento del activo
  no eliminar movimientos ni auditorías
  dejar el activo disponible o en revisión según resultado físico

al reasignar tambo:
  verificar que el activo esté disponible
  verificar que el nuevo cliente no tenga otro activo
  ejecutar asignación en transacción
  crear movimiento y auditoría
```

La eliminación física de `clientes/{clienteId}`, `activos_tambos/{activoId}` y `movimientos_activos_tambos/{movimientoId}` queda prohibida. La aplicación ofrecerá `Archivar cliente`, no `Eliminar cliente`.

## 22. Criterios adicionales de aceptación

1. Un tambo conserva un único `activoId` durante toda su vida útil.
2. El mismo tambo puede pasar de un cliente a otro solo después de una devolución validada.
3. El historial de asignaciones permite saber con qué clientes estuvo relacionado el tambo.
4. Archivar un cliente elimina únicamente la relación activa del cliente con el tambo.
5. Archivar un cliente no elimina, duplica ni cambia la identidad del tambo.
6. Un tambo disponible no contiene `clienteId` ni `localidadId` vigentes.
7. El sistema nunca crea un nuevo tambo automáticamente por cambiar de localidad.
8. La capacidad del tambo permanece asociada al activo y se copia en la relación del cliente para consulta rápida.
