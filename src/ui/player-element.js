/**
 * @fileoverview 玩家元素创建模块
 * 提供玩家DOM元素的创建和初始化功能
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { element } from "../utils/element.js";


/**
 * 折叠范围只限于有实际受赠记录的派生技能。
 * 例如【甚宠】先赠予【飞扬】【跋扈】，再通过 *_die storage 保存受赠对象。
 */
function getGrantedSkillGroups(player, displayedSkills) {
	if (lib.config.extension_十周年UI_foldDerivedSkills !== true || !displayedSkills.length) return [];
	const available = new Set(displayedSkills), consumed = new Set(), result = [];
	for (const giver of new Set([...(game.players || []), ...(game.dead || [])])) {
		if (!giver || giver === player) continue;
		for (const parent of giver.getSkills?.("invisible", null, false) || giver.skills || []) {
			const derivation = lib.skill[parent]?.derivation;
			if (!derivation) continue;
			const recipients = giver.getStorage?.(parent + "_die") || giver.storage?.[parent + "_die"];
			if (!Array.isArray(recipients) || !recipients.includes(player)) continue;
			const children = (Array.isArray(derivation) ? derivation : [derivation]).filter(
				id => typeof id === "string" && available.has(id) && !consumed.has(id)
			);
			if (!children.length) continue;
			children.forEach(id => consumed.add(id));
			result.push({ parent, children });
		}
	}
	return result;
}

/** 只查看来源技能实际赠予的技能，不修改玩家状态。 */
function showGrantedSkillDetails(player, group) {
	const previous = document.querySelector(".derived-gain-overlay");
	previous?._closeDerivedGain?.();
	previous?.remove();
	const overlay = ui.create.div(".derived-gain-overlay", ui.window);
	const dialog = ui.create.div(".derived-gain-dialog", overlay);
	dialog.setAttribute("role", "dialog");
	dialog.setAttribute("aria-modal", "true");
	const header = ui.create.div(".derived-gain-dialog-head", dialog);
	ui.create.div(".derived-gain-dialog-title", header, get.translation(group.parent));
	const closeButton = ui.create.div(".derived-gain-dialog-close", header, "×");
	const onKeyDown = e => {
		if (e.key === "Escape") close();
	};
	const close = () => {
		document.removeEventListener("keydown", onKeyDown);
		overlay.remove();
	};
	overlay._closeDerivedGain = close;
	closeButton.addEventListener("click", e => { e.stopPropagation(); close(); });
	overlay.addEventListener("click", e => {
		e.stopPropagation();
		if (e.target === overlay) close();
	});
	dialog.addEventListener("click", e => e.stopPropagation());
	document.addEventListener("keydown", onKeyDown);
	for (const skill of group.children) {
		if (!player.node?.gainSkill?.skills?.includes(skill)) continue;
		const row = ui.create.div(".derived-gain-dialog-skill", dialog);
		ui.create.div(".derived-gain-dialog-name", row, get.translation(skill));
		const description = ui.create.div(".derived-gain-dialog-desc", row);
		let info = "";
		try {
			info = get.skillInfoTranslation?.(skill, player, false) || lib.translate[skill + "_info"] || "";
		} catch (e) {
			info = lib.translate[skill + "_info"] || "";
		}
		description.innerHTML = info || "暂无技能描述";
	}
}

/**
 * 子节点监视器类
 * 用于缓存和监视DOM子节点变化
 */
class ChildNodesWatcher {
	/**
	 * @param {HTMLElement} dom - 要监视的DOM元素
	 */
	constructor(dom) {
		this.dom = dom;
		/** @type {Node[]|null} */
		this._cache = null;
		const observer = new MutationObserver(() => (this._cache = null));
		observer.observe(dom, { childList: true });
	}

	/**
	 * 获取子节点列表
	 * @returns {Node[]}
	 */
	get childNodes() {
		if (!this._cache) this._cache = Array.from(this.dom.childNodes);
		return this._cache;
	}
}

/**
 * 设置身份显示
 * @param {HTMLElement} realIdentity - 身份元素
 * @param {HTMLElement} player - 玩家元素
 */
