/**
 * @fileoverview Player动画效果覆写模块
 * @description 处理玩家的各种动画效果，包括伤害、拼点、连线、死亡等
 * @module overrides/player/animations
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { getDui } from "./base.js";

/**
 * 伤害动画动作映射
 * @constant {Object}
 */
const DAMAGE_ACTIONS = {
	thunder: ["play5", "play6"],
	fire: ["play3", "play4"],
	__default: ["play1", "play2"],
};

/**
 * 伤害弹出覆写
 * @description 播放Spine伤害动画，字符串时显示武将技能名称（文字从两边飞入）
 * @param {number|string} num - 伤害数值或技能名称
 * @param {string} [nature] - 伤害属性（fire/thunder/water等）
 * @param {boolean} [font] - 是否使用普通字体
 * @param {boolean} [nobroadcast] - 是否不广播
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerDamagepop(num, nature = "soil", font, nobroadcast) {
	const player = this;

	if (typeof num === "string") {
		game.addVideo("damagepop", player, [num, nature, font]);
		if (nobroadcast !== false) {
			game.broadcast((p, n, na, f) => p.$damagepop(n, na, f), player, num, nature, font);
		}

		const container = ui.create.div(".damage.skill-popup", ui.arena);
		container.dataset.nature = nature || "soil";

		let left = 0;
		let top = 0;
		let element = player;

		while (element && element !== ui.arena) {
			left += element.offsetLeft || 0;
			top += element.offsetTop || 0;
			element = element.offsetParent;
		}

		container.style.position = "absolute";
		container.style.left = `${left}px`;
		container.style.top = `${top + 80}px`;
		container.style.width = `${player.offsetWidth}px`;
		container.style.zIndex = "9999";

		// 含 HTML 标签的字符串（如 <span data-nature="woodmm">丰田</span>）需由 innerHTML 解析
		if (/<\/?[a-z][^>]*>/i.test(num)) {
			const wrapper = document.createElement("div");
			wrapper.innerHTML = num;
			container.appendChild(wrapper);
			setTimeout(() => container.delete(), 1500);
			return;
		}

		const chars = num.split("");
		const midIndex = Math.ceil(chars.length / 2);

		chars.forEach((char, i) => {
			const span = document.createElement("span");
			span.textContent = char;
			span.className = i < midIndex ? "char-left" : "char-right";
			span.style.animationDelay = `${i * 0.05}s`;
			container.appendChild(span);
		});

		setTimeout(() => container.delete(), 1500);
		return;
	}

	if (typeof num !== "number") {
		if (player.damagepopups?.length) {
			const node = player.damagepopups[0];
			player.appendChild(node);
			ui.refresh(node);
			node.classList.add("damageadded");
			node.listenTransition(() => setTimeout(() => node.delete(), 200));
			setTimeout(() => {
				player.damagepopups.shift();
				player.$damagepop();
			}, 500);
		}
		return;
	}

	const animation = getDui()?.animation;
	if (!animation) return;

	if (num < 0 && nature !== "water") {
		const pair = DAMAGE_ACTIONS[nature] || DAMAGE_ACTIONS.__default;
		const action = num <= -2 ? pair[1] : pair[0];
		animation.playSpine({ name: "effect_shoujidonghua", action }, { scale: 0.8, parent: player });
	} else if (num > 0 && nature === "wood") {
		animation.playSpine("effect_zhiliao", { scale: 0.7, parent: player });
	}
}

/**
 * 伤害覆写
 * @description 播放受伤动画并广播
 * @param {Object} [source] - 伤害来源玩家
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerDamage(source) {
	if (get.itemtype(source) === "player") {
		game.addVideo("damage", this, source.dataset.position);
	} else {
		game.addVideo("damage", this);
	}

	game.broadcast((player, source) => player.$damage(source), this, source);

	this.queueCssAnimation("player-hurt 0.3s");
}

/**
 * 拼点覆写
 * @description 显示翻牌拼点动画
 * @param {Object} card1 - 发起者的牌
 * @param {Object} target - 目标玩家
 * @param {Object} card2 - 目标的牌
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerCompare(card1, target, card2) {
	const cardsetions = collectCardsetions([this, target]);

	game.broadcast((p, t, c1, c2, cs) => p.$compare(c1, t, c2, cs), this, target, card1, card2, cardsetions);
	game.addVideo("compare", this, [get.cardInfo(card1), target.dataset.position, get.cardInfo(card2)]);

	const { scale, centerX, y } = getCompareParams();

	createFlipCard(card1, this, Math.round(centerX - 62), y, scale, cardsetions, 300);
	setTimeout(() => {
		createFlipCard(card2, target, Math.round(centerX + 62), y, scale, cardsetions, 200);
	}, 200);
}

/**
 * 多人拼点覆写
 * @description 显示多人翻牌拼点动画
 * @param {Object} card1 - 发起者的牌
 * @param {Object[]} targets - 目标玩家数组
 * @param {Object[]} cards - 目标的牌数组
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerCompareMultiple(card1, targets, cards) {
	const cardsetions = collectCardsetions([this, ...targets]);

	game.broadcast((p, c1, ts, cs, cst) => p.$compareMultiple(c1, ts, cs, cst), this, card1, targets, cards, cardsetions);
	game.addVideo("compareMultiple", this, [get.cardInfo(card1), get.targetsInfo(targets), get.cardsInfo(cards)]);

	const { scale, centerX, y } = getCompareParams();
	const spacing = 124;
	const startX = Math.round(centerX - (spacing * targets.length) / 2);

	createFlipCard(card1, this, startX, y, scale, cardsetions, 300);

	targets.forEach((target, i) => {
		setTimeout(
			() => {
				createFlipCard(cards[i], target, startX + spacing * (i + 1), y, scale, cardsetions, 200);
			},
			200 * (i + 1)
		);
	});
}

/**
 * 连线覆写
 * @description 绘制玩家间的连线动画
 * @param {Object|Object[]} target - 目标玩家或玩家数组
 * @param {Object} [config] - 连线配置
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerLine(target, config) {
	if (get.itemtype(target) === "players") {
		target.forEach(t => this.line(t, config));
		return;
	}

	if (get.itemtype(target) !== "player") return;
	if (target === this) return;

	const player = this;
	const dui = getDui();

	game.broadcast((player, target, config) => player.line(target, config), player, target, config);
	game.addVideo("line", player, [target.dataset.position, config]);

	player.checkBoundsCache(true);
	target.checkBoundsCache(true);

	const hand = dui.boundsCaches.hand;
	let x1, y1, x2, y2;

	if (player === game.me) {
		hand.check();
		x1 = ui.arena.offsetWidth / 2;
		y1 = hand.y;
	} else {
		x1 = player.cacheLeft + player.cacheWidth / 2;
		y1 = player.cacheTop + player.cacheHeight / 2;
	}

	if (target === game.me) {
		hand.check();
		x2 = ui.arena.offsetWidth / 2;
		y2 = hand.y;
	} else {
		x2 = target.cacheLeft + target.cacheWidth / 2;
		y2 = target.cacheTop + target.cacheHeight / 2;
	}

	game.linexy([x1, y1, x2, y2], config, true);
}

/**
 * 死亡后覆写
 * @description 显示死亡UI效果
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerDieAfter() {
	this.stopDynamic();
	this.node.gainSkill.innerHTML = null;

	if (!this.node.dieidentity) {
		this.node.dieidentity = ui.create.div("died-identity", this);
	}
	this.node.dieidentity.classList.add("died-identity");

	const player = this;
	const decadeUI = window.decadeUI;
	const identity = decadeUI.getPlayerIdentity(this);
	const style = decadeUI.config.newDecadeStyle;

	const url = getDeathImageUrl(style, identity, player);

	const image = new Image();
	image.onerror = () => {
		player.node.dieidentity.innerHTML = `${decadeUI.getPlayerIdentity(player, player.identity, true)}<br>阵亡`;
	};

	if ((player._trueMe || player) !== game.me && player !== game.me && style === "off") {
		player.node.dieidentity.innerHTML = `
			<div style="width:21px; height:81px; left:22.5px; top:-12px; position:absolute;
				background-image: url(${lib.assetURL}extension/十周年UI/image/ui/misc/likai.png);
				background-size: 100% 100%;">
			</div>
		`;
	} else {
		player.node.dieidentity.innerHTML = "";
	}

	player.node.dieidentity.style.backgroundImage = `url("${url}")`;
	image.src = url;

	setTimeout(() => {
		decadeUI.animation?.playSpine("effect_zhenwang", {
			parent: player,
			scale: 0.8,
		});
	}, 250);
}

/**
 * 获取死亡图片URL
 * @param {string} style - UI样式
 * @param {string} identity - 身份
 * @param {Object} player - 玩家对象
 * @returns {string} 图片URL
 * @private
 */
