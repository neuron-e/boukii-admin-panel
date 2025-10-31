# URGENTE: INSTRUCCIONES PARA FIX DE TABS

## PROBLEMA REPORTADO
Los tabs de intervalos NO se muestran en los subgrupos. El usuario ve contenido repetido sin separación por tabs.

## ESTADO ACTUAL DEL CÓDIGO

### ✅ VERIFICACIONES COMPLETADAS

1. **MatTabsModule importado**: ✅ Confirmado en `courses-create-update.module.ts` línea 31 y 85
2. **HTML correcto**: ✅ La estructura de tabs está correctamente implementada (líneas 555-580)
3. **Métodos TypeScript existen**: ✅ Todos los métodos necesarios están implementados:
   - `subgroupHasMultipleIntervals()`
   - `getIntervalsForSubgroup()`
   - `getSelectedIntervalIndexForSubgroup()`
   - `onIntervalTabChange()`
   - `getIntervalIdForFlux()`
4. **Compilación exitosa**: ✅ No hay errores de TypeScript o Angular

## DIAGNÓSTICO

El problema NO es de código faltante, sino de **DATOS**. Los tabs NO se muestran porque:

```typescript
subgroupHasMultipleIntervals(level, subgroupIndex) {
  const intervals = this.getIntervalsForSubgroup(level, subgroupIndex);
  return intervals.length > 1;  // RETORNA FALSE
}
```

Si `intervals.length` es 0 o 1, los tabs NO se muestran y se muestra el contenido repetido.

## POSIBLES CAUSAS

### Causa #1: this.intervals no tiene datos suficientes
- El array `this.intervals` global está vacío o tiene solo 1 elemento
- Los intervalos no se cargaron correctamente desde `settings`

### Causa #2: course_dates no tienen interval_id
- Los `course_dates` no tienen el campo `interval_id` correctamente asignado
- El método `subgroupHasDatesInInterval()` no encuentra fechas para los intervalos

### Causa #3: Estructura de datos incorrecta
- Los `course_subgroups` no están correctamente asociados a los intervalos
- La búsqueda de fechas por subgrupo falla

## INSTRUCCIONES PARA EL USUARIO

### PASO 1: Abrir DevTools y capturar logs

1. Abrir el curso problemático en el navegador
2. Presionar **F12** para abrir DevTools
3. Ir a la pestaña **Console**
4. Buscar mensajes con `[tabs-debug]`
5. **IMPORTANTE**: Capturar y enviar los siguientes logs:

```
[tabs-debug] getIntervalsForSubgroup called
[tabs-debug] Checking interval
[tabs-debug] normalized intervals used / fallback intervals
[tabs-debug] subgroupHasMultipleIntervals
```

### PASO 2: Ejecutar comando de debug manual

En la consola del navegador, ejecutar:

```javascript
// Obtener el componente (puede variar según la estructura)
const componentElement = document.querySelector('vex-courses-create-update');
if (componentElement) {
  const component = ng.getComponent(componentElement);

  console.log('===== DEBUG MANUAL =====');
  console.log('1. this.intervals:', component.intervals);
  console.log('2. this.useMultipleIntervals:', component.useMultipleIntervals);
  console.log('3. course_dates count:', component.courses.courseFormGroup.get('course_dates').value.length);
  console.log('4. First 3 course_dates:', component.courses.courseFormGroup.get('course_dates').value.slice(0, 3));
  console.log('5. settings.intervals:', JSON.parse(component.courses.courseFormGroup.get('settings').value).intervals);
  console.log('===== FIN DEBUG =====');
}
```

### PASO 3: Verificar datos específicos

En la consola, también ejecutar:

```javascript
const component = ng.getComponent(document.querySelector('vex-courses-create-update'));
const courseDates = component.courses.courseFormGroup.get('course_dates').value;

// Verificar interval_id en cada fecha
console.log('Interval IDs por fecha:');
courseDates.forEach((cd, idx) => {
  console.log(`Fecha ${idx}: interval_id=${cd.interval_id}, date=${cd.date}`);
});

// Contar fechas por interval_id
const byInterval = {};
courseDates.forEach(cd => {
  const id = cd.interval_id || 'NULL';
  byInterval[id] = (byInterval[id] || 0) + 1;
});
console.log('Fechas por intervalo:', byInterval);
```

## SOLUCIONES PROPUESTAS (basadas en diagnóstico)

### Solución A: Si this.intervals está vacío

**Problema**: Los intervalos no se cargaron desde settings

**Fix**:
```typescript
// En ngOnInit o después de cargar el curso
if (this.useMultipleIntervals && (!this.intervals || this.intervals.length === 0)) {
  this.loadIntervalsFromCourse(this.detailData, this);
}
```

### Solución B: Si course_dates no tienen interval_id

**Problema**: Los datos se guardaron sin interval_id

**Fix temporal**: Re-sincronizar los datos
```typescript
// Ejecutar en consola
const component = ng.getComponent(document.querySelector('vex-courses-create-update'));
component.syncIntervalsToCourseFormGroup();
```

### Solución C: Si hay datos pero no se detectan correctamente

**Problema**: El método `subgroupHasDatesInInterval()` no funciona correctamente

**Fix**: Revisar la lógica de búsqueda de fechas por subgrupo e intervalo

## SIGUIENTE PASO

**IMPORTANTE**: Necesito que el usuario ejecute los comandos del PASO 1 y PASO 2, y me envíe:

1. Los logs de `[tabs-debug]` completos
2. La salida del comando de debug manual
3. La salida de la verificación de interval_ids

Con esa información, puedo identificar exactamente cuál de las 3 causas es el problema y aplicar el fix correcto.

## COMPILACIÓN ACTUAL

El proyecto compila sin errores:
```
Build at: 2025-10-31T08:47:32.879Z
Hash: 0dc96ba5a5e194b5
Time: 84069ms
```

No hay errores de sintaxis ni de importación de módulos.

---

**RESUMEN**: El código de tabs está correcto, pero los DATOS no están llegando correctamente. Necesitamos los logs del navegador para identificar el problema exacto.
