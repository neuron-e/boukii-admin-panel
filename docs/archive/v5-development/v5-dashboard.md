# V5 Dashboard API Endpoints

## Overview
API endpoints for the Boukii V5 Dashboard system. All endpoints require authentication and season context.

## Base URL
`{api_base_url}/v5/dashboard`

## Authentication
All endpoints require:
- `Authorization: Bearer {jwt_token}`
- `X-Season-Id: {season_id}` (header)
- `X-School-Id: {school_id}` (header - optional, derived from user)

---

## 1. Dashboard Statistics

### GET /stats
Returns comprehensive dashboard statistics for the specified season.

**Headers:**
- `X-Season-Id`: Season ID (required)
- `X-School-Id`: School ID (optional, derived from user)

**Query Parameters:**
- `season_id` (optional): Season ID. If not provided, uses X-Season-Id header.

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
      "topNationalities": ["Español", "Francés", "Alemán"]
    },
    "revenue": {
      "thisMonth": 28450.00,
      "lastMonth": 24200.00,
      "growth": 17.6,
      "pending": 3200.00,
      "dailyAverage": 945.83,
      "topPaymentMethod": "Tarjeta de Crédito",
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
      "location": "Sierra Nevada, España",
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
  "message": "Dashboard stats retrieved successfully"
}
```

---

## 2. Recent Activity

### GET /recent-activity
Returns recent system activity.

**Query Parameters:**
- `limit` (optional): Number of activities to return. Default: 10

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking_123",
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
  ],
  "message": "Recent activity retrieved successfully"
}
```

---

## 3. System Alerts

### GET /alerts
Returns active system alerts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pending_payments",
      "type": "warning",
      "title": "Pagos pendientes",
      "message": "5 reservas con pagos pendientes",
      "timestamp": "2024-08-02T09:30:00Z",
      "actionUrl": "/v5/bookings?filter=pending-payment",
      "actionLabel": "Ver reservas",
      "priority": 2
    }
  ],
  "message": "Alerts retrieved successfully"
}
```

### DELETE /alerts/{alertId}
Dismisses a specific alert.

**Parameters:**
- `alertId`: Alert ID to dismiss

**Response:**
```json
{
  "success": true,
  "data": [],
  "message": "Alert dismissed successfully"
}
```

---

## 4. Daily Sessions

### GET /daily-sessions
Returns daily session occupancy data.

**Query Parameters:**
- `days` (optional): Number of days to return. Default: 7

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-08-01",
      "morningSlots": 12,
      "afternoonSlots": 8,
      "totalSessions": 20,
      "occupancy": 85.0
    }
  ],
  "message": "Daily sessions retrieved successfully"
}
```

---

## 5. Today's Reservations

### GET /today-reservations
Returns today's reservations list.

**Query Parameters:**
- `date` (optional): Date in YYYY-MM-DD format. Defaults to today.

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
  ],
  "message": "Today reservations retrieved successfully"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Season ID is required",
  "data": []
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthenticated",
  "data": []
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "data": []
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to retrieve dashboard stats",
  "data": []
}
```

---

## Implementation Notes

1. **Caching**: Dashboard statistics are cached for 5 minutes to improve performance
2. **Season Context**: All endpoints require a valid season context
3. **School Isolation**: Data is automatically filtered by the user's school
4. **Real-time Updates**: The frontend uses observables for real-time data updates
5. **Error Handling**: All endpoints have comprehensive error handling and logging

## Frontend Integration

These endpoints are consumed by:
- `DashboardService` in `src/app/v5/core/services/dashboard.service.ts`
- `WelcomeComponent` in `src/app/v5/pages/welcome/welcome.component.ts`

## Security Considerations

1. All endpoints require JWT authentication
2. Season and school context validation is mandatory
3. Data is automatically filtered by user permissions
4. Rate limiting is applied through Laravel middleware
5. Input validation prevents SQL injection and XSS attacks