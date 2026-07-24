# Kid Idea Box CloudBase 部署说明

这是 `kid-idea-box` 的低风险 CloudBase 部署路径。它会保留当前 Vercel 版本不变，只为中国国内访问提供一个独立入口。

共享源码在 `kid-idea-shared/`。修改共享前端或 Issue 生成逻辑后，运行：

```powershell
npm.cmd run sync:kid-idea-box
```

## 费用边界

CloudBase 不是无限免费的托管服务。

- 按当前腾讯云价格页面，每个 CloudBase 账号可以创建一个免费体验环境，每月有 3000 资源点。
- 每个 CloudBase 环境包含 1GB 免费静态托管容量。
- 如果付费环境超出额度并开启超量付费，腾讯云会按用量收费。常见例子包括 API 调用、外网流量、静态托管流量和静态托管容量超额。
- 这个想法箱是给小朋友少量提交使用的，应该保持流量很小，不加入 AI 模型调用，不新增数据库写入，除非确实需要。
- 没有明确决定付费前，不要开启“超量不停服”。

建议第一次测试：

1. 优先使用免费体验环境。
2. 不开启“超量不停服”。
3. 第一次测试不要购买资源包。
4. 提交几次想法后检查用量。

## 保持不变的部分

- Vercel 部署目录仍然是 `kid-idea-box/`。
- CloudBase 静态文件目录是 `kid-idea-box-cloudbase/`。
- 两个部署目录都从 `kid-idea-shared/` 生成。
- 现有小游戏 CloudBase 配置仍然使用 `cloudbaserc.json`。
- 想法箱 CloudBase 迁移使用独立配置：`cloudbaserc.kid-idea-box.json`。

## CloudBase 组成

- 静态网站：上传 `kid-idea-box-cloudbase/`。
- API 云函数：部署 `cloudfunctions/kidIdeaIssues/`。
- HTTP 路径：把云函数绑定到 `/api/issues`。

## 云函数环境变量

在 CloudBase 控制台的 `kidIdeaIssues` 云函数里配置：

- `GITHUB_OWNER`：仓库 owner，例如 `yellowrush`。
- `GITHUB_REPO`：仓库名，例如 `drag-up`。
- `GITHUB_TOKEN`：GitHub fine-grained token，需要 Issues 读写、Contents 读写、Metadata 只读。
- `KID_IDEA_LABELS`：可选，默认是 `kid-idea,needs-parent-review,from-idea-box`。
- `KID_IDEA_UPLOAD_BRANCH`：可选，默认是 `develop`。
- `KID_IDEA_UPLOAD_PATH`：可选，默认是 `kid-idea-uploads`。

不要把 GitHub token 放进任何前端文件。Contents 权限是必须的，因为 GitHub Issues 不能稳定显示 `data:image/...` 内联图片；云函数会先把图片上传到 `kid-idea-uploads/`，然后在 Issue 里引用真实图片 URL。

## 手动部署云函数

在仓库根目录运行：

```powershell
npx.cmd --package @cloudbase/cli cloudbase --config-file cloudbaserc.kid-idea-box.json fn deploy kidIdeaIssues --path /api/issues --force
```

这个命令只用于想法箱的 CloudBase 云函数，不要混入普通小游戏发布流程。

## HTTP 访问

在 CloudBase 控制台：

1. 打开 `kidIdeaIssues` 云函数。
2. 启用 HTTP 访问，或通过 HTTP 访问服务绑定路径。
3. 触发路径设置为 `/api/issues`。
4. 测试：

```powershell
curl https://cloudbase-d9gr8r6jkb1656853.service.tcloudbase.com/api/issues
```

应该返回包含 `issues` 数组的 JSON。

如果页面报 `Unexpected token '<'`，说明前端收到了 HTML，而不是 JSON。这通常表示 `/api/issues` 仍然被静态托管接管，没有转到 `kidIdeaIssues` 云函数。

有两种有效修复方式：

1. 推荐：把同一个静态托管域名下的 `/api/issues` 绑定到云函数。
2. 兜底：在 `kid-idea-box-cloudbase/config.js` 里设置完整 API URL：

```js
window.KID_IDEA_API_URL = 'https://cloudbase-d9gr8r6jkb1656853.service.tcloudbase.com/api/issues'
```

只有当静态页面和 `/api/issues` 云函数共享同一个域名时，才使用空 API URL。旧的 `window.KID_IDEA_API_BASE = 'https://YOUR_FUNCTION_DOMAIN'` 写法仍然兼容。

## 静态网站

把 `kid-idea-box-cloudbase/` 的内容发布到 CloudBase 静态网站。

第一次私人测试可以使用 CloudBase 默认域名。稳定给中国国内公开访问时，建议配置有 ICP 备案的自定义域名。

当前静态网站 App 名是 `kid-idea-issues`，对应访问地址：

```text
https://kid-idea-issues-cloudbase-d9gr8r6jkb1656853.webapps.tcloudbase.com
```

## Merge 后自动发布

CloudBase 版本有单独的 GitHub Actions workflow：

```text
.github/workflows/deploy-kid-idea-cloudbase.yml
```

它只在代码合并后 push 到 `develop` 时自动运行，也可以在 GitHub Actions 页面手动运行。它不会从 pull request 直接发布，也不会改变 Vercel 的 `kid-idea-box` 部署。

需要在 GitHub 仓库 Secrets 配置：

- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`

这两个 secret 只用于发布到 CloudBase。`GITHUB_OWNER`、`GITHUB_REPO`、`GITHUB_TOKEN` 和 `KID_IDEA_LABELS` 继续放在 CloudBase 的 `kidIdeaIssues` 云函数环境变量里，不要放到前端文件。

发布流程：

1. 运行 `node scripts/sync-kid-idea-box.js`。
2. 如果 `kid-idea-box/`、`kid-idea-box-cloudbase/` 或 `cloudfunctions/kidIdeaIssues/` 里的生成文件没有提交，直接失败。
3. 检查这次提交是否改到了 `kidIdeaIssues` 云函数相关文件。
4. 登录 CloudBase。
5. 如果云函数有更新，部署 `kidIdeaIssues` 到 `/api/issues`；如果没有更新，就跳过云函数部署。
6. 使用 `tcb app deploy kid-idea-issues` 发布 CloudBase 静态网站。
7. 冒烟测试 `https://cloudbase-d9gr8r6jkb1656853.service.tcloudbase.com/api/issues`，要求返回包含 `issues` 数组的 JSON。

自动判断云函数变化时，会看这些文件：

- `cloudfunctions/kidIdeaIssues/**`
- `kid-idea-shared/issue-core.js`
- `kid-idea-shared/cloudbase-index.js`
- `cloudbaserc.kid-idea-box.json`
- `scripts/sync-kid-idea-box.js`

手动运行 workflow 时，`deploy_function` 可以选择：

- `auto`：默认，根据文件变化判断。
- `yes`：强制部署云函数。
- `no`：强制跳过云函数。

## Vercel 安全边界

不要移除 Vercel，也不要修改 DNS。

推荐发布顺序：

1. 保持 Vercel URL 不变。
2. 把 CloudBase 发布到独立测试 URL。
3. 测试名字缓存、画图、手机拍照上传、Issue 创建和任务列表读取。
4. 测试通过后，再把 CloudBase URL 给小朋友使用。
5. CloudBase 稳定工作一段时间后，再决定是否继续保留 Vercel 作为备用入口。
