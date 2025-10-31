# ANÁLISIS DEL PROBLEMA DE TABS NO VISIBLES

## Síntomas Reportados
- El usuario ve dos secciones de "Monitor/fechas" repetidas
- NO se ven tabs para separar los intervalos
- Esto ocurre en subgrupos como "JN JN 01"

## Flujo del Código

### 1. HTML (línea 555)
```html
<ng-container *ngIf="subgroupHasMultipleIntervals(level, uniqueSubgroup._index)">
  <mat-tab-group>
    <!-- Tabs aquí -->
  </mat-tab-group>
</ng-container>
```

### 2. Método subgroupHasMultipleIntervals()
```typescript
subgroupHasMultipleIntervals(level: any, subgroupIndex: number): boolean {
  const intervals = this.getIntervalsForSubgroup(level, subgroupIndex);
  return intervals.length > 1;  // DEBE retornar TRUE para mostrar tabs
}
```

### 3. Método getIntervalsForSubgroup()
Este método tiene dos estrategias:

**Estrategia A: Normalizada** (preferida)
- Usa `this.intervals` (array global de intervalos)
- Filtra por `subgroupHasDatesInInterval()`
- Si encuentra intervalos, los retorna

**Estrategia B: Fallback**
- Lee los `course_dates` del FormGroup
- Extrae los `interval_id` únicos de cada course_date
- Retorna un array de intervalos basado en los IDs encontrados

## HIPÓTESIS DEL PROBLEMA

### Hipótesis #1: this.intervals está vacío
Si `this.intervals` no tiene datos o tiene solo 1 elemento:
- `getIntervalsForSubgroup()` retornaría 0 o 1 intervalos
- `subgroupHasMultipleIntervals()` retornaría FALSE
- Los tabs NO se mostrarían

**Verificación**:
- Agregar log: `console.log('this.intervals:', this.intervals);`
- Debe tener al menos 2 elementos para mostrar tabs

### Hipótesis #2: course_dates no tienen interval_id
Si los course_dates no tienen `interval_id` correctamente asignado:
- El fallback buscaría `cd.interval_id` pero sería undefined
- Retornaría un array vacío o con un solo elemento NULL
- Los tabs NO se mostrarían

**Verificación**:
- Agregar log en console de `course_dates`
- Cada course_date DEBE tener `interval_id` válido

### Hipótesis #3: subgroupHasDatesInInterval() falla
Si el método no detecta correctamente que un subgrupo tiene fechas en un intervalo:
- La estrategia normalizada retornaría array vacío
- Caería al fallback que podría fallar también

**Verificación**:
- Revisar la implementación de `subgroupHasDatesInInterval()`
- Asegurarse que busca correctamente en la estructura de datos

## SOLUCIÓN PROPUESTA

### Paso 1: Agregar logs detallados
Ya se agregaron logs en `getIntervalsForSubgroup()` con:
- Número de rawIntervals
- Resultados de normalized
- Resultados de fallback

### Paso 2: Verificar en consola del navegador
El usuario debe:
1. Abrir DevTools (F12)
2. Navegar a Console
3. Buscar logs con `[tabs-debug]`
4. Verificar:
   - `rawIntervalsCount`: debe ser >= 2
   - `normalized intervals`: debe tener >= 2 elementos
   - O `fallback intervals`: debe tener >= 2 elementos

### Paso 3: Diagnóstico basado en logs

**Caso A: rawIntervalsCount = 0 o 1**
```
PROBLEMA: this.intervals no tiene datos suficientes
CAUSA: No se están cargando los intervalos desde settings o no se crearon
SOLUCIÓN: Verificar loadIntervalsFromCourse() y onMultipleIntervalsChange()
```

**Caso B: rawIntervalsCount >= 2 pero normalized = []**
```
PROBLEMA: subgroupHasDatesInInterval() retorna false para todos los intervalos
CAUSA: Los course_dates no tienen interval_id o la búsqueda falla
SOLUCIÓN: Verificar estructura de course_dates y asignación de interval_id
```

**Caso C: Ambos normalized y fallback = []**
```
PROBLEMA: No hay course_dates para el subgrupo o no tienen interval_id
CAUSA: Los datos no se sincronizaron correctamente
SOLUCIÓN: Ejecutar syncIntervalsToCourseFormGroup() manualmente
```

## SIGUIENTE PASO

1. Usuario debe abrir el curso en el navegador
2. Abrir DevTools Console
3. Capturar los logs de `[tabs-debug]`
4. Compartir los logs para diagnóstico preciso
5. Basado en los logs, aplicar la solución correcta

## VERIFICACIÓN ADICIONAL

Si NO aparecen logs en consola:
- El método `subgroupHasMultipleIntervals()` no se está ejecutando
- Problema de rendering en Angular
- Verificar que `getAllUniqueSubgroupsForLevel()` retorna datos correctos
