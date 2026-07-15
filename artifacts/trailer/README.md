# Scribbits trailer

The master is a 30-second, 9:16 H.264 trailer assembled with ImageForce's
Remotion renderer from fresh captures of the live local game.

## Outputs

- `scribbits-trailer-first-cut-proper-drawing.mp4` — final 1080x1920 trailer with AAC audio
- `scribbits-trailer-first-cut-proper-drawing-contact-sheet.png` — visual review sheet
- `scribbits-trailer.imageforce.json` — editable ImageForce composition
- `gameplay/` — captured and trimmed real-game clips

## Rebuild

Start Scribbits and record Wobble Bean with real mouse strokes on the real game
canvas:

```sh
MOCK_SEEDED_SCRIBBITS=1 ./mock.command
node app/scripts/capture-trailer-real-drawing.mjs
```

Restart the mock with that exact exported drawing replacing the seeded trailer
fighter, then capture battle and Gallery:

```sh
MOCK_SEEDED_SCRIBBITS=1 \
MOCK_TRAILER_HERO_PATH=/Users/jasons/Github/Hackathon/scribbits/artifacts/trailer/gameplay/wobble-bean.png \
./mock.command
node app/scripts/capture-trailer-gameplay.mjs
```

Rebuild the composition:

```sh
node app/scripts/build-scribbits-trailer-project.mjs
```

The builder requires `draw-manual.mp4`, `home-manual.mp4`, and
`battle-wobble-bean.mp4`, and `gallery-wobble-bean.mp4`; there is no
old-character fallback. The final structure matches the first cut: hook, real
drawing, Home, battle, Gallery, and CTA.

Render through ImageForce:

```sh
cd /Users/jasons/Github/Components/ImageForce
node frontend/scripts/render-remotion-composition.mjs \
  /Users/jasons/Github/Hackathon/scribbits/artifacts/trailer/scribbits-trailer.imageforce.json \
  /Users/jasons/Github/Hackathon/scribbits/artifacts/trailer/scribbits-trailer-first-cut-proper-drawing.mp4 \
  /Users/jasons/Github/Hackathon/scribbits/artifacts/trailer/scribbits-trailer-first-cut-proper-drawing.render.json
```
