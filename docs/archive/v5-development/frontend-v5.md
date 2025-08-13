# Frontend v5 - Guía de arquitectura

Este documento describe la estructura y convenciones del nuevo frontend v5 ubicado en `src/app/v5`. Sirve como punto de referencia para todos los desarrolladores.

## Arquitectura modular

La versión 5 se organiza en módulos independientes que se cargan de forma perezosa. Cada módulo vive dentro de `src/app/v5` siguiendo la siguiente estructura base:

```text
src/app/v5/
├── components/            # Componentes reutilizables (navbar, sidebar, ...)
├── layout/                # Componentes de layout principales
├── pages/                 # Páginas iniciales o de ejemplo
├── features/              # Próximos módulos funcionales (bookings, courses, ...)
├── v5-routing.module.ts   # Rutas hijas del módulo
└── v5.module.ts           # Módulo raíz de v5
```

Cada funcionalidad futura (por ejemplo `bookings` o `analytics`) tendrá su propia carpeta dentro de `features/` con su propio módulo Angular.

## Routing

`v5-routing.module.ts` define las rutas internas del módulo. El camino base `/v5` carga `V5LayoutComponent` y dentro de él se cargan las páginas hijas. Actualmente se incluye `WelcomeComponent`:

```typescript
const routes: Routes = [
  {
    path: '',
    component: V5LayoutComponent,
    children: [
      { path: '', component: WelcomeComponent }
    ]
  }
];
```

A medida que se añadan módulos bajo `features/`, estas rutas se configurarán con _lazy loading_ utilizando `loadChildren`.

## Componentes y layouts

- **V5LayoutComponent**: contenedor principal con `mat-sidenav` y `mat-toolbar`.
- **NavbarComponent**: barra superior con botón de menú y acciones de usuario.
- **SidebarComponent**: navegación lateral con enlaces a las rutas de v5.
- **WelcomeComponent**: página de bienvenida para validar la estructura.

Todos los componentes siguen la convención Angular de tener archivos `*.component.ts`, `*.component.html` y `*.component.scss` dentro de su propia carpeta.

## Convenciones de carpetas y nombres

- Carpetas y archivos en *kebab-case* (`my-component`, `booking-list-page`).
- Los módulos se ubican en `features/<nombre>` y definen su propio `<nombre>.module.ts` y `<nombre>-routing.module.ts`.
- Los componentes compartidos se colocan en `components/` y las páginas en `pages/` dentro de cada módulo.
- Los servicios residen en `services/` junto al módulo correspondiente.

## Comandos útiles para desarrollo

Los comandos principales están disponibles en `package.json` y se resumen a continuación:

```bash
npm install       # Instala dependencias
npm start         # Servidor de desarrollo
npm run build     # Genera un build optimizado
npm test          # Ejecuta tests unitarios
npm run lint      # Linter de código
npm run e2e       # Tests end‑to‑end
```

Para builds por entorno se pueden usar:

```bash
ng build --configuration=production
ng build --configuration=development
ng build --configuration=local
```

---

Esta guía se mantendrá actualizada conforme avancemos con los módulos de v5.
