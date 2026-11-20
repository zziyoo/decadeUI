/**
 * @fileoverview 手杀风格lbtn插件
 * @description 提供聊天系统、身份显示、手杀风格菜单、自动牌序等功能
 * @version 2.0
 */
import { _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";
import { initChatSystem } from "../chatSystem.js";

/**
 * 创建手杀风格lbtn插件
 * @param {Object} lib - 游戏库对象
 * @param {Object} game - 游戏对象
 * @param {Object} ui - UI对象
 * @param {Object} get - 获取器对象
 * @param {Object} ai - AI对象
 * @param {Object} _status - 状态对象
 * @param {Object} app - 应用对象
 * @returns {Object} 手杀风格插件配置对象
 */
export function createShoushaLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const assetPath = "extension/十周年UI/ui/assets/lbtn/";

	/**
	 * 手牌排序
	 * @description 按类型、名称、花色、点数排序手牌
	 */
	const sortHandCards = () => {
		if (!game.me || game.me.hasSkillTag("noSortCard")) return;
		const cards = game.me.getCards("hs");
		const sort2 = (a, b) => {
			const order = { basic: 0, trick: 1, delay: 1, equip: 2 };
			const ta = get.type(a);
			const tb = get.type(b);
			const ca = order[ta] === undefined ? 99 : order[ta];
			const cb = order[tb] === undefined ? 99 : order[tb];
			if (ca !== cb) return ca - cb;
			if (a.name !== b.name) return lib.sort.card(a.name, b.name);
			if (a.suit !== b.suit) return lib.suit.indexOf(a.suit) - lib.suit.indexOf(b.suit);
			return a.number - b.number;
		};
		if (cards.length > 1) {
			cards.sort(sort2);
			cards.forEach((card, j) => {
				game.me.node.handcards1.insertBefore(cards[j], game.me.node.handcards1.firstChild);
			});
			if (typeof decadeUI !== "undefined") decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
		}
	};

	/**
	 * 开启自动牌序
	 * @description 使用MutationObserver监听手牌变化，自动触发排序
	 */
	const startAutoPaixu = () => {
		if (!game.me || game.me.hasSkillTag("noSortCard")) return;
		const container = game.me.node?.handcards1;
		if (!container) return;

		if (ui._autoPaixuObserver) {
			try {
				ui._autoPaixuObserver.disconnect();
			} catch (e) {}
		}

		ui._autoPaixuDebounce = null;
		ui._autoPaixuSorting = false;
		ui._autoPaixuEnabled = true;
		ui._autoPaixuContainer = container;
		ui._autoPaixuLastCount = container.childNodes.length || 0;

		ui._autoPaixuObserver = new MutationObserver(() => {
			if (ui._autoPaixuSorting) return;
			if (ui._autoPaixuDebounce) clearTimeout(ui._autoPaixuDebounce);
			ui._autoPaixuDebounce = setTimeout(() => {
				if (!game.me?.node?.handcards1) return;
				const curCount = game.me.node.handcards1.childNodes.length || 0;
				if (ui._autoPaixuLastCount !== null && curCount < ui._autoPaixuLastCount) {
					ui._autoPaixuLastCount = curCount;
					return;
				}
				const cards = game.me.getCards("hs");
				const sort2 = (a, b) => {
					const order = { basic: 0, trick: 1, delay: 1, equip: 2 };
					const ta = get.type(a);
					const tb = get.type(b);
					const ca = order[ta] === undefined ? 99 : order[ta];
					const cb = order[tb] === undefined ? 99 : order[tb];
					if (ca !== cb) return ca - cb;
					if (a.name !== b.name) return lib.sort.card(a.name, b.name);
					if (a.suit !== b.suit) return lib.suit.indexOf(a.suit) - lib.suit.indexOf(b.suit);
					return a.number - b.number;
				};
				if (cards.length > 1) {
					ui._autoPaixuSorting = true;
					const sorted = cards.slice().sort(sort2);
					const cont = game.me.node.handcards1;
					let unchanged = true;
					for (let idx = 0; idx < sorted.length; idx++) {
						if (cont.childNodes[idx] !== sorted[idx]) {
							unchanged = false;
							break;
						}
					}
					if (!unchanged) {
						for (let k = 0; k < sorted.length; k++) {
							const nodeExpect = sorted[k];
							if (cont.childNodes[k] !== nodeExpect) {
								cont.insertBefore(nodeExpect, cont.childNodes[k] || null);
							}
						}
					}
					if (typeof decadeUI !== "undefined") {
						decadeUI.queueNextFrameTick(() => {
							decadeUI.layoutHand();
							setTimeout(() => {
								ui._autoPaixuSorting = false;
							}, 0);
						}, decadeUI);
					} else {
						ui._autoPaixuSorting = false;
					}
					ui._autoPaixuLastCount = game.me.node.handcards1.childNodes.length || 0;
					ui._autoPaixuSuppressOnce = true;
				}
			}, 180);
		});

		ui._autoPaixuObserver.observe(container, { childList: true, subtree: true });

		if (ui._autoPaixuKeeper) {
			try {
				clearInterval(ui._autoPaixuKeeper);
			} catch (e) {}
		}
		ui._autoPaixuKeeper = setInterval(() => {
			if (!ui._autoPaixuEnabled || !game.me?.node) return;
			const cur = game.me.node.handcards1;
			if (!cur) return;
			if (cur !== ui._autoPaixuContainer) {
				ui._autoPaixuContainer = cur;
				ui._autoPaixuLastCount = cur.childNodes.length || 0;
				try {
					ui._autoPaixuObserver.disconnect();
				} catch (e) {}
				ui._autoPaixuObserver.observe(cur, { childList: true, subtree: true });
			}
			const nowCount = cur.childNodes.length || 0;
			if (nowCount !== ui._autoPaixuLastCount) {
				const prev = ui._autoPaixuLastCount;
				ui._autoPaixuLastCount = nowCount;
				if (nowCount > prev && !ui._autoPaixuSorting) {
					if (ui._autoPaixuSuppressOnce) {
						ui._autoPaixuSuppressOnce = false;
					} else {
						setTimeout(sortHandCards, 120);
					}
				}
			}
		}, 600);

		sortHandCards();
	};

	/**
	 * 关闭自动牌序
	 * @description 断开观察器并清理相关定时器
	 */
	const stopAutoPaixu = () => {
		if (ui._autoPaixuObserver) {
			try {
				ui._autoPaixuObserver.disconnect();
			} catch (e) {}
			ui._autoPaixuObserver = null;
		}
		if (ui._autoPaixuDebounce) {
			clearTimeout(ui._autoPaixuDebounce);
			ui._autoPaixuDebounce = null;
		}
		if (ui._autoPaixuKeeper) {
			try {
				clearInterval(ui._autoPaixuKeeper);
			} catch (e) {}
			ui._autoPaixuKeeper = null;
		}
		ui._autoPaixuSorting = false;
		ui._autoPaixuEnabled = false;
	};

	/**
	 * 显示牌堆统计
	 * @description 统计并显示牌堆中的卡牌信息，包括花色、点数、类型等
	 */
	const showPaidui = () => {
		if (!_status.gameStarted) return;
		game.pause2();

		const cardsInfo = game.players
			.map(p => p.getCards("h"))
			.flat(Infinity)
			.concat(...ui.cardPile.childNodes)
			.concat(...ui.discardPile.childNodes)
			.map(item => ({
				name: item.name,
				suit: item.suit,
				number: item.number,
				nature: get.translation(item.nature),
				color: get.color(item),
				type: get.translation(get.type(item), "trick"),
				translate: lib.translate[item.name],
				link: item,
			}));

		const cardStatistics = {
			杀: { num: 0, type: "基本" },
			火杀: { num: 0, type: "基本" },
			雷杀: { num: 0, type: "基本" },
			红杀: { num: 0, type: "基本" },
			黑杀: { num: 0, type: "基本" },
			"黑桃2~9": { num: 0, type: "花色" },
		};
		const typeList = ["点数", "花色"];

		for (const card of cardsInfo) {
			typeList.add(card.type);
			if (!cardStatistics[card.translate]) cardStatistics[card.translate] = { num: 0, type: card.type };
			if (!cardStatistics[get.translation(card.suit)]) cardStatistics[get.translation(card.suit)] = { num: 0, type: "花色" };
			if (!cardStatistics[card.number]) cardStatistics[card.number] = { num: 0, type: "点数" };

			if (ui.cardPile.contains(card.link)) {
				cardStatistics[card.translate].num++;
				cardStatistics[get.translation(card.suit)].num++;
				cardStatistics[card.number].num++;
				if (card.name === "sha") {
					if (card.color === "black") {
						cardStatistics["黑杀"].num++;
						if (card.suit === "spade" && card.number <= 9 && card.number >= 2) cardStatistics["黑桃2~9"].num++;
					} else if (card.color === "red") {
						cardStatistics["红杀"].num++;
					}
				}
			}
			if (card.nature) {
				if (!cardStatistics[card.nature + card.translate]) cardStatistics[card.nature + card.translate] = { num: 0, type: card.type };
				if (ui.cardPile.contains(card.link)) cardStatistics[card.nature + card.translate].num++;
			}
		}

		const popupContainer = ui.create.div(".popup-container", ui.window, { zIndex: 10, background: "rgb(0,0,0,.3)" }, function () {
			this.delete(500);
			game.resume2();
		});

		const statistics = ui.create.div(".card-statistics", "卡牌计数器", popupContainer);
		const statisticsTitle = ui.create.div(".card-statistics-title", statistics);
		const statisticsContent = ui.create.div(".card-statistics-content", statistics);

		typeList.forEach(item => {
			ui.create.div(statisticsTitle, "", item);
			statisticsContent[item] = ui.create.div(statisticsContent, "");
		});

		for (const i in cardStatistics) {
			const items = ui.create.div(".items");
			ui.create.div(".item", i, items);
			ui.create.div(".item-num", `X${cardStatistics[i].num}`, items);
			statisticsContent[cardStatistics[i].type].appendChild(items);
		}
	};

	let _lastMe = null;
	let _distanceUpdateInterval = null;

	/**
	 * 显示距离
	 * @description 在其他角色下面显示与当前玩家的距离，并启动定时更新
	 */
	const showDistanceDisplay = () => {
		if (!lib.config["extension_十周年UI_showDistanceDisplay"]) {
			closeDistanceDisplay();
			return;
		}

		closeDistanceDisplay();
		_lastMe = game.me;
		if (game.players?.length > 0) {
			game.players.forEach(player => {
				if (player !== game.me) {
					const distance = get.distance(game.me, player);
					const distanceText = distance === Infinity ? "∞" : distance.toString();
					const distanceDisplay = ui.create.div(".distance-display", `(距离:${distanceText})`, player);
					player._distanceDisplay = distanceDisplay;
				}
			});
		}
		if (_distanceUpdateInterval) clearInterval(_distanceUpdateInterval);
		_distanceUpdateInterval = setInterval(updateDistanceDisplay, 1000);
	};

	/**
	 * 更新距离显示
	 * @description 刷新所有角色的距离显示，如果当前角色改变则重新初始化
	 */
	const updateDistanceDisplay = () => {
		if (_lastMe !== game.me) {
			_lastMe = game.me;
			closeDistanceDisplay();
			showDistanceDisplay();
			return;
		}
		game.players.forEach(player => {
			if (player !== game.me && player._distanceDisplay) {
				const distance = get.distance(game.me, player);
				const distanceText = distance === Infinity ? "∞" : distance.toString();
				player._distanceDisplay.innerHTML = `(距离:${distanceText})`;
			}
		});
	};

	/**
	 * 关闭距离显示
	 * @description 移除所有距离显示元素并清理定时器
	 */
	const closeDistanceDisplay = () => {
		game.players?.forEach(player => {
			if (player._distanceDisplay) {
				player._distanceDisplay.remove();
				player._distanceDisplay = null;
			}
		});
		if (_distanceUpdateInterval) {
			clearInterval(_distanceUpdateInterval);
			_distanceUpdateInterval = null;
		}
	};

	return {
		...base,
		skinName: "shousha",

		/**
		 * 点击处理器集合
		 */
		click: {
			...base.click,
			paixu: sortHandCards,
			startAutoPaixu,
			stopAutoPaixu,
			paidui: showPaidui,
		},

		/**
		 * 内容初始化
		 * @description 注册技能更新触发器
		 */
		content(next) {
			lib.skill._uicardupdate = {
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				unique: true,
				popup: false,
				silent: true,
				noLose: true,
				noGain: true,
				noDeprive: true,
				priority: -Infinity,
				filter: (event, player) => !!player,
				async content() {
					const me = _status.event?.player || game.me;
					ui.updateSkillControl?.(me, true);
				},
			};
		},

		/**
		 * 预加载内容
		 * @description 初始化聊天系统、基础重写、距离显示和配置监听
		 */
		precontent() {
			initChatSystem(lib, game, ui, get);
			this.initArenaReady();
			base.initBaseRewrites.call(this);

			if (lib.announce?.subscribe) {
				lib.announce.subscribe("gameStart", () => setTimeout(showDistanceDisplay, 100));
			} else {
				lib.arenaReady.push(() => {
					const checkAndShow = () => {
						if (_status.gameStarted && game.players?.length > 0) {
							setTimeout(showDistanceDisplay, 100);
						} else {
							setTimeout(checkAndShow, 500);
						}
					};
					checkAndShow();
				});
			}

			if (lib.announce?.subscribe) {
				lib.announce.subscribe("extensionConfigChanged", data => {
					if (data?.extension === "十周年UI" && data?.config === "showDistanceDisplay") {
						if (data.value) {
							showDistanceDisplay();
						} else {
							closeDistanceDisplay();
						}
					}
				});
			}
		},

		/**
		 * 初始化确认对话框重写
		 * @description 重写ui.create.confirm方法以适配手杀风格
		 */
		initConfirmRewrite() {
			const self = this;
			ui.create.confirm = (str, func) => {
				if (ui.confirm?.classList.contains("closing")) {
					ui.confirm.remove();
					ui.controls.remove(ui.confirm);
					ui.confirm = null;
				}

				if (!ui.confirm) {
					ui.confirm = self.create.confirm();
				}

				ui.confirm.node.ok.classList.add("disabled");
				ui.confirm.node.cancel.classList.add("disabled");

				if (_status.event.endButton) {
					ui.confirm.node.cancel.classList.remove("disabled");
				}

				if (str) {
					if (str.includes("o")) ui.confirm.node.ok.classList.remove("disabled");
					if (str.includes("c")) ui.confirm.node.cancel.classList.remove("disabled");
					ui.confirm.str = str;
				}

				if (func) {
					ui.confirm.custom = func;
				} else {
					ui.confirm.custom = (link, target) => {
						if (link === "ok") ui.click.ok(target);
						else if (link === "cancel") ui.click.cancel(target);
						else target.custom?.(link);
					};
				}

				ui.updatec();
				ui.confirm.update?.();
			};
		},

		/**
		 * 初始化Arena就绪回调
		 * @description 注册游戏开始后的初始化逻辑
		 */
		initArenaReady() {
			const self = this;
			lib.arenaReady.push(() => {
				self.initRoundUpdate();
				self.createChatButton();

				if (self.supportedModes.includes(lib.config.mode)) {
					self.initIdentityShow();
				}

				self.createMenuButton();

				if (["identity", "doudizhu", "versus", "guozhan"].includes(lib.config.mode)) {
					self.createIdentityTip();
				}
			});
		},

		/**
		 * 创建聊天按钮
		 * @description 在界面右下角创建聊天功能按钮
		 */
		createChatButton() {
			const btn = ui.create.node("img");
			btn.src = `${lib.assetURL}${assetPath}uibutton/liaotian.png`;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
			btn.style.cssText = `display:block;--w:135px;--h:calc(var(--w)*1019/1400);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 97px);${isRight ? "right" : "left"}:calc(100% - 129px);background-color:transparent;z-index:3;${isRight ? "" : "transform:scaleX(-1);"}`;

			btn.onclick = () => {
				if (lib.config["extension_说话_enable"]) {
					game.showChatWordBackground?.();
				} else {
					game.showChatWordBackgroundX?.();
				}
			};
			document.body.appendChild(btn);
		},

		/**
		 * 初始化身份显示
		 * @description 创建身份显示元素并启动定时更新
		 */
		initIdentityShow() {
			const self = this;
			const map = this.buildModeWinTranslations();
			if (!map) return;

			Object.entries(map).forEach(([k, v]) => {
				lib.translate[`${k}_win_option`] = v;
			});

			if (!game.ui_identityShow) {
				game.ui_identityShow = ui.create.div("", "身份加载中......");
				game.ui_identityShow.style.cssText = "top:1.9px;left:63.5px;z-index:4;";
				ui.arena.appendChild(game.ui_identityShow);
			}
			if (!game.ui_identityShowx) {
				game.ui_identityShowx = ui.create.div("", "身份加载中......");
				game.ui_identityShowx.style.cssText = "top:1.9px;left:63.5px;z-index:3;";
				ui.arena.appendChild(game.ui_identityShowx);
			}

			game.ui_identityShow_update = () => self.updateIdentityShow();
			setInterval(() => game.ui_identityShow_update?.(), 1000);
		},

		/**
		 * 构建模式胜利条件翻译
		 * @description 根据游戏模式返回对应的胜利条件文本映射
		 * @returns {Object|null} 胜利条件翻译映射表
		 */
		buildModeWinTranslations() {
			const mode = lib.config.mode;
			const versusMode = get.config("versus_mode");

			const baseMap = {
				zhu: "推测场上身份<br>击败反贼内奸",
				zhong: "保护主公<br>取得最后胜利",
				fan: "找出反贼队友<br>全力击败主公",
				nei: "找出反贼忠臣<br>最后击败主公",
				mingzhong: "保护主公<br>取得最后胜利",
				undefined: "胜利条件",
			};

			if (mode === "doudizhu") return { zhu: "击败所有农民", fan: "击败地主", undefined: "未选择阵营" };
			if (mode === "single") return { zhu: "击败对手", fan: "击败对手", undefined: "未选择阵营" };
			if (mode === "boss") return { zhu: "击败盟军", cai: "击败神祇", undefined: "未选择阵营" };
			if (mode === "guozhan") {
				const map = { undefined: "未选择势力", unknown: "保持隐蔽", ye: "击败场上所有其他角色" };
				lib.group.forEach(g => {
					map[g] = `击败所有非${get.translation(g)}势力角色`;
				});
				return map;
			}
			if (mode === "versus") {
				if (versusMode === "two" || versusMode === "three") {
					return { undefined: get.config("replace_character_two") ? "抢先击败敌人所有上场角色" : "协同队友击败所有敌人" };
				}
				if (versusMode === "jiange") return { wei: "击败所有蜀势力角色", shu: "击败所有魏势力角色" };
				if (versusMode === "siguo") {
					const map = {};
					lib.group.forEach(g => {
						map[g] = `获得龙船或击败非${get.translation(g)}势力角色`;
					});
					return map;
				}
				return null;
			}
			return baseMap;
		},

		/**
		 * 更新身份显示
		 * @description 刷新左上角的身份统计和胜利条件信息
		 */
		updateIdentityShow() {
			let str = "";
			const mode = lib.config.mode;

			if (mode === "guozhan" || (mode === "versus" && ["siguo", "jiange"].includes(get.config("versus_mode")))) {
				Object.entries(this.groupColors).forEach(([key, color]) => {
					const count = game.countPlayer(p => p.identity === key);
					if (count > 0) str += `<font color="${color}">${get.translation(key)}</font> x ${count}  `;
				});
			} else if (mode === "versus" && get.config("versus_mode") === "two") {
				const enemy = game.countPlayer(p => p.isEnemyOf(game.me));
				const friend = game.countPlayer(p => p.isFriendOf(game.me));
				if (enemy > 0) str += `<font color="#ff0000">虎</font> x ${enemy}  `;
				if (friend > 0) str += `<font color="#00ff00">龙</font> x ${friend}  `;
			} else {
				["zhu", "zhong", "fan", "nei"].forEach(id => {
					const aliases = {
						zhu: ["zhu", "rZhu", "bZhu"],
						zhong: ["zhong", "rZhong", "bZhong", "mingzhong"],
						fan: ["fan", "rYe", "bYe"],
						nei: ["nei", "rNei", "bNei"],
					};
					const count = game.countPlayer(p => aliases[id].includes(p.identity));
					if (count > 0) str += `<font color="${this.identityColors[id]}">${get.translation(id)}</font> x ${count}  `;
				});
			}

			str += `<br>${game.me?.identity ? (lib.translate[game.me.identity + "_win_option"] ?? "") : ""}`;

			const style = "font-family:shousha;font-size:17px;font-weight:500;text-align:right;line-height:20px;text-shadow:none;";
			game.ui_identityShow.innerHTML = `<span style="${style}color:#C1AD92;">${str}</span>`;
			game.ui_identityShowx.innerHTML = `<span style="${style}color:#2D241B;-webkit-text-stroke:2.7px #322B20;">${str}</span>`;
		},

		/**
		 * 创建菜单按钮
		 * @description 在右上角创建手杀风格菜单按钮
		 */
		createMenuButton() {
			const self = this;
			const headImg = ui.create.node("img");
			headImg.src = `${lib.assetURL}${assetPath}shousha/button.png`;
			headImg.style.cssText = "display:block;--w:130px;--h:calc(var(--w)*1080/1434);width:var(--w);height:var(--h);position:absolute;bottom:calc(100% - 98px);left:calc(100% - 126.2px);background-color:transparent;z-index:1;";
			document.body.appendChild(headImg);

			const head = ui.create.node("div");
			head.style.cssText = "display:block;width:134px;height:103px;position:absolute;top:0px;right:-8px;background-color:transparent;z-index:1;";
			head.onclick = () => self.showMenu();
			document.body.appendChild(head);
		},

		/**
		 * 显示菜单
		 * @description 弹出手杀风格的菜单界面，包含设置、退出等功能
		 */
		showMenu() {
			const self = this;
			game.playAudio(`../${assetPath}shousha/label.mp3`);

			const container = ui.create.div(".popup-container", { background: "rgb(0,0,0,0)" }, ui.window);
			container.addEventListener("click", e => {
				game.playAudio(`../${assetPath}shousha/caidan.mp3`);
				e.stopPropagation();
				container.delete(200);
			});

			ui.create.div(".yemian", container);

			const buttons = [
				{
					cls: ".shezhi",
					action: () => {
						ui.click.configMenu?.();
						ui.system1.classList.remove("shown");
						ui.system2.classList.remove("shown");
					},
				},
				{ cls: ".tuichu", action: () => window.location.reload() },
				{ cls: ".taopao", action: () => game.reload() },
				{ cls: ".touxiang", action: () => game.over() },
				{ cls: ".tuoguan", action: () => ui.click.auto() },
			];

			buttons.forEach(({ cls, action }) => {
				const btn = ui.create.div(cls, container);
				btn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}shousha/xuanzhe.mp3`);
					action();
				});
			});
		},

		/**
		 * 创建身份提示
		 * @description 在左上角创建身份提示按钮，点击显示当前身份详情
		 */
		createIdentityTip() {
			const self = this;
			const tip = ui.create.node("img");
			tip.src = `${lib.assetURL}${assetPath}uibutton/shenfen.png`;
			tip.style.cssText = "display:block;--w:400px;--h:calc(var(--w)*279/2139);width:var(--w);height:var(--h);position:absolute;top:-1px;left:-45px;background-color:transparent;z-index:1;";

			tip.onclick = () => {
				game.playAudio(`../${assetPath}shousha/label.mp3`);
				const container = ui.create.div(".popup-container", ui.window);

				const mode = lib.config.mode;
				if (mode === "identity") {
					const cls = self.identityTips[game.me?.identity];
					if (cls) ui.create.div(cls.replace("Tip", "sfrw"), container);
				} else if (mode === "doudizhu") {
					const cls = self.doudizhuTips[game.me?.identity];
					if (cls) ui.create.div(cls.replace("Tip", "sfrw"), container);
				} else if (mode === "versus") {
					ui.create.div(".sfrwhu", container);
				} else if (mode === "guozhan") {
					const cls = self.groupTips[game.me?.group] || ".sfrwundefined";
					ui.create.div(cls.replace("Tip", "sfrw"), container);
				}

				container.addEventListener("click", () => {
					game.playAudio(`../${assetPath}shousha/caidan.mp3`);
					container.delete(200);
				});
			};

			document.body.appendChild(tip);
		},

		/**
		 * 创建器集合
		 */
		create: {
			control() {},

			/**
			 * 创建确认对话框
			 * @description 创建手杀风格的确认/取消按钮组
			 * @returns {HTMLElement} 确认对话框元素
			 */
			confirm() {
				const confirm = ui.create.control("<span></span>", "cancel");
				confirm.classList.add("lbtn-confirm");
				confirm.node = {
					ok: confirm.firstChild,
					cancel: confirm.lastChild,
				};

				if (_status.event.endButton) _status.event.endButton.close();

				confirm.node.ok.link = "ok";
				confirm.node.ok.classList.add("primary");
				confirm.node.cancel.classList.add("primary2");
				confirm.node.cancel.innerHTML = `<img draggable='false' src='${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/QX.png'>`;
				confirm.custom = (link, target) => {
					if (link === "ok") ui.click.ok(target);
					else if (link === "cancel") ui.click.cancel(target);
				};

				app.reWriteFunction(confirm, {
					close: [
						function () {
							this.classList.add("closing");
						},
					],
				});

				Object.values(confirm.node).forEach(node => {
					node.classList.add("disabled");
					node.removeEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control);
					node.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
						e.stopPropagation();
						if (this.classList.contains("disabled")) {
							if (this.link === "cancel" && this.dataset.type === "endButton" && _status.event.endButton) {
								_status.event.endButton.custom();
								ui.confirm.close();
							}
							return;
						}
						if (this.parentNode.custom) {
							this.parentNode.custom(this.link, this);
						}
					});
				});

				if (ui.skills2?.skills?.length) {
					const recastingSkills = ui.skills2.skills.filter(skill => skill === "_recasting");
					if (recastingSkills.length) {
						confirm.skills2 = recastingSkills.map(skill => {
							const item = document.createElement("div");
							item.link = skill;
							item.classList.add("recasting-btn");
							item.innerHTML = `<img draggable='false' src='${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/CZ.png'>`;
							item.style.backgroundImage = `url('${lib.assetURL}extension/十周年UI/ui/assets/lbtn/uibutton/game_btn_bg2.png')`;
							item.style.transform = "scale(0.75)";
							item.style.setProperty("padding", "25px 10px", "important");
							item.style.setProperty("margin", "0 -12px", "important");
							item.dataset.type = "skill2";
							item.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
								if (_status.event?.skill === "_recasting") return;
								e.stopPropagation();
								ui.click.skill(this.link);
								ui.updateSkillControl?.(game.me, true);
							});
							return item;
						});
						confirm.skills2.forEach(item => confirm.insertBefore(item, confirm.firstChild));
					}
				}

				confirm.update = () => {
					const isLimitedSkill = () => {
						if (_status.event?.skill && get.info(_status.event.skill)?.limited && _status.event.player === game.me) return true;
						if (_status.event?.getParent?.(2)?.skill && get.info(_status.event.getParent(2).skill)?.limited && _status.event.getParent(2).player === game.me) return true;
						if (_status.event?.getParent?.()?.skill && get.info(_status.event.getParent().skill)?.limited && _status.event.getParent().player === game.me) return true;
						return false;
					};
					if (isLimitedSkill() && !confirm.node.ok.classList.contains("xiandingji")) {
						confirm.node.ok.classList.add("xiandingji");
					}
					if (!isLimitedSkill() && confirm.node.ok.classList.contains("xiandingji")) {
						confirm.node.ok.classList.remove("xiandingji");
					}

					if (confirm.skills2) {
						if (_status.event.skill && _status.event.skill !== confirm.dataset.skill) {
							confirm.dataset.skill = _status.event.skill;
							confirm.skills2.forEach(item => item.remove());
							ui.updatec();
						} else if (!_status.event.skill && confirm.dataset.skill) {
							delete confirm.dataset.skill;
							confirm.skills2.forEach(item => confirm.insertBefore(item, confirm.firstChild));
							ui.updatec();
						}
					}
					ui.updateSkillControl?.(game.me, true);
				};

				return confirm;
			},

			/**
			 * 创建卡牌回合时间显示
			 * @description 创建显示牌堆数量、回合数、游戏时长的UI元素
			 * @returns {HTMLElement} 卡牌回合时间元素
			 */
			cardRoundTime() {
				const node = ui.create.div(".cardRoundNumber", ui.arena).hide();
				node.node = {
					cardPileNumber: ui.create.div(".cardPileNumber", node, showPaidui),
					roundNumber: ui.create.div(".roundNumber", node),
					time: ui.create.div(".time", node),
				};

				node.updateRoundCard = function () {
					const cardNumber = ui.cardPile.childNodes.length || 0;
					const roundNumber = Math.max(1, game.roundNumber || 1);
					this.node.roundNumber.innerHTML = `<span>第${roundNumber}轮</span>`;
					this.setNumberAnimation(cardNumber);
					this.show();
					game.addVideo("updateCardRoundTime", null, { cardNumber, roundNumber });
				};

				node.setNumberAnimation = function (num, step) {
					const item = this.node.cardPileNumber;
					clearTimeout(item.interval);
					if (!item._num) {
						item.innerHTML = `<span>${num}</span>`;
						item._num = num;
					} else if (item._num !== num) {
						if (!step) step = 500 / Math.abs(item._num - num);
						item._num += item._num > num ? -1 : 1;
						item.innerHTML = `<span>${item._num}</span>`;
						if (item._num !== num) {
							item.interval = setTimeout(() => this.setNumberAnimation(num, step), step);
						}
					}
				};

				ui.time4 = node.node.time;
				ui.time4.starttime = get.utc();
				ui.time4.interval = setInterval(() => {
					const num = Math.round((get.utc() - ui.time4.starttime) / 1000);
					const pad = n => (n < 10 ? `0${n}` : n);
					if (num >= 3600) {
						const h = Math.floor(num / 3600);
						const m = Math.floor((num - h * 3600) / 60);
						const s = num - h * 3600 - m * 60;
						ui.time4.innerHTML = `<span>${pad(h)}:${pad(m)}:${pad(s)}</span>`;
					} else {
						const m = Math.floor(num / 60);
						const s = num - m * 60;
						ui.time4.innerHTML = `<span>${pad(m)}:${pad(s)}</span>`;
					}
				}, 1000);

				game.addVideo("createCardRoundTime");
				return node;
			},

			/**
			 * 创建手牌数量显示
			 * @description 创建显示当前手牌数/手牌上限的UI元素
			 * @returns {HTMLElement} 手牌数量元素
			 */
			handcardNumber() {
				const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";

				ui.create.div(".settingButton", ui.arena);

				const controls = ui.create.div(".lbtn-controls", ui.arena);
				ui.create.div(".lbtn-control", controls, "   ");
				ui.create.div(".lbtn-control", controls, "   ");

				const paixuauto = ui.create.div(isRight ? ".lbtn-paixu" : ".lbtn-paixu1", ui.arena);
				paixuauto.onclick = () => {
					if (window.paixuxx === undefined || window.paixuxx === false) {
						startAutoPaixu();
						paixuauto.setBackgroundImage(`${assetPath}shousha/zidongpaixu.png`);
						window.paixuxx = true;
					} else {
						stopAutoPaixu();
						paixuauto.setBackgroundImage(`${assetPath}shousha/btn-paixu.png`);
						window.paixuxx = false;
					}
				};

				ui.create.div(isRight ? ".latn-jilu" : ".latn-jilu1", ui.arena, ui.click.pause);
				ui.create.div(".tuoguanButton", ui.arena, ui.click.auto);

				const className = isRight ? ".handcardNumber" : ".handcardNumber1";
				const node = ui.create.div(className, ui.arena).hide();
				node.node = {
					cardPicture: ui.create.div(isRight ? ".cardPicture" : ".cardPicture1", node),
					cardNumber: ui.create.div(isRight ? ".cardNumber" : ".cardNumber1", node),
				};

				node.updateCardnumber = function () {
					if (!game.me) return;
					const current = game.me.countCards("h") || 0;
					let limit = game.me.getHandcardLimit() || 0;
					let color = "#ffe9cd";
					if (limit > game.me.hp) color = "#20c520";
					if (limit < game.me.hp) color = "#ff1813";
					if (limit === Infinity) limit = "∞";

					this.node.cardNumber.innerHTML = `<font size="5.5">${current}</font><font size="5" face="xinwei">/<font color="${color}" size="4" face="shousha">${limit}</font>`;
					this.show();
					game.addVideo("updateCardnumber", null, { cardNumber: limit });
				};

				node.node.cardNumber.interval = setInterval(() => ui.handcardNumber?.updateCardnumber(), 1000);
				game.addVideo("createhandcardNumber");
				return node;
			},
		},
	};
}
