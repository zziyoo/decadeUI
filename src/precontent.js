/**
 * @fileoverview 扩展预加载入口 - 游戏初始化前执行
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { initEruda, initNodeFS } from "./core/debug.js";
import { initDecadeModule, EXCLUDED_MODES } from "./core/decadeModule.js";
import { setupConnectMode, setupLayoutVisualMenu } from "./core/connectMode.js";
import { initApp } from "./core/app.js";
import { applyMoveAnimFix } from "./overrides/moveAnimFix.js";
import { initPrecontentUI } from "./ui/progress-bar.js";
import { initCardAlternateNameVisible } from "./ui/cardAlternateName.js";

/**
 * Precontent主入口 - 游戏初始化前执行
 */
export async function precontent() {
	// 同一游戏进程内重复导入扩展时，保留第一次初始化的运行时状态。
	if (window.decadeUI) return;

	const mode = get.mode();
	if (EXCLUDED_MODES.includes(mode)) return;

	initEruda();
	initNodeFS();
	setupLayoutVisualMenu();

	window.decadeModule = await initDecadeModule();

	setupConnectMode();
	initApp();

	if (!lib.config.asset_version) {
		game.saveConfig("asset_version", "无");
	}

	applyMoveAnimFix();
	initPrecontentUI();
	initCardAlternateNameVisible();
}
