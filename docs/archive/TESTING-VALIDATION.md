# 🧪 Manual Testing & Validation Guide

Esta guía proporciona una lista de verificación manual para validar todas las funcionalidades críticas que fueron arregladas durante el Dashboard V5 Audit.

## ✅ Lista de Verificación Manual

### 🔐 1. Flujo Completo de Autenticación

**Pasos a Seguir:**
1. **Limpiar datos** - Abrir DevTools → Application → Local Storage → Limpiar todos los datos de `localhost:4200`
2. **Ir a login** - Navegar a `http://localhost:4200/v5/login`
3. **Introducir credenciales**:
   - Email: `admin@boukii-v5.com`
   - Password: `password123`
4. **Verificar redirect** - Debe redirigir a `/v5/school-selector`
5. **Seleccionar escuela** - Hacer click en "ESS Veveyse" (School ID: 2)
6. **Verificar localStorage** - En DevTools verificar que existen:
   - `boukii_v5_token` - Token permanente (no temporal)
   - `boukii_v5_user` - Datos del usuario
   - `boukii_v5_school` - Datos de la escuela seleccionada
   - `boukii_v5_season` - Datos de temporada asignada
7. **Verificar dashboard** - Debe redirigir a `/v5/dashboard` automáticamente
8. **Verificar persistencia** - Refrescar página → Debe mantenerse autenticado

**✅ Resultado Esperado:**
- Login → School Selection → Dashboard sin errores
- Datos guardados en localStorage correctamente
- No vuelve al login en ningún momento
- Dashboard carga completamente

---

### 🗃️ 2. TokenV5Service - Sincronización localStorage

**Pasos para Validar en DevTools Console:**

```javascript
// 1. Verificar que el servicio está funcionando
const tokenService = angular.element(document.body).injector().get('TokenV5Service');

// 2. Simular desincronización (localStorage tiene token pero BehaviorSubject no)
localStorage.setItem('boukii_v5_token', 'test-token-12345');
localStorage.setItem('boukii_v5_user', JSON.stringify({id: 1, name: 'Test', email: 'test@example.com'}));

// 3. Verificar sincronización automática
const token = tokenService.getToken(); // Debe retornar 'test-token-12345' y sincronizar subjects
console.log('Token sincronizado:', token);
console.log('Usuario sincronizado:', tokenService.user$.value);

// 4. Verificar hasValidToken
const isValid = tokenService.hasValidToken();
console.log('Token válido después de sync:', isValid); // Debe ser true
```

**✅ Resultado Esperado:**
- `getToken()` sincroniza automáticamente desde localStorage
- BehaviorSubjects se actualizan correctamente
- `hasValidToken()` retorna `true` después de sincronización

---

### 👤 3. AuthV5Service - Extracción Flexible de Usuario

**Pasos en Network Tab:**

1. **Ir a Dashboard** - Con autenticación completada
2. **Buscar llamada a `/me`** - En Network tab filtrar por "me"
3. **Verificar request headers**:
   - `Authorization: Bearer [token]`
   - `X-School-ID: 2`
   - `X-Season-ID: [season-id]`
4. **Verificar response structure** - Debe mostrar estructura exitosa
5. **Verificar logs en Console** - Buscar logs que empiecen con:
   - `🔄 AuthV5Service: Making /me API call`
   - `🔍 AuthV5Service: Raw API response for /me`
   - `✅ AuthV5Service: Extracted user from API response`

**✅ Resultado Esperado:**
- API call a `/me` exitosa (200)
- Headers correctos incluidos
- Usuario extraído sin errores `user.email undefined`
- Logs muestran estructura de respuesta y método de extracción usado

---

### 📊 4. Dashboard - Datos Dinámicos 

**Verificaciones Visuales:**

1. **Dashboard Stats** - Los números deben ser reales (no hardcodeados como 42, 128, etc.)
2. **Reservaciones de Hoy** - Verificar que muestran:
   - Emails reales de clientes (no `cliente1@example.com`)
   - Precios dinámicos de cursos (no €25.00 hardcodeado)
   - Datos que cambian según temporada/escuela seleccionada
3. **Network Tab** - Verificar llamadas API:
   - `GET /api/v5/dashboard/stats`
   - `GET /api/v5/dashboard/todays-reservations` 
   - `GET /api/v5/clients/[client-id]` (para emails dinámicos)
   - `GET /api/v5/courses/prices` (para precios dinámicos)

**✅ Resultado Esperado:**
- Datos del dashboard NO son hardcodeados
- Emails de clientes son reales y dinámicos
- Precios de cursos son obtenidos de API
- Datos cambian según contexto de escuela/temporada

---

### 🔄 5. AuthV5Guard - Lógica de Retry

**Simulación de Errores Temporales:**

1. **Abrir DevTools** - Network tab
2. **Ir a Dashboard** - URL directa `http://localhost:4200/v5/dashboard`
3. **Simular error 500** - En Network tab, right-click en request a `/me` → Block request URL
4. **Verificar retry behavior** - En Console buscar logs:
   - `🔄 AuthV5Guard: Checking authentication`
   - `❌ AuthV5Guard: No valid token found, checking if token is being saved...`
   - `🔄 AuthV5Guard: Retrying token validation...`
