/**
 * @fileoverview 玩家标记系统覆写模块
 * @description 处理玩家标记的显示逻辑，包括技能标记、武将标记等的创建、更新和过滤
 * @module overrides/player/marks
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { getBasePlayerMethods } from "./base.js";

/**
 * 需要过滤的技能标记前缀列表
 * 这些标记会在专门的区域显示，不在传统标记区域显示
 * @constant {string[]}
 */
const SKIP_PREFIXES = ["xinfu_falu_"];

/**
 * 标记过滤的例外技能
 * 即使匹配前缀规则，这些技能也不会被过滤
 * @constant {Set<string>}
 */
const SKIP_EXCEPTIONS = new Set(["starcanxi_wangsheng", "starcanxi_xiangsi", "starcanxi_cancel"]);

/**
 * 残玺技能的六大主要势力标记
 * 这些标记使用新样式在专门区域显示，其他势力使用传统标记
 * @constant {Set<string>}
 */
const STARCANXI_MAIN_FACTIONS = new Set(["starcanxi_qun", "starcanxi_shu", "starcanxi_wei", "starcanxi_wu", "starcanxi_jin", "starcanxi_shen"]);

/**
 * 判断标记是否应该被过滤（不在传统标记区域显示）
 * @param {string|Object} item - 标记项（技能名或其他标记对象）
 * @returns {boolean} true表示应该过滤，false表示正常显示
 */
function shouldSkipMark(item) {
	if (!item) return false;

	const style = window.decadeUI?.config?.newDecadeStyle ?? lib.config.extension_十周年UI_newDecadeStyle;
	const markStyle = window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle;

	if (style === "Off") return false;

	if (markStyle === "decade") {
		const info = get.info(item);
		if (info?.zhuanhuanji || info?.zhuanhuanji2 || info?.limited) {
			return true;
		}
	}

	if (typeof item !== "string") return false;
	if (style !== "on" && style !== "othersOff") return false;

	if (SKIP_PREFIXES.some(p => item.startsWith(p)) && !SKIP_EXCEPTIONS.has(item)) {
		return true;
	}

	if (STARCANXI_MAIN_FACTIONS.has(item)) {
		return true;
	}

	return false;
}

/**
 * 覆写玩家的标记技能方法
 * 根据UI样式配置过滤特定标记的显示
 * @param {string} name - 技能名称
 * @param {Object} [info] - 标记信息
 * @param {Object} [card] - 关联卡牌
 * @param {boolean} [nobroadcast] - 是否不广播到其他客户端
 * @returns {Object} 玩家对象（链式调用）
 * @this {Object} 玩家对象
 */
export function playerMarkSkill(name, info, card, nobroadcast) {
	if (shouldSkipMark(name)) return;
	const base = getBasePlayerMethods();
	return base.markSkill.apply(this, [name, info, card, nobroadcast]);
}

/**
 * 覆写玩家的取消标记技能方法
 * 根据UI样式配置过滤特定标记的取消
 * @param {string} name - 技能名称
 * @param {Object} [info] - 标记信息
 * @param {Object} [card] - 关联卡牌
 * @param {boolean} [nobroadcast] - 是否不广播到其他客户端
 * @returns {Object} 玩家对象（链式调用）
 * @this {Object} 玩家对象
 */
export function playerUnmarkSkill(name, info, card, nobroadcast) {
	if (shouldSkipMark(name)) return;
	const base = getBasePlayerMethods();
	return base.unmarkSkill.apply(this, [name, info, card, nobroadcast]);
}

/**
 * 覆写玩家的标记方法
 * 创建并显示玩家标记，支持卡牌标记和技能标记
 * @param {string|Object|Object[]} item - 标记项（技能名、卡牌对象或卡牌数组）
 * @param {Object|string} [info] - 标记信息对象或标识符字符串
 * @param {string} [skill] - 关联的技能名称
 * @returns {HTMLElement|HTMLElement[]} 创建的标记元素或元素数组
 * @this {Object} 玩家对象
 */
