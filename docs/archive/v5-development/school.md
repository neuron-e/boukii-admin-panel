# School Module

Lists schools for a season along with their season-specific settings.

## Endpoints

### List Schools

```http
GET /api/v5/schools?season_id={id}
```

Parameters:
- `season_id` (integer) required unless `school_id` is provided

The `season.context` middleware can derive the current `season_id` from
`school_id`. Access requires both `season.context` and `season.permission`
middleware along with a valid authentication token.

Response:
```json
[
  {
    "id": 1,
    "name": "Test School",
    "current_season_id": 3,
    "season_settings": [
      { "key": "currency", "value": "CHF" }
    ]
  }
]
```

Each school record includes `current_season_id` which references the
active `Season` for that school. Use the `currentSeason` relationship on
the `School` model to retrieve the full season object.