5. **Unblock request** - Quitar bloqueo después de algunos intentos
6. **Verificar éxito eventual** - Dashboard debe cargar correctamente

**✅ Resultado Esperado:**
- Guard realiza múltiples intentos (hasta 8)
- Logs muestran strategy de retry con delays
- Eventualmente permite acceso cuando API responde
- No redirige al login inmediatamente ante errores temporales

---

## 🚀 Script de Validación Automatizada

Para verificar rápidamente todos los puntos críticos, ejecutar este script en DevTools Console:

```javascript
// Script de Validación Dashboard V5 Audit
console.log('🧪 INICIANDO VALIDACIÓN DASHBOARD V5 AUDIT...\n');

// 1. Verificar localStorage data
const checkLocalStorage = () => {
  const token = localStorage.getItem('boukii_v5_token');
  const user = localStorage.getItem('boukii_v5_user');
  const school = localStorage.getItem('boukii_v5_school');
  const season = localStorage.getItem('boukii_v5_season');
  
  console.log('✅ LocalStorage Check:');
  console.log('  - Token exists:', !!token, token?.substring(0, 20) + '...');
  console.log('  - User exists:', !!user, user ? JSON.parse(user).email : 'N/A');
  console.log('  - School exists:', !!school, school ? JSON.parse(school).name : 'N/A');
  console.log('  - Season exists:', !!season, season ? JSON.parse(season).name : 'N/A');
  console.log('');
  
  return { token, user, school, season };
};

// 2. Verificar que estamos en dashboard
const checkCurrentPage = () => {
  const isDashboard = window.location.pathname.includes('/v5/dashboard');
  console.log('✅ Current Page Check:');
  console.log('  - On Dashboard:', isDashboard);
  console.log('  - Current URL:', window.location.href);
  console.log('');
  
  return isDashboard;
};

// 3. Verificar elementos del dashboard
const checkDashboardElements = () => {
  const statsElements = document.querySelectorAll('[data-cy*="stats"], .stats, .dashboard-stats');
  const clientElements = document.querySelectorAll('[data-cy*="client"], .client-email');
  const priceElements = document.querySelectorAll('[data-cy*="price"], .course-price, .price');
  
  console.log('✅ Dashboard Elements Check:');
  console.log('  - Stats elements found:', statsElements.length);
  console.log('  - Client elements found:', clientElements.length);
  console.log('  - Price elements found:', priceElements.length);
  console.log('');
  
  return { statsElements, clientElements, priceElements };
};

// 4. Verificar llamadas API recientes
const checkRecentAPICalls = () => {
  console.log('✅ API Calls Check (revisar Network tab):');
  console.log('  - Buscar: GET /api/v5/dashboard/stats');
  console.log('  - Buscar: GET /api/v5/dashboard/todays-reservations');
  console.log('  - Buscar: GET /api/v5/auth/me');
  console.log('  - Buscar: GET /api/v5/clients/*');
  console.log('  - Buscar: GET /api/v5/courses/prices');
  console.log('');
};

// Ejecutar todas las verificaciones
const localStorage = checkLocalStorage();
const onDashboard = checkCurrentPage();
const elements = checkDashboardElements();
checkRecentAPICalls();

// Resumen final
console.log('🎯 RESUMEN VALIDACIÓN:');
console.log('  - Auth Data Stored:', !!(localStorage.token && localStorage.user && localStorage.school));
console.log('  - Dashboard Loaded:', onDashboard);
console.log('  - Dynamic Elements:', elements.statsElements.length + elements.clientElements.length + elements.priceElements.length > 0);
console.log('');

if (onDashboard && localStorage.token) {
  console.log('🎉 VALIDACIÓN EXITOSA: Dashboard V5 Audit funcionando correctamente!');
} else {
  console.log('❌ VALIDACIÓN FALLIDA: Revisar problemas identificados arriba.');
}

console.log('\n📋 Para verificación completa, revisar Network tab y Console logs durante navegación.');
```

---

## 📝 Notas Adicionales

### Casos de Uso Especiales:

1. **Multi-School Users**: Probar con usuario que tenga múltiples escuelas asignadas
2. **Single Season**: Verificar auto-selección cuando solo hay 1 temporada
3. **Multiple Seasons**: Verificar modal selector cuando hay múltiples temporadas
4. **Token Expiration**: Simular token expirado y verificar refresh automático
5. **Network Failures**: Probar con conexión intermitente

### Debugging Tips:

- **Console Filters**: Usar filtros como `TokenV5Service`, `AuthV5Service`, `Dashboard` para logs específicos
- **Network Tab**: Filtrar por `api/v5` para ver solo llamadas relevantes
- **Application Tab**: Revisar localStorage en tiempo real
- **Performance Tab**: Verificar que no hay memory leaks en subscriptions

### Criterios de Éxito:

✅ **APROBADO** si:
- Flujo login → school → dashboard funciona sin errores
- Datos del dashboard son dinámicos (no hardcodeados)  
- Token se sincroniza automáticamente entre localStorage y BehaviorSubjects
- Guard realiza retry logic correctamente
- API calls incluyen headers de contexto (school-id, season-id)

❌ **RECHAZADO** si:
- Cualquier parte del flujo de auth falla
- Dashboard muestra datos hardcodeados
- Errores de `user.email undefined` 
- Redirect loops al login
- Missing token synchronization