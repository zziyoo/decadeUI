# 动态皮肤配置说明

本章节将介绍十周年UI的动态皮肤系统配置方法。

## 一、功能说明

动态皮肤是基于Spine骨骼动画的武将皮肤系统，可以让武将立绘动起来。

- 打开动态皮肤开关后直接替换原有武将皮肤
- 动态皮肤参数表：https://docs.qq.com/sheet/DS2Vaa0ZGWkdMdnZa
- 相关文件放到 `十周年UI/assets/dynamic` 目录下

启用条件：用户在确保安装对应的《皮肤切换》和《千幻铃音》扩展前提下，在十周年UI设置中开启"动态皮肤"选项。

## 二、文件位置

| 文件类型     | 位置                       |
| ------------ | -------------------------- |
| 参数配置文件 | `src/skins/dynamicSkin.js` |
| 骨骼资源文件 | `assets/dynamic/`          |

## 三、配置格式

编辑 `src/skins/dynamicSkin.js` 中的 `dynamicSkinConfig` 对象：

```javascript
武将名: {
  皮肤名: {
    name: "xxx",           // 必填，骨骼名称（不带.skel后缀）
    action: "xxx",         // 播放动作，一般是 DaiJi
    x: [10, 0.5],          // left: calc(10px + 50%)，默认[0, 0.5]
    y: [10, 0.5],          // bottom: calc(10px + 50%)，默认[0, 0.5]
    scale: 0.5,            // 缩放大小，默认1
    angle: 0,              // 旋转角度，默认0
    speed: 1,              // 播放速度，默认1
    hideSlots: [],         // 隐藏的部件
    clipSlots: [],         // 裁剪的部件（仅露头动皮）
    background: "xxx.jpg", // 背景图片
  }
}
```

## 四、资源文件

### 1. 文件结构

每个动态皮肤需要三个文件：

```
assets/dynamic/
└── 武将名/
    └── 皮肤名/
        ├── xxx.skel    # 骨骼数据文件
        ├── xxx.atlas   # 图集描述文件
        └── xxx.png     # 纹理图片
```

### 2. 路径对应关系

`name` 参数对应 `assets/dynamic/` 下的路径：

| name 参数              | 实际文件路径                               |
| ---------------------- | ------------------------------------------ |
| `mychar/默认/daiji`    | `assets/dynamic/mychar/默认/daiji.skel`    |
| `卢弈/姝丽风华/daiji2` | `assets/dynamic/卢弈/姝丽风华/daiji2.skel` |

## 五、添加新动皮

### 第一步：准备Spine骨骼文件

- 使用Spine软件导出骨骼动画
- 导出格式：二进制(.skel) + 图集(.atlas + .png)
- 版本要求：Spine 3.8兼容格式

### 第二步：放置资源文件

```
assets/dynamic/mychar/皮肤名/
├── daiji.skel
├── daiji.atlas
└── daiji.png
```

### 第三步：添加参数配置

编辑 `src/skins/dynamicSkin.js`：

```javascript
export const dynamicSkinConfig = {
	mychar: {
		皮肤名: {
			name: "mychar/皮肤名/daiji",
			x: [0, 0.5],
			y: [0, 0.45],
			scale: 0.8,
			speed: 1,
		},
	},
};
```

### 第四步：共享皮肤（可选）

在 `setupDynamicSkin` 函数中添加共享配置：

```javascript
const dynamicSkinExtend = {
	re_luyi: decadeUI.dynamicSkin.luyi,
};
decadeUI.get.extend(decadeUI.dynamicSkin, dynamicSkinExtend);
```

## 六、配置示例

```javascript
luyi: {
  姝丽风华: {
    name: "卢弈/姝丽风华/daiji2",
    shan: "play3",
    x: [0, 0.438],
    y: [0, 0.396],
    angle: -2,
    scale: 1.07,
    shizhounian: true,
    // 出场动画
    chuchang: {
      name: "卢弈/姝丽风华/chuchang",
      x: [0, 0.777],
      y: [0, 0.36],
      scale: 0.7,
      action: "play",
    },
    // 攻击动画
    gongji: {
      name: "卢弈/姝丽风华/chuchang2",
      x: [0, 0.812],
      y: [0, 0.254],
      scale: 0.8,
      action: "gongji",
    },
    // 特殊技能动画
    teshu: {
      name: "卢弈/姝丽风华/chuchang2",
      x: [0, 0.812],
      y: [0, 0.254],
      scale: 0.8,
      action: "jineng",
    },
    // 背景动画
    beijing: {
      name: "卢弈/姝丽风华/beijing",
      x: [0, 0.29],
      y: [0, 0.5],
      scale: 0.4,
    },
    // 指示线特效
    zhishixian: {
      name: "卢弈/姝丽风华/shouji2",
      scale: 0.5,
      speed: 0.8,
      delay: 0.4,
      effect: {
        name: "卢弈/姝丽风华/shouji",
        scale: 0.5,
        speed: 0.8,
        delay: 0.25,
      },
    },
  },
}
```

## 七、调试方法

控制台执行：

```javascript
// 停止当前动皮
game.me.stopDynamic();

// 测试新配置
game.me.playDynamic({
	name: "xxx",
	loop: true,
	x: [0, 0.5],
	y: [0, 0.5],
	scale: 0.5,
	angle: 0,
	speed: 1,
	hideSlots: [],
	clipSlots: [],
});
```

## 八、注意事项

1. 动态皮肤需要WebGL支持，部分老旧设备可能无法使用
2. 同时显示的动皮数量过多会造成严重卡顿
3. 骨骼文件需要使用Spine 3.8兼容格式导出
4. 大尺寸纹理图片会影响性能，建议优化图片大小
