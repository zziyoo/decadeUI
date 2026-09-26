/**
 * 装备牌手牌化模式 - 将装备区的牌复制到手牌区显示
 */

import { lib, game, ui, get, _status } from "noname";

const GAINTAG = "equipHand";
const VALID_EVENTS = ["chooseCard", "chooseToUse", "chooseToRespond", "chooseToDiscard", "chooseCardTarget", "chooseToGive"];
const originalFilters = new WeakMap();

/** content.js 保证单次初始化，这里再防意外二次调用导致的 hook 重复注册 */
let equipCopyInitialized = false;

/**
 * 建副本时的事件引用。uncheckBegin 只能拿到 _status.event，收不到已被顶掉的旧事件，
 * 所以必须留住旧事件引用，不能靠事件栈反推。
 */
let copyOwnerEvent = null;

/**
 * 创建装备牌副本
 * @param {Card} original
 * @returns {Card}
 */
function createCopy(original) {
	const card = ui.create.card(ui.special);
	card.init([original.suit, original.number, original.name, original.nature]);
	card.cardid = original.cardid;
	card.wunature = original.wunature;
	card.storage = original.storage;
	card.relatedCard = original;
	card.owner = get.owner(original);

	const syncSelection = () => {
		if (get.position(card) !== "s" || !card.hasGaintag(GAINTAG)) return;

		ui.selected.cards.remove(card);
		const selected = card.classList.contains("selected");
		card.updateTransform(selected, 0);
		card.relatedCard.classList.toggle("selected", selected);

		if (selected) {
			ui.selected.cards.add(card.relatedCard);
		} else {
			ui.selected.cards.remove(card.relatedCard);
		}

		game.check();
	};

	card.addEventListener("click", syncSelection);
	card._syncSelection = syncSelection;

	return card;
}

/**
 * 创建过滤器包装
 * @param {GameEvent} event
 * @param {Function} filter
 * @param {boolean} includeS
 * @returns {Function}
 */
function wrapFilter(event, filter, includeS) {
	if (!originalFilters.has(event)) {
		originalFilters.set(event, filter);
	}

	return function (card, player) {
		const real = card.relatedCard || card;
		if (get.position(card) === "e") return false;
		if (includeS && get.position(card) === "s" && get.itemtype(card) === "card" && !card.hasGaintag(GAINTAG)) {
			return false;
		}
		return filter ? filter.call(this, real, player) : true;
	};
}

/**
 * 恢复原始过滤器
 * @param {GameEvent} event
 */
function restoreFilter(event) {
	if (originalFilters.has(event)) {
		event.filterCard = originalFilters.get(event);
		originalFilters.delete(event);
	}
}

/**
 * 处理多选时的卡牌筛选
 * @param {GameEvent} event
 * @param {Player} player
 * @param {Card[]} copies
 * @param {Card[]} filtered
 * @returns {Card[]}
 */
function processMultiSelect(event, player, copies, filtered) {
	const isMultiSelect = event.filterCard && (typeof event.selectCard === "object" || event.selectCard > 1);
	if (!isMultiSelect) {
		return event.filterCard ? filtered : copies;
	}

	const result = [...filtered];
	const originalPosition = event._equipCopyOriginalPosition || event.position;
	const validCards = player.getCards("he", card => {
		const real = card.relatedCard || card;
		return originalPosition.includes(get.position(real)) && event.filterCard.call(event, real, player);
	});

	for (const card of validCards) {
		ui.selected.cards = ui.selected.cards || [];
		ui.selected.cards.add(card);

		for (const copy of copies) {
			if (result.includes(copy)) continue;
			const real = copy.relatedCard || copy;
			if (originalPosition.includes(get.position(real)) && event.filterCard.call(event, real, player)) {
				result.push(copy);
			}
		}

		ui.selected.cards.remove(card);
	}

	return result;
}

/**
 * 设置卡牌样式
 * @param {Card[]} cards
 */
function styleCards(cards) {
	for (const card of cards) {
		card.node.gaintag.classList.remove("gaintag", "info");
		card.node.gaintag.innerHTML = '<div class="epclick"></div>';
	}
}

/**
 * 卡牌排序
 * @param {Card[]} cards
 */
function sortCards(cards) {
	cards.sort((b, a) => {
		if (a.name !== b.name) return lib.sort.card(a.name, b.name);
		if (a.suit !== b.suit) return lib.suit.indexOf(a) - lib.suit.indexOf(b);
		return a.number - b.number;
	});
}

/**
 * 清理副本卡牌
 * @param {GameEvent} event
 * @param {Player} player
 */
function cleanup(event, player) {
	if (!player) return;
	if (copyOwnerEvent === event) copyOwnerEvent = null;

	const cards = event.result?.cards;
	if (cards) {
		cards.forEach((card, i) => {
			if (card.hasGaintag(GAINTAG)) {
				const original = player.getCards("e", c => c.cardid === card.cardid)[0];
				if (original) cards[i] = original;
			}
		});
	}

	const copies = player.getCards("s", c => c.hasGaintag(GAINTAG));
	for (const copy of copies) {
		if (copy._syncSelection) {
			copy.removeEventListener("click", copy._syncSelection);
			delete copy._syncSelection;
		}
		copy.discard();
		copy.delete();
	}

	restoreFilter(event);

	if (event._equipCopyOriginalPosition !== undefined) {
		event.position = event._equipCopyOriginalPosition;
		delete event._equipCopyOriginalPosition;
	}

	event.copyCards = false;
	if (player === game.me) ui.updatehl();
}

