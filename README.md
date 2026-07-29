# HouseHive

A full-stack app for managing household chores, members, events, and shared expenses.

## Stack

- **Frontend**: React + Vite, Redux Toolkit, Axios
- **Backend**: FastAPI + PostgreSQL, managed with [`uv`](https://docs.astral.sh/uv/), migrations via Alembic
- **Deployment**: Docker Compose (each side has its own `Dockerfile` and `docker-compose.yml`)

## Project structure

```
HouseHive/
├── backend/     # FastAPI + PostgreSQL API
└── frontend/    # React + Vite client
```

Each folder has its own `README.md` with setup details specific to that side of the app.

## Getting started

### Backend

```bash
cd backend
cp .env.example .env   # fill in your own values
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

### Frontend

```bash
cd frontend
cp .env.example .env   # fill in your own values
npm install
npm run dev
```

## Environment variables

Neither `.env` file is committed — copy the corresponding `.env.example` in each folder and fill in your own secrets (database credentials, JWT secret, API URLs, etc.) before running either side.
