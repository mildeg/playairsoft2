# PlayAirsoft Web - Funcionalidades Actuales

Ultima actualizacion: 2026-03-22

Este documento resume el estado actual de la web para usar como contexto en nuevos chats.

## Stack y arquitectura (web)

- Frontend: React + TypeScript + React Router.
- Backend consumido por la web: Laravel API (`/api`).
- App de una sola instancia (no multi-tenant complejo), con separacion logica por roles.
- Roles operativos en V1: `player`, `owner`, `admin`.

## Rutas principales

- Publicas:
- `/` (inicio)
- `/partidas` (catalogo)
- `/partidas/:eventId` (detalle de partida)
- `/campos/:venueId` (detalle de campo)
- `/ingresar` (login)
- `/registro` (registro)
- `/olvide-mi-contrasena` (recuperacion)
- `/auth/google/callback` (callback OAuth)

- Protegidas:
- `/panel` (dashboard por rol)
- `/completar-perfil` (perfil jugador)
- `/mis-partidas` (owner)
- `/mis-partidas/nueva` (owner)
- `/mis-partidas/:eventId/editar` (owner)
- `/mis-predios` (owner)
- `/mis-predios/:venueId/editar` (owner)

## Autenticacion y acceso

- Login por email + contrasena.
- Login/registro con Google OAuth.
- Registro con aceptacion de terminos vigentes (ToS activo).
- Redireccion a dashboard segun rol.
- Guardas de ruta para secciones privadas.

## Experiencia publica (jugador sin login)

- Home orientado a usuario final.
- Catalogo de partidas con:
- busqueda por texto (ubicacion/zona/predio/organizador),
- filtro por fecha,
- limpieza de filtros,
- cards con estado/fecha/hora/ubicacion/precio.
- Detalle de partida con:
- informacion general,
- carrusel de imagenes de la partida (foto principal + miniaturas + navegacion),
- categorias y cupos,
- datos de organizador y predio,
- CTA de inscripcion.
- Detalle de campo con:
- banner principal,
- informacion del campo,
- servicios/amenities,
- proximas partidas del campo,
- perfil publico del owner,
- galeria de fotos en miniaturas.

## Flujo de inscripcion (player)

- Alta de inscripcion desde detalle de partida.
- Si hay multiples categorias, se muestra modal para elegir categoria.
- Si hay una sola categoria, se inscribe directo.
- Validaciones:
- evita doble inscripcion activa,
- si falta perfil de jugador, redirige a completar perfil.
- Cancelacion de inscripcion desde dashboard player.
- Estado de inscripcion cancelada persistido como cancelado (no pendiente).

## Perfil jugador (`/completar-perfil`)

- Edicion de datos personales y datos de jugador.
- Campos operativos: DNI, edad, telefono, ciudad, contacto de emergencia, alias, notas medicas.
- Contacto de emergencia marcado como dato obligatorio para flujo de inscripcion.
- Seccion de cuenta/seguridad:
- cambio de contrasena,
- soporte para cuentas Google sin password local inicial.
- Seccion de preferencias:
- preferencias de notificaciones (email, alertas de partidas, recordatorios, mensajes owner).

## Dashboard player

- Proximas partidas activas.
- En "Proximas partidas" se muestran 2 cards y, si hay mas, se habilita "Ver mas" con popup paginado para el resto.
- Actividad reciente (historial acotado).
- Actividad reciente incluye partidas pasadas y proximas, ordenadas por fecha descendente.
- Pagina actividad: 5 elementos por pagina y ventana maxima de consulta de 2 anos hacia atras.
- En actividad reciente, el titulo de la partida es link al detalle solo si la publicacion esta activa (`published`).
- Estado de inscripcion y estado de pago.
- Acciones:
- ver detalle,
- cancelar inscripcion,
- explorar catalogo.

## Funcionalidades owner

- Dashboard owner con resumen de partidas y resumen de inscriptos (ultimos 30 dias).
- Header owner con acceso rapido a `Publicar` (boton visible y opcion en menu de usuario).
- Gestion de partidas:
- listado en `/mis-partidas` con metricas (ocupacion, inscriptos, revenue, waitlist, cancelaciones),
- listado con paginacion (10 por pagina) y card compacta en 2 columnas (desktop),
- en la card se muestra foto principal de la partida integrada con metricas,
- crear partida (`/mis-partidas/nueva`),
- creacion con selector de plantilla: al elegir una partida previa, se autocompletan campos y categorias,
- al crear una partida nueva, redirige a `/partidas/:eventId` (vista publica),
- editar partida (`/mis-partidas/:eventId/editar`),
- gestion de imagenes de partida (subida, eliminacion, reorden por drag & drop, marcar principal),
- copiar enlace publico de partida.
- Soporte de categorias por partida (precio/cupos por categoria).
- Gestion de predios:
- listado en `/mis-predios`,
- edicion completa en `/mis-predios/:venueId/editar`,
- carga y gestion de imagenes de predio (subida, eliminacion, reorden por drag & drop, marcar principal).

## Edicion inline de campo (owner en vista publica de campo)

- Desde `/campos/:venueId`, si el usuario es owner de ese predio:
- Cambiar banner desde modal (adjuntar imagen, guardar, refresco inmediato).
- Subir multiples fotos en la seccion Galeria.
- Link directo a pantalla dedicada de edicion completa (`/mis-predios/:venueId/editar`) para administracion avanzada.
- Editar inline en "Sobre el campo":
- descripcion,
- servicios (`rental_equipment`, `parking`, `buffet`),
- amenities (texto separado por comas).
- Galeria:
- miniaturas en pagina,
- click abre modal de carrusel (Embla),
- navegacion con flechas,
- cierre por boton, `Esc` o click en backdrop.

## Funcionalidades admin

- Dashboard admin con alta y baja de owners.
- Formulario de creacion de owner (datos de usuario + datos de organizacion).
- Listado de owners con estado y accion de desactivacion.

## Integraciones y estado funcional

- Integracion OAuth Google operativa en login/registro.
- Integracion de pagos Mercado Pago: preparada a nivel de producto/backend, pero el flujo completo de pago no esta cerrado en la UI publica actual.
- Check-in owner y ticket existen en modelo/API, pero el check-in manual ya no esta expuesto en el panel owner actual.

## Fuera de alcance actual / pendiente

- Chat en tiempo real: no implementado (explicitamente fuera de MVP actual).
- Comunidad/social: no implementado.
- Push mobile nativo: no implementado en web actual (estructura preparada para evolucion).
- Multi-tenant complejo: no implementado (instancia unica con separacion logica por owner).