export function playerMark(item, info, skill) {
	const style = lib.config.extension_十周年UI_newDecadeStyle;
	const markStyle = window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle;

	if (item && style !== "Off" && markStyle === "decade") {
		const itemInfo = get.info(item);
		if (itemInfo && (itemInfo.zhuanhuanji || itemInfo.zhuanhuanji2 || itemInfo.limited)) {
			return;
		}
	}

	if (item && typeof item === "string") {
		if (item.startsWith("xinfu_falu_") && (style === "on" || style === "othersOff")) {
			return;
		}
		if (STARCANXI_MAIN_FACTIONS.has(item) && (style === "on" || style === "othersOff")) {
			return;
		}
	}

	if (get.itemtype(item) === "cards") {
		return item.map(card => this.mark(card, info));
	}

	const mark = createMarkElement(item, skill, this);

	if (typeof info === "object") {
		mark.info = info;
	} else if (typeof info === "string") {
		mark.markidentifer = info;
	}

	bindMarkEvents(mark);

	this.node.marks.appendChild(mark);
	this.updateMarks();
	ui.updatem(this);

	return mark;
}

/**
 * 创建标记DOM元素
 * @param {string|Object} item - 标记项（技能名或卡牌对象）
 * @param {string} [skill] - 关联的技能名称
 * @param {Player} [player] - 关联的角色
 * @returns {HTMLElement} 创建的标记元素
 */
function createMarkElement(item, skill, player) {
	let mark;
	let itemName = item;

	if (get.itemtype(item) === "card") {
		mark = item.copy("mark");
		mark.suit = item.suit;
		mark.number = item.number;

		if (item.classList.contains("fullborder")) {
			mark.classList.add("fakejudge", "fakemark");
			if (!mark.node.mark) {
				mark.node.mark = mark.querySelector(".mark-text") || window.decadeUI.element.create("mark-text", mark);
			}
			mark.node.mark.innerHTML = lib.translate[item.name + "_bg"] || get.translation(item.name)[0];
		}
		itemName = item.name;
	} else {
		mark = ui.create.div(".card.mark");
		const markStyle = window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle;

		let markText = lib.translate[item + "_bg"];
		if (!markText || markText[0] === "+" || markText[0] === "-") {
			markText = get.translation(item).slice(0, 2);
			if (markStyle !== "decade") {
				markText = markText[0];
			}
		}

		mark.text = window.decadeUI.element.create("mark-text", mark);

		if (lib.skill[item]?.markimage) {
			markText = "　";
			Object.assign(mark.text.style, {
				animation: "none",
				boxShadow: "none",
				backgroundPosition: "center",
				backgroundSize: "contain",
				backgroundRepeat: "no-repeat",
			});
			mark.text.setBackgroundImage(lib.skill[item].markimage);
			mark.text.classList.add("before-hidden");
		} else if (lib.skill[item]?.markimage2) {
			markText = "　";
			Object.assign(mark.text.style, {
				animation: "none",
				backgroundPosition: "center",
				backgroundSize: "contain",
				backgroundRepeat: "no-repeat",
			});
			mark.text.setBackgroundImage(lib.skill[item].markimage2);
			mark.text.classList.add("before-hidden");
		} else if (markText.length === 2) {
			mark.text.classList.add("small-text");
		}

		if (lib.skill[item]?.zhuanhuanji) {
			mark.text.style.animation = "none";
			mark.text.classList.add("before-hidden");

			if (markStyle === "decade" && markText?.includes("☯")) {
				if (markStyle === "decade") {
					mark.style.setProperty("display", "none", "important");
				} else if (markText === "☯") {
					const zhuanhuanLimit = get.zhuanhuanItemNum(item, player);
					const storage = player.storage[item];
					let index;

					if (zhuanhuanLimit === 2) {
						if (get.info(item).zhuanhuanji === "number" || typeof storage === "number") {
							index = player.countMark(item) % zhuanhuanLimit;
						} else {
							index = storage ? 1 : 0;
						}
					} else {
						index = player.countMark(item) % zhuanhuanLimit;
					}

					const angle = index * (360 / zhuanhuanLimit);
					mark.text.reversed = angle;
					mark.text.style.transform = `rotate(${angle}deg)`;
				}
			}
		}

		mark.text.innerHTML = markText;

		const originalSetBackground = mark.setBackground;
		mark.setBackground = function (name, type) {
			if (type === "character" && mark.text) {
				mark.text.innerHTML = "　";
				mark.text.style.animation = "none";
				mark.text.style.boxShadow = "none";
				mark.text.classList.add("before-hidden");
				mark.text.setBackground(name, "character");
				mark.text.style.backgroundPosition = "center";
				mark.text.style.backgroundSize = "contain";
				mark.text.style.backgroundRepeat = "no-repeat";
				return this;
			}
			return originalSetBackground?.apply(this, arguments);
		};
	}

	mark.name = itemName;
	mark.skill = skill || itemName;

	if (!mark.classList.contains("own-skill") && !mark.classList.contains("other-skill")) {
		const skillIntro = lib.skill[mark.skill]?.intro;
		const hasCardDisplay = typeof skillIntro?.mark === "function" || ["expansion", "card", "cards"].includes(skillIntro?.content);
		mark.classList.add(hasCardDisplay ? "other-skill" : "own-skill");
	}

	return mark;
}

