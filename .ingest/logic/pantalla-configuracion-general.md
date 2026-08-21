# Pantalla de Configuración general — Panel administrador

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** propuesta funcional previa a implementación
**Versión:** 1.0
**Alcance:** estructura visual, switches, confirmaciones, persistencia y auditoría

> La configuración general controla el comportamiento opcional de la aplicación. No reemplaza las reglas de Firestore ni concede permisos por sí misma. Un switch puede ocultar o mostrar una función en la interfaz, pero toda operación sensible debe seguir protegida por autenticación, rol, alcance y reglas de backend.

## 1. Objetivo de la pantalla

La pantalla permite que un administrador configure la forma en que la empresa utiliza INGEST sin modificar código. Debe concentrar switches y parámetros globales en secciones independientes, mostrar el impacto operativo de cada cambio y evitar que una opción de configuración altere accidentalmente registros históricos.

La pantalla no debe mezclar configuración con operaciones diarias. Desde aquí no se crean ventas, no se validan devoluciones, no se asignan rutas y no se editan clientes directamente.

## 2. Acceso y navegación

La entrada se ubicará en:

```text
Panel administrador
└── Configuración
    └── General
```

Solo usuarios con rol `admin` pueden consultar o cambiar esta pantalla. Choferes y vendedores no deben verla en la navegación. Si intentan acceder mediante una URL directa, la aplicación debe mostrar una pantalla de acceso no autorizado y Firestore debe rechazar la consulta.

## 3. Estructura visual

La vista se recomienda como un panel de dos columnas en escritorio y una columna en móvil:

```text
[Encabezado]
Configuración general                         [Guardar cambios]
Última actualización · usuario · fecha

[Menú lateral de secciones]   [Contenido de sección]
Operación                      Switches y parámetros
Identificación                 Explicación del impacto
Clientes                       Estado actual y advertencias
Medidores                      [Guardar] [Cancelar]
Ventas                         Historial de cambios
Notificaciones
Seguridad
Auditoría

[Barra inferior]
Cambios sin guardar · [Descartar] [Guardar cambios]
```

En móvil, el menú lateral se convierte en un selector o acordeón. Cada sección debe mantener los cambios como borrador local hasta que el administrador confirme guardar.

## 4. Encabezado y acciones globales

| Control | Comportamiento |
|---|---|
| **Guardar cambios** | Persiste únicamente las opciones modificadas y genera auditoría. |
| **Cancelar** | Descarta cambios locales no guardados. |
| **Actualizar** | Recarga la versión vigente desde Firestore. Si hay cambios locales, solicita confirmación. |
| **Ver historial** | Abre cambios anteriores de configuración en modo lectura. |
| **Indicador de sincronización** | Muestra `sin cambios`, `borrador local`, `guardando`, `guardado` o `error`. |
| **Tres puntos** | Exportar configuración no sensible, restaurar borrador local y consultar ayuda. |

No debe existir un botón genérico de “activar todo” o “desactivar todo”, porque podría alterar funciones críticas de forma accidental.

## 5. Sección Operación

Esta sección controla funciones del flujo diario, sin modificar jornadas ya cerradas.

| Switch o parámetro | Valor inicial recomendado | Impacto |
|---|---:|---|
| **Jornada obligatoria antes de operar** | Activado | Impide ventas y devoluciones operativas sin turno abierto. |
| **Cierre automático de jornada** | Activado | Cierra operaciones abiertas al cambio de día según el contrato. |
| **Guardar borradores locales** | Activado | Conserva formularios incompletos por cierre accidental o pérdida de conexión. |
| **Permitir operación offline** | Activado con sincronización | Guarda operaciones pendientes, pero no confirma folios sensibles hasta sincronizar. |
| **Mostrar resumen de turno** | Activado | Muestra ventas, créditos, medidor y efectivo esperado. |
| **Exigir confirmación doble en cierre** | Activado | Solicita lectura final y confirmación explícita. |
| **Margen de diferencia de lectura** | Configurable | Define cuándo se solicita motivo, sin bloquear automáticamente el inicio. |

El cambio del margen solo afecta futuras jornadas. No recalcula ni modifica lecturas históricas.

## 6. Sección Identificación

### 6.1 Identificador principal

El identificador físico principal es el folio o código del tambo. Esta regla no debe ser un switch libre, porque es parte del modelo de trazabilidad.

```text
Identificación principal: folio/código físico del tambo
Estado: obligatorio · no editable desde configuración
```

### 6.2 QR único por cliente

| Control | Valor inicial | Comportamiento |
|---|---:|---|
| **QR único por cliente** (`qrClienteHabilitado`) | Desactivado | No muestra botón, lector ni modal QR en la app operativa. |
| **Permitir regenerar QR** | Desactivado | Si se activa, requiere confirmación administrativa y auditoría. |
| **Mostrar QR en ficha del cliente** | Igual a QR principal | Solo puede activarse si el QR principal está activo. |
| **Aceptar QR como acceso rápido** | Igual a QR principal | El QR identifica al cliente, pero no sustituye el folio físico del tambo. |

