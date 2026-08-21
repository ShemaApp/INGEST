# Lógica aprobada — pantalla principal del chofer

**Proyecto:** INGEST — Inventario y Gestión
**Estado:** contrato aprobado para diseño posterior
**Última actualización:** 2026-08-20

> Este documento es la referencia funcional para futuras modificaciones. No autoriza por sí mismo la creación de colecciones, reglas ni pantallas; cada función deberá aprobarse antes de implementarse.

## 1. Contexto general

La aplicación es una sola PWA, pero cada usuario autenticado recibe un contexto operativo diferente. La pantalla principal del chofer debe mostrar únicamente la cartera territorial, el vehículo, el medidor, las ventas, los créditos, el historial y la caja relacionados con su usuario.

El cliente no se asigna directamente a un chofer. Cada cliente pertenece a una localidad. Administración asigna una localidad de forma permanente a un solo chofer activo. El chofer conserva esa cartera hasta que administración la reasigna o la retira explícitamente.

## 2. Relaciones operativas

```text
usuario autenticado / choferUid
        |
        └── vehiculoId
                |
                └── medidorId

localidadId
        |
        └── clientes de la localidad

asignación permanente
        ├── localidadId
        └── choferUid
```

Una localidad puede tener cero o un chofer activo, nunca dos. Una localidad sin chofer conserva sus clientes, pero no aparece en la cartera de ningún chofer.

## 3. Carga automática al iniciar

El chofer no selecciona cada día su vehículo, localidad ni medidor. La aplicación debe resolver el contexto mediante la sesión:

```text
sesión autenticada
  → perfil del usuario
  → vehículo asignado
  → medidor del vehículo
  → asignaciones permanentes
  → localidades
  → clientes de esas localidades
```

El sistema debe bloquear la operación si falta alguno de los elementos obligatorios: usuario activo, vehículo activo, medidor activo o localidad asignada.

## 4. Información visible en la pantalla principal

| Sección | Información |
|---|---|
| Identidad | Nombre del chofer y estado de sesión. |
| Vehículo | Vehículo asignado al usuario. |
| Medidor | Medidor vinculado y lectura de referencia. |
| Cartera | Localidades permanentes asignadas. |
| Clientes | Clientes agrupados por localidad. |
| Ventas del turno | Comerciales, industriales y créditos separados. |
| Caja | Efectivo comercial, efectivo industrial y total a recibir. |
| Historial | Tickets, comprobantes y notas de crédito propias. |
| Cierre | Medidor final, clientes atendidos y resumen de turno. |

## 5. Accesos operativos aprobados

### Clientes

Abre la cartera del chofer agrupada por localidad. El chofer solo puede consultar clientes cuyo `localidadId` pertenezca a una asignación permanente activa para su `choferUid`.

### Nueva venta

El flujo se determina por el tipo registrado en el cliente:

```text
cliente comercial
  → cantidad de garrafones
  → precio comercial
  → contado o crédito

cliente industrial
  → lectura inicial del medidor
  → lectura final del medidor
  → litros = lectura final - lectura inicial
  → garrafones equivalentes = litros / 19
  → precio industrial por garrafón equivalente
  → contado o crédito
```

Las lecturas confirmadas son inmutables. La lectura final debe ser mayor que la inicial.

### Créditos

Muestra las notas de crédito y saldos pendientes relacionados con las operaciones del chofer. El crédito no forma parte del efectivo recibido, pero sí forma parte del total de unidades y del total vendido.

### Mi caja

La caja separa el origen de las ventas:

```text
contado comercial
contado industrial
crédito comercial
crédito industrial
```

El efectivo operativo esperado es únicamente:

```text
efectivo comercial de contado + efectivo industrial de contado
```

### Historial

Muestra tickets y operaciones propias, conservando el contexto histórico:

```text
clienteId
localidadId
choferUid
vehiculoId
medidorId
jornadaId o turnoId
lectura inicial y final cuando aplique
precio aplicado
total
forma de pago
```

### Cerrar turno

El cierre debe mostrar antes de confirmar:

```text
total de garrafones vendidos
garrafones comerciales
garrafones industriales
garrafones a crédito
efectivo comercial
efectivo industrial
total efectivo a recibir
crédito comercial pendiente
crédito industrial pendiente
medidor inicial
medidor final
litros del turno
clientes atendidos
vehículo utilizado
```

## 6. Fórmulas aprobadas

Para clientes industriales:

```text
litrosVendidos = lecturaFinal - lecturaInicial
garrafonesEquivalentes = litrosVendidos / 19
totalIndustrial = garrafonesEquivalentes × precioIndustrial
```

Para cierre:

```text
totalGarrafonesVendidos = contadoComercial + contadoIndustrial + creditoComercial + creditoIndustrial

totalEfectivoARecibir = efectivoComercial + efectivoIndustrial

totalCreditoPendiente = creditoComercial + creditoIndustrial
```

Ejemplo aprobado:

```text
Crédito total: 70 garrafones
Contado comercial: 20 × $15 = $300
Contado industrial: 100 × $12 = $1,200

Total vendido: 70 + 20 + 100 = 190 garrafones
Total efectivo a recibir: $300 + $1,200 = $1,500
```

El crédito no se resta del total vendido. Se excluye únicamente del efectivo operativo.

## 7. Cambio de localidad

Las asignaciones no vencen diariamente. Para cambiar de responsable:

1. Administración selecciona la localidad.
2. Finaliza la asignación actual.
3. Registra el motivo del cambio.
4. Crea la nueva asignación permanente.
5. Mantiene intactos los clientes y operaciones históricas.

Las ventas anteriores conservan el `choferUid`, `vehiculoId`, `medidorId` y `localidadId` que tenían al momento de realizarse.

## 8. Límites del chofer

El chofer no puede cambiar su localidad, cambiar el vehículo o medidor asignado, editar ventas confirmadas, editar lecturas confirmadas, eliminar tickets, modificar precios pactados ni consultar la cartera de otro chofer.

La administración tendrá una pantalla consolidada para consultar la actividad de todos los choferes por localidad, cliente, vehículo, medidor, fecha, contado, crédito y estado.

## 9. Pendientes antes de implementar

Antes de crear colecciones o código se debe definir de manera separada:

| Pendiente | Decisión requerida |
|---|---|
| Identificador del activo prestado | Confirmar si cada envase o inmueble tendrá código/QR individual. |
| Firma en crédito | Confirmar formato y almacenamiento de la firma. |
| Comprobante | Definir si se genera PDF mediante Storage y se guarda solo la referencia en Firestore. |
| Turno | Confirmar si el cierre se llamará `turno`, `jornada` o `caja`. |
| Precio comercial | Confirmar si es por garrafón completo de 19 L. |
| Crédito monetario | Separar créditos comerciales e industriales para calcular el saldo. |

## 10. Regla de implementación

No se deben agregar botones, consultas ni colecciones fuera de este contrato aprobado. Cada pantalla futura deberá documentar previamente su botón, destino, colección, campos leídos, campos escritos, permisos, estados de error y prueba de duplicados.
