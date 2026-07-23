# Drag Up 小朋友想法箱

这是给小朋友用的极简网页：打开链接，输入游戏想法，提交后自动创建 GitHub Issue，并在网页里看到最近任务的链接和状态。

## 本地预览页面

网页本身是静态文件，可以直接打开：

```powershell
start kid-idea-box/index.html
```

本地直接打开时，任务列表和提交会因为没有 API 服务而失败；部署后会正常工作。

## 部署建议

第一版建议部署到 Vercel：

1. 把 `kid-idea-box` 作为项目根目录导入 Vercel。
2. 设置环境变量：
   - `GITHUB_OWNER`：仓库 owner，例如 `yellowrush`
   - `GITHUB_REPO`：仓库名，例如 `drag-up`
   - `GITHUB_TOKEN`：GitHub fine-grained token，只给目标仓库 Issues 读写权限
   - `KID_IDEA_LABELS`：可选，默认 `kid-idea,needs-parent-review,from-idea-box`
3. 在 GitHub 仓库里提前创建这些 label，或者首次提交时让 API 使用已有 label。
4. 把部署后的网页链接发给小朋友，并在微信里置顶。

## CloudBase 部署

如果把 `kid-idea-box` 发布到 CloudBase 静态网站，不会自动拥有
Vercel 的 `/api/issues` 路由，需要改用 `kidIdeaIssues` 云函数：

1. 部署云函数：

```powershell
npm.cmd run build:minigame
npm.cmd run deploy:cloudfunctions
```

2. 在 CloudBase 控制台给 `kidIdeaIssues` 配置环境变量：
   - `GITHUB_OWNER`：仓库 owner，例如 `yellowrush`
   - `GITHUB_REPO`：仓库名，例如 `drag-up`
   - `GITHUB_TOKEN`：GitHub fine-grained token，只给目标仓库 Issues 读写权限
   - `KID_IDEA_LABELS`：可选，默认 `kid-idea,needs-parent-review,from-idea-box`

3. 为 `kidIdeaIssues` 开启 HTTP 访问或 HTTP 触发器，复制访问地址。
4. 发布静态网站前，把 `config.js` 里的地址改成这个 HTTP 函数地址：

```js
window.KID_IDEA_API_URL = 'https://your-cloudbase-function-url'
```

保留空字符串时，页面会继续使用 Vercel 路径 `/api/issues`。

## 避免无关 PR 反复部署 Preview

Vercel 默认会给每个 PR 创建 Preview Deployment。这个仓库里大多数 PR 只改游戏代码，不会改想法箱，所以建议在 Vercel 项目里配置 Ignored Build Step：

1. 打开 Vercel 项目 `drag-up-kid-idea-box`。
2. 进入 `Settings -> Git -> Ignored Build Step`。
3. 填入：

```text
node vercel-ignore-build.js
```

这个脚本只在 `kid-idea-box/` 目录有变化时允许 Vercel 构建；其他 PR 会显示 skipped，不再反复部署 Preview。

## GitHub token 权限

推荐使用 fine-grained personal access token：

- Repository access：只选 `drag-up`
- Permissions：
  - Issues：Read and write
  - Metadata：Read-only

不要把 token 写进 `index.html`、`app.js` 或任何前端文件。

## 使用流程

1. 小朋友打开网页。
2. 写下“今天想改什么”。
3. 可选填写“试玩时重点看哪里”。
4. 点击发送。
5. 网页刷新任务列表，显示自动生成的 GitHub Issue 链接和状态。
6. 你审核 Issue 后，加 `copilot-ready` 标签让 Copilot 开 PR；未来也可以加 `codex-ready` 走 Codex 入口。

## Agent label

仓库里有 GitHub Actions 路由：

- `copilot-ready`：把 Issue 分配给 GitHub Copilot coding agent。
- `codex-ready`：捕获 Issue 并生成标准 Codex prompt，作为后续 Codex 自动执行入口。

要启用 `copilot-ready`，在 GitHub Actions Secrets 里添加：

- `COPILOT_AGENT_TOKEN`：fine-grained user token，只选 `drag-up` 仓库；Issues、Actions、Contents、Pull requests 设为 Read and write。

## 状态显示

当前第一版读取 GitHub Issue 的 `state`：

- `open`：显示为“进行中”
- `closed`：显示为“已完成/关闭”

后续可以继续扩展为读取 PR 链接、CI 状态和体验版上传结果。
