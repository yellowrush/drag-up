# 修复 drag-up 游戏拖拽与旋转

## 已完成

1. **修复小熊无法拖动**
   - `src/utils/game-engine.js` 的 `loadLevel()` 中，加载关卡后没有初始化小熊位置，导致 `getIsInsideCub()` 永远返回 false。
   - 现在根据 `maze.startPosition` 调用 `Cub.setPeg()` 和 `Cub.setOffset()`，让小熊出现在正确位置。

2. **修复画布旋转不响应**
   - 将 canvas 从 fixed 全屏改为 flex 容器后，H5 的 `pointermove` 在 canvas 上更新不可靠。
   - 重写 `src/components/game-canvas.vue` 的输入处理：使用 active pointer 状态，并注册 window 级别的 `pointermove/pointerup`、`mousemove/mouseup`、`touchmove/touchend` 作为后备，确保拖拽和旋转持续更新。

3. **防止浏览器默认手势干扰**
   - 在 `game-wrapper` 和 `index.vue` 的 `.page` 上增加 `user-select: none` 和 `touch-action: none`。

4. **验证构建**
   - `npm run build:h5` 通过（Compiler version: 5.13 vue3）。

## 请用户测试

在 Xbuilder 终端或命令行运行：

```bash
cd C:\app\drag-up
npm run dev:h5
```

然后在浏览器中打开终端输出的地址，测试：
- 点击小熊并拖动，应该能沿轨道移动
- 点击画布空白处并拖动，应该能旋转整个迷宫
- 白色/灰色扇形（rotate handle）应随拖动实时变化

## 新增修复（H5 画布空白）

### 问题
浏览器报错：
```
TypeError: el.getContext is not a function
    at initH5 (game-canvas.vue:73)
```
且画布内没有任何游戏内容（小熊、迷宫、星星等）。

### 根因
uni-app H5 会把 `<canvas id="gameCanvas">` 编译成 `<uni-canvas>` 自定义组件，并在内部再生成一个真正的 `<canvas>` 元素。`document.getElementById('gameCanvas')` 拿到的是外层包装节点，它没有 `getContext` 方法，导致初始化失败，游戏引擎无法启动。

### 修复
修改 `src/components/game-canvas.vue` 的 `initH5()`：
1. 先用 `getElementById` 获取节点；
2. 如果该节点没有 `getContext`，则在其子节点中查找真正的 `<canvas>`；
3. 如果仍然找不到真实 canvas，打印错误并退出，避免后续崩溃；
4. 尺寸计算也改为优先使用 `.game-wrapper` / `.game-area` 的 `getBoundingClientRect()`，避免用 wrapper 元素算错。

### 验证
`npx uni build --platform h5` 编译通过。

## 再次修复：拖动 / 旋转仍无响应

### 问题
游戏画面能正常渲染（能看到小熊、星星、轨道），但点击小熊无法拖动，点击空白处迷宫也不旋转。初次点击时会出现白色旋转扇形（rotate handle），说明 `pointerdown` 已触发，但后续没有更新。

### 根因
uni-app H5 的 `<canvas>` 组件实际渲染为 `<uni-canvas>` 包装节点。Vue 模板上的 `@pointerdown` 等事件绑定在包装上，而 `setPointerCapture` 被调用在包装节点上可能无效；window 级别的 `pointermove` 后备监听器也没有可靠地收到事件，导致拖拽和旋转无法持续更新。

### 修复
修改 `src/components/game-canvas.vue`：
1. 在 `initH5()` 找到真实 `<canvas>` 后，把 `pointerdown/move/up/cancel`、`mousedown/move/up`、`touchstart/move/end` 监听器直接绑定到真实 canvas 元素上；
2. `setPointerCapture` 改为始终作用在真实 canvas 元素（`h5CanvasNode.value`），而不是 `e.target`；
3. 如果 canvas 容器初始尺寸为 0，延迟到下一帧重试；
4. 在 `game-canvas.vue` 和 `game-engine.js` 关键输入路径增加临时日志，方便在浏览器控制台观察事件是否被正确分发。

