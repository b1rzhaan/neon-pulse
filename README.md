# NEON PULSE

Neon web arcade inspired by the classic Coloron mechanic. A memory sphere jumps
between signal towers; before each landing, the player must tune the next tower
to the sphere's color.

![NEON PULSE logo](./assets/neon-pulse-mark.png)

Play online: [https://b1rzhaan.github.io/neon-pulse/](https://b1rzhaan.github.io/neon-pulse/)

## Features

- Solo run and AI rival mode
- Three speed levels with acceleration after 10 successful towers
- An audible 3-2-1 opening countdown and evolving background every 10 towers
- Mobile controls and responsive HUD
- Custom menu soundtrack, three rotating in-game tracks, and gameplay sounds
- Local top-5 rating
- Animated tower signals, glass-shatter matched towers, and a reactive night scene

## Controls

- Tap or click a tower to cycle its color
- On mobile, use the `CYAN`, `AMBER`, and `VIOLET` buttons
- On keyboard, press `1`, `2`, or `3` to set the next tower color

## Run

This is a static web project. Open `index.html` through any static web server.

```bash
python -m http.server 4180
```

Then open `http://127.0.0.1:4180/neon-pulse/`.

## AI-Assisted Process

The product concept, UI iteration, game logic, mobile adaptation, visual
effects, and synthesized audio were developed with AI-assisted coding and
review during a one-day build sprint.
