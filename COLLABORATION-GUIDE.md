# 协作开发指南

> 让朋友（即使是小学生）也能通过对话参与游戏开发，每次修改自动编译并发布微信体验版。

---

## 整体流程

```
朋友打开 WorkBuddy → 用自然语言提需求 → WorkBuddy 修改代码并推送 → GitHub 自动构建 → 微信体验版更新 → 手机上测试
```

朋友**全程不需要写代码**，只需要用中文描述想要什么，比如：
- "加一个新关卡，迷宫要旋转 3 次才能到终点"
- "把小熊的颜色改成蓝色"
- "第 5 关太难了，把星星移近一点"

---

## 一次性设置（由项目主人完成）

### 第 1 步：设置 GitHub Secret

GitHub Actions 需要微信私钥才能自动上传体验版。

1. 打开 https://github.com/yellowrush/drag-up/settings/secrets/actions
2. 点击 **New repository secret**
3. **Name** 填：`WX_PRIVATE_KEY`
4. **Secret** 填：`private.wxcdf46c8da7dacd7a.key` 文件的全部内容
   -（项目根目录下有这个文件，用记事本打开复制全部内容）
5. 点击 **Add secret**

### 第 2 步：邀请朋友为协作者

1. 打开 https://github.com/yellowrush/drag-up/settings/access
2. 点击 **Add people**
3. 输入朋友的 GitHub 用户名
4. 权限选 **Write**（可以推送代码）
5. 朋友会收到邮件邀请，点击接受

### 第 3 步：帮朋友准备电脑环境

在朋友的电脑上安装以下软件（只需一次）：

1. **Node.js** — 下载 https://nodejs.org/ 选 LTS 版本安装
2. **Git** — 下载 https://git-scm.com/ 安装
3. **WorkBuddy** — 从应用商店或官网安装

---

## 朋友的使用流程（每次开发）

### 1. 打开 WorkBuddy，选择项目

打开 WorkBuddy，如果第一次使用：
- WorkBuddy 中选择「打开项目」
- 选择 `drag-up` 文件夹（提前用 git clone 下载好）

### 2. 对话式开发

直接用中文跟 WorkBuddy 说想要什么。例如：

> "我想加一个新关卡，是一个 5×5 的迷宫，小熊从左上角出发，需要旋转到 6 点钟方向才能到达星星。"

WorkBuddy 会：
- 修改对应的代码文件（如 `src/utils/levels-data.js`）
- 自动构建验证
- 把改动推送到 GitHub

### 3. 等待自动发布

代码推送到 GitHub 后，大约 1-2 分钟内：
- GitHub Actions 会自动构建小游戏
- 自动上传到微信后台成为新的体验版
- 可以在 https://github.com/yellowrush/drag-up/actions 查看进度
- 绿色 ✅ = 发布成功，红色 ❌ = 出了问题

### 4. 手机上测试

打开微信 → 搜索小游戏名称 → 进入体验版 → 测试新功能

---

## 项目结构速览

（供 WorkBuddy 参考，朋友不需要看）

```
src/
  game.js              # 小游戏入口
  game.json            # 小游戏配置
  utils/
    levels-data.js     # 所有关卡数据（加关卡改这里）
    game-engine.js     # 游戏引擎（拖拽、旋转、碰撞）
    maze.js            # 迷宫渲染和旋转
    cub.js             # 小熊角色
    storage.js         # 存档系统
    rewards.js         # 奖励系统
    leaderboard.js     # 排行榜
  components/
    game-canvas.vue    # 画布组件
  pages/
    index/index.vue    # 主页面

cloudfunctions/        # 微信云函数（排行榜）
```

---

## 构建和发布命令

```bash
npm run build:minigame    # 构建小游戏
npm run upload:minigame   # 手动上传体验版（需要私钥文件）
npm run dev:minigame      # 本地开发调试
```

GitHub Actions 会自动执行构建和上传，朋友不需要手动运行这些命令。

---

## 常见问题

**Q: 朋友推送代码后怎么知道发布成功了？**
A: 去 https://github.com/yellowrush/drag-up/actions 看，绿色勾就是成功了。

**Q: 发布失败了怎么办？**
A: 把失败的错误信息发给 WorkBuddy，让它帮忙修复。

**Q: 朋友不小心改坏了代码怎么办？**
A: 代码在 GitHub 上有完整历史，随时可以回退。在 GitHub 上找到之前正常的版本，点击 Revert 即可。

**Q: 朋友不会用 Git 怎么办？**
A: 不需要会。WorkBuddy 会自动处理代码提交和推送。朋友只需要对话。
