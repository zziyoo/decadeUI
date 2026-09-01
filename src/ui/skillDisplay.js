/**
 * @fileoverview 技能外显模块 (babysha样式专用)
 * 在玩家头像旁显示技能列表，支持点击查看技能描述
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { isDoubleCharacterMode } from "./characterBackground.js";

/**
 * 播放扩展音效
 * @param {string} name - 音效名称
 */
const playExtAudio = name => {
	game.playAudio("..", "extension", "十周年UI", `audio/${name}`);
};

/**
 * 初始化技能外显
 */
export function initSkillDisplay() {
	/** @type {number} 最大玩家数限制 */
	const MAX_PLAYERS = 5;

	/** @type {WeakMap<HTMLElement, string[]>} 玩家技能数组映射 */
	const playerSkillArrays = new WeakMap();

	/**
	 * 获取所有玩家数量
	 * @returns {number}
	 */
	const getAllPlayersCount = () => game.players.length + (game.dead?.length || 0);

	/**
	 * 判断是否为需要显示的技能
	 * @param {string} skill - 技能名称
	 * @param {HTMLElement} player - 玩家元素
	 * @returns {boolean}
	 */
	const isDisplayableSkill = (skill, player) => {
		if (!player || player === game.me || !lib.translate?.[skill]) return false;
		const info = get.info(skill);
		return !info?.nopop || info.enable || skill.startsWith("olhedao_tianshu_");
	};

	/**
	 * 获取技能名称
	 * @param {string} skill - 技能ID
	 * @returns {string}
	 */
	const getSkillName = skill => lib.translate?.[skill] || skill;

	/**
	 * 获取技能图标
	 * @param {string} skill - 技能名称
	 * @param {HTMLElement} player - 玩家元素
	 * @returns {string|null} 图标文件名或null
	 */
	const getSkillIcon = (skill, player) => {
		const info = get.info(skill);
		if (!info) return null;
		if (info.limited) return "xiandingjihs.png";
		if (info.juexingji) return "juexingjihs.png";
		if (get.is.zhuanhuanji(skill, player)) {
			const markNode = player?.node?.xSkillMarks?.querySelector(`.skillMarkItem.zhuanhuanji[data-id="${skill}"]`);
			return markNode?.classList.contains("yin") ? "mark_yinghs.png" : "mark_yanghs.png";
		}
		return null;
	};

	/**
	 * 显示技能描述弹窗
	 * @param {string} skill - 技能名称
	 * @param {HTMLElement} targetEl - 目标元素
	 */
	const showSkillPopup = (skill, targetEl) => {
		document.querySelector(".baby_skill_popup")?.remove();
		if (!lib.skill[skill]) return;

		const popup = document.createElement("div");
		popup.className = "baby_skill_popup";
		popup.innerHTML = `
			<div class="skill_title">${getSkillName(skill)}</div>
			<div class="skill_description">${get.translation(skill, "info") || "暂无描述"}</div>
		`;
		document.body.appendChild(popup);

		const title = popup.querySelector(".skill_title");
		const desc = popup.querySelector(".skill_description");
		popup.style.height = `${title.scrollHeight + desc.scrollHeight + 32}px`;

		const rect = targetEl.getBoundingClientRect();
		const popupRect = popup.getBoundingClientRect();
		let left = rect.left + rect.width / 2 - popupRect.width / 2;
		let top = rect.top - popupRect.height - 10;

		left = Math.max(10, Math.min(left, window.innerWidth - popupRect.width - 10));
		if (top < 10) top = rect.bottom + 10;

		popup.style.left = `${left}px`;
		popup.style.top = `${top}px`;

		const closeHandler = e => {
			if (!popup.contains(e.target)) {
				popup.remove();
				document.removeEventListener("click", closeHandler);
			}
		};
		setTimeout(() => document.addEventListener("click", closeHandler), 100);
	};

	/**
	 * 更新玩家技能显示
	 * @param {HTMLElement} player - 玩家元素
	 */
	const updateSkillDisplay = player => {
		if (getAllPlayersCount() > MAX_PLAYERS) return;
		const avatar = player.node?.avatar;
		if (!avatar) return;

		avatar.parentNode.querySelectorAll(".baby_skill").forEach(el => el.remove());

		const skillArray = playerSkillArrays.get(player) || [];
		const seen = new Set();
		const uniqueSkills = skillArray.filter(skill => {
			const name = getSkillName(skill);
			if (seen.has(name)) return false;
			seen.add(name);
			return true;
		});

		const rect = avatar.getBoundingClientRect();
		const isLeft = rect.left < window.innerWidth / 2;
		const isDouble = isDoubleCharacterMode();
		const baseOffset = isDouble ? 135 : 75;

		const frag = document.createDocumentFragment();
		uniqueSkills.forEach((skill, idx) => {
			const skillEl = document.createElement("div");
			skillEl.className = "baby_skill";
			Object.assign(skillEl.style, {
				position: "absolute",
				bottom: `${idx * 35 + 30}px`,
				zIndex: "102",
				left: isLeft ? `${avatar.offsetWidth + (isDouble ? 65 : 10)}px` : "",
				right: isLeft ? "" : `${avatar.offsetWidth + baseOffset}px`,
			});

			const skillBox = document.createElement("div");
			skillBox.className = "baby_skill_box";
			skillBox.dataset.skill = skill;
			skillBox.textContent = getSkillName(skill).slice(0, 2);
			skillBox.style.cursor = "pointer";
			skillBox.addEventListener("click", e => {
				e.stopPropagation();
				playExtAudio("BtnSure");
				showSkillPopup(skill, e.target);
			});
			skillEl.appendChild(skillBox);

			const icon = getSkillIcon(skill, player);
			if (icon) {
				const iconImg = document.createElement("img");
				iconImg.src = `extension/十周年UI/ui/assets/skill/baby/${icon}`;
				Object.assign(iconImg.style, { position: "absolute", top: "3px", right: "-15px", width: "16px", height: "16px", zIndex: "103" });
				skillEl.appendChild(iconImg);
			}

			frag.appendChild(skillEl);
		});
		avatar.parentNode.appendChild(frag);
	};

	/**
	 * 更新技能数组
	 * @param {HTMLElement} player - 玩家元素
	 * @param {string} skill - 技能名称
	 * @param {boolean} [add=true] - 是否添加
	 */
	const updateSkillArray = (player, skill, add = true) => {
		if (getAllPlayersCount() > MAX_PLAYERS || !isDisplayableSkill(skill, player)) return;

		if (!playerSkillArrays.has(player)) playerSkillArrays.set(player, []);
		const arr = playerSkillArrays.get(player);
		const idx = arr.indexOf(skill);

		if (add && idx === -1) arr.push(skill);
		else if (!add && idx > -1) arr.splice(idx, 1);

		updateSkillDisplay(player);
	};

	/**
	 * 刷新玩家所有技能
	 * @param {HTMLElement} player - 玩家元素
	 */
	const refreshPlayerSkills = player => {
		if (getAllPlayersCount() > MAX_PLAYERS || !player?.node?.avatar) return;

		const skills = [...(player.skills || []), ...(player.additionalSkills ? Object.keys(player.additionalSkills) : [])];
		playerSkillArrays.set(
			player,
			skills.filter(s => isDisplayableSkill(s, player))
		);
		updateSkillDisplay(player);
	};

	// 钩子：角色事件
	["showCharacterEnd", "hideCharacter", "changeCharacter", "removeCharacter"].forEach(event => {
		const original = lib.element.player[event];
		if (typeof original !== "function") return;
		lib.element.player[event] = function (...args) {
			original.apply(this, args);
			refreshPlayerSkills(this);
		};
	});

	// 钩子：添加/移除技能
	const origAdd = lib.element.player.addSkill;
	const origRemove = lib.element.player.removeSkill;

	lib.element.player.addSkill = function (skill, ...args) {
		const res = origAdd.apply(this, [skill, ...args]);
		const skills = Array.isArray(skill) ? skill : [skill];
		skills.forEach(s => requestAnimationFrame(() => updateSkillArray(this, s, true)));
		return res;
	};

	lib.element.player.removeSkill = function (skill, ...args) {
		const res = origRemove.apply(this, [skill, ...args]);
		const skills = Array.isArray(skill) ? skill : [skill];
		skills.forEach(s => requestAnimationFrame(() => updateSkillArray(this, s, false)));
		return res;
	};

	// 钩子：控制状态变化
	const origIsUnderControl = lib.element.player.isUnderControl;
	if (typeof origIsUnderControl === "function") {
		lib.element.player.isUnderControl = function (...args) {
			const result = origIsUnderControl.apply(this, args);
			const prev = this.__babyshaUnderControl;
			this.__babyshaUnderControl = result;
			if (prev !== undefined && prev !== result && getAllPlayersCount() <= MAX_PLAYERS) {
				requestAnimationFrame(() => refreshPlayerSkills(this));
			}
			return result;
		};
	}

	// 转换技更新监听
	lib.skill._zhuanhuanjiUpdate = {
		charlotte: true,
		forced: true,
		popup: false,
		silent: true,
		trigger: { global: "changeZhuanhuanji" },
		filter: event => getAllPlayersCount() <= MAX_PLAYERS && event.player && event.skill,
		async content(event) {
			updateSkillDisplay(event.player);
		},
	};

	lib.refreshPlayerSkills = refreshPlayerSkills;
}

/**
 * 清除所有技能外显
 */
export function clearAllSkillDisplay() {
	for (const player of [...game.players, ...(game.dead || [])]) {
		player.node?.avatar?.parentNode?.querySelectorAll(".baby_skill").forEach(el => el.remove());
	}
}

/**
 * 初始化技能外显（条件检查）
 * 仅在babysha样式且玩家数不超过5人时启用
 */
export function setupSkillDisplay() {
	if (lib.config.extension_十周年UI_newDecadeStyle === "babysha" && game.players.length <= 5) {
		initSkillDisplay();
	}
	lib.clearAllSkillDisplay = clearAllSkillDisplay;
}
