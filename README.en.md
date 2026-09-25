# Fluid Lab · WebGL Fluid Simulation

[中文](README.md) · English

An interactive fluid playground built with React, Vite and TypeScript. Switch between Chinese and English instantly. The independent GPU engine preserves the original fluid solver, bloom, sunrays and PNG export.

## Quick start

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open the local address printed in the terminal. Click and drag, or draw with a finger. Press **P** to pause and **Space** for random splats. Use the top-right selector for Chinese/English. Preferences are stored locally.

## Technology choices

- **React** owns the interface and lifecycle integration.
- **Vite** provides development, hot reload, asset processing and static builds.
- **TypeScript** checks engine contracts, settings and translation keys. Its stable version is chosen for compatibility with the linting toolchain.
- **Native WebGL and GLSL** preserve the fullscreen 2D solver and WebGL 1 fallback. Three.js is reserved for a future requirement involving 3D scenes; the current solver does not need a scene graph.

See the bilingual [architecture guide](docs/architecture.md) for the rationale and `package-lock.json` for exact dependency versions.

## Project layout

```text
src/
  app/                 App composition, shortcuts and styles
  features/fluid/      Controls, presets, settings and engine hook
  engine/              Lifecycle, solver, postprocessing, input and capture
    webgl/             Context, programs, targets and GPU ownership
    shaders/           20 standalone GLSL shaders
  i18n/                Typed Chinese/English dictionaries
  shared/              Safe browser storage
  assets/              Bundled textures
public/                Static assets
tests/e2e/             Browser behavior, compatibility and production tests
docs/                  Architecture and development guides
wiki_memory/           State, decisions, knowledge, logs and validation
```

## Commands

| Command                                         | Purpose                                   |
| ----------------------------------------------- | ----------------------------------------- |
| `npm run dev`                                   | Development server                        |
| `npm run check`                                 | Type checking, lint, unit tests and build |
| `npm run format` / `npm run format:check`       | Format / verify formatting                |
| `npm run test:e2e`                              | Browser regression suite                  |
| `npm run test:production`                       | Test built assets under a subdirectory    |
| `npm run build` / `npm run preview`             | Build / local production preview          |
| `npm run memory:index` / `npm run memory:check` | Refresh memory index / validate memory    |

Install Chromium once using `npx playwright install chromium`. Memory tooling needs Python 3.10+. CI runs quality checks; deploy the contents of **`dist/`**, rather than serving the source repository directly. See [development and validation](docs/development.md).

## Runtime behavior

Settings update the existing engine. GPU targets are released when replaced; unmounting cleans up animation frames, events, textures and programs. Context restoration retains settings and generates a fresh fluid image. Missing linear filtering selects a compatibility path; unsupported devices receive a translated error.

Browser tests use Chromium software rendering and mobile emulation. They do not establish performance on physical devices or coverage in Safari/Firefox.

## Project memory

The [memory workspace](wiki_memory/README.md) follows the user-provided template, separating current facts from append-only task logs. Proposed long-term conclusions require confirmation before activation. Read [AGENTS.md](AGENTS.md) before changes. The original desktop template is untouched.

## Attribution and license

Based on [Pavel Dobryakov's WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation), under the original [MIT license](LICENSE).

- [GPU Gems: Fast Fluid Dynamics Simulation on the GPU](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu)
- [fluids-2d](https://github.com/mharrys/fluids-2d)
- [GPU Fluid Experiments](https://github.com/haxiomic/GPU-Fluid-Experiments)
