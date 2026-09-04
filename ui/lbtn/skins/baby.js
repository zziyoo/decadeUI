/**
 * @fileoverview 宝宝杀风格lbtn插件
 * 特点：简化按钮、宝宝杀风格菜单
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";

export function createBabyLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const assetPath = "extension/十周年UI/ui/assets/lbtn/";

	return {
		...base,
		skinName: "baby",

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
				filter: (event, player) => player === game.me,
				content() {
					ui.updateSkillControl?.(game.me, true);
				},
			};
		},

		precontent() {
			base.initBaseRewrites.call(this);
			this.initArenaReady();
			this.initSelectAllOverride();
		},

		initArenaReady() {
			const self = this;
			lib.arenaReady.push(() => {
				self.initRoundUpdate();
				self.initPlayerNicknames();
				self.createConfigButton();
				self.createSortButton();
				self.createSelectAllButton();
				self.createTopRightMenu();
			});
		},

		// 初始化玩家昵称
		initPlayerNicknames() {
			const nicknames = [
				"缘之空",
				"小小恐龙",
				"自然萌",
				"海边的ebao",
				"小云云",
				"点点",
				"猫猫虫",
				"小爱莉",
				"冰佬",
				"鹿鹿",
				"黎佬",
				"浮牢师",
				"U佬",
				"蓝宝",
				"影宝",
				"柳下跖",
				"无语",
				"小曦",
				"墨渊",
				"k9",
				"扶苏",
				"皇叔",
			];

			setInterval(() => {
				game.countPlayer(player => {
					if (!player.nickname) {
						player.nickname = player === game.me ? lib.config.connect_nickname : nicknames.randomGet();
					}
				});
			}, 1000);
		},

		// 初始化全选按钮覆盖
		initSelectAllOverride() {
			ui.create.cardChooseAll = () => null;

			const initObserver = () => {
				if (!ui.control) return;
				const observer = new MutationObserver(mutations => {
					mutations.forEach(mutation => {
						mutation.addedNodes.forEach(node => {
							if (node.nodeType === 1 && node.classList?.contains("control")) {
								const first = node.firstElementChild;
								if (first && /^[全反]选$/.test(first.innerHTML) && node.childElementCount === 1) {
									node.remove();
									ui.updatec?.();
								}
							}
						});
					});
				});
				observer.observe(ui.control, { childList: true });
			};

			if (ui.control) initObserver();
			else lib.arenaReady?.push(initObserver);
		},

		// 创建配置按钮
		createConfigButton() {
			const btn = ui.create.node("div");
			btn.style.cssText =
				"display:block;--w:56px;--h:calc(var(--w)*74/71);width:var(--w);height:var(--h);position:absolute;bottom:13%;left:53px;right:auto;background-color:transparent;z-index:1;";

			btn.onclick = () => {
				game.playAudio(`../${assetPath}CD/button.mp3`);
				ui.click.configMenu?.();
				ui.system1.classList.remove("shown");
				ui.system2.classList.remove("shown");
			};

			document.body.appendChild(btn);
		},

		// 创建整理手牌按钮
		createSortButton() {
			const self = this;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";

			const btn = ui.create.node("img");
			btn.src = `${lib.assetURL}${assetPath}uibutton/hs_zhengli.png`;
			btn.style.cssText = `display:block;position:absolute;background-color:transparent;width:85px;height:50px;bottom:18%;left:22px;z-index:4;right:auto;${isRight ? "right:calc(100% - 380px);z-index:3;" : "right:calc(100% - 1260px);z-index:3;"}`;

			btn.onclick = () => self.sortHandCards();

			document.body.appendChild(btn);
		},

		// 创建全选按钮
		createSelectAllButton() {
			const self = this;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";

			const btn = ui.create.node("img");

			const updateImage = () => {
				btn.src =
					ui.selected.cards.length > 0
						? `${lib.assetURL}${assetPath}uibutton/fanxuanhs.png`
						: `${lib.assetURL}${assetPath}uibutton/quanxuanhs.png`;
			};
			updateImage();

			btn.style.cssText = `display:none;position:absolute;background-color:transparent;width:85px;height:50px;bottom:26%;left:22px;z-index:4;right:auto;${isRight ? "right:calc(100% - 295px);z-index:3;" : "right:calc(100% - 1175px);z-index:3;"}`;

			btn.onclick = () => {
				game.playAudio("../extension/十周年UI/audio/card_click.mp3");
				self.toggleSelectAllCards(updateImage);
			};

			// 定时检测是否显示
			setInterval(() => {
				const event = _status.event;
				if (!event?.isMine?.() || !event.allowChooseAll || event.complexCard || event.complexSelect) {
					btn.style.display = "none";
					return;
				}
				const selectCard = event.selectCard;
				if (!selectCard) {
					btn.style.display = "none";
					return;
				}
				const range = get.select(selectCard);
				btn.style.display = range[1] > 1 ? "block" : "none";
				updateImage();
			}, 100);

			document.body.appendChild(btn);
		},

		// 创建右上角菜单
		createTopRightMenu() {
			const self = this;

			const menuBtn = ui.create.node("img");
			menuBtn.src = `${lib.assetURL}${assetPath}CD/hs_caidan.png`;
			menuBtn.style.cssText =
				"display:block;--w:56px;--h:calc(var(--w)*74/71);width:var(--w);height:var(--h);position:absolute;top:10px;left:40px;background-color:transparent;z-index:3;";
			document.body.appendChild(menuBtn);

			let menuPopup = null;

			const openMenu = () => {
				if (menuPopup) return;
				game.playAudio(`../${assetPath}CD/click.mp3`);

				menuPopup = ui.create.div(".popup-container", { background: "rgb(0,0,0,0)" }, ui.window);
				menuPopup.addEventListener("click", e => {
					game.playAudio(`../${assetPath}CD/back.mp3`);
					e.stopPropagation();
					closeMenu();
				});

				ui.create.div(".HOME", menuPopup);

				// 设置
				const szBtn = ui.create.div(".SZ", menuPopup);
				szBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					ui.click.configMenu?.();
					ui.system1.classList.remove("shown");
					ui.system2.classList.remove("shown");
					closeMenu();
				});

				// 离开
				const lkBtn = ui.create.div(".LK", menuPopup);
				lkBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					window.location.reload();
				});

				// 背景
				const bjBtn = ui.create.div(".BJ", menuPopup);
				bjBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					self.openBackgroundSelector(`../${assetPath}shousha/caidan.mp3`);
				});

				// 投降
				const txBtn = ui.create.div(".TX", menuPopup);
				txBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					game.over();
				});

				// 托管
				const tgBtn = ui.create.div(".TG", menuPopup);
				tgBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					ui.click.auto();
				});
			};

			const closeMenu = () => {
				if (menuPopup) {
					menuPopup.delete(200);
					menuPopup = null;
				}
			};

			menuBtn.onclick = () => (menuPopup ? closeMenu() : openMenu());
		},

		create: {
			control() {},

			confirm() {
				return base.create.confirm();
			},

			handcardNumber() {
				const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";

				// 设置按钮
				ui.create.div(".settingButton", ui.arena);

				// 功能按钮
				if (isRight) {
					ui.create.div(".jiluButton_new", ui.arena, ui.click.pause);
					ui.create.div(".meiguiButton_new", ui.arena);
				} else {
					ui.create.div(".jiluButton_new1", ui.arena, ui.click.pause);
					ui.create.div(".meiguiButton_new1", ui.arena);
				}

				// 托管按钮
				ui.create.div(".tuoguanButton", ui.arena, ui.click.auto);

				// 手牌数量
				const className = isRight ? ".handcardNumber" : ".handcardNumber1";
				const node = ui.create.div(className, ui.arena).hide();
				node.node = {
					cardPicture: ui.create.div(".cardPicture", node),
					cardNumber: ui.create.div(".cardNumber", node),
				};

				node.updateCardnumber = function () {
					if (!game.me) return;
					const current = game.me.countCards("h") || 0;
					const limit = game.me.getHandcardLimit() || 0;
					const color = current > limit ? "red" : "white";
					const displayLimit = limit === Infinity ? "∞" : limit;

					this.node.cardNumber.innerHTML = `<span><font color="${color}">${current}</font><sp style="font-size:15px;font-family:yuanli;color:#FFFCF5;">/</sp>${displayLimit}</span>`;
					this.show();
					game.addVideo("updateCardnumber", null, { cardNumber: limit });
				};

				node.node.cardNumber.interval = setInterval(() => ui.handcardNumber?.updateCardnumber(), 1000);
				game.addVideo("createhandcardNumber");
				return node;
			},

			cardRoundTime() {
				const node = ui.create.div(".cardRoundNumber", ui.arena, ui.click.pause).hide();
				node.node = {
					cardPileNumber: ui.create.div(".cardPileNumber", node),
					roundNumber: ui.create.div(".roundNumber", node),
					time: ui.create.div(".time", node),
				};

				node.updateRoundCard = function () {
					const cardNum = ui.cardPile.childNodes.length || 0;
					const round = Math.max(1, game.roundNumber || 1);
					this.node.roundNumber.innerHTML = `<span>${round}轮</span>`;
					this.setNumberAnimation(cardNum);
					this.show();
					game.addVideo("updateCardRoundTime", null, { cardNumber: cardNum, roundNumber: round });
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

				// 计时器
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
		},
	};
}
