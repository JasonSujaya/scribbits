# Scribbits Remotion Intro Trailer

## Objective

Create one fast, polished **18-second vertical trailer** that explains the real
Scribbits hook without a voice-over:

> Draw a Scribbit. Watch it fight.

The trailer should feel handmade, playful, and energetic rather than like a
generic fantasy-game ad. It must use the real game art and real UI as its source
of truth.

## Creative direction: From Line to Legend

- Format: 1080 x 1920, 30 fps, H.264 MP4
- Length: 18 seconds / 540 frames
- Rhythm: a new visual idea every 1.5-3 seconds
- Typography: one short headline at a time
- Palette: cream paper, black ink, warm red, teal, and yellow
- Motion: pencil wipes, paper snaps, elastic character pops, quick battle hits
- Audio: handmade four-note motif, pencil taps, page flicks, handclaps, and
  compact fight impacts

## Beat sheet

| Time | Beat | Visual | On-screen copy |
| --- | --- | --- | --- |
| 0.0-2.0s | The empty page | Cream paper opens with two pencil lines and small ink dots. | `EVERY LEGEND STARTS AS A LINE.` |
| 2.0-4.6s | Draw | A real Draw-screen crop zooms forward, showing Stormpuff being drawn. | `DRAW IT.` |
| 4.6-7.4s | Come alive | Mossmop, Looplet, and Stormpuff pop in with paper shadows. | `IT WAKES UP.` |
| 7.4-11.4s | Fight | The real battle screen pushes forward with a compact fight card. | `EVERY SHAPE FIGHTS DIFFERENT.` |
| 11.4-14.0s | Grow | A diagonal two-shot shows a gear battle effect and the open Mystery Ink Chest. | `GEAR UP. GROW.` / `LEAVE A MARK.` |
| 14.0-18.0s | Brand close | The real logo, three Scribbits, tagline, and CTA settle on clean paper. | `DRAW A SCRIBBIT. WATCH IT FIGHT.` / `DRAW TODAY` |

## Existing assets to use

### Shipped game art

- `app/src/client/assets/scribbits-logo.png`
- `app/src/client/assets/scribbits-stage.png`
- `app/src/client/assets/splash-doodle-mossmop.png`
- `app/src/client/assets/splash-doodle-looplet.png`
- `app/src/client/assets/splash-doodle-stormpuff.png`
- `app/src/client/assets/ui-fight-start.png`

### Real gameplay proof

- `artifacts/screenshots/scribbits-untimed-tool-stormpuff.jpg`
- `artifacts/screenshots/scribbits-clean-battle-header.png`
- `artifacts/screenshots/gear-red-star-blade-volley-live.png`
- `artifacts/screenshots/scribbits-shop-generated-chest-open.png`

## Asset gaps

1. **Music:** the repo contains the `Drawn Alive` direction but no authored
   audio file. Use an 18-second instrumental cut if a chosen take exists;
   otherwise create a compact original four-note motif with paper/pencil SFX.
2. **No new canonical characters are needed for the first cut.** The three
   transparent fallback Scribbits and real player drawings are more truthful to
   the product than unrelated polished mascots.
3. GPT Image is reserved for trailer-only support art if the first contact
   sheet proves a real gap, such as a cleaner paper-tear overlay or one
   non-canonical hero pose. Generated art must not become a parallel runtime
   character system.

## Remotion implementation

1. Add a small project-specific generator under Scribbits, modeled on
   ImageForce's `frontend/scripts/render-imageforce-ads.mjs`.
2. Embed only the selected PNG/JPG files as image data URLs and keep the project
   below ImageForce's 50 MB composition limit.
3. Build six Remotion pages using `image`, `text`, and `shape` elements.
4. Use ImageForce motion presets for entrances and explicit keyframes for
   character lunges, wobble, camera push, hit shake, and logo settle.
5. Render through:

   ```bash
   node frontend/scripts/render-remotion-composition.mjs \
     /absolute/path/scribbits-intro.project.json \
     /absolute/path/scribbits-intro.mp4 \
     /absolute/path/scribbits-intro.render.json
   ```

6. Save final outputs under `artifacts/trailer/`:
   - `scribbits-intro-vertical.mp4`
   - `scribbits-intro-contact-sheet.png`
   - `scribbits-intro.project.json`
   - `scribbits-intro.render.json`

## Quality gates

- The hook is understandable with sound off.
- The first creature appears before 5 seconds and the fight starts before 8 seconds.
- No text card contains more than seven words.
- Copy and mechanics match the real game; no synchronous PvP or fake gameplay is implied.
- Logo and final CTA remain readable at a 320-pixel-wide preview.
- The video has no black frames, clipped text, stretched screenshots, or baked checkerboards.
- Review the full MP4 plus a contact sheet before calling it finished.

## Done means

One verified 1080 x 1920 MP4 exists in `artifacts/trailer/`, its render metadata
matches 30 fps and 18 seconds, its contact sheet shows a clear six-beat story,
and the final frame holds the Scribbits logo and `DRAW TODAY` cleanly.

## Completed proof

- Reusable generator: `scripts/render-intro-trailer.mjs`
- Final video: `artifacts/trailer/scribbits-intro-vertical.mp4`
- Review contact sheet: `artifacts/trailer/scribbits-intro-contact-sheet.png`
- Render/proof manifests: `scribbits-intro.render.json` and
  `scribbits-intro-proof.json`
- The encoded MP4 was decoded at six timestamps with AVFoundation. All six
  frames were readable, correctly oriented, and visually clean.
- `ffprobe` confirmed H.264 video at 1080 x 1920 and 30 fps, AAC stereo audio at
  48 kHz, and an 18.048-second file duration.