### 文件修改
- `src/components/game-canvas.vue`
- `src/utils/game-engine.js`

### 验证
`npx uni build --platform h5` 编译通过。

## 再次修复：点击空白处无日志 / 坐标显示为 `{x: 0, y: 0, id: undefined}`

### 问题
- 点击小熊时 `pointerdown` 日志打印 `{x: 0, y: 0, id: undefined}`，引擎判定 `isInsideCub: false`，小熊无法进入拖动状态。
- 点击画布空白处完全没有日志，迷宫无法旋转。

### 根因
1. H5 模板上的 `@pointerdown` 等事件被 uni-app 绑定到 `<uni-canvas>` 包装节点，传进来的事件对象不是原生 PointerEvent，缺少 `clientX/clientY/pointerId`。
2. 事件监听器只绑定在真实 `<canvas>` 上，但 flex 布局后 canvas 的可点击区域可能未覆盖整个 `.game-wrapper`，导致空白处点击丢失。
3. `game-engine.js` 的 `getCanvasMazePosition()` 使用缓存的 `canvasLeft/canvasTop`，布局变化后坐标偏移。

### 修复
- `src/components/game-canvas.vue`：
  - 移除 H5 模板中的 `@pointerdown/@touchstart/@mousedown` 绑定。
  - 在 `initH5()` 中把原生 `pointerdown/move/up/cancel`、`mousedown/move/up`、`touchstart/move/end` 监听器直接绑定到 `.game-wrapper` 上，确保整个游戏区域都能捕获输入。
  - 同时继续绑定到真实 `<canvas>` 作为后备。
  - `getPointer()` 增加对 `e.detail` 和缺失 `pointerId` 的兜底处理，使用 `clientX/clientY` 作为 viewport 坐标。
- `src/utils/game-engine.js`：
  - `getCanvasMazePosition()` 每次调用都使用 live `getBoundingClientRect()` 计算 canvas 偏移。
- 在 `initH5()` 增加 wrapper 和 canvas 的 bounding rect 日志，方便确认事件捕获区域。

### 文件修改
- `src/components/game-canvas.vue`
- `src/utils/game-engine.js`

### 验证
`npx uni build --platform h5` 编译通过。

## 本次修复：画布居中、边缘旋转错位、小熊拖拽

### 问题
1. 画布边缘点击旋转时初始位置有时错位。
2. 小熊仍无法拖拽。
3. 游戏内容不在画布中心。

### 根因
1. **事件对象被 uni-app 包装**：`game-canvas.vue` 把事件监听器绑在 `.game-wrapper` 上，H5 的 `<view>` 会被编译为自定义元素，传进来的事件不是原生 PointerEvent，`clientX/clientY/pointerId` 经常丢失，导致日志出现 `{x:0,y:0,id:undefined}`。
2. **坐标转换不一致**：`game-engine.js` 里混用 `pageX/pageY` 和缓存的 `canvasLeft/canvasTop`，偏移容易出错。
3. **迷宫中心不是画布中心**：`setupCanvas()` 的 `mazeCenter.y` 用了 `Math.min(gridSize*8, h/2)`，强制把内容限制在上方。

### 修复
- `src/components/game-canvas.vue`：只把原生事件监听器绑定到**真实 `<canvas>` 元素**，避免 wrapper 事件拦截；`setPointerCapture` 也只在真实 canvas 上调用。
- `src/utils/game-engine.js`：统一使用 viewport CSS pixels `{x, y}`，`getCanvasMazePosition()` 每次调用 live `getBoundingClientRect()` 计算 canvas 偏移。
- `src/utils/game-engine.js`：`mazeCenter.y` 改为 `h/2`，并在 `loadLevel()` 后根据 `maze.gridMax` 重新计算，确保内容真正居中且不超出画布。

