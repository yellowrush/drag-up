# 微信 CI 上传说明

这个项目可以通过 GitHub Actions 上传微信小游戏体验版，不需要把 `appId` 或私钥路径写死在代码里。

## 需要配置的 GitHub Secrets

在 GitHub 仓库设置里添加：

- `WX_APPID`：微信小游戏或小程序的 `appId`。
- `WX_PRIVATE_KEY`：`miniprogram-ci` 私钥的完整内容。

`WX_PRIVATE_KEY` 可以包含真实换行，也可以使用转义后的 `\n`。

## GitHub Actions 流程

`.github/workflows/deploy.yml` 会在 pull request 创建、更新、重新打开或标记为 ready for review 时运行，也可以在 Actions 页面手动触发。主要流程是：

1. `npm ci`
2. `npm run build:minigame`
3. `npm run upload:minigame:ci`

上传体验版前会先构建小游戏。构建过程中，`WX_APPID` 会写入 `dist/build/minigame/project.config.json`。源码里的配置文件继续保留空 `appid`，避免把真实 `appId` 提交进仓库。

CI 上传的版本号默认使用 `package.json` 里的 `version`，上传描述会包含来源、分支和短提交号。

`package.json` 是唯一需要手动修改的版本来源。应用构建前，`npm run sync:version` 会同步更新 `src/manifest.json` 里的 `versionName`，并根据包版本生成 `versionCode`。

## 本地上传

脚本会按以下顺序自动补全 `appId`：

1. 环境变量 `WX_APPID`（或 `WECHAT_APPID`）
2. 项目根目录 `.env` 文件里的 `WX_APPID`
3. 本地的 `private.<appId>.key` 文件名（默认私钥文件在项目根目录，通常是 `private.wx<一串字符>.key`）

只要本地已有 `private.<appId>.key`，直接运行即可，无需手动设置环境变量：

```bash
npm.cmd run upload:minigame -- 1.1.0 "manual test"
```

如果需要显式指定 `appId`，也可以手动设置（env 变量优先级最高）：

```bash
WX_APPID=wxxxxxxxxxxxxxxxxx npm run upload:minigame -- 1.1.0 "manual test"
```

Windows PowerShell：

```powershell
$env:WX_APPID = "wxxxxxxxxxxxxxxxxx"
npm.cmd run upload:minigame -- 1.1.0 "manual test"
```

默认情况下，本地上传脚本会查找 `private.<WX_APPID>.key`。如果要指定其他私钥文件路径：

```powershell
$env:WX_PRIVATE_KEY_PATH = "private.wxxxxxxxxxxxxxxxxx.key"
```

## 常用日志标记

上传脚本会输出稳定的日志标记，方便在 CI 日志里搜索：

- `[upload] Preparing WeChat upload`
- `[ci-upload] Preparing WeChat upload`
- `[upload] Upload started`
- `[ci-upload] Upload progress 40% (4/10)`
- `[ci-upload] Upload succeeded`
- `[ci-upload] Failed`

失败时会输出主要错误信息，并尽量附带 `miniprogram-ci` 返回的 `code`、`errCode` 和 `errMsg`。

如果 CI 需要更详细的调试信息，可以设置：

```text
CI_UPLOAD_DEBUG=1
```

这样会打印完整的 `miniprogram-ci` 响应。