/**
 * 为标记元素绑定交互事件
 * @param {HTMLElement} mark - 标记元素
 * @returns {void}
 */
function bindMarkEvents(mark) {
	mark.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.card);

	if (!lib.config.touchscreen) {
		if (lib.config.hover_all) {
			lib.setHover(mark, ui.click.hoverplayer);
		}
		if (lib.config.right_info) {
			mark.oncontextmenu = ui.click.rightplayer;
		}
	}
}

/**
 * 覆写玩家的标记武将方法
 * 创建武将标记元素并添加到玩家标记区域
 * @param {string|Object} name - 武将名称或武将对象
 * @param {Object} [info] - 标记信息对象
 * @param {*} [learn] - 学习参数
 * @param {*} [learn2] - 学习参数2
 * @returns {HTMLElement} 创建的武将标记元素
 * @this {Object} 玩家对象
 */
export function playerMarkCharacter(name, info, learn, learn2) {
	if (typeof name === "object") name = name.name;

	const nodeMark = ui.create.div(".card.mark");
	const nodeMarkText = ui.create.div(".mark-text", nodeMark);

	if (!info) info = {};
	if (!info.name) info.name = get.translation(name);
	if (!info.content) info.content = get.skillintro(name, learn, learn2);

	if (name.startsWith("unknown")) {
		const unknownText = get.translation(name)[0];
		const markStyle = window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle;
		if (markStyle === "decade" && unknownText?.includes("☯")) {
			nodeMark.style.setProperty("display", "none", "important");
		}
		nodeMarkText.innerHTML = unknownText;
	} else {
		if (!get.character(name)) {
			return console.error(name);
		}
		const text = info.name.slice(0, 2);
		if (text.length === 2) {
			nodeMarkText.classList.add("small-text");
		}
		const markStyle = window.decadeUI?.config?.playerMarkStyle ?? lib.config.extension_十周年UI_playerMarkStyle;
		if (markStyle === "decade" && text?.includes("☯")) {
			nodeMark.style.setProperty("display", "none", "important");
		}
		nodeMarkText.innerHTML = text;
	}

	nodeMark.name = name + "_charactermark";
	nodeMark.info = info;
	nodeMark.text = nodeMarkText;

	const hasCardDisplay = typeof lib.skill[name]?.intro?.mark === "function";
	nodeMark.classList.add(hasCardDisplay ? "other-skill" : "own-skill");

	bindMarkEvents(nodeMark);

	this.node.marks.appendChild(nodeMark);
	ui.updatem(this);

	return nodeMark;
}

/**
 * 覆写玩家的更新标记方法
 * 更新标记的计数显示
 * @param {string} name - 标记名称
 * @param {boolean} [storage] - 是否同步存储数据
 * @returns {Object} 玩家对象（链式调用）
 * @this {Object} 玩家对象
 */
export function playerUpdateMark(name, storage) {
	if (!this.marks[name]) {
		const skillInfo = lib.skill[name];
		if (skillInfo?.intro && (this.storage[name] || skillInfo.intro.markcount)) {
			this.markSkill(name);
			if (!this.marks[name]) return this;
		} else {
			return this;
		}
	}

	const mark = this.marks[name];
	const skillInfo = lib.skill[name];

	if (storage && this.storage[name]) {
		this.syncStorage(name);
	}

	if (skillInfo?.intro && !skillInfo.intro.nocount && (this.storage[name] || skillInfo.intro.markcount)) {
		const num = calculateMarkCount(this, name, skillInfo);

		if (num) {
			if (!mark.markcount) {
				mark.markcount = window.decadeUI.element.create("mark-count", mark);
			}
			mark.markcount.textContent = num;
		} else if (mark.markcount) {
			mark.markcount.delete();
			mark.markcount = undefined;
		}
	} else {
		if (mark.markcount) {
			mark.markcount.delete();
			mark.markcount = undefined;
		}
		if (skillInfo?.mark === "auto") {
			this.unmarkSkill(name);
		}
	}

	return this;
}

/**
 * 计算标记的数量
 * @param {Object} player - 玩家对象
 * @param {string} name - 标记名称
 * @param {Object} skillInfo - 技能信息对象
 * @returns {number} 标记数量
 */