function getDeathImageUrl(style, identity, player) {
	const basePath = window.decadeUIPath + "image/styles/";

	const styleMap = {
		onlineUI: `online/dead4_${identity}.png`,
		babysha: `baby/dead3_${identity}.png`,
		codename: `codename/dead_${identity}.png`,
		on: `decade/dead_${identity}.png`,
		othersOff: `decade/dead_${identity}.png`,
	};

	if (styleMap[style]) {
		return basePath + styleMap[style];
	}

	if (player !== game.me) {
		return basePath + `shousha/dead2_${identity}.png`;
	}
	return basePath + "shousha/dead2_me.png";
}

/**
 * 技能特效覆写
 * @description 显示技能发动的全屏特效
 * @param {string} name - 技能名
 * @param {string} [type="legend"] - 特效类型
 * @param {string} [color] - 颜色
 * @param {*} [avatar] - 头像
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerSkill(name, type, color, avatar) {
	if (typeof type !== "string") type = "legend";

	game.addVideo("skill", this, [name, type, color, avatar]);

	game.broadcastAll(
		(player, type, name, color, avatar) => {
			const decadeUI = window.decadeUI;
			if (!decadeUI) {
				game.delay(2.5);
				if (name) player.$fullscreenpop(name, color, avatar);
				return;
			}

			decadeUI.delay(2500);
			if (name) decadeUI.effect.skill(player, name, avatar);
		},
		this,
		type,
		name,
		color,
		avatar
	);
}

/**
 * CSS动画队列覆写
 * @description 管理CSS动画的队列播放
 * @param {string} animation - CSS动画字符串
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerQueueCssAnimation(animation) {
	const current = this.style.animation;
	let animations = this._cssanimations;

	if (animations === undefined) {
		animations = [];
		this._cssanimations = animations;

		this.addEventListener("animationend", function (e) {
			if (this.style.animationName !== e.animationName) return;

			const current = this.style.animation;
			const animations = this._cssanimations;

			while (animations.length) {
				this.style.animation = animations.shift();
				if (this.style.animation !== current) return;
				animations.current = this.style.animation;
			}

			animations.current = "";
			this.style.animation = "";
		});
	}

	if (animations.current || animations.length) {
		animations.push(animation);
		return;
	}

	animations.current = animation;
	this.style.animation = animation;
}

/**
 * 收集卡牌信息
 * @param {Object[]} players - 玩家数组
 * @returns {Object|null} 卡牌信息映射
 * @private
 */
