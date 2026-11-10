# DESIGN

**Concept: the circle is the vault.** One ring of members seen in perspective, like a coin bowl from above. Each member is a bead. Paid beads fill violet, the bead whose turn it is glows ember. Threads run from paid beads to the centre, and one brighter thread from the centre to the bead that draws. The same image is the logo, the hero, the circle page and the loading state.

Tone: an editorial money magazine, calm and plain. Blockchain stays out of the person's screens. Digests and explorer links live on `/proof` and in small "verify" links.

## Tokens
paper `#FBFAFF`, vellum `#F3F0FF`, ink `#16112B`, violet `#5B3DF5`, amethyst `#2A1A7A`, lilac `#C9BCFF`, tide `#4DA2FF` (one verified state per view), ember `#FF8A3D` (your turn, nothing else), mist `#6F6990` (secondary text, darkened from the brief's `#8B85A6` to pass WCAG AA contrast).

## Type
Zodiak for headlines and large numerals, General Sans for interface and body, Geist Mono for amounts, digests and memory lines. All three are self-hosted in `public/fonts`, licences in `public/fonts/LICENSES.md`. Scale 12, 14, 16, 20, 28, 40, 64, 96.

## Mark and motion
Mark: ten beads on a ring with one bead filled ember (`public/art/mark.svg`). Hero background: woven violet gradient with soft vertical light folds (`public/art/folds.svg`). Cards carry a cursor glow (a radial lilac gradient following the pointer). The ember bead breathes on a 4 second cycle. Everything stops under `prefers-reduced-motion`.

## Navigation
A floating square capsule bar (radius 14, blurred paper at 72 percent, lilac hairline). Connect wallet on the right. When connected it shows a ring avatar, short address, USDC balance read through Tatum, and a power icon that disconnects. On phones the links move into a full-height sheet and Connect wallet sits at its foot.

## Refusal and waiting states
Designed, never blank: "Reading the circle through Tatum", "This wallet is not a member", "Tatum fallback active, reading from the public Sui node", "waiting for member N to confirm".
