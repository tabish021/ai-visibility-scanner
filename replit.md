# Running on Replit

This imported app uses React, Vite, TypeScript, Tailwind CSS, and Express. Keep its existing structure and stack.

## Development

- Click Run to start the **Start application** workflow (`npm run dev`).
- Express listens on `0.0.0.0:5000` and serves the API and Vite frontend together.
- The frontend uses relative `/api` requests so it works through the Replit preview.
- Install dependencies with `npm install` (a package-lock.json is included).
- Check types with `npm run lint`; build the frontend with `npm run build`.

## Environment

No secrets or external services are required by the current scanner. Despite the original AI Studio README and `.env.example`, the code does not call Gemini or use `GEMINI_API_KEY` or `APP_URL`. It fetches the public website being scanned and evaluates its HTML and related files. Scans require outbound internet access, and target websites can block requests or time out.

`PORT` can override the default port. For production-style serving, first run `npm run build`, then run `NODE_ENV=production npm start`.
