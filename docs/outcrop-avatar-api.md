# 露头头像配置说明

本章节将介绍十周年UI的露头头像系统，支持扩展按约定目录结构提供露头图。

## 一、功能说明

露头头像是将武将立绘裁剪为头部特写的显示方式，支持懒加载和请求节流，避免大量并发请求导致卡顿。

启用条件：用户在十周年UI设置中选择露头样式（十周年/手杀）。

## 二、文件位置

| 露头样式             | 子目录名 | 资源路径                    |
| -------------------- | -------- | --------------------------- |
| 十周年 (shizhounian) | dcloutou | `image/character/dcloutou/` |
| 手杀 (shousha)       | ssloutou | `image/character/ssloutou/` |

## 三、目录结构

```
十周年UI/image/character/
├── dcloutou/          # 十周年风格露头图
│   ├── caocao.jpg
│   ├── liubei.jpg
│   └── ...
├── ssloutou/          # 手杀风格露头图
│   ├── caocao.jpg
│   ├── liubei.jpg
│   └── ...
└── lihui/             # 立绘图（技能特效用）
```

## 四、外部扩展支持

外部扩展可以按约定目录结构提供自己武将的露头图，十周年UI会自动查找。

### 查找顺序

1. 武将所属扩展的露头图目录
2. 十周年UI目录的露头图

### 扩展目录结构

```
我的扩展/
└── image/
    └── character/
        ├── dcloutou/      # 十周年风格露头图
        │   └── mychar.jpg
        └── ssloutou/      # 手杀风格露头图
            └── mychar.jpg
```

### 路径生成规则

```javascript
// 扩展目录
extension / { 扩展名 } / image / character / { 子目录 } / { 武将名 }.jpg;

// 十周年UI目录（回退）
extension / 十周年UI / image / character / { 子目录 } / { 武将名 }.jpg;
```

示例：武将 `mychar` 属于扩展 `我的扩展`，十周年风格露头图路径：

```
extension/我的扩展/image/character/dcloutou/mychar.jpg
```

## 五、武将名称解析

露头图查找时会自动解析武将的实际名称：

| 优先级 | 来源                      | 说明                 |
| ------ | ------------------------- | -------------------- |
| 1      | img属性                   | 从图片路径提取武将名 |
| 2      | trashBin中的character引用 | `character:xxx` 格式 |
| 3      | 武将本身名称              | 默认使用武将ID       |

示例：

```javascript
// 武将定义
lib.character["mychar"] = {
	img: "extension/我的扩展/image/character/realname.jpg",
};
// 露头图查找名称为 realname，而非 mychar
```

## 六、API接口

十周年UI在 `decadeUI` 对象上暴露以下方法：

### 1. applyOutcropAvatar

应用露头头像到节点：

```javascript
await decadeUI.applyOutcropAvatar(characterName, node, outcropStyle);
```

| 参数          | 类型        | 说明             |
| ------------- | ----------- | ---------------- |
| characterName | string      | 武将名称         |
| node          | HTMLElement | 目标节点         |
| outcropStyle  | string      | 露头样式（可选） |

返回值：`Promise<boolean>` - 是否成功应用露头图

### 2. updateOutcropAvatar

更新单个玩家的露头头像：

```javascript
await decadeUI.updateOutcropAvatar(player, outcropStyle);
```

### 3. updateAllOutcropAvatars

更新所有玩家的露头头像：

```javascript
await decadeUI.updateAllOutcropAvatars(outcropStyle);
```

### 4. registerLazyOutcrop

注册节点进行懒加载：

```javascript
decadeUI.registerLazyOutcrop(node, characterName);
```

### 5. clearOutcropCache

清除图片缓存：

```javascript
decadeUI.clearOutcropCache();
```

## 七、图片规格

- 格式：JPG
- 命名：`{武将名}.jpg`

## 八、注意事项

1. 露头图文件名必须与武将名称一致（区分大小写）
2. 支持懒加载，进入视口时才加载图片
3. 请求节流控制，最多4个并发请求
4. 图片存在性会被缓存，避免重复检查
5. 若露头图不存在，会自动回退到本体默认头像
