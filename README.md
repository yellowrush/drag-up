# Drag Up - 旋转解谜游戏

基于 uni-app X 开发的微信小游戏，重新实现经典的旋转网格解谜玩法。

## 原游戏
- 游戏类型: 旋转网格解谜
- 原版: https://github.com/mpg-chong-huang/yellowrush/blob/gh-pages/game/dragUp/index.html

## 游戏玩法
1. 拖动紫色立方体(cub)沿轨道移动到金色星星
2. 点击并拖动网格可以旋转整个迷宫
3. 不同类型的轨道有不同的旋转行为:
   - 蓝色轨道(Free): 随网格一起旋转
   - 橙色轨道(Fixed): 保持固定位置
   - 绿色轨道(Pivot): 围绕支点旋转
   - 红色轨道(Rotate): 固定在原地但端点旋转

## 技术栈
- 框架: uni-app X (Vue 3)
- 渲染: Canvas 2D API (W3C 标准)
- 平台: 微信小游戏
- 存储: uni-app X Storage API

## 项目结构
```
drag-up-game/
├── pages/
│   └── index/
│       ├── index.vue          # 游戏主页面
│       └── index.scss        # 页面样式
├── components/
│   ├── game-canvas.vue      # Canvas 游戏组件
│   └── level-select.vue    # 关卡选择组件
├── utils/
│   ├── game-engine.js       # 游戏引擎核心
│   ├── maze.js              # 迷宫/网格逻辑
│   ├── cub.js               # 立方体角色
│   ├── track-segments.js    # 轨道段定义
│   ├── flywheel.js          # 旋转物理系统
│   ├── levels.js            # 关卡数据
│   └── storage.js          # 本地存储封装
├── static/
│   └── levels/             # 关卡配置文件
├── pages.json               # 页面路由配置
├── manifest.json            # 应用配置文件
├── uni.scss                 # 全局样式变量
└── package.json            # 项目依赖
```

## 开发指南

### 环境准备
1. 安装 HBuilderX 4.25+ (支持 uni-app X)
2. 安装微信开发者工具
3. 注册微信小游戏账号

### 运行项目
1. 使用 HBuilderX 打开项目
2. 点击"运行" → "运行到小程序模拟器" → "微信开发者工具"
3. 等待编译完成，自动打开微信开发者工具

### 打包发布
1. 在 HBuilderX 中点击"发行" → "小程序-微信"
2. 等待编译完成
3. 在微信开发者工具中点击"上传"
4. 登录微信公众平台提交审核

## 核心模块说明

### GameEngine (游戏引擎)
- 管理游戏主循环
- 处理用户输入
- 协调各个游戏对象

### Maze (迷宫)
- 解析关卡定义
- 管理轨道连接
- 处理网格旋转

### Cub (立方体)
- 渲染玩家角色
- 处理拖动逻辑
- 检测胜利条件

### TrackSegments (轨道段)
- FreeSegment: 自由轨道
- FixedSegment: 固定轨道
- PivotSegment: 枢轴轨道
- RotateSegment: 旋转轨道

### FlyWheel (旋转轮)
- 物理旋转系统
- 摩擦力和速度控制
- 角度归一化

## 待完成功能
- [ ] 完善关卡解析逻辑 (Maze.parse)
- [ ] 实现完整的立方体拖动逻辑
- [ ] 添加胜利动画效果
- [ ] 实现关卡数据加载
- [ ] 添加音效和背景音乐
- [ ] 优化触摸交互体验
- [ ] 添加更多关卡
- [ ] 实现暂停功能
- [ ] 添加设置页面

## 已知问题
1. 关卡解析逻辑不完整 - 只实现了基本字符解析
2. 立方体拖动逻辑需要完善 - 当前只是简单实现
3. 缺少完整的 50+ 关卡数据

## 贡献指南
欢迎提交 Issue 和 Pull Request!

## 许可证
MIT License

## 联系方式
- 作者: [Your Name]
- Email: [your.email@example.com]
