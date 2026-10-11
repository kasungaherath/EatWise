# EatWise app interface

The React and Vite frontend for EatWise. See the
[project README](../README.md) for features, local setup, environment
configuration, deployment, and security guidance.

From the repository root:

```sh
npm --prefix client ci
npm --prefix client run dev
```

For account features, start the backend separately as described in the project
README. The frontend uses `http://localhost:5000` by default; an ignored
`client/.env.local` can set a different public `VITE_API_URL`.

```sh
npm --prefix client run lint
npm --prefix client run build
```

The build output is `client/dist`. Production uses the root Dockerfile to build
the frontend with `VITE_API_URL=/` and serve it alongside the API.
