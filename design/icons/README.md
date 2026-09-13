# Icons

Drop the artwork here and it gets wired into the app. **Upload straight to this folder on the
branch:**

<https://github.com/junutala/dubaisaathi/upload/claude/affectionate-bohr-ppyrd3/design/icons>

(GitHub's "Add file → Upload files" — drag all five in at once, commit to
`claude/affectionate-bohr-ppyrd3`, no pull request needed.)

## What is needed, and what to call it

Use these names and nothing has to be guessed about which icon is which tile. The extension can
be `.svg`, `.png`, `.jpg` or `.webp` — SVG is better if you have it, because it stays sharp on
every phone and costs nothing in the offline pack.

| File name          | Tile           | Where it shows                                             |
| ------------------ | -------------- | ---------------------------------------------------------- |
| `tile-transport.*` | रास्ता         | Home tile 1, the bottom bar, and the header crumb          |
| `tile-food.*`      | खाना           | Home tile 2, the bottom bar, and the header crumb          |
| `tile-talk.*`      | बोलना          | Home tile 3, the bottom bar, and the header crumb          |
| `tile-info.*`      | ज़रूरी जानकारी | Home tile 4, the bottom bar, and the header crumb          |
| `app-icon.*`       | the app itself | Home-screen icon when installed, browser tab, PWA manifest |

If the file names are awkward to change, upload them as they are and say which is which — the
names are a convenience, not a requirement.

## What happens to them

- **Tile icons** replace the four line glyphs in `apps/pwa/src/app/shell/icons.tsx` and the
  matching ones in `design/generate-screens.py`, so the artboards and the app stay in step.
  They appear at three sizes — 15px in the header crumb, 23px in the bottom bar, and larger on
  the home tiles — so anything with fine detail will need a simplified small form. If that is a
  problem I will say so rather than ship something illegible at 15px.
- **The app icon** becomes the PWA manifest icons at 192px, 512px and a 512px maskable variant
  (Android crops a circle out of it, so the important part must sit inside the middle 80%), plus
  the iOS `apple-touch-icon` at 180px. I generate those sizes from whatever you upload — one
  square image at 512px or larger, or an SVG, is enough.

Everything here is bundled into the app and precached by the service worker, so the icons work
with the network off like the rest of it (rule 1).

## The app icon needs a square source

If `app-icon.*` is not square, I will pad it rather than crop it, and tell you. A cropped logo
is worse than a padded one.
