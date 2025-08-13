# Setup V5 Test Users

## Para crear los usuarios de prueba y asignar permisos correctamente en MySQL:

### 1. Ir al directorio de la API:
```bash
cd C:\laragon\www\api-boukii
```

### 2. Ejecutar el seeder:
```bash
php artisan db:seed --class=V5TestUsersSeeder
```

### 3. Verificar que se crearon correctamente:
```bash
php artisan tinker --execute="
echo 'Usuarios creados:' . PHP_EOL;
\$users = App\Models\User::whereIn('email', ['admin.test.v5@boukii.com', 'multi.test@boukii.com'])->get(['id', 'first_name', 'last_name', 'email']);
foreach(\$users as \$user) {
    echo 'ID: ' . \$user->id . ' - ' . \$user->first_name . ' ' . \$user->last_name . ' - ' . \$user->email . PHP_EOL;
}

echo PHP_EOL . 'Temporadas para school 2:' . PHP_EOL;
\$seasons = App\Models\Season::where('school_id', 2)->get(['id', 'name']);
foreach(\$seasons as \$season) {
    echo 'ID: ' . \$season->id . ' - ' . \$season->name . PHP_EOL;
}

echo PHP_EOL . 'Permisos asignados:' . PHP_EOL;
\$permissions = DB::table('user_season_roles')->get();
foreach(\$permissions as \$perm) {
    echo 'User ' . \$perm->user_id . ' -> Season ' . \$perm->season_id . ' -> Role: ' . \$perm->role . PHP_EOL;
}
"
```

### 4. Si necesitas asignar permisos para la temporada 11 específicamente:
```bash
php artisan tinker --execute="
\$adminUser = App\Models\User::where('email', 'admin.test.v5@boukii.com')->first();
\$multiUser = App\Models\User::where('email', 'multi.test@boukii.com')->first();

if(\$adminUser && \$multiUser) {
    DB::table('user_season_roles')->updateOrInsert(
        ['user_id' => \$adminUser->id, 'season_id' => 11],
        ['role' => 'admin', 'created_at' => now(), 'updated_at' => now()]
    );
    
    DB::table('user_season_roles')->updateOrInsert(
        ['user_id' => \$multiUser->id, 'season_id' => 11],
        ['role' => 'admin', 'created_at' => now(), 'updated_at' => now()]
    );
    
    echo 'Permisos asignados para temporada 11' . PHP_EOL;
} else {
    echo 'Usuarios no encontrados' . PHP_EOL;
}
"
```

## Credenciales de Prueba:
- **Email:** admin.test.v5@boukii.com  
- **Password:** password

- **Email:** multi.test@boukii.com  
- **Password:** password

## Problemas Comunes:

### Si obtienes error "Forbidden" (403):
1. Verifica que los usuarios estén asociados a la school correcta
2. Verifica que tengan permisos en la temporada que se está usando
3. Verifica que la temporada existe y está activa

### Para debugging:
```bash
# Ver qué temporada está siendo usada en el frontend
# Revisa los headers de la request en Network tab: x-season-id

# Verificar permisos específicos:
php artisan tinker --execute="
\$seasonId = 11; // Cambiar por el ID que aparece en x-season-id
\$permissions = DB::table('user_season_roles')->where('season_id', \$seasonId)->get();
echo 'Permisos para temporada ' . \$seasonId . ':' . PHP_EOL;
foreach(\$permissions as \$perm) {
    \$user = App\Models\User::find(\$perm->user_id);
    echo \$user->email . ' -> ' . \$perm->role . PHP_EOL;
}
"
```