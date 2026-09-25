---
type: moc
status: active
kind: process
importance: high
updated: 2026-09-25
topic: work-log-index
source_logs: []
supersedes: null
---

# 工作日志 MOC

> 单一工作日志索引，按更新时间倒序。任务类型通过 `kind` 元数据区分。

| 时间 | 类型 | 目标 | 状态 | 主题 | 日志 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-25 | maintenance | 提交并推送上一轮完成的架构重构，并记录用户对后续完整对话的提交与推送要求。 | active | commit-and-push-workflow | [[日志/2026-09-25-自动提交与推送约定.md\|2026-09-25｜自动提交与推送约定]] |
| 2026-09-24 | feature | 将原始全局脚本改造为现代可维护工程，提供中英双语与模板驱动的工程记忆。 | archived | architecture-bilingual-migration | [[日志/2026-09-24-现代架构与双语重构.md\|2026-09-24｜现代架构与双语重构]] |

## 使用方式

- 由 `python 工具/memory_lint.py index` 生成或刷新。
- 查询时先阅读当前状态，再按关键词定位日志。
- 历史日志是审计记录，不应直接覆盖当前状态。

## 入口

- [[README|工程 Agent 记忆系统]]
- [[AGENTS|记忆维护协议]]
- [[日志/README|工作日志说明]]
- [[当前状态/项目概览|当前项目概览]]
- [[当前状态/系统架构|当前系统架构]]
