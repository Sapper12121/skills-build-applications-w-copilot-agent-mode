# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

The implementation should be layered in dependency order so each tier is validated before moving to the next.

- Presentation tier decision: Build the UI around route-level data fetching with a shared API client; render loading, empty, and accessible alert states per page and keep the page components thin by pushing server contract handling into the client layer.
- Logic tier decision: Keep Express handlers focused on validation, request parsing, and response shaping while delegating business rules to model-friendly service logic so the API contract and 4xx behavior stay consistent.
- Data tier decision: Use Mongoose schemas to enforce required fields and defaults, keep object references for users/teams/activities, and rely on idempotent seed data to populate representative fixtures without deleting unrelated records.
- Activity tracking approach: Require user/team references, valid activity type, minutes, points, and occurredAt; compute points from the activity input and persist both the canonical linked IDs and the timestamped event for leaderboard aggregation.
- Team management approach: Require a team name and mascot, default the members list to an empty array, and store member references as ObjectIds while exposing the member list in list/create responses.
- Leaderboard approach: Aggregate team totals from Activity records grouped by team, sum `points` descending, and assign a 1-based rank to each team result for stable ordering.
- Workout suggestions approach: Match a user by email, inspect recent activity patterns, and derive the suggestion focus from the user's goal or the majority activity type; return a concise reason referencing the pattern and maintain a deliberate 4xx for unknown emails.
- Safe implementation order: validate the data contracts first, then the API contract, and only then implement the presentation layer. Doing the work in this order prevents frontend changes from masking broken schema or endpoint behavior.

## Test plan

Run the checks in the same order as the architecture layers so each failure can be traced to the correct tier before moving on to higher-level features.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — validates Mongoose schema contracts and seed idempotency; failures here indicate missing required fields/defaults or broken seed data.
- API command: `npm run test:api --prefix octofit-tracker/backend` — validates endpoint semantics, validation status codes, leaderboard ordering, and workout suggestion matching; failures here point to Express route logic and business behavior rather than frontend rendering.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — validates route rendering, API consumption, loading states, empty states, and alert handling; failures here indicate the UI is not yet matching the expected contract for the backend responses.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — verifies TypeScript compilation and that the API/server code is structurally valid after the data and route changes.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — verifies the React app bundles cleanly and the presentation layer still compiles after API integration work.
- Validation rule: fix the lowest failing layer first; data failures must be resolved before API concerns, and API failures before frontend rendering problems, otherwise the tests can produce misleading failures.
