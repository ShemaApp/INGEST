# Módulo 1 — Usuarios y perfiles administrativos

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** documentación previa al desarrollo
**Versión:** 1.0

> Este documento define el contrato funcional y de seguridad del módulo. No crea usuarios, colecciones ni reglas por sí mismo.

## 1. Objetivo

El módulo administra la identidad autenticada y el perfil operativo de cada persona que utiliza INGEST. Firebase Authentication será la fuente de identidad; Firestore almacenará el perfil, el rol, el estado y las referencias operativas. La aplicación no tendrá registro público.

La creación de cuentas se realizará desde Firebase Authentication por administración autorizada o desde la consola de Firebase. El perfil Firestore se creará únicamente después de que exista el UID autenticado.

## 2. Separación entre identidad y perfil

| Capa | Fuente | Responsabilidad |
|---|---|---|
| Identidad | Firebase Authentication | UID, correo, contraseña, proveedor, sesión y estado de autenticación. |
| Perfil | Firestore `usuarios/{uid}` | Nombre, teléfono, rol, estado operativo y referencias a vehículo. |
| Auditoría | Firestore `auditoria_usuarios/{eventoId}` | Quién creó, modificó, activó, desactivó o cambió un rol. |

La aplicación nunca debe guardar contraseñas en Firestore. El UID de Authentication será el identificador del documento de perfil.

## 3. Roles iniciales

| Rol | Alcance |
|---|---|
| `admin` | Administra usuarios, localidades, vehículos, medidores, clientes, precios, inventario, ventas, créditos, cajas, reportes y auditoría. |
| `chofer` | Opera únicamente su cartera permanente de localidades, sus clientes autorizados, su vehículo, su medidor, sus ventas, sus créditos, su caja y sus cierres. |
| `vendedor` | Se reserva para una futura operación de planta o mostrador. No se activa en este módulo hasta documentar su pantalla específica. |

El rol no se obtiene del correo ni del nombre. Se consulta desde `usuarios/{uid}` y las reglas de Firestore deben validar el rol en servidor.

## 4. Colección principal: `usuarios`

Ruta:

```text
usuarios/{uid}
```

El ID del documento debe ser exactamente el UID de Firebase Authentication.

### Campos

| Campo | Tipo | Obligatorio | Editable | Descripción |
|---|---|---:|---:|---|
| `uid` | string | Sí | No | Debe coincidir con el ID del documento y el UID autenticado. |
| `correo` | string | Sí | No desde perfil | Correo de Authentication, duplicado solo para consultas administrativas. |
| `nombre` | string | Sí | Sí | Nombre visible y usado en comprobantes o notificaciones. |
| `telefono` | string | No | Sí | Teléfono de contacto normalizado. |
| `rol` | enum | Sí | Solo admin | `admin`, `chofer` o `vendedor`. |
| `activo` | boolean | Sí | Solo admin | Controla si puede operar. |
| `vehiculoId` | string/null | Condicional | Solo admin | Obligatorio para un chofer que opere vehículo. |
| `fotoUrl` | string/null | No | Sí | URL opcional de perfil; no es necesaria para operar. |
| `creadoEn` | timestamp | Sí | No | Momento de creación del perfil. |
| `actualizadoEn` | timestamp | Sí | Automático | Última modificación válida. |
| `ultimoAccesoEn` | timestamp/null | No | Automático | Último acceso conocido. |
| `desactivadoEn` | timestamp/null | No | Solo admin | Momento de desactivación. |
| `desactivadoPorUid` | string/null | No | Solo admin | Administrador que lo desactivó. |
| `motivoDesactivacion` | string/null | No | Solo admin | Obligatorio cuando `activo` pasa a `false`. |

## 5. Reglas de integridad del perfil

Un perfil no puede existir con un UID distinto al de Authentication. Un chofer activo que tenga operaciones de campo debe tener `vehiculoId`; sin embargo, la creación del perfil puede ocurrir antes de asignar vehículo. Un administrador no necesita vehículo. Un usuario inactivo no puede iniciar nuevas operaciones, aunque sus historiales permanezcan consultables según las reglas administrativas.

