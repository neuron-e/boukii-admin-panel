# Season Module

The Season module manages academic seasons for a school. Each season has a start and end date along with optional hours and vacation days.

## Endpoints

### List Seasons

```http
GET /api/v5/seasons
```

Returns all seasons.

### Create Season

```http
POST /api/v5/seasons
```

Parameters: see `Season` schema. Returns the created season.

### Show Season

```http
GET /api/v5/seasons/{id}
```

Retrieve a single season by ID.

### Update Season

```http
PUT /api/v5/seasons/{id}
```

Accepts the same fields as creation. Returns the updated season.

### Delete Season

```http
DELETE /api/v5/seasons/{id}
```

Removes a season.

### Current Season

```http
GET /api/v5/seasons/current?school_id={id}
```

Fetch the active season for a school.

### Close Season

```http
POST /api/v5/seasons/{id}/close
```

Marks a season as closed.

### Clone Season

```http
POST /api/v5/seasons/{id}/clone
```

Creates a new season based on an existing one.

## Workflow Notes

Most operations rely on `SeasonService` which interacts with the repository and models. Closing or cloning a season updates additional fields like `is_closed` and `closed_at`.
