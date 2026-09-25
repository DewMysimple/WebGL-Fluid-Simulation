# 架构说明 / Architecture

[中文说明](../README.md) · [English guide](../README.en.md)

## 技术选择 / Technology choices

本项目采用 React 19 + Vite 8 + TypeScript 6 + 原生 WebGL/GLSL。React 负责界面，GPU 模拟完全独立。它是单页面、无后端的实时画布，不需要服务端渲染、路由或远程数据缓存，因此选择 Vite 的客户端构建方式。React 官方提供了 [Vite + TypeScript 的独立应用入口](https://react.dev/learn/build-a-react-app-from-scratch)。

The project uses React 19, Vite 8, TypeScript 6 and native WebGL/GLSL. React owns the interface; a separate imperative engine owns the simulation. A client-only build fits this single-screen application without server data or routing. TypeScript stays on the stable 6.0 line supported by the installed typescript-eslint toolchain; the lockfile records exact versions.

Three.js 适合三维场景、相机、网格和材质管理。本项目现有算法全部是全屏二维纹理计算，引入场景抽象不能消除流体求解器或 GLSL 的维护成本，还会改变兼容范围：当前 [Three.js WebGLRenderer 需要 WebGL 2](https://threejs.org/docs/pages/WebGLRenderer.html)。因此本次保留 WebGL 1 的回退能力。未来需要三维物体与流体交互时，再增加独立适配器，并明确纹理与上下文的所有权。

Three.js remains a future option for a real 3D requirement. The present solver consists of fullscreen texture passes, so keeping native WebGL preserves its algorithms and WebGL 1 fallback without an additional scene abstraction. WebGPU would require a separate implementation and compatibility validation; it is not introduced in this migration.

## 依赖方向 / Dependency direction

```text
src/main.tsx
  └─ app/App.tsx
       ├─ i18n/useLocale → messages + shared/storage
       ├─ features/fluid/Controls → engine/config
       ├─ features/fluid/settings → engine/config + shared/storage
       └─ features/fluid/useFluidEngine
            └─ engine/FluidEngine
                 ├─ input + config + math
                 ├─ solver → WebGL Device + GLSL
                 ├─ renderer → WebGL Device + GLSL
                 └─ capture → RGBA8 target → PNG Blob
```

| 层 / Layer            | 职责 / Responsibility                                                    | 修改入口 / Entry            |
| --------------------- | ------------------------------------------------------------------------ | --------------------------- |
| 应用 / App            | 页面结构、快捷键、下载 / Composition, shortcuts, download                | `src/app/App.tsx`           |
| 功能 / Feature        | 参数、预设、React 生命周期 / Controls, preferences, lifecycle            | `src/features/fluid/`       |
| 引擎 / Engine         | RAF、能力回退、事件、上下文恢复 / RAF, capabilities, events, restoration | `src/engine/FluidEngine.ts` |
| 求解 / Solver         | 涡旋、压力、投影、平流 / Vorticity, pressure, projection, advection      | `src/engine/solver.ts`      |
| 显示 / Renderer       | 明暗、辉光、光束、透明显示 / Shading, bloom, sunrays, composition        | `src/engine/renderer.ts`    |
| GPU 资源 / Resources  | 程序、纹理、帧缓冲、几何 / Programs, textures, FBOs, geometry            | `src/engine/webgl/`         |
| 多语言 / Localization | 类型约束词典、语言检测和持久化 / Typed dictionaries and persistence      | `src/i18n/`                 |

## 帧管线 / Frame pipeline

1. Resize the drawing buffer if CSS dimensions or device pixel ratio changed; cap DPR at 2.
2. Coalesce pointer events and inject velocity/color splats.
3. Unless paused: curl → vorticity confinement → divergence → pressure decay → Jacobi pressure iterations → gradient subtraction → velocity advection → dye advection.
4. Apply optional bloom and sunrays, then composite onto the canvas.

模拟和染料分别使用 ping-pong 双帧缓冲，避免读写同一纹理。帧步长限制到 1/60 秒，后台标签页停止 RAF。所有 GPU 计算都在引擎内；React 仅在参数、语言或状态改变时更新。

Velocity and dye use separate ping-pong targets. Timestep is capped at 1/60 second. Hidden tabs stop the loop. Per-frame GPU state never enters React state.

## 生命周期与失败处理 / Lifecycle and failure handling

- `useFluidEngine` mounts one engine per canvas and disposes it during cleanup, including React StrictMode and hot reload.
- `Device` owns allocated programs, targets and buffers. Resizing copies the readable dye/velocity state into replacement targets and releases the previous targets.
- Shader compilation and framebuffer validation failures report typed errors and release partial allocations.
- Context loss stops work; context restoration rebuilds GPU resources using the selected settings. The previous fluid image cannot survive context loss and is replaced by fresh splats.
- WebGL 2 is preferred. WebGL 1 needs renderable half-float textures. Missing linear filtering selects manual bilinear advection and disables lighting effects.
- Screenshot capture uses an RGBA8 target and byte readback, independent of float readback support. Transparent PNG output flips rows and unpremultiplies alpha.

这些边界遵循 [WebGL 资源管理与能力检测建议](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)。

## 新增功能 / Extending the application

新增参数：更新 `FluidConfig`、默认值和校验范围，添加中英文标签，在 `Controls` 中接入，再在 solver 或 renderer 中使用。更改纹理尺寸或 shader 关键字时，必须保留替换与释放路径。

For a new setting, update the config type, defaults, validation, both translation dictionaries and controls, then consume it in the solver or renderer. GPU allocation or keyword changes require a replacement/disposal path and browser regression coverage.

新增语言：增加满足 `Messages` 的词典，扩展 `Locale` 与检测逻辑，增加语言选项。当前只有两种语言且没有复数/复杂插值需求，因此使用类型检查的静态词典；复杂内容国际化出现时可替换为 i18next 等专用层，不影响引擎。

For a new locale, add a dictionary satisfying `Messages`, update locale detection and the language selector. The small static interface uses typed dictionaries; a larger localization system can replace that layer independently.

## 迁移对应 / Migration map

| 原文件 / Original                     | 新位置 / Replacement                                                        |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `script.js` 全局脚本                  | `src/engine/` + `src/features/fluid/`                                       |
| 内嵌 GLSL                             | `src/engine/shaders/*.glsl` (20 files)                                      |
| `dat.gui.min.js`                      | React `Controls.tsx`                                                        |
| `index.html` 内嵌样式、分析与推广脚本 | Vite entry + `src/app/styles.css`; obsolete analytics and promotion removed |
| `LDR_LLL1_0.png`                      | `src/assets/dithering.png`                                                  |
| `logo.png`                            | `public/logo.png`                                                           |
| `screenshot.jpg`                      | `docs/original-screenshot.jpg`                                              |

上游 MIT 许可与作者归属保留在 `LICENSE`、派生求解器/渲染器、GLSL 文件和界面链接中。原版可从 Git 历史恢复。

The upstream MIT license and attribution remain intact. Git history preserves the original standalone implementation.
