---
type: decision
status: active
kind: architecture
importance: high
updated: 2026-09-24
topic: gpu-lifecycle
source_logs:
  - "[[日志/2026-09-24-现代架构与双语重构]]"
supersedes: null
---

# ADR-002：GPU 生命周期与兼容 / GPU ownership and compatibility

> 本次基线已于 2026-09-24 获用户集中确认，当前有效。
> Baseline confirmed by the user on 2026-09-24; active.

## 选择 / Decision

React Hook 只负责创建、传参和释放 `FluidEngine`。引擎拥有 RAF/事件，`Device` 拥有 GPU 对象。求解器与显示模块只通过这些资源操作。

每次 resize 保留染料/速度可读内容后释放旧资源；shader 编译失败与 FBO 不完整必须抛出错误并清理。上下文丢失时停止循环，恢复时按现有设置重建。截图使用 RGBA8 与 UNSIGNED_BYTE 读取。

The GPU engine owns its loop and input; Device owns allocations, including partial initialization. Resizes release replacements, and context restoration creates a fresh image from retained settings.

## 取舍 / Trade-offs

原生 GPU 封装比 scene graph 更贴合当前算法，但资源生命周期由本项目负责，因此浏览器回归必须检查资源计数稳定。WebGL 1 无线性过滤时手动插值，关闭辉光/明暗/光束。

## 验证 / Validation

`tests/e2e/lifecycle.spec.ts` 检查 StrictMode、反复画质/窗口/光效切换后的纹理、FBO、buffer、program、shader 数量。`tests/e2e/fluid.spec.ts` 验证上下文恢复、回退与截图。

- [[知识/模块/流体引擎]]
- [[知识/流程/开发与验证]]

## 来源 / Evidence

- [[日志/2026-09-24-现代架构与双语重构|重构工作日志]]
