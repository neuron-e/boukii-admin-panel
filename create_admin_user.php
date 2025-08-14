<?php

require_once 'C:\laragon\www\api-boukii\vendor\autoload.php';

$app = require_once 'C:\laragon\www\api-boukii\bootstrap\app.php';

$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\SchoolUser;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

// Create or update admin user
$email = 'admin@test-v5.com';
$password = 'admin123';
$schoolId = 2; // ESS Veveyse

echo "Creating admin user for testing...\n";

$user = User::updateOrCreate(
    ['email' => $email],
    [
        'first_name' => 'Admin',
        'last_name' => 'Test',
        'password' => Hash::make($password),
        'active' => true,
    ]
);

echo "✅ User created: {$user->email} (ID: {$user->id})\n";

// Assign school_admin role
try {
    $role = Role::firstOrCreate(['name' => 'school_admin']);
    $user->assignRole($role);
    echo "✅ Role assigned: school_admin\n";
} catch (Exception $e) {
    echo "⚠️  Role assignment error: " . $e->getMessage() . "\n";
}

// Create school user relationship
$schoolUser = SchoolUser::updateOrCreate([
    'user_id' => $user->id,
    'school_id' => $schoolId
]);

echo "✅ School relationship created: User {$user->id} -> School {$schoolId}\n";

// Create user season roles (if table exists)
try {
    DB::table('user_season_roles')->updateOrCreate(
        [
            'user_id' => $user->id,
            'school_id' => $schoolId,
            'season_id' => 14, // 2024-2025 season
            'role' => 'school_admin'
        ]
    );
    echo "✅ Season role assigned\n";
} catch (Exception $e) {
    echo "⚠️  Season role error: " . $e->getMessage() . "\n";
}

echo "\n=== CREDENTIALS FOR TESTING ===\n";
echo "Email: {$email}\n";
echo "Password: {$password}\n";
echo "School ID: {$schoolId}\n";
echo "Season ID: 14\n";