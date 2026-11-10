# UI inspection

Measured with headless Chromium (Playwright) against https://eranos.vercel.app on 10 Nov 2026, by `scripts/inspect-ui.mjs`. Raw output: [ui-inspection.json](ui-inspection.json). Screenshots: `docs/images/`.

What the script checks on every page at 1440x900 and 390x844 (scrolled step by step so scroll reveals have fired):

- every font face the design uses is loaded from this origin (no system fallback for the headline or body),
- no horizontal overflow, and no element wider than the viewport outside the marquee and scrollable tables,
- every SVG with a role (the hero scene, the membership diagram, ornaments) sits fully inside the viewport,
- on the landing page the headline's real text extent (not its block box) does not overlap the hero scene,
- no broken images.

Fonts: headline and display text compute to Bricolage Grotesque, body to Hanken Grotesk, quotes and accents to Instrument Serif, addresses and memory lines to JetBrains Mono. All four are self-hosted woff2 files in `public/fonts`.

| Size | Page | Height (px) | Overflow (px) | Elements wider than viewport | SVGs inside viewport | Fonts | Broken images |
|---|---|---|---|---|---|---|---|
| desktop | landing | 6304 | 0 | 0 | yes | all loaded | 0 |
| desktop | app | 1150 | 0 | 0 | yes | all loaded | 0 |
| desktop | circle | 2124 | 0 | 0 | yes | Instrument Serif not used on this page | 0 |
| desktop | memory | 1795 | 0 | 0 | yes | all loaded | 0 |
| desktop | join | 1344 | 0 | 0 | yes | all loaded | 0 |
| desktop | stewards | 1016 | 0 | 0 | yes | all loaded | 0 |
| desktop | proof | 6080 | 0 | 0 | yes | all loaded | 0 |
| desktop | judge | 1727 | 0 | 0 | yes | all loaded | 0 |
| mobile | landing | 10820 | 0 | 0 | yes | all loaded | 0 |
| mobile | app | 1676 | 0 | 0 | yes | all loaded | 0 |
| mobile | circle | 3605 | 0 | 0 | yes | Instrument Serif not used on this page | 0 |
| mobile | memory | 3126 | 0 | 0 | yes | all loaded | 0 |
| mobile | join | 1769 | 0 | 0 | yes | all loaded | 0 |
| mobile | stewards | 1399 | 0 | 0 | yes | all loaded | 0 |
| mobile | proof | 6896 | 0 | 0 | yes | all loaded | 0 |
| mobile | judge | 2705 | 0 | 0 | yes | all loaded | 0 |

Instrument Serif is reported as not loaded on the circle page because that page uses no italic accent text, so the browser never requests the file.

## SVG placement, landing page, desktop

| SVG | Position (x, y) | Size | Result |
|---|---|---|---|
| A ring of circle members seen in perspec | 706, 205 | 649 x 467 | inside the viewport |
| Three stewards own the circle's memory a | 763, 3654 | 524 x 309 | inside the viewport |

## Other automated gates

- Playwright responsive suite on 7 viewports (375x812, 390x844, 412x915, 768x1024, 1024x768, 1440x900, 1920x1080) times 8 pages: no horizontal scroll, navbar inside the viewport, buttons at least 44 px tall on touch sizes, headline clear of the ring, zero console errors, axe-core WCAG 2.2 AA with no violations, plus a reduced-motion render.
- Wallet flow on the deployed site with an injected Wallet Standard test wallet: connect, derive memory key, disconnect with the power icon, a non-member refusal, and a real payment from the browser.

## What the inspection found and what changed

- Scroll reveals did not fire when a screenshot jumped straight to the page bottom. The script now scrolls in steps.
- The memory card inside the dark band rendered as translucent grey with pale text. It is now solid white with dark text.
- Headings sat tight against the card grids below them. A sibling spacing rule fixed it.
- Axe found a colour contrast of 3.62 on green status text and an unlabelled landmark. The green was darkened and the marquee became a labelled region.
- The animated headline split words into spans with no space characters, so copied text read "Savetogether.". Real spaces are now rendered.
- The faint outer ring of the hero scene touched the end of the headline's second line. The scene was moved right and the overlap check now measures text extents.
