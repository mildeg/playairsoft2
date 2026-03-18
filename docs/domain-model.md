# Modelo de Dominio Inicial

## Roles

- `admin`: crea y da de baja owners
- `owner`: publica partidas, administra predios, inscriptos y asistencia
- `player`: explora partidas y se inscribe

Un usuario owner tambien puede actuar como player al anotarse a partidas.

## Entidades principales

### `users`

Datos base del usuario:

- nombre
- email
- password hash
- proveedor social
- estado
- ultimo acceso

### `player_profiles`

- user_id
- dni
- edad
- telefono
- ciudad
- contacto de emergencia

### `owner_profiles`

- user_id
- nombre publico u organizacion
- estado operativo
- datos administrativos basicos

### `venues`

- owner_id
- nombre
- descripcion
- direccion
- latitud
- longitud
- fotos
- comodidades
- alquiler de equipo
- estacionamiento
- buffet

### `events`

- owner_id
- venue_id
- titulo
- descripcion corta
- descripcion larga
- fecha
- hora de inicio
- hora de fin
- precio base de referencia
- cupo total
- reglas
- estado
- politica de cancelacion
- fecha limite de cancelacion
- requiere pago para confirmar
- permite lista de espera

### `event_categories`

- event_id
- nombre
- descripcion
- precio
- cupo
- orden
- activa

### `event_images`

- event_id
- url
- orden
- alt_text

### `registrations`

- event_id
- player_id
- category_id
- estado
- estado de pago
- origen
- fecha de cancelacion
- motivo de cancelacion

### `tickets`

- registration_id
- codigo unico
- qr_payload
- emitido_en

### `checkins`

- registration_id
- escaneado_por
- fecha_hora
- resultado

### `owner_bans`

- owner_id
- player_id
- motivo
- activo_desde
- activo_hasta

### `terms_documents`

- tipo
- version
- contenido
- publicado_en
- activo

### `terms_acceptances`

- user_id
- document_id
- version
- aceptado_en
- ip
- user_agent

### `notifications`

- user_id
- tipo
- canal
- payload
- enviado_en
- estado

### `owner_payment_settings`

Preparada para una etapa posterior:

- owner_id
- proveedor
- marketplace_enabled
- fee_percentage
- credenciales o referencias seguras

## Estados sugeridos

### Estado de partida

- `draft`
- `published`
- `cancelled`
- `completed`

### Estado de inscripcion

- `pending`
- `confirmed`
- `waitlisted`
- `cancelled_by_player`
- `cancelled_by_owner`
- `checked_in`

### Estado de pago

- `not_required`
- `pending`
- `paid`
- `failed`
- `refunded`
