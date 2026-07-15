# Scribbits trailer

The master is a 30-second, 9:16 H.264 trailer assembled with ImageForce's
Remotion renderer from fresh captures of the live local game.

## Outputs

- `scribbits-trailer.mp4` — final 1080x1920 trailer with AAC audio
- `scribbits-trailer-contact-sheet.png` — visual review sheet
- `scribbits-trailer.imageforce.json` — editable ImageForce composition
- `assets/human-drawn-hero.png` — final hand-drawn hero used by the master
- `gameplay/` — captured and trimmed real-game clips

## Rebuild

Start the seeded Scribbits mock app:

```sh
MOCK_SEEDED_SCRIBBITS=1 \
MOCK_TRAILER_HERO_PATH="$PWD/artifacts/trailer/assets/human-drawn-hero.png" \
./mock.command
```

Capture the supporting gameplay:

```sh
node app/scripts/capture-trailer-gameplay.mjs
```

For the final master, record the creator drawing by hand. The script opens a
real browser, records the final five seconds of drawing, waits for the saved
Scribbit to reach Home, and creates both trailer-ready clips automatically:

```sh
node app/scripts/capture-trailer-manual-drawing.mjs
```

Rebuild the composition:

```sh
node app/scripts/build-scribbits-trailer-project.mjs
```

The builder prefers `draw-manual.mp4` and `home-manual.mp4` when present. Until
then it uses the automated Paper Spark clips as a preview fallback. The trailer
also includes the live Growing and Retired gallery so older Scribbits remain
part of the story.

Render through ImageForce:

```sh
cd /Users/jasons/Github/Components/ImageForce
node frontend/scripts/render-remotion-composition.mjs \
  /Users/jasons/Github/Hackathon/scribbits/artifacts/trailer/scribbits-trailer.imageforce.json \
  /Users/jasons/Github/Hackathon/scribbits/artifacts/trailer/scribbits-trailer.mp4 \
  /Users/jasons/Github/Hackathon/scribbits/artifacts/trailer/scribbits-trailer.render.json
```