El rol no se modifica desde el perfil del propio usuario. Los cambios de rol requieren una acción administrativa explícita y un registro de auditoría. Desactivar un usuario no elimina su perfil ni sus operaciones.

## 6. Colección de auditoría: `auditoria_usuarios`

Ruta:

```text
auditoria_usuarios/{eventoId}
```

Se crea un documento por evento sensible. No se edita ni elimina desde la aplicación.

```text
auditoria_usuarios/{eventoId}
{
  tipo: "crear_perfil | cambiar_rol | activar | desactivar | asignar_vehiculo | retirar_vehiculo",
  objetivoUid: "uid_del_usuario_afectado",
  ejecutadoPorUid: "uid_del_admin",
  valoresAnteriores: {},
  valoresNuevos: {},
  motivo: "texto cuando aplique",
  creadoEn: timestamp
}
```

Los campos `valoresAnteriores` y `valoresNuevos` deben contener únicamente datos no sensibles. Nunca se guarda una contraseña, token o secreto.

## 7. Relación con otras entidades

```text
usuarios/{choferUid}
  └── vehiculoId
          ↓
vehiculos/{vehiculoId}
  └── medidorId
          ↓
medidores/{medidorId}
```

La cartera del chofer no se guarda dentro del perfil. Se obtiene de la asignación permanente de localidades:

```text
usuarios/{choferUid}
  ↓
asignaciones_localidades donde choferUid == uid y estado == activa
  ↓
localidades
  ↓
clientes por localidadId
```

Las ventas, créditos, movimientos y cierres deben guardar una copia histórica de `choferUid`, `vehiculoId` y `medidorId` para que un cambio futuro no altere la interpretación del pasado.

## 8. Pantallas del módulo

### 8.1 Lista de usuarios

Visible únicamente para `admin`. Debe mostrar nombre, correo, rol, activo, vehículo y último acceso. Debe incluir filtros por rol, estado y vehículo.

### 8.2 Perfil de usuario

Visible para el propio usuario en modo limitado y para `admin` en modo administrativo. El administrador puede cambiar nombre, teléfono, rol, estado y vehículo según las reglas del contrato.

### 8.3 Crear perfil operativo

No crea una cuenta de Authentication desde un formulario público. El flujo esperado es:

```text
cuenta creada en Authentication
  ↓
admin captura UID y datos del perfil
  ↓
validación de rol
  ↓
creación de usuarios/{uid}
  ↓
registro de auditoría
```

### 8.4 Cambiar rol

Debe exigir confirmación y motivo. No se debe permitir degradar o cambiar el último administrador activo sin una validación que evite dejar el sistema sin administrador.

### 8.5 Activar o desactivar

Desactivar exige motivo. La acción no borra documentos ni cancela automáticamente ventas, créditos, activos o cierres anteriores.

### 8.6 Asignar o retirar vehículo

La acción se documentará también en el módulo de vehículos, pero el perfil mostrará el vínculo actual. El historial de operaciones conserva el vehículo utilizado al momento de cada operación.

## 9. Botones y acciones

| Botón | Visible para | Acción | Colección afectada |
|---|---|---|---|
| `Ver usuarios` | Admin | Abre la lista administrativa. | `usuarios` lectura |
| `Ver mi perfil` | Todos autenticados | Abre perfil propio. | `usuarios/{uid}` lectura |
| `Editar perfil propio` | Todos autenticados | Modifica solo campos personales permitidos. | `usuarios/{uid}` actualización limitada |
| `Crear perfil` | Admin | Registra perfil de usuario existente en Authentication. | `usuarios`, `auditoria_usuarios` |
| `Cambiar rol` | Admin | Cambia rol con motivo. | `usuarios`, `auditoria_usuarios` |
| `Activar usuario` | Admin | Reactiva perfil. | `usuarios`, `auditoria_usuarios` |
| `Desactivar usuario` | Admin | Desactiva con motivo obligatorio. | `usuarios`, `auditoria_usuarios` |
| `Asignar vehículo` | Admin | Vincula vehículo disponible. | `usuarios`, `auditoria_usuarios` |
| `Retirar vehículo` | Admin | Quita vínculo actual sin alterar historial. | `usuarios`, `auditoria_usuarios` |
| `Eliminar usuario` | Nadie desde la app | No se ofrece como botón operativo. | Administración de Authentication separada |