function setupIdentityDisplay(realIdentity, player) {
	Object.defineProperties(realIdentity, {
		innerHTML: {
			configurable: true,
			get() {
				return this.innerText;
			},
			set(value) {
				if (get.mode() === "guozhan" || _status.mode === "jiange" || _status.mode === "siguo") {
					this.style.display = "none";
					this.innerText = value;
					this.parentNode.classList.add("guozhan-mode");
					return;
				}

				const currentStyle = lib.config.extension_十周年UI_newDecadeStyle;
				if (currentStyle === "codename" && value === "猜") {
					this.innerText = "";
					this.style.visibility = "";
					this.parentNode.style.backgroundImage = "";
					return;
				}

				const identity = this.parentNode.dataset.color;
				/** @type {Record<string, Function>} */
				const handlerMap = {
					猜: () => {
						let f = "cai";
						if (_status.mode === "purple" && identity === "cai") f += "_blue";
						return f;
					},
					友: () => "friend",
					敌: () => "enemy",
					反: () => (get.mode() === "doudizhu" ? "nongmin" : "fan"),
					主: () => {
						let f = "zhu";
						if (get.mode() === "versus" && get.translation(player.side + "Color") === "wei") {
							f += "_blue";
							player.classList.add("opposite-camp");
						} else if (get.mode() === "doudizhu") f = "dizhu";
						return f;
					},
					忠: () => {
						if (get.mode() === "identity" && _status.mode === "purple") return player.identity === "rZhong" ? "qianfeng_blue" : "qianfeng";
						if (get.mode() === "versus" && get.translation(player.side + "Color") === "wei") {
							player.classList.add("opposite-camp");
							return "zhong_blue";
						}
						return "zhong";
					},
					内: () => (_status.mode === "purple" ? (identity === "rNei" ? "xizuo" : "xizuo_blue") : "nei"),
					野: () => "ye",
					首: () => "zeishou",
					帅: () => "zhushuai",
					将: () => (_status.mode === "three" || get.translation(player.side + "Color") === "wei" ? "zhushuai_blue" : "dajiang"),
					兵: () => (player.side === false ? "qianfeng_blue" : "qianfeng"),
					卒: () => (player.side === false ? "qianfeng_blue" : "qianfeng"),
					师: () => "junshi",
					盟: () => "mengjun",
					神: () => "boss",
					从: () => "suicong",
					先: () => "xianshou",
					后: () => "houshou",
					民: () => "commoner",
				};

				const handler = handlerMap[value];
				if (!handler) {
					this.innerText = value;
					this.style.visibility = "";
					this.parentNode.style.backgroundImage = "";
					return;
				}

				let filename = handler();
				const checked = ["cai_blue", "nongmin", "dizhu", "zhong_blue", "xizuo", "xizuo_blue", "zhushuai_blue", "qianfeng_blue", "qianfeng"].includes(filename);
				if (!checked && this.parentNode.dataset.color?.[0] === "b") {
					filename += "_blue";
					player.classList.add("opposite-camp");
				}

				this.innerText = value;
				this.style.visibility = "hidden";

				const style = lib.config.extension_十周年UI_newDecadeStyle;
				/** @type {Record<string, string>} */
				const srcMap = {
					onlineUI: "image/styles/online/identity2_",
					babysha: "image/styles/baby/identity3_",
					on: "image/styles/decade/identity_",
					othersOff: "image/styles/decade/identity_",
					codename: "image/styles/codename/identity5_",
				};
				const srcPrefix = srcMap[style] || "image/styles/shousha/identity2_";
				const src = decadeUIPath + srcPrefix + filename + ".png";

				const image = new Image();
				image.node = this;
				image.onerror = function () {
					this.node.style.visibility = "";
				};
				image.src = src;
				this.parentNode.style.backgroundImage = `url("${src}")`;
			},
		},
	});
}

/**
 * 创建player元素
 * @param {HTMLElement} position - 父容器元素
 * @param {boolean} [noclick] - 是否禁用点击事件
 * @returns {HTMLElement} 玩家元素
 */