function collectCardsetions(players) {
	if (!lib.config.card_animation_info) return null;

	const cardsetions = {};
	players.forEach(p => {
		cardsetions[p.playerid] = get.cardsetion(p);
	});
	return cardsetions;
}

/**
 * 获取拼点动画的基础参数
 * @returns {{scale: number, centerX: number, y: number}} 参数对象
 * @private
 */
function getCompareParams() {
	const bounds = getDui().boundsCaches.arena;
	if (!bounds.updated) bounds.update();

	return {
		scale: bounds.cardScale,
		centerX: (bounds.width - bounds.cardWidth) / 2,
		y: Math.round(bounds.height * 0.45 - bounds.cardHeight / 2),
	};
}

/**
 * 创建翻牌动画节点
 * @param {Object} card - 卡牌对象
 * @param {Object} owner - 所有者玩家
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {number} scale - 缩放比例
 * @param {Object} cardsetions - 卡牌信息
 * @param {number} delay - 延迟时间
 * @returns {HTMLElement} 卡牌节点
 * @private
 */
function createFlipCard(card, owner, x, y, scale, cardsetions, delay) {
	const node = card.copy("thrown");
	node.classList.add("infohidden");
	node.classList.remove("decade-card");
	node.style.background = "";
	node.style.transform = `translate(${x}px, ${y}px) scale(${scale}) perspective(600px) rotateY(180deg)`;

	ui.arena.appendChild(node);
	ui.thrown.push(node);

	if (cardsetions?.[owner.playerid]) {
		const setion = ui.create.div(".cardsetion", cardsetions[owner.playerid], node);
		setion.style.setProperty("display", "block", "important");
	}

	setTimeout(() => {
		node.style.transition = "all ease-in 0.3s";
		node.style.transform = `translate(${x}px, ${y}px) scale(${scale}) perspective(600px) rotateY(270deg) translateX(52px)`;

		node.listenTransition(() => {
			node.classList.remove("infohidden");

			if (card.classList.contains("decade-card")) {
				node.classList.add("decade-card");
				node.style.background = card.style.background;
			} else if (card.classList.contains("fullimage")) {
				node.classList.add("fullimage");
				if (card.style.backgroundImage) {
					node.style.backgroundImage = card.style.backgroundImage;
					node.style.backgroundSize = card.style.backgroundSize;
				} else {
					node.style.background = card.style.background;
				}
			}

			node.style.transition = "all 0s";
			ui.refresh(node);
			node.style.transform = `translate(${x}px, ${y}px) scale(${scale}) perspective(600px) rotateY(-90deg) translateX(52px)`;
			ui.refresh(node);
			node.style.transition = "";
			ui.refresh(node);
			node.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
		});
	}, delay);

	return node;
}
