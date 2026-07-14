# Leaderboard Cloud Functions

Create a CloudBase production environment, then create the
`leaderboard_scores` collection and deploy both functions:

- `syncLeaderboardScore`
- `getLeaderboard` (returns the top 10)

Deploy command:

```sh
npm run build:minigame
npm run deploy:cloudfunctions
```

The deploy script uses `cloudbaserc.json` and CloudBase CLI. If the CLI asks
for authorization, open the printed URL and confirm with the shown user code.

Each player record uses the normal `openid` field as the unique player key.
Do not create or write a custom `_openid` field, and do not use level ids such
as `level-1` as dynamic object keys.

Player document shape:

```json
{
  "schemaVersion": 2,
  "openid": "player-openid",
  "scores": [
    { "levelId": "level-1", "score": 10 },
    { "levelId": "level-2", "score": 8 }
  ],
  "totalScore": 18,
  "completedCount": 2,
  "nickname": "Anonymous",
  "avatarUrl": "",
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
live build.
