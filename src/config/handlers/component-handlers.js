/**
 * @fileoverview 部件管理配置处理函数
 * @description 处理部件管理相关配置项的onclick和update回调
 * @module config/handlers/component-handlers
 */
import { lib, game, ui, _status } from "noname";
import { parseInputValue } from "../utils.js";

/**
 * 进度条样式更新处理
 * @description 清理旧进度条并重置状态
 */
export function onJindutiaoYangshiUpdate() {
	if (window.timer) {
		clearInterval(window.timer);
		delete window.timer;
	}
	if (window.timer2) {
		clearInterval(window.timer2);
		delete window.timer2;
	}
	document.getElementById("jindutiaopl")?.remove();
	window.resetProgressBarState?.();
}

/**
 * 进度条高度失焦处理
 * @this {HTMLElement} 输入框元素
 */
export function onJindutiaoSetBlur() {
	const isInput = this.tagName === "INPUT";
	if (!isInput) {
		this.innerHTML = this.innerHTML.replace(/<br>/g, "");
	}

	let value = parseFloat(isInput ? this.value : this.innerHTML);
	if (isNaN(value)) value = 22;
	value = Math.max(0, Math.min(100, value));

	if (isInput) {
		this.value = String(value);
	} else {
		this.innerHTML = String(value);
	}

	game.saveConfig("extension_十周年UI_jindutiaoSet", value);

	const progressBar = document.getElementById("jindutiaopl");
	if (progressBar) {
		progressBar.style.bottom = `${value}%`;
	}
}

/**
 * 进度条高度更新处理
 */
export function onJindutiaoSetUpdate() {
	const height = lib.config.extension_十周年UI_jindutiaoSet ?? "22";
	const progressBar = document.getElementById("jindutiaopl");
	if (progressBar) {
		progressBar.style.bottom = `${height}%`;
	}

	// 更新菜单显示值
	const menu = lib.extensionMenu?.extension_十周年UI?.jindutiaoSet;
	if (menu) {
		const isInput = menu.tagName === "INPUT";
		if (isInput) {
			menu.value = String(height);
		} else {
			menu.innerHTML = String(height);
		}
	}
}

/**
 * 阶段提示更新处理
 */
export function onJDTSYangshiUpdate() {
	if (lib.config.extension_十周年UI_JDTSYangshi === "0") {
		game.as_removeImage?.();
		delete _status.as_showImage_phase;
	}
}

/**
 * 狗托播报点击处理
 * @param {string} item - 播报样式选项
 */
export function onGTBBYangshiClick(item) {
	const oldValue = lib.config.extension_十周年UI_GTBBYangshi;
	game.saveConfig("extension_十周年UI_GTBBYangshi", item);

	// 清理旧的定时器
	if (window._gtbbCheckId) {
		clearInterval(window._gtbbCheckId);
		delete window._gtbbCheckId;
	}
	if (window._gtbbInterval) {
		clearInterval(window._gtbbInterval);
		delete window._gtbbInterval;
	}
	// 移除旧容器
	document.getElementById("gtbb-container")?.remove();

	// 初始化新的播报
	if (item !== "0") {
		import("../../ui/gtbb.js").then(module => module.initGTBB());
	}
}

/**
 * 标记样式热更新
 * @description 更新标记样式并重新渲染所有玩家的标记
 */
export function onPlayerMarkStyleUpdate() {
	if (!window.decadeUI) return;

	ui.arena.dataset.playerMarkStyle = lib.config.extension_十周年UI_playerMarkStyle;

	if (window.decadeUI.config) {
		window.decadeUI.config.playerMarkStyle = lib.config.extension_十周年UI_playerMarkStyle;
	}

	game.players.concat(game.dead).forEach(player => {
		if (!player || !player.marks) return;

		const markData = [];
		for (const [markName, markElement] of Object.entries(player.marks)) {
			if (!markElement) continue;
			markData.push({
				name: markName,
				skill: markElement.skill || markName,
				info: markElement.info,
				markidentifer: markElement.markidentifer,
			});
		}

		for (const markName in player.marks) {
			if (player.marks[markName]) {
				player.marks[markName].remove();
				delete player.marks[markName];
			}
		}

		markData.forEach(data => {
			const skillInfo = lib.skill[data.name];
			if (skillInfo?.intro) {
				player.markSkill(data.name);
			} else {
				player.mark(data.name, data.info, data.skill);
			}
		});

		player.updateMarks?.();
		ui.updatem?.(player);
	});
}

/**
 * 光标+loading框更新处理
 */
export function onLoadingStyleUpdate() {
	if (window.decadeUI) {
		ui.arena.dataset.loadingStyle = lib.config.extension_十周年UI_loadingStyle;
	}
}

/**
 * 获得技能显示更新处理
 */
export function onGainSkillsVisibleUpdate() {
	if (window.decadeUI) {
		ui.arena.dataset.gainSkillsVisible = lib.config.extension_十周年UI_gainSkillsVisible;
	}
}

/**
 * 即时更新 OL 样式派生技能分组，不修改技能数据或录像。
 */
export function onFoldDerivedSkillUpdate() {
	if (typeof ui.skillControl?.applyDerivedGrouping !== "function") return;
	ui.skillControl.applyDerivedGrouping();
	ui.skillControl.update?.();
}
