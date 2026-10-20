# Film Diary

A Letterboxd-inspired web app for discovering movies, recording ratings and reviews, and keeping a personal watchlist. Movie metadata and artwork come from The Movie Database (TMDB) public API.

**[Open the live app](https://film-diary-ei08sh0ff-yangaveryxs-projects.vercel.app/)**

## Features

- Browse popular movies and search by title.
- View film details, including synopsis, genres, runtime, director, and cast.
- Register and sign in with an email address and password.
- Rate films from 1–5 stars and write reviews.
- View your diary, edit or delete your reviews, and manage your watchlist.
- Read other users’ reviews on movie pages.

## Tech stack and architecture

| Layer | Technologies | Responsibility |
| --- | --- | --- |
| Frontend | React 18, TypeScript/TSX, React Router 7, CSS | Movie discovery, film pages, authentication screens, and profile UI |
| Build tooling | Vite 5 | Frontend development server and production bundle |
| Backend | Node.js, Express 4, CORS, dotenv | REST API, TMDB requests, token verification, and database access |
| Authentication | Firebase Authentication, Firebase Admin SDK | Email/password accounts and server-side ID-token verification |
| Database | Cloud Firestore | Persistent `reviews` and `watchlist` collections |
| Movie data | TMDB API v3 and image service | Movie metadata, credits, posters, and backdrops |
| Deployment | Vercel frontend; Google Cloud Run backend; Docker | Hosted client and containerized server |

The browser signs in through Firebase Authentication and calls the Express API. For writes, it sends a Firebase ID token in the `Authorization: Bearer <token>` header. Express verifies the token using Firebase Admin, accesses Firestore, and proxies movie requests to TMDB using a server-side bearer token. Movie images load directly from TMDB’s image service.

Reviews and watchlists are read through the backend. Read endpoints are public; write endpoints require authentication. Review edits and deletions check ownership. Watchlist deletion uses the authenticated user’s ID, even though the route also contains a `userId` parameter.

### Project structure

```text
src/
  pages/             Home, movie details, profile, and login screens
  components/        Shared UI components
  auth/firebase.ts   Firebase client configuration and authentication
  constants/api.ts   Backend API base URL
  utils/api.ts       API requests and authentication headers
  App.tsx            Client routes and navigation
  styles.css         Application styles
server/
  index.js           Express routes, TMDB integration, and static serving
  firebase.js        Firebase Admin initialization
.env.example         Example environment configuration
vite.config.ts       Frontend build configuration (src → dist)
Dockerfile           Builds the client and runs the Express server
deploy.sh            Google Cloud Run deployment script
```

## Run locally

### 1. Install dependencies

Use Node.js 22 or newer and npm. Run commands from the repository root:

```bash
npm ci
cp .env.example .env
```

### 2. Configure Firebase and TMDB

1. Create a Firebase project and register a web app. Copy its Firebase configuration into the `VITE_FIREBASE_*` variables in `.env`.
2. Enable **Email/Password** in Firebase Authentication and create a **Cloud Firestore** database in the same project. Ensure `localhost` is an authorized Authentication domain for local development.
3. Generate a Firebase Admin service-account JSON key from your Firebase project settings and save it as **`server/service_account.json`**. The current server loads this exact file; an environment variable alone does not replace it. The account needs access to the project’s Firestore database.
4. Obtain a TMDB **API Read Access Token** from your [TMDB API settings](https://www.themoviedb.org/settings/api), and set `TMDB_TOKEN` to the token value without the `Bearer ` prefix. See [TMDB application authentication](https://developer.themoviedb.org/docs/authentication-application).
5. Change `VITE_API_BASE` in `.env` to `http://localhost:8080/api`. The example file points to the hosted backend.

Keep `.env` and `server/service_account.json` private; both are covered by the repository’s ignore rules. Variables prefixed with `VITE_` are exposed to the browser. Never put the TMDB token or service-account credentials in those variables.

### 3. Start the backend and frontend

In one terminal:

```bash
npm run dev
```

This starts Express with nodemon at `http://localhost:8080`.

In a second terminal:

```bash
npm run client:dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Both processes must be running. Restart Vite after changing `.env`.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain, such as `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID; use the same project as the Admin service account |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket from the Firebase web config; the app currently has no file-upload feature |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID from the Firebase web config |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_API_BASE` | Backend base URL, including `/api`; defaults to `http://localhost:8080/api` if unset |
| `TMDB_TOKEN` | Server-only TMDB API Read Access Token |
| `PORT` | Optional Express port; defaults to `8080`. Update `VITE_API_BASE` if you change it locally |

Vite reads the root `.env` during development and builds. The Express server also reads it through dotenv. When Express serves the frontend itself, it injects the Firebase client configuration into the page at runtime. `VITE_API_BASE` is still a frontend build-time setting.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the backend with automatic restart |
| `npm start` | Run the backend without nodemon |
| `npm run client:dev` | Start the Vite development server |
| `npm run client:build` | Build the frontend into `dist/` |
| `npm run client:preview` | Preview the built frontend; the backend must run separately |

`npm start` does not build the frontend. Express expects static files in `public/`, while Vite outputs to `dist/`. The Dockerfile copies the build into `public/` automatically. For a local frontend preview, use `npm run client:build` followed by `npm run client:preview`, alongside the backend.

## API reference

All paths below are relative to `/api`. Requests and responses use JSON. Protected requests require `Authorization: Bearer <Firebase ID token>`.

| Method | Endpoint | Authentication | Purpose / request body |
| --- | --- | --- | --- |
| GET | `/movies/search?q=title` | Public | Search movies by title |
| GET | `/movies/popular` | Public | Get popular movies |
| GET | `/movies/:id` | Public | Get movie details and credits |
| GET | `/reviews/:movieId` | Public | Get a movie’s reviews |
| GET | `/users/:userId/reviews` | Public | Get a user’s diary entries |
| POST | `/reviews` | Required | Create a review: `movieId`, `rating`; optional `movieTitle`, `reviewText`, `poster` |
| PUT | `/reviews/:reviewId` | Owner only | Update `rating` and optional `reviewText` |
| DELETE | `/reviews/:reviewId` | Owner only | Delete a review |
| GET | `/watchlist/:userId` | Public | Get a user’s watchlist |
| POST | `/watchlist` | Required | Add `movieId`; optional `movieTitle`, `poster` |
| DELETE | `/watchlist/:userId/:movieId` | Required | Remove a movie from the authenticated user’s watchlist |

Use TMDB movie IDs as strings for review and watchlist requests, matching the client. The server prevents duplicate reviews and duplicate watchlist entries for the same user and film. Collection responses use `{ results: [...] }`, `{ reviews: [...] }`, or `{ watchlist: [...] }`; movie details return a single object. Errors return `{ error: "..." }` with an HTTP status code.

Example public request:

```bash
curl 'http://localhost:8080/api/movies/search?q=Inception'
```

The backend calls these TMDB v3 endpoints at `https://api.themoviedb.org/3`:

- `/search/movie` for title searches.
- `/movie/popular` for discovery.
- `/movie/:id?append_to_response=credits` for details and credits.

Search and popular-movie requests currently fetch only page 1 in English (`en-US`). Posters use `https://image.tmdb.org/t/p/w500`; backdrops use the `w1280` image size.

## Deployment notes

The live frontend is hosted on Vercel. For a separate frontend deployment, build with `npm run client:build`, publish `dist/`, set the frontend’s `VITE_*` variables before building, and configure a single-page-app fallback to `index.html` for client routes.

The included Dockerfile packages Express and the built client together. `deploy.sh` deploys the source to Google Cloud Run as `film-diary` in `us-central1`, using the active Google Cloud project. It requires the Google Cloud CLI and a project configured for Cloud Run builds. Configure backend environment variables and securely supply the required service-account file at `server/service_account.json`; the script does not provision Firebase or TMDB credentials. The checked-in Dockerfile currently uses Node 18, so update its base image before relying on the Node 22+ setup described above in a container.

## Credits

Movie metadata, cast and crew information, posters, and backdrops are provided by [The Movie Database (TMDB)](https://www.themoviedb.org/) public API. Thank you to TMDB and its contributors.

> This product uses the TMDB API but is not endorsed or certified by TMDB.

See the [TMDB API documentation](https://developer.themoviedb.org/docs/getting-started) and [attribution guidelines](https://developer.themoviedb.org/docs/faq).
