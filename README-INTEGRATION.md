# Hand Cricket — KhelGhor Integration Package

This package contains only the Hand Cricket feature code and its direct supporting modules. It intentionally excludes Shadow Detective source/data, other KhelGhor games, host application files, node_modules, build output, environment secrets, and runtime player databases.

## Included
- React Hand Cricket screens and components (`src/handcricket/`)
- Gesture registry for 1A–6C
- Cricket engine and deterministic AI
- Express room manager and game statistics manager
- Hand Cricket TypeScript types and sound utility
- Hand Cricket tests
- Official Hand Cricket game logo (`assets/hand-cricket-logo.png`)

## Important integration notes
- This is a feature module, not a complete replacement KhelGhor app.
- Integrate into the **current main KhelGhor project**, not the older remix copy used to develop Hand Cricket.
- Do not overwrite the main app's `App.tsx`, `server.ts`, package manifest, global CSS, routing, authentication, or shared types wholesale.
- Merge imports, routes, dependencies, and navigation surgically after auditing the current main project.
- Active multiplayer rooms are held in Node process memory; production multi-instance deployment needs sticky sessions or shared pub/sub. Career and game stats use JSON file persistence in the supplied manager and may need durable storage on serverless/ephemeral hosting.
- Do not import any `handcricket-data.json` or `game-stats.json` from the development remix; those are runtime data, not source code.

## Logo
Use `assets/hand-cricket-logo.png` as the Hand Cricket game icon/branding asset. Do not replace the main KhelGhor official platform logo with it. Preserve aspect ratio; avoid stretching or cropping important artwork.
