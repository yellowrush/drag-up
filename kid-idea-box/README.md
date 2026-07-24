# Drag Up 小朋友任务箱

这是给小朋友用的任务创建网页：打开链接，按 tab 选择新建关卡、编辑关卡、新建奖励任务、奖励品或游戏系统，提交后自动创建结构化 GitHub Issue，并在网页里看到最近任务的链接和状态。

## 共享源码

`kid-idea-box` 和 `kid-idea-box-cloudbase` 的 UI、表单、图片处理和 Issue 生成逻辑来自 `kid-idea-shared/`。不要直接手改两个部署目录里的 `index.html`、`app.js`、`styles.css` 或 API 核心；先改共享源，再运行：

```powershell
npm.cmd run sync:kid-idea-box
```

## 本地预览页面

网页本身是静态文件，可以直接打开：

```powershell
start kid-idea-box/index.html
```

本地直接打开时，任务列表和提交会因为没有 API 服务而失败；部署后会正常工作。

## Vercel 部署

Vercel 版本使用 `kid-idea-box/api/issues.js`。

1. 把 `kid-idea-box` 作为项目根目录导入 Vercel。
2. 设置环境变量：
   - `GITHUB_OWNER`：仓库 owner，例如 `yellowrush`
   - `GITHUB_REPO`：仓库名，例如 `drag-up`
   - `GITHUB_TOKEN`：GitHub fine-grained token，给目标仓库 Issues 读写、Contents 读写、Metadata 只读权限
   - `KID_IDEA_LABELS`：可选，默认 `kid-idea,needs-parent-review,from-idea-box`
   - `KID_IDEA_UPLOAD_BRANCH`：可选，默认 `develop`
   - `KID_IDEA_UPLOAD_PATH`：可选，默认 `kid-idea-uploads`
3. 在 GitHub 仓库里提前创建这些 label，或者首次提交时让 API 使用已有 label。
4. 把部署后的网页链接发给小朋友，并在微信里置顶。

## CloudBase 部署

CloudBase 静态页面使用 `kid-idea-box-cloudbase/`，API 使用 `kidIdeaIssues` 云函数。当前验证过的函数 API 是：

```text
https://cloudbase-d9gr8r6jkb1656853.service.tcloudbase.com/api/issues
```

部署云函数：

```powershell
npx.cmd --package @cloudbase/cli cloudbase --config-file cloudbaserc.kid-idea-box.json fn deploy kidIdeaIssues --path /api/issues --force
```

在 CloudBase 控制台给 `kidIdeaIssues` 配置环境变量：

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `KID_IDEA_LABELS`
- `KID_IDEA_UPLOAD_BRANCH`
- `KID_IDEA_UPLOAD_PATH`

发布静态网站前，确认 `kid-idea-box-cloudbase/config.js` 的 `window.KID_IDEA_API_URL` 指向真实函数地址。

## GitHub Token 权限

推荐使用 fine-grained personal access token：

- Repository access：只选 `drag-up`
- Permissions：
  - Issues：Read and write
  - Contents：Read and write
  - Metadata：Read-only

不要把 token 写进 `index.html`、`app.js` 或任何前端文件。

## 使用流程

1. 小朋友打开网页。
2. 选择一个 tab：新建关卡、编辑关卡、新建任务、奖励品或游戏系统。
3. 填完必填字段和试玩重点。
4. 可选拍照、选择图片或直接画图。
5. 点击发送。
6. 网页刷新任务列表，显示自动生成的 GitHub Issue 链接和状态。
7. 你审核 Issue 后，加 `copilot-ready` 标签让 Copilot 开 PR，或加 `codex-ready` 标签让 Codex 开 PR。

## Agent Label

仓库里有 GitHub Actions 路由：

- `copilot-ready`：把 Issue 分配给 GitHub Copilot coding agent。
- `codex-ready`：把 Issue 分配给 Codex coding agent。

不要同时加两个 ready 标签。PR 输出要求见 `docs/kid-idea-agent-output.md`。