### 文件修改
- `src/components/game-canvas.vue`
- `src/utils/game-engine.js`

### 验证
`npx uni build --platform h5` 编译通过。

## 本次修复：内容全部挤在左上角、无法拖动

### 问题
- 初始化成功，日志显示 `canvasRect` 和 `wrapperRect` 尺寸正常（约 699×729）。
- 但小熊、轨道、星星全部出现在画布左上角，无法拖动，空白处旋转也异常。

### 根因
uni-app H5 会把 `<canvas>` 编译成 `<uni-canvas>` 外层包裹。代码把 inner canvas 的 CSS 设为 `width/height: 100%`，但中间父级（`<uni-canvas>`）没有明确高度，导致 `100%` 失效；canvas 实际 CSS 尺寸退回到 drawing buffer 的物理像素（`w * dpr ≈ 874×912`），而逻辑坐标系仍按 `ctx.scale(dpr)` 期望的 CSS 像素（`699×729`）绘制。结果所有内容被缩到左上角，且拖拽/旋转的碰撞检测基于错误坐标系全部失效。

### 修复
- `src/components/game-canvas.vue` 的 `initH5()`：
  - 把 real canvas 到 `.game-wrapper` 之间的所有父级都设为 `position: relative; width: 100%; height: 100%; overflow: hidden`。
  - real canvas 设为 `position: absolute; top: 0; left: 0; width: 100%; height: 100%`，确保它真正填满 `.game-wrapper`。
- 新增 `resizeH5Canvas()` 与 `window.addEventListener('resize', ...)`，窗口变化时重新按 wrapper 尺寸生成 drawing buffer、重设 `ctx.scale(dpr)`，并更新 engine 的 canvas 引用和 `setupCanvas()`。

### 文件修改
- `src/components/game-canvas.vue`

### 验证
`npx uni build --platform h5` 编译通过。

## 测试方式

```bash
cd C:\app\drag-up
npm run dev:h5
```

在浏览器打开终端输出的地址，打开控制台确认：
- `canvasRect.width/height` 应等于 `wrapperRect.width/height`（约 699×729）。
- 小熊、轨道、星星应位于画布中心。
- 点击小熊可拖动，点击空白处可旋转迷宫。

如果还有问题，请把浏览器控制台日志发给我。

## 本次修复：H5 画布只显示 1/4、内容仍挤在左上角

### 问题
- 日志显示 `.game-wrapper` 尺寸为 `879×729`（合理），但 canvas 实际显示区域只有约 1/4。
- 小熊、轨道、星星仍然挤在左上角，无法拖动，空白处旋转也不正常。
- 在 DevTools 中调整 `left` / `right` 才能移动 canvas 位置。

### 根因
uni-app H5 的 `<canvas>` 模板会被编译为 `<uni-canvas>` 自定义组件，组件内部会再次渲染一个 `<canvas>`，并可能自带限制性的 CSS（例如 `max-width`、`max-height` 或固定的默认尺寸）。我们之前试图在 `<uni-canvas>` 生成后再覆盖 inner canvas 的样式，但 uni-app 的组件逻辑和样式优先级仍然会把 canvas 的**实际可见区域**限制到 1/4，并且 drawing buffer 与 CSS 像素不配对，导致坐标系错乱。

### 修复
彻底改变 H5 的 canvas 创建方式：
- `src/components/game-canvas.vue` 的 template 中，H5 不再写 `<canvas>`，而是放一个 `<view id="canvasHost" class="canvas-host">` 容器。
- `initH5()` 在容器内**手动创建原生 `<canvas>` 元素**并插入，这样完全绕过 uni-app 的 `<uni-canvas>` 包装，避免样式和尺寸冲突。
- 新 canvas 的 CSS 尺寸明确使用像素值（`w + 'px'`, `h + 'px'`），drawing buffer 使用 `w * dpr` / `h * dpr`，然后 `ctx.scale(dpr, dpr)`，确保逻辑坐标系与 CSS 像素 1:1 对应。
- 使用 `ResizeObserver` 监听 `#canvasHost` 的尺寸变化，发生布局变化时自动重新创建/调整 canvas 并更新 engine。
- 同时统一 `App.vue` 和 `pages/index/index.vue` 的页面布局：都使用 `flex-direction: column`，`top-bar` 为 `flex-shrink: 0`，`.game-area` 为 `flex: 1`，保证 canvas 容器始终填满标题栏下方的剩余空间。

