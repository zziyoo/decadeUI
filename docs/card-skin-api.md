# 卡牌皮肤注册 API

本章节将介绍十周年UI提供的卡牌皮肤注册接口，供外部扩展为自定义卡牌添加皮肤。

## 一、registerDecadeCardSkin

十周年UI提供全局函数 `registerDecadeCardSkin`，用于注册卡牌皮肤。该函数可在十周年UI加载前后调用。

### 1. 基础用法

```javascript
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "decade",
	cardNames: ["mycard1", "mycard2"],
});
```

此写法将注册扩展 `我的扩展` 中的卡牌 `mycard1` 和 `mycard2` 的十周年风格皮肤。

### 2. 参数说明

| 参数          | 类型     | 必填 | 默认值   | 说明                           |
| ------------- | -------- | ---- | -------- | ------------------------------ |
| extensionName | string   | ✓    | -        | 扩展名称，用于定位图片路径     |
| skinKey       | string   | ✗    | 'decade' | 皮肤类型，决定使用哪套皮肤风格 |
| cardNames     | string[] | ✗    | -        | 卡牌名称列表，推荐指定         |
| extension     | string   | ✗    | 'png'    | 图片文件扩展名                 |

### 3. 皮肤类型 (skinKey)

十周年UI内置以下皮肤类型：

| skinKey  | 说明         | 对应设置选项   |
| -------- | ------------ | -------------- |
| decade   | 十周年风格   | 十周年卡牌样式 |
| caise    | 彩色风格     | 彩色卡牌样式   |
| online   | OL风格       | OL卡牌样式     |
| gold     | 手杀金卡风格 | 手杀金卡样式   |
| bingkele | 哈基米风格   | 哈基米卡牌样式 |

用户在十周年UI设置中选择对应的卡牌样式后，会自动使用该类型的皮肤。

### 4. 图片路径规则

图片路径由以下规则生成：

```
extension/{extensionName}/image/card-skins/{skinKey}/{cardName}.{extension}
```

示例：

```javascript
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "decade",
	cardNames: ["sha", "shan"],
});
```

对应图片路径：

- `extension/我的扩展/image/card-skins/decade/sha.png`
- `extension/我的扩展/image/card-skins/decade/shan.png`

## 二、注册方式

### 1. 指定卡牌列表（推荐）

明确指定要注册的卡牌名称，性能最优：

```javascript
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "decade",
	cardNames: ["mycard1", "mycard2", "mycard3"],
});
```

### 2. 自动扫描目录

不指定 `cardNames` 时，会自动扫描目录获取卡牌列表：

```javascript
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "decade",
});
```

注意：自动扫描会占用额外资源，建议仅在开发调试时使用。

## 三、调用时机

### 1. 在十周年UI加载前调用

若扩展先于十周年UI加载，调用会被加入队列，待十周年UI初始化后自动处理：

```javascript
// extension.js (precontent)
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "decade",
	cardNames: ["mycard1"],
});
```

### 2. 在十周年UI加载后调用

十周年UI加载后，调用会立即生效：

```javascript
// extension.js (content)
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "decade",
	cardNames: ["mycard1"],
});
```

## 四、完整示例

### 示例1：为自定义卡牌添加十周年皮肤

扩展目录结构：

```
我的扩展/
├── extension.js
└── image/
    └── card-skins/
        └── decade/
            ├── mysha.png
            └── myshan.png
```

extension.js：

```javascript
// precontent 或 content 中均可
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "decade",
	cardNames: ["mysha", "myshan"],
});
```

### 示例2：同时注册多种皮肤风格

```javascript
// 十周年风格
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "decade",
	cardNames: ["mycard"],
});

// OL风格
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "online",
	cardNames: ["mycard"],
});

// 彩色风格
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "caise",
	cardNames: ["mycard"],
});
```

对应目录结构：

```
我的扩展/
└── image/
    └── card-skins/
        ├── decade/
        │   └── mycard.png
        ├── online/
        │   └── mycard.png
        └── caise/
            └── mycard.png
```

### 示例3：使用JPG格式图片

```javascript
registerDecadeCardSkin({
	extensionName: "我的扩展",
	skinKey: "decade",
	cardNames: ["mycard"],
	extension: "jpg",
});
```

## 五、注意事项

1. `extensionName` 必须与扩展文件夹名称完全一致
2. `cardNames` 中的名称必须与卡牌的 `name` 属性一致
3. 图片文件名必须与卡牌名称一致（区分大小写）
4. 同名文件十周年UI扩展自带皮肤优先
5. 建议图片尺寸参考十周年UI内置卡牌皮肤
