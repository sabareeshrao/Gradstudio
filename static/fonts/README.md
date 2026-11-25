# Bundled UI fonts

GradStudio bundles the Latin subsets it already requested from Google Fonts so production rendering and visual-regression tests do not depend on a third-party request or operating-system fallback fonts.

- `inter-latin-400-900.woff2`: Inter variable font, normal, weights 400–900, Google Fonts `inter` v20 Latin subset.
- `jetbrains-mono-latin-700-800.woff2`: JetBrains Mono, normal, weights 700–800, Google Fonts `jetbrainsmono` v24 Latin subset.
- `INTER-OFL.txt` and `JETBRAINS-MONO-OFL.txt`: upstream SIL Open Font License files from the corresponding `google/fonts` directories.

The CSS owners are the two `@font-face` declarations at the beginning of `static/gradstudio-learn-demo.css`. Do not replace these files without updating the licenses, browser baselines, integrity checks, and this provenance record in the same change.
