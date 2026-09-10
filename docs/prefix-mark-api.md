# 前缀角标注册 API

本章节将介绍十周年UI提供的前缀角标注册接口，供外部扩展为自定义武将添加角标。

## 一、功能说明

前缀角标是显示在武将卡左侧的小图标，用于标识武将的版本或系列，如"界"、"神"、"SP"等。

启用条件：用户在十周年UI设置中选择"十周年"风格时生效。

## 二、decadeModule.prefixMark

十周年UI通过 `decadeModule.prefixMark` 对象提供前缀角标的注册接口。

### 1. registerPrefix - 注册单个前缀

```javascript
decadeModule.prefixMark.registerPrefix(prefix, styleName);
```

参数说明：

| 参数      | 类型   | 说明                                      |
| --------- | ------ | ----------------------------------------- |
| prefix    | string | 前缀名称，需与武将的 `_prefix` 翻译一致   |
| styleName | string | 样式名称，对应CSS类名 `.{styleName}-mark` |

返回值：`boolean` - 是否注册成功

示例：

```javascript
// 注册前缀"自定义"，样式名为"custom"
decadeModule.prefixMark.registerPrefix("自定义", "custom");
// 对应CSS类名：.custom-mark
```

### 2. registerPrefixes - 批量注册前缀

```javascript
decadeModule.prefixMark.registerPrefixes(configs);
```

参数说明：

| 参数    | 类型   | 说明                        |
| ------- | ------ | --------------------------- |
| configs | object | `{ 前缀: 样式名 }` 映射对象 |

返回值：`string[]` - 注册成功的前缀列表

示例：

```javascript
decadeModule.prefixMark.registerPrefixes({
	前缀A: "styleA",
	前缀B: "styleB",
	前缀C: "styleC",
});
```

### 3. hasPrefix - 检查前缀是否已注册

```javascript
decadeModule.prefixMark.hasPrefix(prefix);
```

参数说明：

| 参数   | 类型   | 说明     |
| ------ | ------ | -------- |
| prefix | string | 前缀名称 |

返回值：`boolean` - 前缀是否已注册

示例：

```javascript
decadeModule.prefixMark.hasPrefix("界"); // true（内置前缀）
decadeModule.prefixMark.hasPrefix("自定义"); // 取决于是否已注册
```

## 三、CSS样式配置

注册前缀后，需要配合CSS样式才能显示角标图片。

### 1. 样式格式

```css
.player > .{styleName}-mark {
  background-image: url("图片路径");
}
```

### 2. 完整样式示例

```css
/* 自定义角标样式 */
.player > .custom-mark {
	position: absolute;
	top: 100px;
	left: -11px;
	width: 22px;
	height: 34px;
	background-size: 100% 100%;
	background-image: url("extension/我的扩展/image/mark_custom.png");
	pointer-events: none;
	z-index: 87;
}
```

### 3. 图片规格

参考十周年UI内置角标图片：

- 路径：`extension/十周年UI/image/ui/mark/`
- 尺寸：约 22×34 像素
- 格式：PNG（支持透明背景）

## 四、武将前缀配置

角标显示依赖武将的前缀翻译配置。

### 1. 配置格式

在 `lib.translate` 中添加武将前缀：

```javascript
lib.translate["武将名_prefix"] = "前缀名";
```

### 2. 示例

```javascript
// 武将定义
lib.character["mychar"] = ["male", "shu", 4, ["myskill"]];
lib.translate["mychar"] = "自定义武将";

// 前缀配置
lib.translate["mychar_prefix"] = "自定义";
```

## 五、完整示例

### 示例1：为扩展武将添加自定义角标

扩展目录结构：

```
我的扩展/
├── extension.js
├── style.css
└── image/
    └── mark_custom.png
```

extension.js：

```javascript
// 1. 注册前缀
decadeModule.prefixMark.registerPrefix("自定义", "custom");

// 2. 加载CSS
lib.init.css(lib.assetURL + "extension/我的扩展", "style");
```

style.css：

```css
.player > .custom-mark {
	position: absolute;
	top: 100px;
	left: -11px;
	width: 22px;
	height: 34px;
	background-size: 100% 100%;
	background-image: url("image/mark_custom.png");
	pointer-events: none;
	z-index: 87;
}
```

### 示例2：复用已有样式

若自定义前缀想使用已有的角标样式，可直接映射到内置样式名：

```javascript
// 使用"神"的角标样式
decadeModule.prefixMark.registerPrefix("我的神将", "shen");

// 使用"界"的角标样式
decadeModule.prefixMark.registerPrefix("我的界将", "jie");
```

## 六、内置前缀列表

十周年UI已内置以下前缀映射（部分）：

| 前缀 | 样式名 | 前缀 | 样式名 |
| ---- | ------ | ---- | ------ |
| 界   | jie    | 神   | shen   |
| SP   | sp     | OL   | ol     |
| TW   | tw     | 谋   | sb     |
| 新杀 | dc     | 手杀 | mb     |
| 牢   | lao    | 势   | pot    |
| 武   | wu     | 族   | clan   |

完整列表请查看源码 `src/ui/prefixMark.js` 中的 `PREFIX_CONFIGS`。

## 七、注意事项

1. 前缀角标仅在"十周年"风格下显示
2. `styleName` 建议使用英文小写，避免特殊字符
3. CSS样式需要在十周年UI加载后生效
4. 国战模式下，角标在武将亮将后才会显示
5. 若前缀已存在，`registerPrefix` 会覆盖原有映射
