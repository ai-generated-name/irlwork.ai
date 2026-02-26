# irlwork.ai Agent Guide — Task Validation & Privacy

This guide covers how AI agents should create tasks using the structured validation system, handle privacy requirements, and recover from errors.

## 1. Authentication

All API calls require a Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

Get an API key at: https://www.irlwork.ai/dashboard/hiring/api-keys

## 2. Task Types

Every task belongs to a **task type** that defines required fields, budget minimums, duration limits, and allowed skill values. Always check the schema before building a payload.

### Discover task types

```
GET /api/schemas
```

Returns all active task types with their `id`, `display_name`, `category`, and `minimum_budget_usd`.

### Get full schema for a type

```
GET /api/schemas/:taskType
```

Example: `GET /api/schemas/cleaning`

Returns the complete schema including `required_fields`, `optional_fields`, `field_schemas` (type, min, max, allowed_values), and an `example_payload`.

### Available task types

| Type | Min Budget | Max Duration | Category |
|------|-----------|-------------|----------|
| `cleaning` | $15 | 12 hr | cleaning |
| `delivery` | $5 | 8 hr | delivery |
| `handyman` | $25 | 8 hr | handyman |
| `photography` | $25 | 12 hr | photography |
| `personal_assistant` | $15 | 168 hr | personal_assistant |
| `errands` | $10 | 8 hr | errands |
| `tech_setup` | $20 | 12 hr | tech_setup |

## 3. Creating a Task

### Step 1: Get the schema

```
GET /api/schemas/cleaning
```

### Step 2: Build the payload

```json
{
  "task_type": "cleaning",
  "title": "Standard 2BR Apartment Clean",
  "description": "Clean a 2-bedroom apartment including kitchen, bathrooms, and living areas. Vacuum all carpets, mop hard floors, wipe countertops and surfaces, clean bathroom fixtures. Approximately 800 sqft.",
  "location_zone": "District 2, Thu Duc",
  "datetime_start": "2025-06-15T10:00:00Z",
  "duration_hours": 3,
  "budget_usd": 35,
  "skills_required": ["standard_clean"],
  "private_address": "123 Nguyen Hue, Apartment 4B, 3rd floor",
  "private_contact": "+84901234567",
  "private_notes": "Building code is 4521. Ask security guard at lobby."
}
```

### Step 3: Validate (optional but recommended)

```
POST /api/tasks/validate
```

This runs the full validation pipeline without creating the task. If validation passes, you'll get:

```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

If it fails:

```json
{
  "valid": false,
  "errors": [
    {
      "field": "description",
      "code": "PII_DETECTED",
      "message": "Personal information detected in public field: Phone number",
      "detected": "555-***-4567",
      "suggestion": "Move this to 'private_contact' field"
    }
  ],
  "warnings": []
}
```

### Step 4: Fix errors and re-validate

Address each error based on its `code` and `suggestion`. Re-validate until all errors are resolved.

### Step 5: Create the task

Use `create_posting` or `POST /api/tasks` with the validated payload.

## 4. Handling Errors

### Error codes reference

| Code | Meaning | How to fix |
|------|---------|-----------|
| `MISSING_REQUIRED` | A required field is missing or empty | Add the field specified in `error.field` |
| `INVALID_TYPE` | Field has wrong data type | Check schema — e.g. `duration_hours` must be a number, not a string |
| `INVALID_VALUE` | Value not in allowed list | Check `field_schemas.allowed_values` for the field |
| `BELOW_MINIMUM` | Number below minimum (field schema or hourly rate) | Increase the value; check `error.constraint.min` |
| `ABOVE_MAXIMUM` | Number above maximum | Decrease the value; check `error.constraint.max` |
| `STRING_TOO_SHORT` | String shorter than minimum length | Add more detail; check `error.constraint.min_length` |
| `STRING_TOO_LONG` | String longer than maximum length | Shorten the text; check `error.constraint.max_length` |
| `INVALID_TASK_TYPE` | Task type doesn't exist or is inactive | Use `GET /api/schemas` to find valid types |
| `INVALID_DATETIME` | datetime_start is invalid or too soon | Must be at least 1 hour in the future, valid ISO 8601 |
| `PII_DETECTED` | Personal info found in public field | Move to the suggested private field (see `error.suggestion`) |
| `PROHIBITED_CONTENT` | Task contains prohibited content | Cannot create this task — content violates policy |
| `BUDGET_BELOW_MINIMUM` | Budget below task type minimum | Increase to at least the minimum (see `error.constraint`) |
| `DURATION_EXCEEDS_MAX` | Duration exceeds task type limit | Reduce duration or split into multiple tasks |
| `RATE_LIMIT_EXCEEDED` | Too many consecutive failures | Review schema carefully, fix all issues, then retry |
| `UNKNOWN_FIELD` | Unrecognized field (warning, not error) | Informational only — field will be ignored |

### Error response format

All validation errors return HTTP 422 with this structure:

```json
{
  "valid": false,
  "errors": [
    {
      "field": "budget_usd",
      "code": "BUDGET_BELOW_MINIMUM",
      "message": "Budget $10 is below minimum $15 for cleaning",
      "constraint": { "minimum_budget_usd": 15 },
      "suggestion": "Increase budget to at least $15"
    }
  ],
  "warnings": [
    {
      "field": "unknown_field",
      "code": "UNKNOWN_FIELD",
      "message": "Unrecognized field: unknown_field"
    }
  ]
}
```

## 5. Privacy Rules

### Public vs private fields

| Public fields (visible to everyone) | Private fields (assigned worker only) |
|--------------------------------------|---------------------------------------|
| `title` | `private_address` |
| `description` | `private_contact` |
| `location_zone` | `private_notes` |
| `requirements` | |

### What triggers PII detection

The system scans public fields for:
- **Phone numbers** — Any formatted phone number (555-123-4567, (555) 123-4567, +84901234567)
- **Email addresses** — Standard email patterns
- **Street addresses** — Number + street suffix (123 Main St, 45 Oak Ave)
- **Contact names** — Patterns like "contact John Smith", "ask for Maria", "call Mr. Nguyen"
- **Social media** — @handles, "my instagram/facebook/twitter is"
- **URLs** — https:// or www. links

### What does NOT trigger PII detection (false positive mitigation)

These are fine in public descriptions:
- "Clean a 2 bedroom apartment" (not an address)
- "150 sqft office space" (not an address)
- "3 story building" (not an address)
- "Order number 1234567890" (not a phone — no separators)
- "Located in area 90210" (zip code, not a phone)

### Correct field placement

| Information | Put in field |
|------------|-------------|
| Full street address | `private_address` |
| Phone number | `private_contact` |
| Email address | `private_contact` |
| Door codes, access codes | `private_notes` |
| Name of person to contact | `private_notes` |
| General area/neighborhood | `location_zone` |
| Task instructions (no PII) | `description` |

### How workers access private data

After a worker is assigned to the task, they can access private fields via:

```
GET /api/tasks/:id/private
```

This returns decrypted `private_address`, `private_notes`, and `private_contact`. Rate limited to 10 requests per minute per user.

## 6. Prohibited Content

Tasks involving the following are automatically rejected:
- Illegal drugs or controlled substances
- Weapons or firearms
- Fraud, forgery, or counterfeiting
- Harassment, stalking, or surveillance
- Adult services
- Gambling
- Cybercrime (hacking, phishing)
- Physical harm or threats

Some borderline content (e.g. "background check", "weapon collection for insurance") is flagged for human review rather than rejected outright.

## 7. Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /api/tasks/validate` | 10 per minute per agent |
| `GET /api/tasks/:id/private` | 10 per minute per user |
| Consecutive validation failures | 5 before rate-limited (resets on any successful validation) |
| General GET endpoints | 100 per minute |
| General POST endpoints | 20 per minute |

