# House Hive API

Backend API for the House Hive application. It provides authentication,
house management, house membership, chores, events, shared expense splitting,
settlements, and token revocation support using FastAPI, PostgreSQL,
SQLAlchemy, Alembic, and JWT auth.

## Requirements

- Python 3.14+
- PostgreSQL
- uv
- Docker and Docker Compose, for containerized development

## Setup

For local development without Docker, install dependencies:
```bash
uv sync
```

Create a local env file:
```bash
cp .env.example .env
```

Generate a JWT secret and put it in `.env`:
```bash
openssl rand -hex 32
```

Required env values:
```env
APP_NAME=HouseHive
ENVIRONMENT=development
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8000","http://127.0.0.1:3000","http://127.0.0.1:8000"]

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=house_hive

JWT_SECRET_KEY=<long-random-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
```

## Database

Create the database if needed:
```bash
createdb house_hive
```

Run migrations:
```bash
uv run alembic upgrade head
```

Create a migration after model changes:
```bash
uv run alembic revision --autogenerate -m "describe change"
```

## Run

```bash
uv run fastapi dev app/main.py
```

The API is served at `http://localhost:8000`. Interactive docs are available at
`http://localhost:8000/docs`.

## Run With Docker Compose

Docker Compose is the simplest way to run the API with its PostgreSQL database.
It builds the backend image from `Dockerfile` and starts two services:

- `backend`: FastAPI application on port `8000`
- `db`: PostgreSQL database on port `5432`

Start the backend and PostgreSQL database:
```bash
docker compose up --build
```

The backend container runs Alembic migrations before starting the API. The API is
served at `http://localhost:8000`, and PostgreSQL is exposed on `localhost:5432`.

Compose reads `.env` automatically when it exists. Inside Docker, the backend
uses `POSTGRES_HOST=db` so it can reach the database service. Other values, such
as `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `JWT_SECRET_KEY`, can
be set in `.env` or fall back to the defaults in `docker-compose.yml`.

Stop the services:
```bash
docker compose down
```

Stop the services and remove the persisted database volume:
```bash
docker compose down -v
```

## Auth

Register a user:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "exampleuser",
    "first_name": "Example",
    "last_name": "User",
    "password": "password123456"
  }'
```

Login with an email or username:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123456"
```

Use an access token:
```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <jwt-token>"
```

Swagger authorization uses `POST /api/v1/auth/token`, which returns a top-level
OAuth-compatible token response.

## Endpoints

Auth:
```text
POST /api/v1/auth/register      Create a regular user and return token pair
POST /api/v1/auth/login         Return the user and token pair
POST /api/v1/auth/token         Swagger/OAuth-compatible token endpoint
POST /api/v1/auth/refresh       Return a new access token from a refresh token
POST /api/v1/auth/logout        Revoke the presented access or refresh token
GET  /api/v1/auth/me            Return the current user
GET  /api/v1/auth/admin-only    Require an admin user
```

Houses:
```text
POST   /api/v1/houses                 Create a house and assign creator as admin
GET    /api/v1/houses                 List houses for the current user
GET    /api/v1/houses/{house_id}      Read a house for a member
PATCH  /api/v1/houses/{house_id}      Update a house as admin
DELETE /api/v1/houses/{house_id}      Delete a house as admin
POST   /api/v1/houses/{house_id}/join Join a house as a member
```

House members:
```text
POST   /api/v1/house-members                  Add a user to a house as admin
GET    /api/v1/house-members?house_id=<uuid>  List house users and their roles
GET    /api/v1/house-members/{member_id}      Read a membership
PATCH  /api/v1/house-members/{member_id}      Update a member role as admin
DELETE /api/v1/house-members/{member_id}      Remove a membership
```

Expenses:
```text
POST   /api/v1/houses/{house_id}/expenses               Create an equal-split expense
GET    /api/v1/houses/{house_id}/expenses               List house expenses
GET    /api/v1/houses/{house_id}/expenses/{expense_id}  Read one expense
DELETE /api/v1/houses/{house_id}/expenses/{expense_id}  Delete an expense as payer/admin
GET    /api/v1/houses/{house_id}/balances               List member net balances
GET    /api/v1/houses/{house_id}/debts                  List suggested repayments
POST   /api/v1/houses/{house_id}/settlements            Record a repayment
GET    /api/v1/houses/{house_id}/settlements            List repayments
```

Create an expense split between all current house members:
```bash
curl -X POST http://localhost:8000/api/v1/houses/<house-id>/expenses \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Internet bill",
    "description": "July",
    "amount_cents": 12000
  }'
```

Create an expense split between selected members:
```bash
curl -X POST http://localhost:8000/api/v1/houses/<house-id>/expenses \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dinner",
    "amount_cents": 6000,
    "participant_member_ids": [
      "<member-id-1>",
      "<member-id-2>"
    ]
  }'
```

The payer is derived from the authenticated user's house membership. Clients do
not send `paid_by_member_id` when creating an expense.

Suggested debts include member IDs and usernames:
```json
[
  {
    "from_member_id": "bob-member-id",
    "from_username": "bob",
    "to_member_id": "alice-member-id",
    "to_username": "alice",
    "amount_cents": 3000
  }
]
```

Record a settlement:
```bash
curl -X POST http://localhost:8000/api/v1/houses/<house-id>/settlements \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "from_member_id": "<debtor-member-id>",
    "to_member_id": "<creditor-member-id>",
    "amount_cents": 3000,
    "note": "cash"
  }'
```

For more detail, see `expenses_guide.txt`.

## Data Model

Core models:

- `User`: registered users and global app role.
- `House`: home profile with name, address, and room count.
- `HouseMember`: connection between users and houses, with `admin` or `member`
  role inside that house.
- `Event`: scheduled house event created by a house member.
- `Chore`: house task created by a user.
- `ChoreCompletion`: records a user completing a chore.
- `Expense`: shared purchase or bill paid by a house member.
- `ExpenseShare`: one member's owed share of an expense.
- `Settlement`: repayment from one house member to another.
- `TokenBlocklist`: revoked access or refresh tokens.

## Quality

Run Ruff:
```bash
uv run ruff check .
```

Compile check:
```bash
uv run python -m compileall app
```

## Key Files

```text
app/main.py                         FastAPI app
app/api/router.py                   API router registration
app/api/v1/auth.py                  Auth routes
app/api/v1/house.py                 House routes
app/api/v1/house_member.py          House member routes
app/api/v1/schemas/                 Pydantic request/response schemas
app/api/v1/utils/house_member.py    House membership lookup/permission helpers
app/core/security.py                Password hashing and JWT logic
app/core/settings.py                Env settings
app/db/models/                      SQLAlchemy models
alembic/versions/                   DB migrations
```
