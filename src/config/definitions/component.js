/**
 * @fileoverview 部件管理配置定义
 * @description 纯配置数据，不包含业务逻辑
 * @module config/definitions/component
 */
import { lib } from "noname";
import { createCollapseTitle, createCollapseEnd } from "../utils.js";
import { onJindutiaoYangshiUpdate, onJindutiaoSetBlur, onJindutiaoSetUpdate, onJDTSYangshiUpdate, onGTBBYangshiClick, onPlayerMarkStyleUpdate, onLoadingStyleUpdate, onGainSkillsVisibleUpdate, onFoldDerivedSkillUpdate } from "../handlers/component-handlers.js";

/**
 * 部件管理折叠标题
 * @type {Object}
 */
export const component_title = createCollapseTitle("component_title", "部件管理");

/**
 * 进度条样式配置
 * @type {Object}
 */
export const jindutiaoYangshi = {
	name: "进度条",
	init: "2",
	intro: "切换进度条样式",
	item: {
		0: "关闭",
		1: "手杀进度条",
		2: "十周年PC端进度条",
		3: "十周年客户端进度条",
		4: "一将成名进度条",
	},
	update: onJindutiaoYangshiUpdate,
};

/**
 * 进度条速度配置
 * @type {Object}
 */
export const jindutiaoST = {
	name: "进度条速度",
	init: "200",
	intro: "设置玩家进度条的时间间隔",
	item: {
		10: "10毫秒/次",
		50: "50毫秒/次",
		100: "100毫秒/次",
		200: "200毫秒/次",
		500: "500毫秒/次",
		800: "800毫秒/次",
		1000: "1秒/次",
		2000: "2秒/次",
	},
};

/**
 * 进度条高度配置
 * @type {Object}
 */
export const jindutiaoSet = {
	name: "进度条高度",
	init: "22",
	intro: "输入0~100的数值，设置玩家进度条的高度百分比（默认值为22）",
	input: true,
	onblur: onJindutiaoSetBlur,
	update: onJindutiaoSetUpdate,
};

/**
 * 阶段提示配置
 * @type {Object}
 */
export const JDTSYangshi = {
	name: "阶段提示",
	init: "0",
	intro: "切换阶段提示样式",
	item: {
		0: "关闭",
		1: "手杀阶段提示",
		2: "十周年阶段提示",
		3: "OL阶段提示",
		4: "欢乐阶段提示",
	},
	update: onJDTSYangshiUpdate,
};

/**
 * 狗托播报配置
 * @type {Object}
 */
export const GTBBYangshi = {
	name: "狗托播报",
	init: "0",
	intro: "开启后，顶部会出现滚动播报栏",
	item: { 0: "关闭", 1: "手杀", 2: "十周年" },
	onclick: onGTBBYangshiClick,
};

/**
 * 播报字体配置
 * @type {Object}
 */
export const GTBBFont = {
	name: "播报字体",
	init: "on",
	intro: "切换狗托播报字体（即时生效）",
	item: {
		on: '<font face="shousha">手杀',
		off: '<font face="yuanli">十周年',
	},
};

/**
 * 播报时间间隔配置
 * @type {Object}
 */
export const GTBBTime = {
	name: "时间间隔",
	init: "60000",
	intro: "更改狗托播报出现的时间间隔",
	item: {
		30000: "0.5min/次",
		60000: "1min/次",
		120000: "2min/次",
		300000: "5min/次",
	},
};

/**
 * 标记样式配置
 * @type {Object}
 */
export const playerMarkStyle = {
	name: "标记样式",
	init: "decade",
	item: { red: "红灯笼", yellow: "黄灯笼", decade: "十周年" },
	update: onPlayerMarkStyleUpdate,
};

/**
 * 生成loading框选项
 * @returns {Object} loading框选项映射
 */
function generateLoadingStyleItems() {
	const basePath = `${lib.assetURL}extension/十周年UI/image/ui/dialog`;
	const createPreview = filename => `<div style="width:60px;height:40px;position:relative;background-image: url(${basePath}/${filename});background-size: 100% 100%;"></div>`;

	return {
		off: "关闭",
		on: createPreview("dialog2.png"),
		On: createPreview("dialog1.png"),
		othersOn: createPreview("dialog3.png"),
		othersOff: createPreview("dialog4.png"),
		onlineUI: createPreview("dialog5.png"),
	};
}

/**
 * 光标+loading框配置
 * @type {Object}
 */
export const loadingStyle = {
	name: "更换光标+loading框",
	intro: "可以更换局内选项框以及光标",
	init: "off",
	item: generateLoadingStyleItems(),
	update: onLoadingStyleUpdate,
};

/**
 * 获得技能显示配置
 * @type {Object}
 */
export const gainSkillsVisible = {
	name: "获得技能显示",
	init: "othersOn",
	item: { on: "显示", off: "不显示", othersOn: "显示他人" },
	update: onGainSkillsVisibleUpdate,
};

/**
 * 派生技能折叠配置（获赠技能显示）
 * @type {Object}
 */
export const foldDerivedSkills = {
	name: "派生技能折叠",
	intro: "当其他角色通过一个技能授予多个派生技能时，武将牌上只显示该来源技能的图标，点击可查看所获得的技能。默认关闭，仅改变本地显示。",
	init: false,
	update: onFoldDerivedSkillUpdate,
};

/**
 * 武将详情插件配置
 * @type {Object}
 */
export const characterPlugin = {
	name: "武将详情插件",
	init: true,
	intro: "开启后，点击武将可查看详细信息",
};

/**
 * 部件管理折叠结束标记
 * @type {Object}
 */
export const component_title_end = createCollapseEnd("component_title");

/**
 * 部件管理配置集合
 * @type {Object}
 */
export const componentConfigs = {
	component_title,
	jindutiaoYangshi,
	jindutiaoST,
	jindutiaoSet,
	JDTSYangshi,
	GTBBYangshi,
	GTBBFont,
	GTBBTime,
	playerMarkStyle,
	loadingStyle,
	gainSkillsVisible,
	foldDerivedSkills,
	characterPlugin,
	component_title_end,
};
