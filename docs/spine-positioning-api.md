# 骨骼动画定位系统说明

本章节将介绍十周年UI的Spine骨骼动画定位系统的工作原理和使用方法。

## 一、功能概述

骨骼动画定位系统负责计算和管理Spine动画在画布上的位置、缩放、旋转等变换属性。支持两种定位模式：

- **绝对定位**：基于画布尺寸的像素定位
- **相对定位**：基于参考元素的比例定位

## 二、核心文件

| 文件                 | 说明                               |
| -------------------- | ---------------------------------- |
| `APNode.js`          | 动画节点类，管理单个骨骼的变换状态 |
| `AnimationPlayer.js` | 动画播放器，负责WebGL渲染          |
| `TimeStep.js`        | 时间步进类，处理属性过渡动画       |
| `utils.js`           | 工具函数，包含DPR计算等            |

## 三、定位参数格式

### 1. calc 计算函数

定位系统的核心是 `calc` 函数，支持两种格式：

```javascript
const calc = (value, refer) => {
	return Array.isArray(value) ? value[0] + value[1] * refer : value;
};
```

### 2. 数组格式 `[offset, ratio]`

```javascript
x: [10, 0.5]; // 计算结果: 10 + 0.5 * referWidth
y: [0, 0.3]; // 计算结果: 0 + 0.3 * referHeight
```

- `offset`：像素偏移量
- `ratio`：相对比例(0-1)，乘以参考尺寸

**等效CSS表达式**：`calc(10px + 50%)`

### 3. 数字格式

```javascript
x: 100; // 计算结果: 100
```

纯像素值，直接使用。

### 4. 常用定位示例

| 位置     | x 参数      | y 参数       | 说明         |
| -------- | ----------- | ------------ | ------------ |
| 正中心   | `[0, 0.5]`  | `[0, 0.5]`   | 水平垂直居中 |
| 左下角   | `[0, 0]`    | `[0, 0]`     | 原点位置     |
| 右上角   | `[0, 1]`    | `[0, 1]`     | 右上角       |
| 偏左居中 | `[0, 0.3]`  | `[0, 0.5]`   | 水平30%位置  |
| 固定偏移 | `[20, 0.5]` | `[-10, 0.5]` | 居中后微调   |

## 四、参考节点定位

### 1. referNode 参数

当需要相对某个DOM元素定位时，使用 `referNode` 参数：

```javascript
animation.playSpine({
	name: "effect_xxx",
	referNode: playerElement, // 参考的DOM元素
	referFollow: true, // 是否跟随元素移动
	x: [0, 0.5],
	y: [0, 0.5],
	scale: 0.5,
});
```

### 2. 边界计算 (\_calcReferBounds)

系统会自动计算参考元素的边界：

```javascript
{
    x: rect.left,           // 元素左边距
    y: bodyHeight - rect.bottom,  // 转换为WebGL坐标系（Y轴向上）
    width: rect.width,      // 元素宽度
    height: rect.height     // 元素高度
}
```

### 3. 皮肤扩展兼容

模块化版本新增了对《皮肤切换》扩展的兼容处理：

```javascript
// 检测getBoundingClientRect是否被修改
const isNative = HTMLElement.prototype.getBoundingClientRect.toString().includes("[native code]");

if (isNative) {
	// 原生函数，按标准流程处理zoom
} else {
	// 被修改的函数，需要补偿documentZoom
}
```

## 五、DPR适配机制

### 1. useNewDpr 判断

针对高版本浏览器的zoom处理优化：

```javascript
// Chrome 128+ 或 Firefox 126+ 启用新DPR计算
export const useNewDpr = (browserInfo[0] === "chrome" && browserInfo[1] >= 128) || (browserInfo[0] === "firefox" && browserInfo[1] >= 126);
```

### 2. DPR计算流程

```javascript
const zoom = useNewDpr ? parseFloat(window.getComputedStyle(document.body).zoom) : 1;
const dpr = e.dpr / zoom;
```

### 3. 父元素zoom累积

当存在嵌套zoom时，需要累积计算：

```javascript
let zoom = 1,
	ele = domNode;
while (ele && ele !== document.body) {
	zoom *= parseFloat(window.getComputedStyle(ele).zoom);
	ele = ele.parentElement;
}
```

## 六、变换属性

### 1. 基础变换

