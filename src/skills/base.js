/**
 * @fileoverview 基础技能模块
 * @description 包含体力动画、伤害数字显示、弃牌清理等基础技能
 * @module skills/base
 */

import { lib, game, ui, get, _status } from "noname";

/**
 * @type {Object.<string, Object>}
 * @description 基础技能集合
 */
export const baseSkill = {
	/** 护甲标记配置 */
	ghujia: { mark: false },

	/**
	 * 失去体力动画
	 * @description 在失去体力前播放动画效果
	 */
	_hpLossAnimation: {
		trigger: { player: "loseHpBefore" },
		forced: true,
		popup: false,
		charlotte: true,
		filter(event) {
			return !!event.num;
		},
		async content(event, trigger, player) {
			if (window.dcdAnim?.playLoseHp) {
				window.dcdAnim.playLoseHp(player);
			}
		},
	},

	/**
	 * 回复数字显示
	 * @description 在实际回复体力时显示数字动画
	 */
	_wjmh_huifushuzi_: {
		priority: 10,
		forced: true,
		trigger: { player: "changeHp" },
		filter(event) {
			const parent = event.getParent?.("recover", true);
			return !!parent && event.changedHp > 0 && event.changedHp <= 9 && lib.config.extension_十周年UI_newDecadeStyle !== "off";
		},
		async content(event, trigger, player) {
			decadeUI.animation?.playRecoverNumber?.(player, trigger.changedHp);
		},
	},

	/**
	 * 虚拟伤害数字显示
	 * @description 在受到虚拟伤害时显示数字动画
	 */
	_wjmh_xunishuzi_: {
		priority: 10,
		forced: true,
		trigger: { player: "damage" },
		filter(event) {
			return event.num >= 0 && event.num <= 9 && event.unreal;
		},
		async content(event, trigger, player) {
			decadeUI.animation?.playVirtualDamageNumber?.(player, trigger.num);
		},
	},

	/**
	 * 伤害数字显示
	 * @description 在受到多点伤害时显示数字动画
	 */
	_wjmh_shanghaishuzi_: {
		priority: 10,
		forced: true,
		trigger: { player: "damage" },
		filter(event) {
			return event.num > 1 && event.num <= 9 && !event.unreal && lib.config.extension_十周年UI_newDecadeStyle;
		},
		async content(event, trigger, player) {
			decadeUI.animation?.playDamageNumber?.(player, trigger.num);
		},
	},

	/**
	 * 用牌后清理
	 * @description 在用牌结束后清理UI元素
	 */
	_usecard: {
		trigger: { global: "useCardAfter" },
		forced: true,
		popup: false,
		silent: true,
		priority: -100,
		filter(event) {
			return ui.clear.delay === "usecard" && event.card.name !== "wuxie";
		},
		async content() {
			ui.clear.delay = false;
			game.broadcastAll(() => ui.clear());
		},
	},

	/**
	 * 弃牌清理
	 * @description 在弃牌后清理弃牌堆中的卡牌元素
	 */
	_discard: {
		trigger: { global: ["discardAfter", "loseToDiscardpileAfter", "loseAsyncAfter"] },
		filter(event) {
			return !!ui.todiscard[event.discardid];
		},
		forced: true,
		silent: true,
		popup: false,
		priority: -100,
		async content(event, trigger) {
			game.broadcastAll(id => {
				if (window.decadeUI) {
					ui.todiscard = [];
					ui.clear();
					return;
				}
				const todiscard = ui.todiscard[id];
				delete ui.todiscard[id];
				if (!todiscard) return;

				let time = 1000;
				if (typeof todiscard._discardtime === "number") {
					time += todiscard._discardtime - get.time();
				}
				setTimeout(() => todiscard.forEach(card => card.delete()), Math.max(0, time));
			}, trigger.discardid);
		},
	},

	/**
	 * 旧版胆守
	 * @description 造成伤害后摸牌并结束当前阶段
	 */
	olddanshou: {
		audio: "danshou",
		trigger: { source: "damageSource" },
		check(event, player) {
			return get.attitude(player, event.player) <= 0;
		},
		async content(event, trigger, player) {
			await player.draw();

			while (ui.ordering.childNodes.length) {
				ui.ordering.firstChild.discard();
			}

			const evt = _status.event.getParent("phase", true);
			if (evt) {
				if (window.decadeUI?.eventDialog) {
					decadeUI.eventDialog.finished = true;
					decadeUI.eventDialog.finishing = false;
					decadeUI.eventDialog = undefined;
				}
				game.resetSkills();
				_status.event = evt;
				_status.event.finish();
				_status.event.untrigger(true);
			}
		},
		ai: { jueqing: true },
	},
};