Cuando `qrClienteHabilitado = false`, la app debe ocultar completamente la acción QR y mantener disponible la identificación manual por folio o código físico del tambo.

Al activar el QR, la pantalla debe mostrar una advertencia:

> “El QR será una vía opcional de identificación rápida. El folio físico del tambo continuará siendo la referencia operativa y de control.”

Apagar el QR no elimina códigos ya generados ni modifica clientes, tambos, ventas o historiales. Solo deshabilita la entrada QR en las pantallas.

## 7. Sección Clientes

| Switch o parámetro | Valor inicial recomendado | Impacto |
|---|---:|---|
| **Permitir solicitudes de alta por chofer** | Activado | El chofer puede enviar solicitudes, pero administración debe aprobarlas. |
| **Permitir solicitud de desactivación por chofer** | Activado | El chofer solicita; no archiva directamente. |
| **Exigir localidad al crear cliente** | Activado y obligatorio | Evita clientes sin agrupación territorial. |
| **Permitir edición de datos maestros por chofer** | Desactivado | El chofer no cambia nombre, teléfono, RFC ni localidad. |
| **Permitir múltiples tambos industriales** | Activado | Solo clientes industriales pueden superar un tambo. |
| **Permitir tambo para comerciales** | Activado | Comercial puede tener cero o un tambo. |
| **Solicitar datos fiscales completos** | Activado | Exige razón social, RFC, código postal, régimen y uso de CFDI cuando aplique. |

La opción “Permitir múltiples tambos industriales” no debe permitir exceder la regla por tipo de cliente. Es una habilitación de la función, no una autorización para comerciales.

## 8. Sección Medidores y ventas

| Switch o parámetro | Valor inicial recomendado | Impacto |
|---|---:|---|
| **Capturar medidor en ventas industriales** | Activado | Solicita lectura inicial y final para calcular litros. |
| **Conversión industrial a 19 L** | Activada | Presenta equivalentes de garrafón sin alterar litros reales. |
| **Permitir venta a crédito** | Activado | Genera nota interna y firma del receptor. |
| **Permitir venta comercial** | Activado | Habilita tickets comerciales para choferes autorizados. |
| **Permitir venta industrial** | Activado | Habilita tickets industriales con tarifa vigente. |
| **Permitir venta pública de planta** | Desactivado para choferes | Debe permanecer aislada de la operación de reparto. |
| **Exigir firma en crédito** | Activado | No permite cerrar una nota sin firma o justificación administrativa. |
| **Mostrar desglose comercial/industrial** | Activado | Separa efectivo por origen en el resumen. |

La configuración nunca modifica el precio histórico de un ticket. Los cambios de tarifa aplican únicamente a nuevas ventas.

## 9. Sección Devoluciones y tambos

| Switch o parámetro | Valor inicial recomendado | Impacto |
|---|---:|---|
| **Permitir reporte de devolución al chofer** | Activado | El chofer puede iniciar reportes, no validarlos. |
| **Permitir devolución múltiple industrial** | Activado | Permite seleccionar varios tambos, generando un folio por cada unidad. |
| **Exigir código físico al reportar** | Activado | La devolución no se guarda sin identificar el tambo. |
| **Exigir observaciones por unidad** | Activado | Cada activo puede conservar una observación distinta. |
| **Permitir recepción administrativa** | Activado | Administración puede marcar recepción física. |
| **Exigir revisión antes de liberar** | Activado | Evita que un reporte libere inmediatamente el activo. |
| **Permitir fotografías en revisión** | Desactivado hasta implementar almacenamiento | No debe mostrarse si todavía no existe flujo seguro de archivos. |

Estas opciones no pueden eliminar la regla de que cada devolución corresponde a un solo `activoId` y un solo folio.

## 10. Sección Notificaciones

| Switch | Valor inicial recomendado | Destinatario |
|---|---:|---|
| **Notificar nueva solicitud de cliente** | Activado | Administración. |
| **Notificar devolución reportada** | Activado | Administración y chofer reportante. |
| **Notificar devolución validada** | Activado | Chofer reportante. |
| **Notificar devolución rechazada** | Activado | Chofer y administración. |
| **Notificar activo en revisión** | Activado | Administración. |
| **Notificar error de sincronización** | Activado | Usuario que originó la operación. |

El canal de WhatsApp `wa.me` permanece fuera de esta versión de configuración. No se deben almacenar tokens de WhatsApp en texto plano dentro de esta colección.

## 11. Sección Seguridad y datos sensibles

Esta sección no debe ofrecer switches que debiliten reglas de Firestore.

