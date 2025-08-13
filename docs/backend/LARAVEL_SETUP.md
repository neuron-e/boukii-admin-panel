# Laravel Setup - Boukii V5 Backend

## 🚀 Quick Start

### Prerrequisitos
```bash
# Versiones requeridas
PHP >= 8.1
Composer >= 2.0
MySQL >= 8.0 (o SQLite para desarrollo)
Redis (opcional, recomendado para producción)
```

### Instalación Inicial
```bash
# Clonar repositorio (si no está en Laragon)
git clone https://github.com/sysantonio/api-boukii.git
cd api-boukii

# Cambiar a rama v5
git checkout v5

# Instalar dependencias
composer install

# Configurar environment
cp .env.example .env
php artisan key:generate

# Configurar base de datos en .env
php artisan migrate
php artisan db:seed --class=V5TestDataSeeder
```

## ⚙️ Configuración de Entornos

### Environment Variables Críticas
```bash
# .env
APP_NAME="Boukii V5 API"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://api-boukii.test

# Database (Laragon MySQL)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=api_boukii
DB_USERNAME=root
DB_PASSWORD=

# Database (SQLite para desarrollo)
DB_CONNECTION=sqlite
DB_DATABASE=/path/to/database/data.sqlite

# Auth
JWT_SECRET=your-super-secret-jwt-key
SANCTUM_STATEFUL_DOMAINS=localhost:4200,api-boukii.test

# Cache & Sessions
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Logs V5
V5_LOG_CHANNEL=v5_enterprise
V5_LOG_LEVEL=debug
```

## 🗄️ Base de Datos

### Comandos Útiles
```bash
# Migraciones
php artisan migrate
php artisan migrate:fresh --seed

# Seeders
php artisan db:seed --class=V5TestDataSeeder
php artisan db:show --counts

# Testing
php artisan test --group=v5
php artisan route:list --path=v5
```

---
*Específico para el repositorio backend*  
*Última actualización: 2025-08-13*
*Sincronizado automáticamente entre repositorios*