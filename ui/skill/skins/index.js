/**
 * @fileoverview 技能样式管理器 - 动态加载样式模块
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { STYLE_TO_SKIN, DEFAULT_SKIN } from "../../constants.js";

/**
 * 获取当前样式名
 * @returns {string}
 */
export function getCurrentSkin() {
	return STYLE_TO_SKIN[lib.config.extension_十周年UI_newDecadeStyle] || DEFAULT_SKIN;
}

/**
 * 动态加载技能插件
 * @param {string} skinName - 样式名
 * @param {*} lib
 * @param {*} game
 * @param {*} ui
 * @param {*} get
 * @param {*} ai
 * @param {*} _status
 * @param {*} app
 * @returns {Promise<Object|null>}
 */
export async function createSkillPluginForSkin(skinName, lib, game, ui, get, ai, _status, app) {
	try {
		const module = await import(/* @vite-ignore */ `./${skinName}.js`);
		const creator = module[`create${skinName.charAt(0).toUpperCase() + skinName.slice(1)}SkillPlugin`];
		return creator?.(lib, game, ui, get, ai, _status, app) ?? null;
	} catch (e) {
		console.error(`[SkillSkin] 加载失败: ${skinName}`, e);
		return null;
	}
}
