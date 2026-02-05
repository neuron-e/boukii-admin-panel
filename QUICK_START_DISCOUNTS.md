# Quick Start - Gestión de Descuentos en Course Detail

## Resumen en 1 minuto

Se ha implementado una nueva pestaña "Descuentos" en el detalle de cursos que permite:
- Crear/editar/eliminar descuentos globales del curso
- Gestionar descuentos por intervalo
- Activar/desactivar descuentos con un toggle

## Archivos Modificados

```
frontend/
├── src/
│   ├── service/
│   │   └── course-discounts.service.ts          [NUEVO]
│   └── app/
│       └── pages/
│           └── courses-v2/
│               └── course-detail/
│                   ├── course-detail.component.ts       [MODIFICADO]
│                   ├── course-detail.component.html     [MODIFICADO]
│                   ├── course-detail.component.scss     [MODIFICADO]
│                   └── course-detail.module.ts          [MODIFICADO]
```

## Cómo Probar

1. **Iniciar aplicación:**
   ```bash
   cd /c/boukii-v4-meta/frontend
   npm start
   ```

2. **Navegar:**
   - Ir a lista de cursos
   - Abrir detalle de cualquier curso
   - Click en pestaña "Descuentos"

3. **Probar funcionalidades:**
   - Click "Agregar Descuento Global"
   - Llenar formulario
   - Guardar
   - Editar descuento creado
   - Toggle activo/inactivo
   - Eliminar descuento

## Endpoints Backend Necesarios

**IMPORTANTE:** El backend debe implementar estos endpoints:

```
GET    /api/courses/{courseId}/discounts
POST   /api/courses/{courseId}/discounts
PUT    /api/courses/{courseId}/discounts/{id}
DELETE /api/courses/{courseId}/discounts/{id}
```

Estructura de datos esperada:
```json
{
  "name": "Descuento 15%",
  "description": "Descuento por reserva anticipada",
  "discount_type": "percentage",
  "discount_value": 15,
  "min_days": 7,
  "valid_from": "2025-01-01",
  "valid_to": "2025-12-31",
  "priority": 0,
  "active": true
}
```

## Qué Hace Cada Sección

### Descuentos Globales
- Descuentos que aplican a TODO el curso
- Independientes de intervalos
- Se pueden activar/desactivar sin eliminar
- Tienen prioridad configurable

### Descuentos por Intervalo
- Descuentos específicos para un periodo del curso
- Gestionados mediante modal
- Integra con `course-intervals-manager`

## Troubleshooting Rápido

### Error: "Cannot find module 'course-discounts.service'"
**Solución:** Verificar que existe `/c/boukii-v4-meta/frontend/src/service/course-discounts.service.ts`

### Error: "Template parse errors: 'mat-snack-bar' is not a known element"
**Solución:** Verificar que `MatSnackBarModule` está en `course-detail.module.ts`

### Error 404 al cargar descuentos
**Solución:** Backend no implementado. Ver sección "Endpoints Backend Necesarios"

### Modal no se abre
**Solución:** Verificar que `showDiscountModal` cambia a `true` en consola del navegador

### Tabla no se muestra
**Solución:**
1. Verificar que `courseDiscounts` tiene datos en consola
2. Verificar que `MatTableModule` está importado
3. Verificar columnas definidas en HTML

## Validaciones Implementadas

✓ Nombre requerido (max 255 caracteres)
✓ Tipo requerido (percentage | fixed_amount)
✓ Valor requerido (0-100 para %, ≥0 para fijo)
✓ Días mínimos ≥1
✓ Fecha fin > fecha inicio (si ambas existen)
✓ Confirmación antes de eliminar

## Estados Cubiertos

✓ Loading inicial
✓ Loading durante guardado
✓ Estado vacío (sin descuentos)
✓ Estado con datos
✓ Errores de API
✓ Validaciones de formulario

## Responsive

✓ Desktop (>768px)
✓ Tablet (768px)
✓ Mobile (<768px)

## Siguiente Paso

Implementar endpoints en backend Laravel:
```
/c/boukii-v4-meta/api/app/Http/Controllers/CourseDiscountController.php
```

Ver `/c/boukii-v4-meta/frontend/COURSE_DISCOUNTS_INTEGRATION_README.md` para detalles completos.