export function createPlayerElement(position, noclick) {
	const player = ui.create.div(".player", position);
	const playerExtend = {
		node: {
			avatar: ui.create.div(".primary-avatar", player, ui.click.avatar).hide(),
			avatar2: ui.create.div(".deputy-avatar", player, ui.click.avatar2).hide(),
			turnedover: element.create("turned-over", player),
			framebg: ui.create.div(".framebg", player),
			intro: ui.create.div(".intro", player),
			identity: ui.create.div(".identity", player),
			hp: ui.create.div(".hp", player),
			long: ui.create.div(".long", player),
			wei: ui.create.div(".wei", player),
			name: ui.create.div(".name", player),
			name2: ui.create.div(".name.name2", player),
			nameol: ui.create.div(".nameol", player),
			count: ui.create.div(".card-count", player),
			equips: ui.create.div(".equips", player).hide(),
			judges: ui.create.div(".judges", player),
			marks: element.create("dui-marks", player),
			chain: element.create("chain", player),
			handcards1: ui.create.div(".handcards"),
			handcards2: ui.create.div(".handcards"),
			expansions: ui.create.div(".expansions"),
		},
		phaseNumber: 0,
		invisibleSkills: [],
		skipList: [],
		skills: [],
		initedSkills: [],
		additionalSkills: {},
		disabledSkills: {},
		hiddenSkills: [],
		awakenedSkills: [],
		forbiddenSkills: {},
		popups: [],
		damagepopups: [],
		judging: [],
		extraEquip: [],
		stat: [{ card: {}, skill: {}, triggerSkill: {} }],
		actionHistory: [{ useCard: [], respond: [], skipped: [], lose: [], gain: [], sourceDamage: [], damage: [], custom: [], useSkill: [] }],
		tempSkills: {},
		storage: {
			counttrigger: new Proxy(
				{},
				{
					get(_, prop) {
						return player.getStat("triggerSkill")[prop];
					},
					set(_, prop, value) {
						player.getStat("triggerSkill")[prop] = value;
						return true;
					},
					deleteProperty(_, prop) {
						delete player.getStat("triggerSkill")[prop];
						return true;
					},
					has(_, prop) {
						return prop in player.getStat("triggerSkill");
					},
					ownKeys() {
						return Reflect.ownKeys(player.getStat("triggerSkill"));
					},
					getOwnPropertyDescriptor(_, prop) {
						return Object.getOwnPropertyDescriptor(player.getStat("triggerSkill"), prop);
					},
				}
			),
		},
		marks: {},
		expandedSlots: {},
		disabledSlots: {},
		ai: { friend: [], enemy: [], neutral: [], handcards: { global: [], source: [], viewed: [] } },
		queueCount: 0,
		outCount: 0,
		vcardsMap: { handcards: [], equips: [], judges: [] },
	};

	// 锁链图片
	const chainImg = new Image();
	chainImg.onerror = function () {
		const node = element.create("chain-back", player.node.chain);
		for (let i = 0; i < 40; i++) element.create("cardbg", node).style.transform = `translateX(${i * 5 - 5}px)`;
		chainImg.onerror = undefined;
	};
	chainImg.src = decadeUIPath + "image/ui/chain/tie_suo.png";

	const extend = {
		$cardCount: playerExtend.node.count,
		$dynamicWrap: element.create("dynamic-wrap"),
	};

	playerExtend.node.handcards1._childNodesWatcher = new ChildNodesWatcher(playerExtend.node.handcards1);
	playerExtend.node.handcards2._childNodesWatcher = new ChildNodesWatcher(playerExtend.node.handcards2);

	decadeUI.get.extend(player, extend);
	decadeUI.get.extend(player, playerExtend);
	Object.setPrototypeOf(player, lib.element.Player.prototype);

	player.node.action = ui.create.div(".action", player.node.avatar);

	// 身份显示
	const realIdentity = ui.create.div(player.node.identity);
	realIdentity.player = player;
	setupIdentityDisplay(realIdentity, player);

	// 手牌数显示
	Object.defineProperties(player.node.count, {
		innerHTML: {
			configurable: true,
			get() {
				return this.textContent;
			},
			set(value) {
				if (this.textContent !== value) {
					this.textContent = value;
					this.dataset.text = value;
				}
			},
		},
	});

	// 装备区监听
	const observer = new MutationObserver(mutations => {
		for (const m of mutations) {
			if (m.type === "childList") {
				const hasChange = Array.from(m.addedNodes).some(n => !n.classList?.contains("emptyequip")) || Array.from(m.removedNodes).some(n => !n.classList?.contains("emptyequip"));
				if (hasChange) player.$handleEquipChange();
			}
		}
	});
	observer.observe(playerExtend.node.equips, { childList: true });

	// 事件绑定
	if (!noclick) {
		player.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.target);
		player.node.identity.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.identity);
		if (lib.config.touchscreen) {
			player.addEventListener("touchstart", ui.click.playertouchstart);
			player.addEventListener("touchmove", ui.click.playertouchmove);
		}
	} else {
		player.noclick = true;
	}

	// 势力包装
	const campWrap = element.create("camp-wrap");
	const hpWrap = element.create("hp-wrap");
	player.insertBefore(campWrap, player.node.name);
	player.insertBefore(hpWrap, player.node.hp);
	player.node.campWrap = campWrap;
	player.node.hpWrap = hpWrap;
	hpWrap.appendChild(player.node.hp);

	const campWrapExtend = {
		node: {
			back: element.create("camp-back", campWrap),
			border: element.create("camp-border", campWrap),
			campName: element.create("camp-name", campWrap),
			avatarName: player.node.name,
			avatarDefaultName: element.create("avatar-name-default", campWrap),
		},
	};
	decadeUI.get.extend(campWrap, campWrapExtend);
	campWrap.appendChild(player.node.name);
	campWrap.node.avatarName.className = "avatar-name";
	campWrap.node.avatarDefaultName.innerHTML = get.mode() === "guozhan" ? "主将" : "隐匿";

	const node = {
		mask: player.insertBefore(element.create("mask"), player.node.identity),
		gainSkill: element.create("gain-skill", player),
	};


	node.gainSkill.player = player;
	node.gainSkill.skills = [];

	/** 将游戏的获赠技能记录渲染到武将牌。 */
	node.gainSkill.refresh = function () {
		const groups = getGrantedSkillGroups(this.player, this.skills);
		const groupByChild = new Map(groups.flatMap(group => group.children.map(child => [child, group])));
		const renderKey = [
			lib.config.extension_十周年UI_foldDerivedSkills === true,
			this.skills.join("|"),
			groups.map(g => g.parent + ":" + g.children.join(",")).join("|"),
		].join(";");
		if (this._derivedGainRenderKey === renderKey) return;
		this._derivedGainRenderKey = renderKey;
		this.classList.toggle("derived-gain-active", groups.length > 0);

		if (!groups.length) {
			this.innerHTML = this.skills.map(s => lib.translate[s] || "").filter(Boolean).join(" ");
			return;
		}

		this.textContent = "";
		const inserted = new Set();
		let first = true;
		for (const skill of this.skills) {
			const group = groupByChild.get(skill);
			if (group && inserted.has(group)) continue;
			if (!first) this.appendChild(document.createTextNode(" "));
			first = false;
			if (!group) {
				this.appendChild(document.createTextNode(lib.translate[skill] || ""));
				continue;
			}
			inserted.add(group);
			const badge = document.createElement("span");
			badge.className = "derived-gain-icon";
			badge.textContent = get.translation(group.parent);
			badge.title = group.children.map(id => get.translation(id)).join("、");
			badge.setAttribute("role", "button");
			badge.tabIndex = 0;
			const open = e => {
				e.preventDefault();
				e.stopPropagation();
				showGrantedSkillDetails(this.player, group);
			};
			badge.addEventListener("click", open);
			badge.addEventListener("keydown", e => {
				if (e.key === "Enter" || e.key === " ") open(e);
			});
			this.appendChild(badge);
		}
	};

	/** 获得技能仍记录原技能 ID；折叠只改变显示。 */
	node.gainSkill.gain = function (skill) {
		if (this.skills.includes(skill) || !lib.translate[skill]) return;
		if (lib.config.extension_十周年UI_newDecadeStyle === "off" && lib.config.extension_十周年UI_gainSkillsVisible !== "off") {
			const info = lib.skill[skill];
			if (!info || info.charlotte || info.sub || (info.mark && !info.limited) || info.nopop || info.popup === false || info.equipSkill) return;
			if (info.onremove && game.me !== this.player.storage[skill]) return;
			if (lib.config.extension_十周年UI_gainSkillsVisible === "othersOn" && this.player === game.me) return;
			if (!info.intro) info.intro = { content: () => get.skillInfoTranslation(skill, this.player, false) };
			this.player.markSkill(skill);
		}
		this.skills.push(skill);
		this.refresh();
	};

	node.gainSkill.lose = function (skill) {
		const index = this.skills.indexOf(skill);
		if (index < 0) return;
		this.skills.splice(index, 1);
		this.refresh();
	};

	decadeUI.get.extend(player.node, node);
	return player;
}
