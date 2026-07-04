# Scribbits — Creature Art Spec (Higgsfield → BG removal → game assets)

**Style anchor (append to every prompt):**
`chunky hand-drawn sticker art, one single creature centered, full body visible, bold confident dark ink outline, flat sherbet colors, paper-grain texture only inside the shape, plain solid white background, no shadow, no ground plane, no text, no watermark, charming doodle-come-alive game sprite`

**Per-creature prompts** (id → subject line; prepend subject, append anchor):

| id | subject |
|---|---|
| mosswhisk | a round mossy hamster creature with long grass-blade whiskers and a leaf cowlick |
| fernibble | a tiny rabbit-like sprout creature with unfurling fern-frond ears nibbling a leaf |
| barkbloom | a stubby log-bodied puppy creature with a pink flower blooming from its head |
| gladepuff | a floating dandelion-puff spirit creature with sleepy half-closed eyes |
| elderglen | a small wise stag creature with a miniature glowing tree growing between its antlers |
| coalimp | a chubby coal-lump imp creature with tiny flame eyebrows and a smug grin |
| cindercoil | a coiled ember salamander creature curled like a cinnamon roll with spark freckles |
| ashwaddle | a waddling ash-grey penguin-blob creature with little soot puffs around its feet |
| flintstag | an angular flint-stone goat creature with spark-striking hooves |
| solarkiln | a round tortoise creature with a glowing lava-mosaic kiln shell and calm smile |
| brinebutton | a tiny barnacle-button creature with one big friendly eye holding a bubble |
| kelpkit | a kitten creature made of flowing kelp ribbons with a seashell nose |
| pearlmote | a shy translucent oyster-wisp creature hugging a shiny pearl |
| coraloom | a gentle fawn creature with branching pastel coral antlers |
| moonurchin | a plump sea-urchin creature with crescent-moon spines and starry freckles |
| cloudpip | a mini cloud-chick creature with stubby wings and rosy cheeks |
| gustling | a swirling wind-puppy creature with a pinwheel tail mid-zoomies |
| ribbonrook | a bird creature made of looping paper ribbon tied into a bow shape |
| thunderbud | a grumpy flower-bud creature crackling with tiny lightning bolts |
| aurorawing | a serene moth-dragon creature with big aurora-gradient wings and trailing stardust |

**Pipeline per image:**
1. Generate: POST /higgsfield/generate (model nano_banana_2, aspect 1:1, 2k, wait)
2. BG remove: POST /remove-bg model=cartoon (isnet-anime — flat art w/ clear ink lines) → PNG
3. If halo/matte artifacts: alpha cleanup endpoint
4. Downscale to 512×512 (sips) — game asset budget ≤150KB/sprite
5. Save as app/public/creatures/creature-<id>.png

**QC bar (main model verifies):** real alpha channel, clean silhouette (no white fringe), single creature, on-style (ink outline + flat color), file ≤150KB, all 20 present, build passes.
