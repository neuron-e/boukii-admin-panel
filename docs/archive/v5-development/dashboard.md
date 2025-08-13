# Dashboard API Endpoints

## Overview
This document specifies the API endpoints required for the V5 Dashboard functionality. All endpoints require authentication and season context.

## Base URL
`https://dev.api.boukii.com/api/admin_v3`

## Authentication
All endpoints require:
- `Authorization: Bearer {jwt_token}`
- `X-Season-Id: {season_id}` (header)
- `X-Client-Version: boukii-admin-v5.0` (header)

---

## 1. Dashboard Overview Stats

### GET /dashboard/stats
Returns comprehensive dashboard statistics for the specified season.

**Parameters:**
- `season_id` (query, optional): Season ID. If not provided, uses current season from context.

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": {
      "total": 347,
      "pending": 23,
      "confirmed": 298,
      "cancelled": 26,
      "todayCount": 12,
      "weeklyGrowth": 15.3,
      "todayRevenue": 2450.00,
      "pendingPayments": 5
    },
    "clients": {
      "total": 156,
      "active": 142,
      "newThisMonth": 18,
      "vipClients": 12,
      "averageAge": 32.5,
      "topNationalities": ["Spanish", "French", "German"]
    },
    "revenue": {
      "thisMonth": 28450.00,
      "lastMonth": 24200.00,
      "growth": 17.6,
      "pending": 3200.00,
      "dailyAverage": 945.83,
      "topPaymentMethod": "Credit Card",
      "totalThisSeason": 125000.00
    },
    "courses": {
      "active": 8,
      "upcoming": 3,
      "completedThisWeek": 5,
      "totalCapacity": 120,
      "occupancyRate": 78.5,
      "averageRating": 4.7
    },
    "monitors": {
      "total": 15,
      "active": 12,
      "available": 8,
      "onLeave": 2,
      "newThisMonth": 1,
      "averageRating": 4.6,
      "hoursWorkedThisWeek": 240
    },
    "weather": {
      "location": "Sierra Nevada, Spain",
      "temperature": -2.5,
      "condition": "snowy",
      "windSpeed": 15,
      "humidity": 85,
      "visibility": 8,
      "lastUpdated": "2024-08-02T10:30:00Z",
      "forecast": [
        {
          "date": "2024-08-03",
          "minTemp": -5,
          "maxTemp": 2,
          "condition": "partly-cloudy",
          "precipitationChance": 20
        }
      ]
    },
    "salesChannels": [
      {
        "channel": "Online",
        "bookings": 195,
        "revenue": 18450.00,
        "percentage": 65.0,
        "growth": 12.5
      },
      {
        "channel": "Teléfono",
        "bookings": 98,
        "revenue": 7200.00,
        "percentage": 25.0,
        "growth": -5.2
      },
      {
        "channel": "Presencial",
        "bookings": 54,
        "revenue": 2800.00,
        "percentage": 10.0,
        "growth": 8.3
      }
    ],
    "dailySessions": [
      {
        "date": "2024-08-01",
        "morningSlots": 12,
        "afternoonSlots": 8,
        "totalSessions": 20,
        "occupancy": 85.0
      }
    ],
    "todayReservations": [
      {
        "id": 1234,
        "clientName": "María González",
        "courseType": "Curso Principiante",
        "startTime": "09:00",
        "endTime": "12:00",
        "status": "confirmed",
        "paymentStatus": "paid",
        "monitorName": "Carlos Ruiz"
      }
    ]
  },
  "message": "Dashboard stats retrieved successfully",
  "timestamp": "2024-08-02T10:30:00Z"
}
```

---

## 2. Individual Stat Endpoints

### GET /dashboard/bookings-stats
Returns detailed booking statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 347,
    "pending": 23,
    "confirmed": 298,
    "cancelled": 26,
    "todayCount": 12,
    "weeklyGrowth": 15.3,
    "todayRevenue": 2450.00,
    "pendingPayments": 5
  }
}
```

### GET /dashboard/clients-stats
Returns client statistics.

### GET /dashboard/revenue-stats
Returns revenue statistics.

### GET /dashboard/courses-stats
Returns course statistics.

### GET /dashboard/monitors-stats
Returns monitor statistics.

---

## 3. Weather Data

### GET /dashboard/weather
Returns current weather conditions and forecast.

**Parameters:**
- `location` (query, optional): Location for weather data. Defaults to school location.