| 属性        | 类型         | 默认值   | 说明               |
| ----------- | ------------ | -------- | ------------------ |
| `x`         | number/array | -        | X坐标              |
| `y`         | number/array | -        | Y坐标              |
| `scale`     | number       | `1`      | 缩放比例           |
| `angle`     | number       | `0`      | 旋转角度(度)       |
| `opacity`   | number       | `1`      | 透明度(0-1)        |
| `width`     | number/array | -        | 指定宽度(自动缩放) |
| `height`    | number/array | -        | 指定高度(自动缩放) |
| `speed`     | number       | `1`      | 播放速度           |
| `loop`      | boolean      | `false`  | 是否循环播放       |
| `loopCount` | number       | -        | 循环次数限制       |
| `action`    | string       | 默认动作 | 播放的动画动作名   |

### 2. 翻转属性

| 属性    | 类型    | 说明     |
| ------- | ------- | -------- |
| `flipX` | boolean | 水平翻转 |
| `flipY` | boolean | 垂直翻转 |

### 3. 裁剪属性

```javascript
clip: {
    x: [0, 0],
    y: [0, 0],
    width: [0, 1],
    height: [0, 1]
}
```

### 4. 插槽控制

| 属性          | 类型     | 说明                       |
| ------------- | -------- | -------------------------- |
| `hideSlots`   | string[] | 隐藏的插槽名称列表         |
| `clipSlots`   | string[] | 裁剪的插槽（仅露头动皮用） |
| `disableMask` | boolean  | 禁用遮罩                   |

### 5. 回调函数

| 属性         | 类型            | 说明           |
| ------------ | --------------- | -------------- |
| `onupdate`   | function        | 每帧更新时回调 |
| `oncomplete` | function/string | 动画完成时回调 |

## 七、动作控制

### 1. 切换动作

```javascript
const node = animation.playSpine({ name: "xxx", action: "DaiJi" });

// 切换到其他动作，500ms过渡
node.setAction("GongJi", 500);

// 重置为默认动作
node.resetAction(300);
```

### 2. 获取动作列表

```javascript
const actions = animation.getSpineActions("effect_xxx");
// 返回: [{ name: "DaiJi", duration: 2.5 }, { name: "GongJi", duration: 1.0 }]
```

## 八、过渡动画

### 1. 过渡方法

```javascript
const node = animation.playSpine({ name: "xxx" });

// 渐变透明度
node.fadeTo(0.5, 500); // 500ms内变为50%透明

// 移动位置
node.moveTo([0, 0.3], [0, 0.6], 300);

// 缩放
node.scaleTo(1.5, 200);

// 旋转
node.rotateTo(45, 400);
```

所有过渡方法返回 `this`，支持链式调用：

```javascript
node.fadeTo(1, 300).moveTo([0, 0.5], [0, 0.5], 300).scaleTo(1.2, 300);
```

### 2. 缓动函数

使用三次贝塞尔曲线缓动（CSS ease 曲线）：

```javascript
// 默认缓动参数 cubic-bezier(0.25, 0.1, 0.25, 1)
const percent = ease(Math.min(time / duration, 1));
const current = lerp(start, end, percent);
```

## 九、MVP矩阵变换

渲染时按以下顺序应用变换：

1. **正交投影** - `ortho2d(0, 0, width, height)`
2. **位移** - `translate(x, y, 0)`
3. **缩放** - `scale(renderScale, renderScale, 0)`
4. **旋转** - `rotate(angle, 0, 0, 1)`

```javascript
this.mvp.ortho2d(0, 0, canvas.width, canvas.height);
this._applyTranslation(renderX, renderY);
if (renderScale !== 1) this.mvp.scale(renderScale, renderScale, 0);
if (this.renderAngle) this.mvp.rotate(this.renderAngle, 0, 0, 1);
```

## 十、调试方法

### 1. 控制台测试定位

```javascript
// 获取动画播放器
const anim = decadeUI.animation;

// 播放测试动画
const node = anim.playSpine({
	name: "effect_xxx",
	x: [0, 0.5],
	y: [0, 0.5],
	scale: 0.5,
	loop: true,
});

// 查看渲染状态
console.log({
	renderX: node.renderX,
	renderY: node.renderY,
	renderScale: node.renderScale,
	referBounds: node.referBounds,
});

// 停止动画
anim.stopSpine(node);
```

### 2. 相对元素定位测试

```javascript
// 相对玩家元素播放
anim.playSpine({
	name: "effect_xxx",
	referNode: game.me,
	x: [0, 0.5],
	y: [0, 0.5],
	scale: 0.5,
});
```

## 十一、注意事项

1. **坐标系差异**：WebGL坐标系Y轴向上，与CSS坐标系相反
2. **DPR影响**：所有像素值都会乘以设备像素比，高分屏需注意
3. **zoom兼容**：Chrome 128+和Firefox 126+对CSS zoom的处理有变化
4. **皮肤扩展**：《皮肤切换》扩展会修改`getBoundingClientRect`，系统已做兼容
5. **性能考虑**：`referFollow: true`会每帧重新计算边界，有性能开销
