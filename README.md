# ImageFitLab

ImageFitLab is a private, frontend-only image studio. It resizes, compresses, converts, rotates, flips, and adjusts images entirely in the browser using the Canvas API.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Deploy with Vercel

1. Create a GitHub repository and push this project.
2. In Vercel, select **Add New → Project** and import the repository.
3. Vercel detects Vite automatically. Keep the defaults:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Select **Deploy**.

No environment variables or backend services are required.
