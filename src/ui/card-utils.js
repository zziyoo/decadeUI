/**
 * @fileoverview 卡牌工具函数，提供卡牌临时花色点数显示、特效播放等功能
 */
import { lib, game, ui, get, ai, _status } from "noname";

/**
 * 卡牌临时花色点数显示
 * @param {HTMLElement} card - 卡牌元素
 * @param {string} suit - 花色
 * @param {number} number - 点数
 * @param {object} [elementUtil] - 元素工具对象
 * @returns {void}
 */
export function cardTempSuitNum(card, suit, number, elementUtil) {
	const create =
		elementUtil?.create ||
		((cls, parent, tag) => {
			const el = document.createElement(tag || "div");
			if (cls) el.className = cls;
			if (parent) parent.appendChild(el);
			return el;
		});

	let remain = false;
	if (card._tempSuitNum) remain = true;

	let snnode = card._tempSuitNum || ui.create.div(".tempsuitnum", card);
	card._tempSuitNum = snnode;

	if (!remain) {
		snnode.$num = create("num", snnode, "span");
		snnode.$num.style.fontFamily = '"STHeiti","SimHei","Microsoft JhengHei","Microsoft YaHei","WenQuanYi Micro Hei",Helvetica,Arial,sans-serif';
		snnode.$br = create(null, snnode, "br");
		snnode.$suit = create("suit", snnode, "span");
		snnode.$suit.style.fontFamily = '"STHeiti","SimHei","Microsoft JhengHei","Microsoft YaHei","WenQuanYi Micro Hei",Helvetica,Arial,sans-serif';
	}

	snnode.$num.innerHTML = number ? get.strNumber(number) : "▣";
	snnode.$suit.innerHTML = suit ? get.translation(suit) || "◈" : "◈";
	card.dataset.tempsn = suit;
}

/**
 * 卡牌特效映射表
 * @type {Object.<string, {key: string, opts?: object}>}
 */
export const cardEffectMap = {
	effect_caochuanjiejian: { key: "effect_caochuanjiejian" },
	shan: { key: "effect_shan" },
	tao: { key: "effect_tao", opts: { scale: 0.9 } },
	tiesuo: { key: "effect_tiesuolianhuan", opts: { scale: 0.9 } },
	jiu: { key: "effect_jiu", opts: { y: [-30, 0.5] } },
	kaihua: { key: "effect_shushangkaihua" },
	wuzhong: { key: "effect_wuzhongshengyou" },
	wuxie: { key: "effect_wuxiekeji", opts: { y: [10, 0.5], scale: 0.9 } },
	nanman: { key: "effect_nanmanruqin", opts: { scale: 0.45 } },
	wanjian: { key: "effect_wanjianqifa", opts: { scale: 0.78 } },
	wugu: { key: "effect_wugufengdeng", opts: { y: [10, 0.5] } },
	taoyuan: { key: "SF_kapai_eff_taoyuanjieyi", opts: { y: [10, 0.5] } },
	shunshou: { key: "effect_shunshouqianyang" },
	huogong: { key: "effect_huogong", opts: { x: [8, 0.5], scale: 0.5 } },
	guohe: { key: "effect_guohechaiqiao", opts: { y: [10, 0.5] } },
	yuanjiao: { key: "effect_yuanjiaojingong" },
	zhibi: { key: "effect_zhijizhibi" },
	zhulu_card: { key: "effect_zhulutianxia" },
};

/**
 * 获取杀的特效key
 * @param {string} nature - 属性（thunder/fire等）
 * @param {HTMLElement} card - 卡牌元素
 * @returns {string} 特效key
 */
export function getShaEffectKey(nature, card) {
	const natureKeyMap = { thunder: "effect_leisha", fire: "effect_huosha" };
	return natureKeyMap[nature] || (get.color(card) === "red" ? "effect_hongsha" : "effect_heisha");
}

/**
 * 尝试添加玩家卡牌使用标签
 * @param {HTMLElement} card - 卡牌元素
 * @param {HTMLElement} player - 玩家元素
 * @param {object} event - 事件对象
 * @param {object} decadeUI - DecadeUI实例
 * @returns {void}
 */
export function tryAddPlayerCardUseTag(card, player, event, decadeUI) {
	if (!card || !player || !event) return;

	const create =
		decadeUI.element?.create ||
		((cls, parent) => {
			const el = document.createElement("div");
			if (cls) el.className = cls;
			if (parent) parent.appendChild(el);
			return el;
		});

	let tagNode = card.querySelector(".used-info");
	if (!tagNode) tagNode = card.appendChild(create("used-info"));
	card.$usedtag = tagNode;

	if (event.blameEvent) event = event.blameEvent;

	let tagText;

	if (event.name === "judge") {
		tagText = handleJudgeTag(card, event, decadeUI);
	} else {
		tagText = handleDefaultTag(card, player, event, decadeUI);
	}

	tagNode.innerHTML = tagText;
}