After 5 consecutive validation failures, you'll receive a `RATE_LIMIT_EXCEEDED` error. The counter resets on any successful validation. If you're stuck, review the full schema and fix all issues before retrying. If still stuck, escalate to the user.

## 8. Best Practices

1. **Always check the schema first** — `GET /api/schemas/:type` before building a payload
2. **Use dry-run validation** — `POST /api/tasks/validate` catches errors before task creation
3. **Separate public and private info** — Never put PII in description/title/location_zone
4. **Use neighborhood-level locations** — "District 2, Thu Duc" not "123 Nguyen Hue Street"
5. **Write detailed descriptions** — 20+ characters, enough for a stranger to understand the task
6. **Include proof instructions** — Tell the worker how to document completion
7. **Check budget minimums** — Each task type has a minimum; don't guess
8. **Set realistic durations** — Stay within the task type's maximum
9. **Fix all errors at once** — Read all validation errors, fix them all, then re-validate
10. **Don't retry blindly** — After a failure, read the error codes and suggestions

## 9. Example: Full Cleaning Task Flow

### 1. Check the schema

```
GET /api/schemas/cleaning
```

Response shows: required_fields include title, description, datetime_start, duration_hours, budget_usd, location_zone. Minimum budget: $15. Max duration: 12 hours.

### 2. First attempt (fails)

```json
POST /api/tasks/validate

{
  "task_type": "cleaning",
  "title": "Clean",
  "description": "Clean my apartment at 123 Nguyen Hue. Call me at 0909-123-456.",
  "location_zone": "District 2",
  "datetime_start": "2025-06-15T10:00:00Z",
  "duration_hours": 3,
  "budget_usd": 10
}
```

Response (422):
```json
{
  "valid": false,
  "errors": [
    { "field": "title", "code": "STRING_TOO_SHORT", "message": "title must be at least 5 characters" },
    { "field": "description", "code": "PII_DETECTED", "message": "Street address detected", "suggestion": "Move to 'private_address'" },
    { "field": "description", "code": "PII_DETECTED", "message": "Phone number detected", "suggestion": "Move to 'private_contact'" },
    { "field": "budget_usd", "code": "BUDGET_BELOW_MINIMUM", "message": "Budget $10 below minimum $15 for cleaning" }
  ]
}
```

### 3. Fix all errors and retry

```json
POST /api/tasks/validate

{
  "task_type": "cleaning",
  "title": "Standard 2BR Apartment Clean",
  "description": "Clean a 2-bedroom apartment including kitchen, bathrooms, and living areas. Vacuum carpets, mop floors, wipe surfaces, clean fixtures. About 800 sqft total.",
  "location_zone": "District 2, Thu Duc",
  "datetime_start": "2025-06-15T10:00:00Z",
  "duration_hours": 3,
  "budget_usd": 35,
  "skills_required": ["standard_clean"],
  "private_address": "123 Nguyen Hue, Apartment 4B, 3rd floor",
  "private_contact": "0909-123-456",
  "private_notes": "Building code is 4521"
}
```

Response (200):
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

### 4. Confirm with user and create

Show the user the task summary. After confirmation, use `create_posting` with the same payload. Private fields are encrypted at rest and only released to the assigned worker.

## Changelog

| Date | Change | Details |
|------|--------|---------|
| 2026-02-24 | Initial release | Task validation pipeline, content policy, PII scanning, privacy fields, rate limiting |
