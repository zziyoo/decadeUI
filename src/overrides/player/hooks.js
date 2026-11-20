/**
 * @fileoverview Player Hooks注册模块
 * @description 通过无名杀hooks机制注册扩展功能，减少对本体的直接覆写
 * @module overrides/player/hooks
 */

import { lib, game, ui, get, ai, _status } from "noname";

/**
 * AI技能提示条显示时长（毫秒）
 * @constant {number}
 */
const SKILL_TIP_DURATION = 1500;

/**
 * 需要跳过的技能名列表
 * @constant {string[]}
 */
const SKIP_SKILL_NAMES = ["_recasting", "jiu"];

/**
 * 注册decadeUI的hooks
 * @description 通过hooks机制实现功能扩展，减少对本体方法的直接覆写
 * - addSkillCheck: 获得技能时的动画和手牌更新
 * - removeSkillCheck: 失去技能时的动画和手牌更新
 * - checkSkillAnimate: AI技能提示条显示
 * @returns {void}
 */
export function registerDecadeUIHooks() {
	const addHook = (name, fn) => (lib.hooks[name] ??= []).push(fn);

	addHook("addSkillCheck", handleAddSkill);

	addHook("removeSkillCheck", handleRemoveSkill);

	addHook("checkSkillAnimate", handleSkillAnimate);
}

/**
 * 处理获得技能事件
 * @param {string} skill - 技能名
 * @param {Object} player - 玩家对象
 * @returns {void}
 */
function handleAddSkill(skill, player) {
	if (typeof skill !== "string") return;

	const charSkills = ["name", "name1", "name2"].flatMap(n => {
		if (!player[n]) return [];
		if (n === "name1" && player.name === player.name1) return [];
		return get.character(player[n], 3) || [];
	});

	if (!charSkills.includes(skill)) {
		const info = get.info(skill);
		if (info && !info.nopop && lib.translate[skill + "_info"]) {
			player.node.gainSkill?.gain(skill);
		}
	}

	updateAllShowCards();
}

/**
 * 处理失去技能事件
 * @param {string} skill - 技能名
 * @param {Object} player - 玩家对象
 * @returns {void}
 */
function handleRemoveSkill(skill, player) {
	if (typeof skill !== "string") return;

	if (player.node.gainSkill?.skills?.includes(skill)) {
		player.node.gainSkill.lose(skill);
	}

	updateAllShowCards();
}

/**
 * 处理AI技能提示条显示
 * @param {Object} player - 玩家对象
 * @param {string} name - 技能名
 * @returns {void}
 */
function handleSkillAnimate(player, name) {
	const cfg = lib.config;

	if (!cfg["extension_十周年UI_enable"] || cfg.extension_十周年UI_jindutiaoYangshi === "0") {
		return;
	}

	if (player === game.me) return;

	player.querySelector(".tipskill")?.remove();

	const style = cfg.extension_十周年UI_newDecadeStyle;
	if (SKIP_SKILL_NAMES.includes(name) || style === "othersOff" || style === "on") {
		return;
	}

	createSkillTip(player, name);
}

/**
 * 更新所有玩家的可见手牌显示
 * @returns {void}
 */
function updateAllShowCards() {
	const allPlayers = [...(game.players || []), ...(game.dead || [])];
	allPlayers.forEach(p => p.decadeUI_updateShowCards?.());
}

/**
 * 创建AI技能提示条
 * @param {Object} player - 玩家对象
 * @param {string} skillName - 技能名
 * @returns {void}
 */
function createSkillTip(player, skillName) {
	const box = document.createElement("div");
	const img = document.createElement("img");
	const text = document.createElement("div");

	// 盒子样式
	box.className = "tipskill";
	box.style.cssText = `
		display: block;
		position: absolute;
		pointer-events: none;
		z-index: 90;
		--w: 133px;
		--h: calc(var(--w) * 50/431);
		width: var(--w);
		height: var(--h);
		bottom: 0px;
	`.replace(/\s+/g, " ");

	// 技能文本
	text.innerHTML = get.skillTranslation(skillName, player).slice(0, 2);
	text.style.cssText = `
		color: #ADC63A;
		text-shadow: #707852 0 0;
		font-size: 11px;
		font-family: shousha;
		display: block;
		position: absolute;
		z-index: 91;
		bottom: -22px;
		letter-spacing: 1.5px;
		line-height: 15px;
		left: 15px;
	`.replace(/\s+/g, " ");

	// 思考中底图
	img.src = lib.assetURL + "extension/十周年UI/ui/assets/lbtn/shoushatip/skilltip.png";
	img.style.cssText = `
		display: block;
		position: absolute;
		z-index: 91;
		--w: 133px;
		--h: calc(var(--w) * 50/431);
		width: var(--w);
		height: var(--h);
		bottom: -22px;
	`.replace(/\s+/g, " ");

	box.appendChild(img);
	box.appendChild(text);
	player.appendChild(box);

	setTimeout(() => box.remove(), SKILL_TIP_DURATION);
}