| Control | Regla |
|---|---|
| **Sesión persistente** | Puede configurarse por política, sin exponer credenciales. |
| **Confirmar acciones destructivas lógicas** | Activado y no deshabilitable para archivado o decisiones administrativas. |
| **Auditar cambios de configuración** | Activado y no deshabilitable. |
| **Permitir eliminación física** | No existe. Los datos históricos son inmutables. |
| **Mostrar datos sensibles completos** | Debe limitarse por rol y necesidad operativa. |
| **Exportar configuración** | Solo incluye valores no secretos. |

Las credenciales, claves privadas, tokens y secretos de integraciones no deben guardarse en texto plano dentro de la configuración general.

## 12. Guardado, confirmación y auditoría

Los cambios se trabajan primero como borrador local:

```text
Modificar switch
    ↓
Mostrar impacto
    ↓
Guardar borrador local
    ↓
[Cancelar] o [Guardar cambios]
    ↓
Confirmar cambios sensibles
    ↓
Escribir configuración autorizada
    ↓
Crear evento de auditoría
    ↓
Actualizar interfaz operativa
```

El documento de configuración debe conservar:

```js
{
  version: 7,
  actualizadoEn: Timestamp,
  actualizadoPorUid: "admin_uid",
  qrClienteHabilitado: false,
  operacion: {...},
  clientes: {...},
  medidores: {...},
  devoluciones: {...},
  notificaciones: {...}
}
```

Cada cambio debe registrar:

```js
{
  accion: "configuracion_actualizada",
  camposModificados: ["qrClienteHabilitado"],
  valoresAnteriores: {"qrClienteHabilitado": false},
  valoresNuevos: {"qrClienteHabilitado": true},
  ejecutadoPorUid: "admin_uid",
  ejecutadoEn: Timestamp,
  requestId: "req_..."
}
```

## 13. Confirmaciones especiales

| Cambio | Confirmación requerida |
|---|---|
| Activar QR | Confirmar que se habilitará una vía adicional de identificación. |
| Desactivar QR | Confirmar que los QR existentes no se borrarán, solo dejarán de mostrarse. |
| Cambiar operación offline | Confirmar riesgo de operaciones pendientes. |
| Cambiar margen de lectura | Capturar motivo y aplicar solo a jornadas futuras. |
| Permitir múltiples tambos industriales | Confirmar que no aplica a comerciales. |
| Desactivar solicitudes de alta | Confirmar que los choferes no podrán enviar nuevos clientes. |
| Cambiar cierre automático | Confirmar impacto en jornadas abiertas. |
| Guardar cualquier cambio | Mostrar resumen antes/después. |

## 14. Comportamiento de la app después de guardar

La app operativa debe leer la configuración vigente al iniciar sesión y al actualizar contexto. Si el QR se activa, aparecerá el botón correspondiente en los modales autorizados. Si se desactiva, desaparecerá sin afectar la búsqueda manual.

Las operaciones ya guardadas no deben recalcularse por cambios de configuración. Un ticket, folio, lectura, cierre o auditoría conserva el comportamiento y los valores que tenía al momento de registrarse.

Si no hay configuración inicial, solo el primer administrador autorizado puede ejecutar el asistente de configuración inicial. Si ya existe configuración en Firestore, instalar la app en otro teléfono no debe volver a solicitarla.

## 15. Criterios de aceptación

1. Solo administración puede abrir y guardar Configuración general.
2. Cada switch tiene descripción, estado, impacto y sección claramente identificada.
3. `qrClienteHabilitado` controla la visibilidad del QR, pero no elimina identificadores existentes.
4. Con QR desactivado, la identificación manual por folio del tambo continúa funcionando.
5. La configuración no permite cambiar la regla de identidad unitaria del tambo.
6. La configuración no permite que un cliente comercial tenga múltiples tambos.
7. La devolución múltiple industrial sigue generando un folio por activo.
8. Los cambios sensibles requieren confirmación explícita.
9. Los cambios guardados generan auditoría inmutable.
10. Los borradores locales no se presentan como configuración confirmada.
11. Los cambios no alteran registros históricos.
12. Ningún secreto se guarda en la configuración general.
13. Firestore rechaza cambios no autorizados aunque el botón esté oculto.

## 16. Pendientes antes de implementar

1. Confirmar los valores iniciales de cada switch.
2. Definir si el QR se asignará al cliente, al tambo o a ambos; la propuesta actual lo asigna al cliente y conserva el tambo como identificación principal.
3. Confirmar la colección final de configuración y su documento único por empresa.
4. Confirmar si vendedores de planta compartirán algunos switches operativos con choferes.
5. Definir si el historial de configuración se consulta dentro de Auditoría o en una sección específica.

No se modificó código funcional ni se desplegó ninguna configuración real. Este documento es el contrato visual y operativo previo a la implementación.