/**
 * 处理判定标签
 * @param {HTMLElement} card - 卡牌元素
 * @param {object} event - 事件对象
 * @param {object} decadeUI - DecadeUI实例
 * @returns {string} 初始标签文本
 */
function handleJudgeTag(card, event, decadeUI) {
	const initialText = event.judgestr + "的判定牌";

	event.addMessageHook?.("judgeResult", function () {
		const evt = this;
		const resultCard = evt.result.card.clone;
		const apcard = evt.apcard;

		let tagNode = resultCard.querySelector(".used-info");
		if (!tagNode) {
			tagNode = document.createElement("div");
			tagNode.className = "used-info";
			resultCard.appendChild(tagNode);
		}

		if (evt.result.suit !== get.suit(resultCard) || evt.result.number !== get.number(resultCard)) {
			cardTempSuitNum(resultCard, evt.result.suit, evt.result.number, decadeUI.element);
		}

		let action;
		let judgeValue;
		const getEffect = evt.judge2;

		if (getEffect) {
			judgeValue = getEffect(evt.result);
		} else {
			judgeValue = decadeUI.get?.judgeEffect?.(evt.judgestr, evt.result.judge) ?? evt.result.judge;
		}

		if (typeof judgeValue === "boolean") {
			judgeValue = judgeValue ? 1 : -1;
		} else {
			judgeValue = evt.result.judge;
		}

		let tagText;
		if (judgeValue >= 0) {
			action = "play4";
			tagText = "判定生效";
		} else {
			action = "play5";
			tagText = "判定失效";
		}

		if (apcard?._ap) apcard._ap.stopSpineAll();

		if (apcard?._ap && apcard === resultCard) {
			apcard._ap.playSpine({ name: "effect_panding", action });
		} else {
			decadeUI.animation?.cap?.playSpineTo?.(resultCard, { name: "effect_panding", action });
		}

		evt.apcard = undefined;
		tagNode.innerHTML = (get.translation(evt.judgestr) || "") + tagText;
	});

	decadeUI.animation?.cap?.playSpineTo?.(card, { name: "effect_panding", action: "play", loop: true });
	event.apcard = card;

	return initialText;
}

/**
 * 处理默认标签
 * @param {HTMLElement} card - 卡牌元素
 * @param {HTMLElement} player - 玩家元素
 * @param {object} event - 事件对象
 * @param {object} decadeUI - DecadeUI实例
 * @returns {string} 标签文本
 */
function handleDefaultTag(card, player, event, decadeUI) {
	const evt = _status.event;
	_status.event = event;
	let text = get.cardsetion?.(player) || "";
	_status.event = evt;

	if (["useCard", "respond"].includes(event.name)) {
		const cardname = event.card.name;
		const cardnature = get.nature(event.card);

		// 临时卡牌名称显示
		if (lib.config.cardtempname !== "off" && (card.name !== cardname || !get.is.sameNature(cardnature, card.nature, true))) {
			if (!card._tempName) card._tempName = ui.create.div(".temp-name", card);
			let tempname = get.translation(cardname) || "";
			if (cardnature && cardname === "sha") {
				tempname = (get.translation(cardnature) || "") + tempname;
			}
			if (cardnature) card._tempName.dataset.nature = cardnature;
			card._tempName.innerHTML = tempname;
			card._tempName.tempname = tempname;
		}

		// 临时花色点数
		const cardnumber = get.number(event.card);
		const cardsuit = get.suit(event.card);
		if (card.dataset.views !== "1" && event.card.cards?.length === 1 && (card.number !== cardnumber || card.suit !== cardsuit)) {
			cardTempSuitNum(card, cardsuit, cardnumber, decadeUI.element);
		}

		// 播放卡牌特效
		if (event.card && (!event.card.cards || !event.card.cards.length || event.card.cards.length === 1)) {
			const name = event.card.name;
			const nature = event.card.nature;

			if (name === "sha") {
				const key = getShaEffectKey(nature, card);
				decadeUI.animation?.cap?.playSpineTo?.(card, key);
			} else {
				const entry = cardEffectMap[name];
				if (entry) {
					decadeUI.animation?.cap?.playSpineTo?.(card, entry.key, entry.opts);
				}
			}
		}
	}

	return text;
}