function calculateMarkCount(player, name, skillInfo) {
	const intro = skillInfo.intro;

	if (typeof intro.markcount === "function") {
		return intro.markcount(player.storage[name], player, name);
	}

	if (intro.markcount === "expansion") {
		return player.countCards("x", card => card.hasGaintag(name));
	}

	if (typeof player.storage[name + "_markcount"] === "number") {
		return player.storage[name + "_markcount"];
	}

	if (name === "ghujia") {
		return player.hujia;
	}

	if (typeof player.storage[name] === "number") {
		return player.storage[name];
	}

	if (Array.isArray(player.storage[name])) {
		return player.storage[name].length;
	}

	return 0;
}

/**
 * 覆写玩家的标记技能武将方法
 * 创建或更新技能关联的武将标记
 * @param {string} id - 标记唯一标识符
 * @param {string|Object} target - 目标武将名称或对象
 * @param {string} name - 显示名称
 * @param {string} content - 标记内容描述
 * @returns {Object} 玩家对象（链式调用）
 * @this {Object} 玩家对象
 */
export function playerMarkSkillCharacter(id, target, name, content) {
	if (typeof target === "object") target = target.name;

	game.broadcastAll(
		(player, target, name, content, id) => {
			if (player.marks[id]) {
				updateExistingSkillMark(player, id, name, content, target);
			} else {
				createNewSkillMark(player, id, name, content, target);
			}

			player.marks[id].classList.add("skillmark");
			player.marks[id]._name = name;
			ui.updatem(player);
		},
		this,
		target,
		name,
		content,
		id
	);

	return this;
}

/**
 * 更新已存在的技能标记
 * @param {Object} player - 玩家对象
 * @param {string} id - 标记唯一标识符
 * @param {string} name - 显示名称
 * @param {string} content - 标记内容描述
 * @param {string} target - 目标武将名称
 * @returns {void}
 */
function updateExistingSkillMark(player, id, name, content, target) {
	const mark = player.marks[id];
	mark.name = name + "_skillmark";
	mark.info = { name, content, id };

	const hasCardDisplay = typeof lib.skill[name]?.intro?.mark === "function";
	mark.classList.remove("own-skill", "other-skill");
	mark.classList.add(hasCardDisplay ? "other-skill" : "own-skill");

	if (mark.text) {
		mark.text.innerHTML = "　";
		mark.text.classList.remove("small-text");
		mark.text.style.animation = "none";
		mark.text.style.boxShadow = "none";
		mark.text.classList.add("before-hidden");
		mark.text.setBackground(target, "character");
		mark.text.style.backgroundPosition = "center";
		mark.text.style.backgroundSize = "contain";
		mark.text.style.backgroundRepeat = "no-repeat";
	}

	game.addVideo("changeMarkCharacter", player, { id, name, content, target });
}

/**
 * 创建新的技能标记
 * @param {Object} player - 玩家对象
 * @param {string} id - 标记唯一标识符
 * @param {string} name - 显示名称
 * @param {string} content - 标记内容描述
 * @param {string} target - 目标武将名称
 * @returns {void}
 */
function createNewSkillMark(player, id, name, content, target) {
	const nodeMark = ui.create.div(".card.mark");
	const nodeMarkText = ui.create.div(".mark-text", nodeMark);

	nodeMarkText.innerHTML = "　";
	nodeMarkText.style.animation = "none";
	nodeMarkText.style.boxShadow = "none";
	nodeMarkText.classList.add("before-hidden");
	nodeMarkText.setBackground(target, "character");
	nodeMarkText.style.backgroundPosition = "center";
	nodeMarkText.style.backgroundSize = "contain";
	nodeMarkText.style.backgroundRepeat = "no-repeat";

	nodeMark.name = name + "_skillmark";
	nodeMark.info = { name, content, id };
	nodeMark.text = nodeMarkText;

	const hasCardDisplay = typeof lib.skill[name]?.intro?.mark === "function";
	nodeMark.classList.add(hasCardDisplay ? "other-skill" : "own-skill");

	nodeMark.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.card);

	if (!lib.config.touchscreen) {
		if (lib.config.hover_all) {
			lib.setHover(nodeMark, ui.click.hoverplayer);
		}
		if (lib.config.right_info) {
			nodeMark.oncontextmenu = ui.click.rightplayer;
		}
	}

	player.node.marks.appendChild(nodeMark);
	player.marks[id] = nodeMark;

	game.addVideo("markCharacter", player, { name, content, id, target });
}
