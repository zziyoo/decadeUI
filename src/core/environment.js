/**
 * @fileoverview 环境初始化模块，负责SVG裁剪路径、全局方法修补和UI环境设置
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { SVG_NS, CLIP_PATHS } from "./constants.js";

/**
 * 初始化SVG裁剪路径
 */
export function initSvgClipPaths() {
	const svg = document.body.appendChild(document.createElementNS(SVG_NS, "svg"));
	const defs = svg.appendChild(document.createElementNS(SVG_NS, "defs"));
	CLIP_PATHS.forEach(({ id, d }) => {
		const clipPath = defs.appendChild(document.createElementNS(SVG_NS, "clipPath"));
		clipPath.id = id;
		clipPath.setAttribute("clipPathUnits", "objectBoundingBox");
		clipPath.appendChild(document.createElementNS(SVG_NS, "path")).setAttribute("d", d);
	});
}

/**
 * 修补全局方法
 * @param {Object} ctx - 上下文对象
 */
export function patchGlobalMethods(ctx) {
	if (!window.get) return;

	if (typeof window.get.cardsetion === "function") {
		// Core 的 cardsetion() 有两类已知边界失败，命中时降级为「本次不显示卡牌使用信息」，
		// 其余异常一律继续抛出，不静默吞掉：
		// - indexOf：Core 内部对 undefined 调用 indexOf；
		// - sourceSkill：Core sourceSkillFor(undefined) 读取 skill["sourceSkill"] 时抛出 TypeError
		//   （noname/get/index.js:1379）。技能派生的 useCard 事件链上存在 skill 为空的 useSkill 事件，
		//   例如经 xwjqiexie 获得 dcsbquzhou 后趋舟亮出并使用杀
		//   （useCard ← chooseUseTarget ← dcsbquzhou ← useSkill）。
		const tolerated = ["indexOf", "sourceSkill"];
		const original = window.get.cardsetion;
		window.get.cardsetion = (...args) => {
			try {
				return original.apply(ctx, args);
			} catch (e) {
				if (tolerated.some(feature => e?.message?.includes(feature))) return "";
				throw e;
			}
		};
	}

	if (typeof window.get.getPlayerIdentity === "function") {
		const original = window.get.getPlayerIdentity;
		window.get.getPlayerIdentity = (player, identity, chinese, isMark) => {
			identity = identity || player?.identity || "";
			if (typeof identity !== "string") identity = "";
			if (player?.special_identity != null && typeof player.special_identity !== "string") {
				player.special_identity = "";
			}
			return original.call(ctx, player, identity, chinese, isMark);
		};
	}
}

/**
 * 初始化十周年UI环境
 * @param {Object} ctx - decadeUI上下文
 * @returns {Object} body尺寸监听器
 */
export const initializeDecadeUIEnvironment = ctx => {
	const sensorNode = ctx.element.create("sensor", document.body);
	sensorNode.id = "decadeUI-body-sensor";
	const bodySensor = new ctx.ResizeSensor(sensorNode);

	initSvgClipPaths();
	document.addEventListener("click", e => decadeUI.set.activeElement(e.target), true);

	const handTipHeight = lib.config["extension_十周年UI_handTipHeight"] || "20";
	document.documentElement.style.setProperty("--hand-tip-bottom", `calc(${handTipHeight}% + 10px)`);

	patchGlobalMethods(ctx);
	return bodySensor;
};
