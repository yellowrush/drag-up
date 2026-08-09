# Drag Up 文档概览与近期修复历史

`overview.md` 现在用于快速说明这个仓库里哪些文档对 AI 开发最有帮助，并补充最近已经完成的重要修复，方便后续 agent 在开始前先读对材料、少走弯路。

## AI 开发先看哪些文档

1. **`/home/runner/work/drag-up/drag-up/COLLABORATION-GUIDE.md`**
   - 说明小朋友想法任务的协作流程、风险边界、分支/PR 规则，以及构建验证要求。
   - 适合在接到 kid idea issue 时第一时间阅读。

2. **`/home/runner/work/drag-up/drag-up/docs/kid-idea-agent-output.md`**
   - 说明 PR 描述必须包含哪些证据。
   - 修改类任务要补 `Before / After`，新关卡任务要补 `New Levels` 表。

3. **`/home/runner/work/drag-up/drag-up/.github/workflows/kid-idea-agent.yml`**
   - 说明仓库当前支持哪些 AI agent 路由。
   - 目前支持 Copilot、Codex、OpenCode，并支持 `/cp`、`/cx`、`/oc` 这类 issue comment 命令触发。

## 为什么这份 overview 对 AI 开发有用

- 它把“先读哪些文档”和“这些文档分别解决什么问题”放在一个入口里，能减少 agent 在仓库里盲目搜索。
- 它保留了最近修复的摘要，后续 agent 遇到类似问题时，可以先判断是否与既有修复历史相关。
- 对文档型任务尤其有帮助：agent 能更快分辨应该改协作规则、PR 证据要求，还是工作流相关说明。

## 近期修复历史

### 本次修复：补齐 AI agent 文档并更新 overview

#### 问题

- `overview.md` 仍然是一次旧的 H5 画布修复记录，缺少对当前文档入口的说明。
- `COLLABORATION-GUIDE.md`、`docs/kid-idea-agent-output.md` 和想法箱 README 仍主要围绕 Copilot / Codex 编写，没有同步现在已支持的 OpenCode agent。

#### 根因

- 仓库工作流已经在 `.github/workflows/kid-idea-agent.yml` 中支持 `opencode`，但面向协作和提交流程的文档没有一起更新。
- `overview.md` 没有继续承担“总览入口”职责，导致 AI agent 不容易快速找到当前最相关的协作文档。

#### 修复

- 将 `overview.md` 改成“文档概览 + 近期修复历史”形式。
- 明确说明哪些文档对 AI 开发最有帮助，以及原因。
- 同步更新协作文档和相关 README，让文档与当前支持的 agent 路由一致。

### 之前的 H5 画布相关修复（摘要）

- 修复小熊初始位置未正确加载，导致无法拖动。
- 多次修复 H5 canvas 输入事件绑定、真实 canvas 查找、尺寸同步和坐标换算问题。
- 修复 `mazeCenter.y` 为 `NaN`、画面内容消失、内容挤在左上角等问题。
- 修复 Vue 3 深度响应式代理 `GameEngine` 后导致 canvas 渲染异常的问题。

这些更详细的技术排障过程如果后续仍需要保留，建议迁移到单独的修复记录文档中，而不是继续占用总览入口。
