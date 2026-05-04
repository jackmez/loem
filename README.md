# LOEM Site

Static Vite site for the LOEM brand intro and brand story experience.

## Pages

- `/` - animated brand intro with scroll-driven canvas composition.
- `/brand-story` - brand story page with parallax scenes, collection icons, and video sections.
- `/lookbook` - lookbook shell.

## Local Development

```sh
npm install
npm run dev
npm run build
npm run preview
```

The dev server runs on `http://127.0.0.1:5173`.

## Deployment

The project is configured for Vercel as a Vite site. Production builds use `npm run build` and publish the `dist` directory.

## Assets

Public media and fonts live under `public/assets`. Reference public files with absolute lowercase paths, for example `/assets/brand/Wordmark.svg` or `/assets/fonts/TestMartinaPlantijn-Light.otf`.

Parked visual references live under `references/images` so they are not copied into production builds.

Asset folders are grouped by role:

- `brand` - logos, marks, and brand graphics.
- `cursors` - custom cursor artwork.
- `fonts` - served font files.
- `icons/product-ranges` - collection and product-range icons.
- `images/landing` - landing page imagery.
- `images/brand-story` - brand story imagery.
- `videos/landing` and `videos/brand-story` - page-specific motion assets.

## Future Sections

Look Book and Brand in Action are visible placeholders for future destinations. They should remain non-navigating until real pages or routes exist.
