# Agent Notes

This file is for coding agents working on the LOEM site. Keep it current when project structure, commands, navigation, or asset conventions change.

## Project Shape

LOEM is a static Vite site. There is no React app or router in the current production path.

Pages:

- `index.html` - animated landing page with scroll-driven canvas cards.
- `brand-story.html` - editorial brand story page with parallax scenes and videos.
- `lookbook.html` - blank Lookbook shell with shared navigation/footer.

Build inputs are configured in `vite.config.js`. If a new top-level HTML page is added, add it there too.

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
```

The dev server is configured for `http://127.0.0.1:5173`.

Always run `npm run build` after code changes. Run `git diff --check` before handing off.

## File Layout

- `styles/landing.css` - landing page styles.
- `styles/brand-story.css` - Brand Story and Lookbook styles.
- `styles/shared/` - shared CSS modules, currently cursor and footer.
- `scripts/landing.js` - landing page runtime and canvas animation loop.
- `scripts/landing/` - landing constants and pure utilities.
- `scripts/brand-story.js` - Brand Story and Lookbook runtime.
- `scripts/shared/` - shared JavaScript modules.
- `public/assets/` - served fonts, images, SVGs, videos, and textures.
- `references/images/` - parked visual references that should not be copied into production builds.

Reference public assets with absolute paths like `/assets/brand/Wordmark.svg`.

## Navigation

The nav is intentionally stable across non-home pages:

- Left: Brand Story
- Center: LOEM wordmark, linked to `/`
- Right: Lookbook

Public navigation uses clean URLs: `/`, `/brand-story`, and `/lookbook`. Vercel serves these via `cleanUrls`; local Vite dev and preview use the clean-route middleware in `vite.config.js`.

Do not move nav items around to indicate the current page. Use the current/selected state only.

The home page has its own top chrome and final-action links. The Forpeople footer is intentionally not shown on the home page.

## Motion And Performance Notes

The landing page animation is sensitive. Preserve the existing scroll-snap behavior unless intentionally testing a motion change.

Key landing details:

- Motion's vanilla `animate()` API drives eased scroll state.
- The canvas render loop remains in `scripts/landing.js`.
- Retina support is intentional via `window.devicePixelRatio`.
- Avoid adding expensive per-frame image processing, layout reads, or DOM writes inside the canvas frame loop.
- Cursor behavior is shared, but landing uses cursor position to add subtle camera wobble.

## Footer

Brand Story and Lookbook share a non-sticky footer with the Forpeople logo and `© 2026`.

The logo asset lives at:

- `public/assets/brand/forpeople.svg`

The footer link opens:

- `http://forpeople.com/`

## Style Conventions

- Keep CSS and JavaScript split out of HTML.
- Keep asset paths lowercase at the folder level under `public/assets`.
- Prefer small shared modules only when they reduce real duplication.
- Do not reintroduce React unless the project direction changes.
- Use `apply_patch` for manual edits when working as Codex.

## Handoff Checklist

Before handing work back:

```sh
npm run build
git diff --check
git status --short
```

Mention any checks that could not be run.