**Response:**
```json
{
  "success": true,
  "data": {
    "location": "Sierra Nevada, Spain",
    "temperature": -2.5,
    "condition": "snowy",
    "windSpeed": 15,
    "humidity": 85,
    "visibility": 8,
    "lastUpdated": "2024-08-02T10:30:00Z",
    "forecast": [
      {
        "date": "2024-08-03",
        "minTemp": -5,
        "maxTemp": 2,
        "condition": "partly-cloudy",
        "precipitationChance": 20
      }
    ]
  }
}
```

---

## 4. Sales Analytics

### GET /dashboard/sales-channels
Returns sales channel performance data.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "channel": "Online",
      "bookings": 195,
      "revenue": 18450.00,
      "percentage": 65.0,
      "growth": 12.5
    }
  ]
}
```

### GET /dashboard/daily-sessions
Returns daily session occupancy data.

**Parameters:**
- `days` (query, optional): Number of days to return. Default: 7

---

## 5. Today's Operations

### GET /dashboard/today-reservations
Returns today's reservations list.

**Parameters:**
- `date` (query, optional): Date in YYYY-MM-DD format. Defaults to today.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1234,
      "clientName": "María González",
      "courseType": "Curso Principiante",
      "startTime": "09:00",
      "endTime": "12:00",
      "status": "confirmed",
      "paymentStatus": "paid",
      "monitorName": "Carlos Ruiz"
    }
  ]
}
```

---

## 6. Activity & Alerts

### GET /dashboard/recent-activity
Returns recent system activity.

**Parameters:**
- `limit` (query, optional): Number of activities to return. Default: 10

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "act_123",
      "type": "booking",
      "title": "Nueva reserva confirmada",
      "description": "María González - Curso Principiante",
      "timestamp": "2024-08-02T10:25:00Z",
      "status": "success",
      "metadata": {
        "bookingId": 1234,
        "clientId": 567
      },
      "actionUrl": "/v5/bookings/1234"
    }
  ]
}
```

### GET /dashboard/alerts
Returns active system alerts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert_123",
      "type": "warning",
      "title": "Pagos pendientes",
      "message": "5 reservas con pagos pendientes próximos a vencer",
      "timestamp": "2024-08-02T09:30:00Z",
      "actionUrl": "/v5/bookings?filter=pending-payment",
      "actionLabel": "Ver reservas",
      "priority": 2
    }
  ]
}
```

### DELETE /dashboard/alerts/{alertId}
Dismisses a specific alert.

**Response:**
```json
{
  "success": true,
  "message": "Alert dismissed successfully"
}
```

---

## Error Responses

All endpoints may return the following error formats:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid request parameters",
  "errors": ["season_id is required"],
  "timestamp": "2024-08-02T10:30:00Z"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "timestamp": "2024-08-02T10:30:00Z"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "timestamp": "2024-08-02T10:30:00Z"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Season not found",
  "timestamp": "2024-08-02T10:30:00Z"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "timestamp": "2024-08-02T10:30:00Z"
}
```

---

## Data Models

### BookingStats
```typescript
interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  todayCount: number;
  weeklyGrowth: number;
  todayRevenue: number;
  pendingPayments: number;
}
```

### ClientStats
```typescript
interface ClientStats {
  total: number;
  active: number;
  newThisMonth: number;
  vipClients: number;
  averageAge: number;
  topNationalities: string[];
}
```

### RevenueStats
```typescript
interface RevenueStats {
  thisMonth: number;
  lastMonth: number;
  growth: number;
  pending: number;
  dailyAverage: number;
  topPaymentMethod: string;
  totalThisSeason: number;
}
```

### WeatherData
```typescript
interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  windSpeed: number;
  humidity: number;
  visibility: number;
  lastUpdated: Date;
  forecast: DailyForecast[];
}
```

---

## Rate Limiting

- Dashboard stats: 60 requests per minute
- Weather data: 30 requests per minute
- Recent activity: 120 requests per minute
- Alert operations: 100 requests per minute

## Caching

- Dashboard stats: 5 minutes
- Weather data: 15 minutes
- Recent activity: 1 minute
- Alerts: Real-time (no cache)

## Security Notes

1. All endpoints require valid JWT authentication
2. Season context is mandatory for all season-specific data
3. Users can only access data for their authorized schools
4. Rate limiting is applied per user/IP combination
5. Sensitive financial data requires additional permissions

## Performance Considerations

1. Dashboard stats endpoint is optimized for single-query execution
2. Weather data is cached and updated every 15 minutes
3. Recent activity uses database indexing on timestamp
4. Monitor stats leverage existing monitor service cache

## Integration Notes

1. Weather data integrates with external weather API
2. Revenue calculations include all payment methods
3. Monitor availability considers current assignments
4. Activity tracking includes user audit logs
5. Alert system is event-driven with real-time updates