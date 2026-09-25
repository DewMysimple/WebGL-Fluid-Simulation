# 开发与验证 / Development and validation

## 环境 / Environment

Use Node.js 24 (see `.nvmrc`) and npm. Python 3.10+ is needed only for the memory tools. The app has no backend, environment variables, API keys or external runtime services.

使用 Node.js 24 和 npm。记忆工具仅依赖 Python 标准库。首次安装后使用锁文件重现依赖：

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. To test from another device on your LAN, run `npm run dev -- --host 0.0.0.0` and use the host computer's LAN address.

## 质量检查 / Checks

| Command                   | 检查内容 / Purpose                                                  |
| ------------------------- | ------------------------------------------------------------------- |
| `npm run check`           | 严格类型、Lint、单元测试、生产构建 / Types, lint, unit tests, build |
| `npm run format:check`    | Prettier formatting                                                 |
| `npm run test:e2e`        | Chromium interaction, compatibility, storage and GPU lifecycle      |
| `npm run test:production` | Build and check real production assets under `/fluid/`              |
| `npm run memory:index`    | Refresh the single memory log index                                 |
| `npm run memory:check`    | Validate memory metadata, links and topics                          |

Install the browser once with `npx playwright install chromium`. On Linux CI, use `npx playwright install --with-deps chromium`. Run `npm run memory:test` to verify the memory index tool's regression tests.

浏览器测试使用 Chromium + SwiftShader 软件渲染，验证真实 shader 编译、PNG 内容、鼠标/触摸交互、中英切换、GPU 上下文恢复、WebGL 1 回退，以及反复调整分辨率/光效后资源计数稳定。它不代表真实手机性能、Safari 或 Firefox 兼容性已获验证。WebGL 无法使用的测试会故意产生引擎错误日志。

Browser tests exercise real shaders and inspect exported PNG pixels. They use software rendering and mobile emulation, so physical GPU performance and other browsers still need device testing. The unsupported-WebGL test intentionally logs an engine error.

## 发布 / Static deployment

```sh
npm run build
npm run preview
```

Deploy only the contents of `dist/` to any static host. `base: './'` makes assets work under a subdirectory. The repository root is now source code: serving the root directly or using a Pages branch containing raw source will not run the app. Build first, then publish `dist/`. For GitHub Pages, configure a build workflow that uploads this directory; the included CI validates changes and does not publish them.

发布 `dist/` 的内容即可。原来“直接托管根目录 index.html”的方式已经改变，需要先构建；子目录托管已通过浏览器测试。仓库 CI 只检查，不自动发布。

## 排查问题 / Troubleshooting

- GPU unavailable: enable browser hardware acceleration and confirm half-float render targets are supported. The interface presents a translated error and reload action.
- Slow on a phone: use Medium/Low quality, lower simulation resolution and disable bloom/sunrays. DPR is capped at 2 and coarse-pointer devices start at 512 dye resolution.
- Black/empty canvas after context loss: recovery resets the fluid image by design. Settings survive, GPU texture contents do not.
- Corrupt/blocked localStorage: preferences fall back to defaults or stay in memory; rendering should remain usable.
- Keyboard shortcuts: `P` toggles simulation, Space adds random splats. Shortcuts do not intercept focused form controls.
- A transparent canvas uses a checkerboard preview; exported PNG alpha is real transparency and excludes interface elements.

## 维护顺序 / Maintenance order

修改前阅读 `AGENTS.md` 和记忆入口。优先改变负责该功能的最小模块，补充与行为相关的回归检查。保持中英文标签一致，保留作者许可；升级依赖时同时检查 peerDependencies 并更新锁文件。完成后记录日志、刷新索引，再按记忆协议确认长期结论。

Read the project instructions and current memory before changes. Keep edits within the responsible module, validate meaningful behavior, update both languages and the lockfile when needed, then append the task log and update the memory index.

每次完整对话结束前，按用户约定检查本轮改动和暂存范围，追加记忆日志并更新索引，提交本轮仓库改动，推送至当前分支上游。保留与本轮无关的用户文件；如果没有上游或推送被拒绝，不要强制推送。

At the end of every completed conversation that changes the repository, review and log the conversation's changes, update the memory index, commit, and push to the current branch's configured upstream. Preserve unrelated files. Do not force-push if the upstream rejects the update.
