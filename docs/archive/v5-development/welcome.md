# WelcomeComponent

Este componente da la bienvenida a Boukii v5 y sirve como punto de partida para validar la nueva arquitectura.

## Funcionalidad

- Muestra un mensaje estático con título y descripción.
- No consume servicios ni depende de datos externos actualmente.

## Ruta de acceso

- **`/v5/welcome`** (también accesible desde `/v5`). El `V5RoutingModule` lo define como hijo directo del layout.

## Estructura

```
src/app/v5/components/welcome/
├── welcome.component.ts
├── welcome.component.html
└── welcome.component.scss
```

## Cómo probar

1. Ejecutar `npm start`.
2. Navegar a `http://localhost:4200/v5/welcome`.
3. Verificar que se muestra el mensaje de bienvenida dentro del layout con sidenav.