/**
 * 初始化手牌化模式
 */
export function setupEquipCopy() {
	if (equipCopyInitialized) return;
	equipCopyInitialized = true;

	lib.hooks.checkBegin.add(async event => {
		if (!lib.config["extension_十周年UI_enableEquipCopy"] || lib.config["extension_十周年UI_aloneEquip"]) return;

		// 通用收尾：正在呈现的事件已不是建副本事件（被取消/被顶掉/主阶段推进）。
		// 这类切换多数不走 card 类 uncheck，只能在这里统一收；被挂起的旧事件若恢复交互，
		// 下一次 check 会经 checkBegin 自愈重建。
		if (copyOwnerEvent !== null && copyOwnerEvent !== event && copyOwnerEvent.copyCards) {
			cleanup(copyOwnerEvent, copyOwnerEvent.player);
		}

		if (event.player !== game.me) return;

		const player = event.player;
		const valid = event.position?.includes("e") && player.countCards("e") && !event.copyCards && VALID_EVENTS.includes(event.name);
		if (!valid) return;

		event.copyCards = true;
		copyOwnerEvent = event;
		const includeS = !event.position.includes("s");

		event._equipCopyOriginalPosition = event.position;
		event.position = event.position.replace("e", "");
		if (includeS) event.position += "s";

		// 本体 backup/restore 会快照/还原 position、filterCard（gameEvent.js:708/842），而 cancel 的
		// 顺序是 restore→uncheck→check：cleanup 晚于 restore 执行会用过期 stash 覆盖本体刚恢复的
		// 状态，checkBegin 随即重建副本（技能取消后残留主阶段的根源）。
		// 故在两者真正执行前先收掉副本上下文；另 backup 是覆盖式快照，保留首次快照为基础态，
		// restore 退出技能（delete skill）时校正回去，避免还原出无技能却带技能 position 的混合态。
		if (!event._equipCopyPatched) {
			event._equipCopyPatched = true;
			for (const key of ["backup", "restore"]) {
				const original = event[key];
				event[key] = function (...args) {
					if (key === "backup") {
						if (this.copyCards) cleanup(this, this.player);
						if (this._backup && !this._equipCopyBaseBackup) this._equipCopyBaseBackup = this._backup;
					} else if (this.copyCards) {
						cleanup(this, this.player);
					}
					const result = original.apply(this, args);
					if (key === "restore" && !this.skill && this._equipCopyBaseBackup) {
						this.position = this._equipCopyBaseBackup.position;
						this.filterCard = this._equipCopyBaseBackup.filterCard;
					}
					return result;
				};
			}
		}

		const copies = player.getCards("e").map(createCopy);
		const filtered = typeof event.filterCard === "function" ? copies.filter(c => event.filterCard.call(event, c.relatedCard || c, player)) : copies.slice();

		event.filterCard = wrapFilter(event, event.filterCard, includeS);

		const toGive = processMultiSelect(event, player, copies, filtered);
		if (toGive.length) player.directgains(toGive, null, GAINTAG);

		styleCards([...copies, ...filtered]);
		sortCards(copies);
	});

	lib.hooks.checkCard.add((card, event) => {
		if (!lib.config["extension_十周年UI_enableEquipCopy"] || lib.config["extension_十周年UI_aloneEquip"] || !event.copyCards) return;

		if (get.position(card) === "e" && card.classList.contains("selected")) {
			const copy = event.player.getCards("s", c => c.hasGaintag(GAINTAG) && c.relatedCard === card)[0];
			if (copy && !copy.classList.contains("selected")) {
				card.classList.remove("selected");
				ui.selected.cards.remove(card);
			}
		}
	});

	lib.hooks.checkEnd.add(event => {
		if (!lib.config["extension_十周年UI_enableEquipCopy"] || lib.config["extension_十周年UI_aloneEquip"] || !event.copyCards) return;

		for (const equip of event.player.getCards("e")) {
			if (equip.classList.contains("selected")) {
				const copy = event.player.getCards("s", c => c.hasGaintag(GAINTAG) && c.relatedCard === equip)[0];
				if (copy && !copy.classList.contains("selected")) {
					equip.classList.remove("selected");
					ui.selected.cards.remove(equip);
				}
			}
		}
	});

	lib.hooks.uncheckBegin.add(async (event, args) => {
		if (!lib.config["extension_十周年UI_enableEquipCopy"] || lib.config["extension_十周年UI_aloneEquip"]) return;

		// ba493a80 的生命周期判定：chooseCard 系事件仅在结算后（有 result）收尾，
		// 中间态重检不拆除上下文；chooseToUse/Respond 每次 card uncheck 都收尾重建。
		const shouldCleanup =
			args.includes("card") &&
			event.copyCards &&
			(
				event.result ||
				(["chooseToUse", "chooseToRespond"].includes(event.name) && !event.result)
			);

		if (shouldCleanup) cleanup(event, event.player);
	});
}