### 文件修改
- `src/components/game-canvas.vue`
- `src/App.vue`

### 验证
`npx uni build --platform h5` 编译通过。

## 本次修复：H5 画布内容消失（mazeCenter.y 为 NaN）

### 问题
- 日志显示 `mazeCenter.y: NaN`。
- 画布内游戏内容（小熊、轨道、星星）全部消失。

### 根因
`src/utils/game-engine.js` 的 `setupCanvas()` 中计算迷宫中心安全边界时使用了 `this.gridMax`：

```javascript
var maxMazeRadius = this.gridSize * (this.gridMax + 2)
```

但 `GameEngine` 类本身没有 `gridMax` 属性，`gridMax` 是属于 `this.maze` 的。`undefined + 2` 得到 `NaN`，后续 `Math.max/min` 比较也返回 `NaN`，最终 `mazeCenter.y` 变成 `NaN`。`ctx.translate(center.x, NaN)` 把所有绘制内容移动到不可见区域，所以画布看起来是空的。

### 修复
`src/utils/game-engine.js` 的 `setupCanvas()`：
- 使用 `this.maze && this.maze.gridMax` 读取正确的网格半径。
- 在迷宫尚未加载时（`this.maze == null`），使用默认兜底值 `6`，避免首次初始化就得到 `NaN`。
- 等 `loadLevel()` 完成并再次调用 `setupCanvas()` 时，会用真实的 `maze.gridMax` 重新计算居中位置。

### 文件修改
- `src/utils/game-engine.js`

### 验证
`npx uni build --platform h5` 编译通过。

## 本次修复：Vue 3 响应式代理导致 canvas 内容不显示

### 问题
- 日志显示 `mazeCenter: Proxy(Object)`，说明 `GameEngine` 实例被 Vue 3 深度响应式代理。
- 画布内仍然没有小熊、轨道、星星。
- `initH5` 被触发两次。

### 根因
Vue 3 的 `ref()` 默认会对对象进行递归响应式代理。当 `GameEngine` 实例被赋值给 `ref` 后，它内部的 `mazeCenter`、`ctx`、`maze`、`cub` 等对象都会被 Vue 包装成 `Proxy`。Canvas 2D 上下文和坐标对象被代理后，绘制逻辑异常（甚至可能导致整个组件被 Vue 重新渲染，触发 `initH5` 再次执行），最终游戏内容无法显示。

### 修复
`src/components/game-canvas.vue`：
- 将 `engine` 改为 `shallowRef`，避免深度响应式代理。
- 将 `h5CanvasNode`、`h5ResizeObserver`、`h5ResizeCallback` 也改为 `shallowRef`。
- 创建 `GameEngine` 实例时用 `markRaw()` 包装，使其内部状态完全不被 Vue 响应式化。
- H5 和 MP-WEIXIN 两条初始化路径都使用 `markRaw(new GameEngine(...))`。

### 文件修改
- `src/components/game-canvas.vue`

### 验证
`npx uni build --platform h5` 编译通过。

## 测试方式

```bash
cd C:\app\drag-up
npm run dev:h5
```

在浏览器打开终端输出的地址，打开控制台确认：
- 新的 `[game-canvas] H5 init` 日志里 `mazeCenter.y` 不再是 `NaN`。
- 小熊、轨道、星星位于画布中心。
- 点击小熊可拖动，点击空白处可旋转迷宫。

如果还有问题，请把浏览器控制台日志发给我。
