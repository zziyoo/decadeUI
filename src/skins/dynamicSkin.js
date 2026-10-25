"use strict";

/**
 * @fileoverview 动态皮肤配置模块
 */
import { lib, game, ui, get, ai, _status } from "noname";

/**
 * @type {Object.<string, Object>}
 * @description 动态皮肤配置表，按武将名和皮肤名组织
 */
export const dynamicSkinConfig = {};

/**
 * 设置动态皮肤模块
 * @returns {void}
 */
export function setupDynamicSkin() {
	if (!window.decadeUI) return;

	decadeUI.dynamicSkin = { ...dynamicSkinConfig };

	// 动皮共享
	const dynamicSkinExtend = {};
	decadeUI.get.extend(decadeUI.dynamicSkin, dynamicSkinExtend);
}
