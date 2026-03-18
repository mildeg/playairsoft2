# PlayAirsoft

Marketplace argentino de partidas de airsoft.

La plataforma permite que distintos organizadores publiquen partidas en sus predios, y que jugadores puedan descubrirlas, anotarse, recibir su entrada digital y realizar check-in el dia del evento.

## Objetivo del MVP

- Explorar partidas publicadas por distintos owners.
- Registrarse e iniciar sesion como player.
- Crear y administrar partidas como owner.
- Gestionar inscripciones, cupos, lista de espera y asistencia.
- Dar soporte a paneles de admin, owner y player.
- Preparar la base para pagos online y notificaciones futuras.

## Stack decidido

- Monorepo
- Backend: Laravel API
- Frontend: React web con enfoque PWA
- Mobile nativo: etapa posterior, reutilizando la API

## Estructura del repositorio

```text
apps/
  api/        Backend Laravel
  web/        Frontend React PWA
packages/
  types/      Tipos y contratos compartidos
  ui/         Componentes reutilizables a futuro
docs/         Producto, arquitectura y dominio
```

## Documentacion inicial

- [Arquitectura](./docs/architecture.md)
- [Dominio](./docs/domain-model.md)
- [MVP](./docs/product-scope.md)

## Proximos pasos

1. Scaffoldear `apps/api` con Laravel.
2. Scaffoldear `apps/web` con React.
3. Implementar autenticacion, roles y terminos versionados.
4. Modelar predios, partidas, categorias, inscripciones y check-in.

## Uso local

Con `PHP 8.4` y `nvm` configurados, el proyecto puede trabajarse sin Docker.

```bash
cd /home/milde/PlayAirsoft
nvm use
npm install
npm run dev
```

Scripts utiles desde la raiz:

- `npm run dev`: levanta API y web
- `npm run test`: corre tests del backend y verifica el build del frontend
- `npm run build`: compila la web
