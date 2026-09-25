# 流体实验室 · WebGL Fluid Simulation

中文 · [English](README.en.md)

基于 React + Vite + TypeScript 的交互式流体实验室。界面支持中英即时切换，流体引擎独立于 React，保留原始 GPU 流体求解、Bloom、光束和 PNG 导出。

## 启动

需要 Node.js 24 和 npm。首次使用：

```sh
npm ci
npm run dev
```

在浏览器打开终端显示的本地地址。按住并拖动鼠标/手指绘制；`P` 暂停，空格随机泼洒。右上角切换中文/English，控制面板调整参数。语言和设置会在本机保存。

## 为什么这样选型

- **React**：组件化界面、受控参数和明确的生命周期。
- **Vite**：开发热更新、模块化资源、静态生产构建。
- **TypeScript**：严格检查配置、引擎接口和翻译键，使用与检查工具兼容的稳定版本。
- **原生 WebGL + GLSL**：保留二维流体算法及 WebGL 1 回退。当前没有三维场景需求，暂不增加 Three.js；未来可从独立引擎边界扩展。

技术选择与适用边界见[架构说明](docs/architecture.md)，精确依赖版本见 `package-lock.json`。

## 目录

```text
src/
  app/                 应用装配、快捷键、全局样式
  features/fluid/      控制面板、预设、设置与引擎 Hook
  engine/              独立流体引擎、求解、后处理、输入、截图
    webgl/             上下文、程序、帧缓冲与资源释放
    shaders/           20 个独立 GLSL 着色器
  i18n/                类型安全的中英词典和语言切换
  shared/              安全的本地存储访问
  assets/              随构建处理的纹理
public/                直接复制的静态资源
tests/e2e/             浏览器行为、兼容、资源与生产测试
docs/                  双语架构和开发说明
wiki_memory/           工程状态、决策、知识、日志与检查工具
```

## 常用命令

| 命令                                            | 用途                           |
| ----------------------------------------------- | ------------------------------ |
| `npm run dev`                                   | 本地开发                       |
| `npm run check`                                 | 类型检查、Lint、单元测试、构建 |
| `npm run format` / `npm run format:check`       | 格式化 / 格式检查              |
| `npm run test:e2e`                              | 浏览器回归测试                 |
| `npm run test:production`                       | 验证真实构建产物及子目录路径   |
| `npm run build` / `npm run preview`             | 构建 / 本地预览                |
| `npm run memory:index` / `npm run memory:check` | 记忆索引 / 体检                |

浏览器测试首次运行前执行 `npx playwright install chromium`。记忆工具需要 Python 3.10+。CI 自动执行质量检查；发布时上传 **`dist/`**，不再直接托管源码根目录。详细步骤见[开发与验证](docs/development.md)。

## 已实现的维护边界

参数变更不会重建 React 画布。GPU 资源由统一对象管理，调整画质会释放旧帧缓冲；卸载清理 RAF、事件、纹理与程序。上下文恢复会保留参数并重新生成流体。缺少纹理过滤支持时自动降级；不支持 WebGL 的设备显示中英错误提示。

浏览器测试使用 Chromium 软件渲染与移动设备模拟；真实设备性能及 Safari/Firefox 尚需实机验证。

## 工程记忆

按用户提供的“工程记忆构建”模板建立，入口为 [wiki_memory/README.md](wiki_memory/README.md)，协作规则见 [AGENTS.md](AGENTS.md)。历史日志与当前状态分离，候选长期结论在确认前保持 `proposed`。桌面原始模板不作修改。

## 来源与许可

源自 [Pavel Dobryakov / WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)，保留 [MIT 许可](LICENSE)及作者归属。

- [GPU Gems：GPU 流体动力学](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu)
- [fluids-2d](https://github.com/mharrys/fluids-2d)
- [GPU Fluid Experiments](https://github.com/haxiomic/GPU-Fluid-Experiments)
