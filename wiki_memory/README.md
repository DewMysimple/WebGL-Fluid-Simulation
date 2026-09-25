# 流体实验室工程记忆 / Fluid Lab project memory

按用户提供的“工程记忆构建/wiki_memory”模板建立。桌面来源保持只读，本目录随 Git 版本化。
Based on the supplied Markdown memory template. The original remains untouched; this workspace is versioned with the project.

## 状态 / Status

用户已于 2026-09-24 集中确认本次架构、决策和知识，五篇当前状态、三篇 ADR、五篇知识页均为 **active**。后续新增结论仍遵守确认规则。日志保存已执行操作及验证证据。页面包含中文说明与英文摘要；产品界面和开发 README 提供完整中英版本。

## 启动读取 / Startup reading

1. [[AGENTS|记忆维护协议]]
2. [[当前状态/项目概览]]、[[当前状态/系统架构]]、[[当前状态/当前约束]]、[[当前状态/当前待办]]
3. [[当前状态/已知问题]]与相关决策/知识
4. 只在需要追溯时读取最近日志，避免默认扫描全部历史。

## 分类入口 / Navigation

- [[决策/README|架构决策]]
- [[知识/模块/README|模块知识]]
- [[知识/流程/README|开发流程]]
- [[知识/规范/README|工程规范]]
- [[知识/运维/README|构建发布]]
- [[日志/README|日志约定]]
- [[日志/MOC_工作日志|唯一工作日志索引]]
- [[llm-wiki|原始理念参考]]

## 操作 / Operations

在仓库根目录运行 `npm run memory:index` 和 `npm run memory:check`。工具只依赖 Python 3.10+ 标准库。
Run these commands from the repository root to refresh the index and validate the memory structure.

记忆同步：追加日志、列出长期候选、刷新 MOC；记忆检索：从当前状态与 MOC 按需追溯；记忆体检：检查元数据、断链、重复主题及孤儿；记忆压缩：总结历史，不删除来源。

用户确认候选后，更新相应 status 并追加确认日志；已封存日志不可改写。新的结论通过 supersedes 保留关系。
