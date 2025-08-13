# Health Check Module

The Health Check endpoint verifies that the V5 API is running correctly.

## Endpoint

```http
GET /api/v5/health-check
```

### Parameters

This endpoint does not accept any parameters.

### Response

```json
{ "status": "ok" }
```

HTTP status code: **200**

### Possible Errors

The health check performs no validation and should always return `200`. A different status code indicates a misconfiguration or network issue.

## Associated Test

The behaviour is covered by `tests/Feature/V5HealthCheckTest.php` which asserts the JSON response above.
