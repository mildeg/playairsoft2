# Arquitectura Inicial

## Vision general

PlayAirsoft se construira como un monorepo con una API central en Laravel y una aplicacion web en React con soporte responsive y PWA.

El objetivo es validar rapido el negocio con una sola plataforma para Argentina, soportando multiples owners dentro de una misma aplicacion, sin multi-tenant complejo.

## Aplicaciones

### `apps/api`

Responsabilidades:

- API REST principal
- autenticacion y autorizacion
- logica de negocio
- persistencia
- notificaciones por email
- integraciones futuras con Mercado Pago y push notifications

Tecnologia esperada:

- Laravel
- PostgreSQL
- Redis para colas y cache
- almacenamiento S3 compatible para imagenes
- Sanctum para autenticacion

### `apps/web`

Responsabilidades:

- landing publica
- exploracion de partidas
- flujo de registro e inicio de sesion
- panel player
- panel owner
- panel admin
- experiencia PWA

Tecnologia esperada:

- React
- Vite
- cliente API compartido con contratos bien definidos

### `packages/types`

Responsabilidades:

- tipos compartidos entre frontend y futuras apps
- contratos de payloads
- enums de dominio reutilizables

### `packages/ui`

Responsabilidades:

- componentes reutilizables
- tokens visuales
- patrones de interfaz compartidos

## Decisiones clave

- Una sola base de datos para toda la plataforma.
- Separacion logica por owner, no multi-tenant fisico.
- Soporte para explorar partidas sin login.
- Registro publico solo para players.
- Alta de owners unicamente por admin.
- Pagos fuera de MVP, pero con modelo preparado.
- Email primero, push despues.
- Sin chat ni comunidad en la primera etapa.

## Modulos del sistema

- autenticacion
- usuarios y roles
- terminos y aceptaciones versionadas
- owners y predios
- partidas
- categorias de entrada
- inscripciones
- tickets y QR
- check-in
- vetos por owner
- notificaciones
- administracion global

## Estrategia de crecimiento

La estructura se prepara desde el inicio para soportar:

- app mobile nativa consumiendo la misma API
- pagos marketplace con Mercado Pago
- tracking y metricas
- web push y notificaciones moviles
- modulos de comunidad en etapas futuras
