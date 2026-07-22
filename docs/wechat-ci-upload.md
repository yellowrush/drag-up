# WeChat CI upload

This project can upload a WeChat experience version from GitHub Actions without
hard-coded appIds or private-key paths.

## Required GitHub Actions secrets

Add these in GitHub repository settings:

- `WX_APPID`: the WeChat Mini Game or Mini Program appId.
- `WX_PRIVATE_KEY`: the full miniprogram-ci private key content.

`WX_PRIVATE_KEY` may contain real newlines or escaped `\n` characters.

## GitHub Actions flow

`.github/workflows/deploy.yml` runs on pushes to `develop` and can also be
started manually from the Actions tab. It performs:

1. `npm ci`
2. `npm run build:minigame`
3. `npm run upload:minigame:ci`

During the minigame build, `WX_APPID` is also written into
`dist/build/minigame/project.config.json`. Source config files keep an empty
`appid` so appIds are not committed.

The CI upload version defaults to `1.0.<github_run_number>`, and the
description defaults to `CI: <short_commit_sha>`.

## Local upload

Set the appId before uploading:

```bash
WX_APPID=wxxxxxxxxxxxxxxxxx npm run upload:minigame -- 1.0.10 "manual test"
```

On Windows PowerShell:

```powershell
$env:WX_APPID = "wxxxxxxxxxxxxxxxxx"
npm.cmd run upload:minigame -- 1.0.10 "manual test"
```

By default the local script looks for `private.<WX_APPID>.key`. To use another
file path:

```powershell
$env:WX_PRIVATE_KEY_PATH = "private.wxxxxxxxxxxxxxxxxx.key"
```

## Useful log markers

Upload scripts now print stable markers:

- `[upload] Preparing WeChat upload`
- `[ci-upload] Preparing WeChat upload`
- `[upload] Progress done/total`
- `[ci-upload] Success response:`
- `[ci-upload] Failed`

Failures include the main message plus any available `code`, `errCode`, and
`errMsg` fields from `miniprogram-ci`.
