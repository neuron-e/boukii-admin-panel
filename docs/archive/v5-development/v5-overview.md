# Boukii v5 - Overview

Esta documentación describe la nueva infraestructura Angular ubicada en `src/app/v5`.
Para la planificación completa consulta `boukii-5.0.md`.

## Estructura modular

```
src/app/v5/
├── components/
│   └── welcome/              # Componente inicial
├── layout/
│   └── v5-layout.component.* # Layout base con sidenav y toolbar
├── v5-routing.module.ts      # Rutas hijas
└── v5.module.ts              # Módulo principal
```

Cada futura funcionalidad (dashboard, bookings, etc.) se añadirá como un módulo hijo bajo esta carpeta y se cargará de forma lazy.

## Lazy loading y nuevo layout

El `AppRoutingModule` carga `V5Module` de forma perezosa cuando se navega a `/v5`. Dentro de este módulo, `V5LayoutComponent` provee la estructura de navegación (sidenav + toolbar) para todos los componentes hijos.

## Composición de componentes

`WelcomeComponent` es el primer componente cargado. Los siguientes módulos seguirán el mismo patrón: un módulo por funcionalidad con sus propios componentes y servicios.

## Pruebas visuales

Para validar cada módulo se recomienda ejecutar `npm start` y navegar a la ruta correspondiente. Se puede usar la extensión de Angular DevTools para inspeccionar el árbol de componentes.

## Ruta inicial

La ruta por defecto es `/v5/welcome` (o simplemente `/v5`) que muestra el `WelcomeComponent` dentro del nuevo layout.
