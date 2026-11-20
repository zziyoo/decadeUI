/**
 * @fileoverview 玩家元素创建模块
 * 提供玩家DOM元素的创建和初始化功能
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { element } from "../utils/element.js";


/**
 * 读取当前仍可见的获赠技能以及有明确来源记录的赠予关系。
 * 【甚宠】先执行 addSkills，再通过 *_die storage 记录受赠目标；
 * 在该记录出现前，仅将可能属于赠予中的技能列为 pending，而不错误归组。
 */
function getGrantedSkillState(player, shownSkills) {
	const visible = new Set(shownSkills);
	const pendingCandidates = new Set();
	const assigned = new Set();
	const groups = [];
	for (const giver of new Set([...(game.players || []), ...(game.dead || [])])) {
		if (!giver || giver === player) continue;
		const sourceSkills = giver.getSkills?.("invisible", null, false) || giver.skills || [];
		for (const parent of sourceSkills) {
			const derivation = lib.skill[parent]?.derivation;
			if (!derivation) continue;
			const candidateSkills = (Array.isArray(derivation) ? derivation : [derivation]).filter(id => typeof id === "string" && visible.has(id));
			if (!candidateSkills.length) continue;
			candidateSkills.forEach(id => pendingCandidates.add(id));
			const recipients = giver.getStorage?.(parent + "_die") || giver.storage?.[parent + "_die"];
			if (!Array.isArray(recipients) || !recipients.includes(player)) continue;
			const children = candidateSkills.filter(id => !assigned.has(id));
			if (!children.length) continue;
			children.forEach(id => assigned.add(id));
			groups.push({ parent, children });
		}
	}
	return { groups, pendingCandidates, assigned };
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

	/** 对暂未建立来源记录的候选获赠技能短暂保留，避免“飞扬、跋扈”先闪现。 */
	node.gainSkill.refresh = function () {
		const enabled = lib.config.extension_十周年UI_foldDerivedSkills === true;
		const { groups, pendingCandidates, assigned } = enabled
			? getGrantedSkillState(this.player, this.skills)
			: { groups: [], pendingCandidates: new Set(), assigned: new Set() };

		if (this._grantRenderTimer) {
			clearTimeout(this._grantRenderTimer);
			this._grantRenderTimer = null;
		}
		this._grantPending ??= new Map();
		this._grantExpired ??= new Set();
		const now = Date.now();
		const pending = new Set();
		if (!enabled) {
			this._grantPending.clear();
			this._grantExpired.clear();
		} else {
			for (const skill of this.skills) {
				if (assigned.has(skill)) {
					this._grantPending.delete(skill);
					this._grantExpired.delete(skill);
				} else if (pendingCandidates.has(skill) && !this._grantExpired.has(skill)) {
					if (!this._grantPending.has(skill)) this._grantPending.set(skill, now + 1000);
					if (now < this._grantPending.get(skill)) {
						pending.add(skill);
					} else {
						this._grantPending.delete(skill);
						this._grantExpired.add(skill);
					}
				} else {
					this._grantPending.delete(skill);
				}
			}
		}
		if (pending.size) {
			this._grantRenderTimer = setTimeout(() => {
				this._grantRenderTimer = null;
				if (this.isConnected) this.refresh();
			}, 60);
		}

		const key = [
			enabled,
			this.skills.join("|"),
			groups.map(g => g.parent + ":" + g.children.join(",")).join("|"),
			[...pending].join("|"),
		].join(";");
		const markHost = this.player.node?.marks;
		this._derivedGainMarks ??= new Map();
		// 标记栏如被其他界面逻辑重新构建，也允许恢复此纯 UI 标记。
		const lostMark = [...this._derivedGainMarks.values()].some(mark => mark.parentNode !== markHost);
		if (this._derivedGainRenderKey === key && !lostMark) return;
		this._derivedGainRenderKey = key;

		// 只移除扩展自身创建的折叠标记，不触碰 player.marks 或原生标记。
		for (const mark of this._derivedGainMarks.values()) mark.remove();
		this._derivedGainMarks.clear();

		if (!markHost || !groups.length) {
			this.innerHTML = this.skills
				.filter(id => !pending.has(id))
				.map(id => lib.translate[id] || "")
				.filter(Boolean)
				.join(" ");
			return;
		}

		// 已归组技能不再出现在 gain-skill 文字层；摘要直接显示在原生标记栏。
		this.innerHTML = this.skills
			.filter(id => !pending.has(id) && !assigned.has(id))
			.map(id => lib.translate[id] || "")
			.filter(Boolean)
			.join(" ");

		for (const group of groups) {
			// 复用现有标记 DOM 结构和 OL 的 .dui-marks > .mark 样式。
			const mark = ui.create.div(".card.mark.other-skill.derived-gain-mark", markHost);
			ui.create.div(".mark-text", mark, get.translation(group.parent).slice(0, 2));
			mark.title = get.translation(group.parent) + "：" + group.children.map(id => get.translation(id)).join("、");
			mark._customintro = uiintro => {
				uiintro.add(get.translation(group.parent));
				let count = 0;
				for (const id of group.children) {
					if (!this.skills.includes(id)) continue;
					const name = get.translation(id);
					let info = "";
					try {
						info = get.skillInfoTranslation(id, this.player, false) || "";
					} catch (error) {
						info = lib.translate[id + "_info"] || "";
					}
					if (!info) info = lib.translate[id + "_info"] || "暂无技能描述";
					uiintro.add('<div><div class="skill">【' + name + '】</div><div>' + info + '</div></div>');
					count++;
				}
				if (!count) uiintro.addText("当前没有可查看的获赠技能");
				uiintro.add(ui.create.div(".placeholder.slim"));
			};
			// 与真实的十周年 UI 标记使用同一个交互入口，不新增弹窗系统。
			mark.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.card);
			this._derivedGainMarks.set(group.parent, mark);
		}
	};

	/** 获得技能仍记录原始技能 ID；折叠仅改变武将牌显示。 */
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
		this._grantPending?.delete(skill);
		this._grantExpired?.delete(skill);
		this.refresh();
	};

	decadeUI.get.extend(player.node, node);
	return player;
}
