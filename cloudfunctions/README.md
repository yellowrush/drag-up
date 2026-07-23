# Leaderboard Cloud Functions

Create a WeChat Cloud environment that belongs to the Mini Game appid, then
deploy both functions:

- `syncLeaderboardScore`
- `getLeaderboard` (returns the top 10)
- `kidIdeaIssues` (creates and lists kid idea GitHub issues)

Deploy command:

```sh
npm run build:minigame
npm run deploy:cloudfunctions
```

The deploy script uses `cloudbaserc.json` and `miniprogram-ci`, so it deploys
through the Mini Game appid and upload private key.

Each player record uses the normal `openid` field as the unique player key.
Do not create or write a custom `_openid` field, and do not use level ids such
as `level-1` as dynamic object keys.

Only players who authorized profile display info are synced into the leaderboard.
Anonymous/local preview records are rejected by `syncLeaderboardScore`, ignored
by `getLeaderboard`, and old anonymous rows are cleaned during leaderboard reads.

Player document shape:

```json
{
  "schemaVersion": 3,
  "authorized": true,
  "playerKey": "openid:player-openid",
  "openid": "player-openid",
  "scores": [
    { "levelId": "level-1", "score": 10 },
    { "levelId": "level-2", "score": 8 }
  ],
  "totalScore": 18,
  "completedCount": 2,
  "nickname": "Player nickname",
  "avatarUrl": "https://avatar.example",
  "createdAt": "server date",
  "updatedAt": "server date"
}
```

Recommended collection index:

- `totalScore` descending
- `completedCount` descending
- `updatedAt` ascending
- `openid` ascending

Set `CLOUD_ENV_ID` in `src/utils/leaderboard-config.js` before publishing a
live build. For the `wx.cloud` client path this must be a WeChat Cloud
environment that belongs to the same Mini Game appid used by `upload.js`;
standalone Tencent CloudBase/qcloud environments are not visible to
`wx.cloud.callFunction` and will report `INVALID_ENV`.

For `kidIdeaIssues`, configure these CloudBase function environment variables:

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `KID_IDEA_LABELS` (optional)

The kid idea web page must point `kid-idea-box/config.js` at the HTTP access URL
for this function when it is hosted on CloudBase static hosting.