## 10. Reglas de acceso funcionales

| Acción | Admin | Propio usuario | Otro usuario |
|---|---:|---:|---:|
| Ver lista completa | Sí | No | No |
| Ver perfil propio | Sí | Sí | No |
| Editar nombre/teléfono propio | Sí | Sí | No |
| Cambiar rol | Sí | No | No |
| Activar/desactivar | Sí | No | No |
| Asignar vehículo | Sí | No | No |
| Crear perfil Firestore | Sí | No desde registro público | No |
| Eliminar perfil | Solo procedimiento administrativo controlado | No | No |
| Ver auditoría | Sí | No | No |

Estas reglas deben imponerse también en Firestore. Ocultar un botón no constituye seguridad.

## 11. Reglas de Firestore conceptuales

```text
usuarios/{uid}
  lectura propia: autenticado y request.auth.uid == uid
  lectura completa: solo admin
  actualización propia: solo nombre, teléfono y campos personales permitidos
  creación de perfil: solo admin o flujo bootstrap controlado
  cambio de rol: solo admin
  activación/desactivación: solo admin
  eliminación desde PWA: prohibida

auditoria_usuarios/{eventoId}
  lectura: solo admin
  creación: solo admin o transacción autorizada
  actualización: prohibida
  eliminación: prohibida
```

El primer administrador debe crearse mediante un proceso de bootstrap controlado desde Firebase Console o una herramienta administrativa segura. No debe existir una regla abierta del tipo `allow write: if true` para crear el primer admin.

## 12. Estados de pantalla

La pantalla debe definir explícitamente estos estados:

| Estado | Comportamiento |
|---|---|
| Cargando sesión | No muestra acciones administrativas. |
| Sin autenticación | Redirige a inicio de sesión. |
| Perfil inexistente | Muestra estado pendiente de configuración; no concede rol. |
| Perfil inactivo | Bloquea operaciones y muestra contacto administrativo. |
| Lista vacía | Indica que no existen perfiles; no crea automáticamente. |
| Error de permisos | Muestra acceso denegado sin revelar datos. |
| Error de red | Conserva la vista local sin afirmar que se guardó. |
| Guardado correcto | Muestra confirmación y registra auditoría. |
| Operación repetida | Evita crear un segundo perfil o evento duplicado. |

## 13. Índices previstos

Los índices se definirán únicamente cuando existan consultas implementadas. Las consultas previsibles son:

```text
usuarios where rol == X orderBy nombre
usuarios where activo == X orderBy nombre
usuarios where vehiculoId == X
usuarios where rol == chofer and activo == true
```

No se deben crear índices por anticipado para todas las combinaciones posibles.

## 14. Criterios de aceptación

El módulo será aprobado cuando:

1. un usuario autenticado pueda leer únicamente su propio perfil;
2. un administrador pueda consultar todos los perfiles;
3. un usuario no pueda elevarse a `admin` modificando su propio documento;
4. un administrador pueda activar, desactivar, cambiar rol y asignar vehículo;
5. desactivar exija motivo;
6. cada cambio sensible genere auditoría inmutable;
7. las operaciones históricas no desaparezcan al desactivar un usuario;
8. no exista registro público desde la PWA;
9. una repetición no cree perfiles o eventos duplicados;
10. las reglas del servidor coincidan con los controles visuales.

## 15. Fuera de alcance

Este módulo todavía no implementa localidades, vehículos, medidores, clientes, ventas, créditos, inventario, caja ni reportes. Solo define la identidad y el perfil que las siguientes pantallas utilizarán.

## 16. Aprobación requerida

Antes de implementar se deben confirmar tres decisiones:

1. Si el rol inicial será exactamente `admin`, `chofer` y `vendedor`.
2. Si un chofer puede existir activo sin vehículo asignado temporalmente.
3. Si el administrador podrá editar el correo o únicamente el correo administrado por Firebase Authentication.
