# Project instructions / 工程协作约定

This is a client-only fluid simulation. Read `README.md`, then follow the memory protocol in `wiki_memory/AGENTS.md`.

## Start here / 会话入口

1. Read `wiki_memory/AGENTS.md` and the four startup pages under `wiki_memory/当前状态/`: 项目概览、系统架构、当前约束、当前待办.
2. Read related active decisions and module knowledge. Proposed pages are review material, not confirmed policy.
3. Inspect current code and `git status` before changing anything. Source code and tests are the factual authority.

## Boundaries / 模块边界

- `src/app`: application composition and styles.
- `src/features/fluid`: React controls, preferences and engine lifecycle hook.
- `src/engine`: independent TypeScript engine. Do not import React, UI translations or localStorage here.
- `src/engine/webgl`: GPU resources; every allocation must have an owner and disposal path, including failures.
- `src/engine/shaders`: GLSL; preserve upstream MIT attribution and document algorithm changes.
- `src/i18n`: Chinese/English dictionaries; all product-facing text belongs here.
- UI changes pass settings through `FluidEngine`; never run GPU frames through React state.
- Prefer focused modules and existing dependencies. Add Three.js only when a concrete 3D integration requires it.

## Validation / 验证

- Node 24; install with `npm ci`.
- Run `npm run check` after engine or application changes.
- Run `npm run test:e2e` for interaction, GPU resource or lifecycle changes.
- Run `npm run test:production` for build, asset or hosting-path changes.
- Run `npm run format:check` and `npm run memory:check` before handoff.
- Browser tests use Chromium/SwiftShader. Do not claim physical-device, Safari or Firefox coverage from these tests.

## Commit and push / 提交与推送

- At the end of every completed conversation that changes this project, commit the changes made for that conversation and push the commit to the current branch's configured upstream.
- Before staging, inspect `git status` and the diff. Include the conversation's intentional project changes; preserve unrelated or user-owned files.
- Verify the push result. Never force-push or rewrite existing history to get around a rejection. Report a missing upstream, authentication problem, or remote conflict and ask for the needed input.
- Follow the project's memory protocol: update the append-only task log and index along with the conversation changes.

每次对话完成了本仓库修改后，检查暂存范围、追加日志并更新索引，提交本次对话的改动，推送到当前分支配置的上游；不得把无关或用户自有文件混入提交，不使用强制推送绕过拒绝。

## Memory / 记忆维护

Follow `wiki_memory/AGENTS.md` without silently promoting proposed conclusions. Create one append-only log per substantive task, update its MOC, and report verified results and limits. The initial architecture baseline was confirmed by the user on 2026-09-24 and is active; future proposals still follow the protocol. Never modify the desktop source template.
