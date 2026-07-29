# House Hive Frontend

The House Hive frontend is a React application built with Vite. It uses Redux Toolkit for application state, React Router for navigation, Axios for API requests, and Lucide for icons.

## Requirements

- Node.js 18 or newer
- npm
- A running House Hive API
- Docker, if running the frontend in a container

## Install

Install project dependencies:

```bash
npm install
```

If Lucide has not already been added to the project:

```bash
npm install lucide-react
```

## Environment variables

Create a `.env` file in the frontend root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Vite exposes only environment variables beginning with `VITE_` to browser code. Do not put secrets in this file.

## Run locally

```bash
npm run dev
```

Open the address printed by Vite. This project configures Vite to use `http://localhost:3000`.

## Run with Docker

Build the production image:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=http://localhost:8000 \
  -t house-hive-front .
```

Run the container:

```bash
docker run --rm -p 3000:80 house-hive-front
```

Open `http://localhost:3000`.

You can also use Docker Compose:

```bash
docker compose up --build
```

Override the API URL or frontend port when needed:

```bash
VITE_API_BASE_URL=http://localhost:8000 FRONTEND_PORT=3000 docker compose up --build
```

`VITE_API_BASE_URL` is a Vite build-time variable, so changing it requires rebuilding the Docker image.

## API client

Set Axios’s base URL from the environment variable:

```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})
```

API functions include the `/api/v1` prefix:

```js
api.get('/api/v1/auth/me')
api.post('/api/v1/auth/login', credentials)
```

## Scripts

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run preview  # Preview the production build locally
```

## Notes

- Use React Router’s `<Link>` or `navigate()` for internal navigation.
- Keep `.env` out of version control; commit a `.env.example` containing only non-secret placeholder values.
