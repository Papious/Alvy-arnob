Implement only the ARNOB animation to mirror the provided GIF, without changing any other hero design.

Plan:
1. Replace the current ARNOB keyframe timing with a GIF-style loop:
   - ARNOB starts hidden above the headline in white.
   - It drops down quickly with a larger scale.
   - It bounces/settles into the normal baseline next to ALVY.
   - It stays white briefly.
   - It changes to gold after the hold.
   - It stays gold for the rest of the loop.
   - It resets cleanly and repeats.
2. Keep the existing hero typography, layout, spacing, ALVY styling, colors, and all other page design untouched.
3. Adjust only these CSS parts in `public/alvy-arnob-portfolio.html`:
   - `.hero-arnob`
   - the ARNOB keyframes
4. Tune the animation duration and keyframe percentages to more closely match the reference GIF rather than the current slower/incorrect motion.

Technical details:
- Use a single infinite `@keyframes arnobLoop` for movement, opacity, scale, and color.
- Make the drop happen early in the loop, keep the white hold short, then transition to `var(--gold)` and hold.
- Avoid changes outside the ARNOB animation block.