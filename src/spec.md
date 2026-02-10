# Specification

## Summary
**Goal:** Visually center the logo/text block within Help Center topic tiles and show the full topic title on hover without changing behavior.

**Planned changes:**
- Adjust CSS/layout in `frontend/src/pages/HelpCenter.tsx` so each Help Center tile’s top spacing is reduced to match the bottom spacing (content appears vertically centered).
- Add a lightweight, text-only hover tooltip on Help Center tiles to display the full `topic.topicName` without affecting layout or click behavior.

**User-visible outcome:** Help Center tiles look vertically centered, and hovering a tile reveals the full topic title while clicks continue to open the topic detail modal as before.
