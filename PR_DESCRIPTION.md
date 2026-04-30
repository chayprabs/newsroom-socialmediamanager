# Fix lavender seam in footer overlay output

## Summary

This PR fixes the Stage 4c footer seam by making the footer overlay step own the entire final canvas background.

- Creates a solid `#E8E6F5` lavender canvas at the exact export size before compositing.
- Resizes the AI image into the non-footer area using Lanczos, top-aligned, with the actual footer height reserved.
- Snaps near-lavender AI background pixels back to exact `#E8E6F5`, preventing subtle drift from forming a boundary line.
- Composites the transparent footer asset onto the lavender reserve and keeps the existing fallback footer path.
- Saves `runs/<runId>/debug/post_base_with_ai.png` before the footer is applied.

## Screenshots

Screenshots were generated from the same `post_raw.png` for run `ce6542d6-3fd3-46de-a0e0-9cc12b82897e`.

Before, using the old direct resize plus footer-band composite:

![Before footer seam](docs/screenshots/footer-overlay-before-seam-crop.png)

After, with the lavender base canvas and background normalization:

![After footer seam removed](docs/screenshots/footer-overlay-after-seam-crop.png)

Full-size references:

- `docs/screenshots/footer-overlay-before.png`
- `docs/screenshots/footer-overlay-after.png`

## Verification

- `npx vitest run tests/footerOverlay.test.ts`
- `npm test`
- `npx tsc --noEmit --pretty false`
- Fresh local pipeline run `ce6542d6-3fd3-46de-a0e0-9cc12b82897e` completed with `selected_chart_template: ranked_horizontal_bar` and `image_model: gpt-image-2`.
- Pixel check at footer boundary `y=1220`: before `[231,228,246,255] -> [232,230,245,255]`; after `[232,230,245,255] -> [232,230,245,255]`.
- `debug/post_base_with_ai.png` is 1080x1350 and has exact lavender rows at `y=1219` and `y=1220`.
- Missing-footer fallback remains covered by `tests/footerOverlay.test.ts`.
