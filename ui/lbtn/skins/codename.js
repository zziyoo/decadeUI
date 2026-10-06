/**
 * @fileoverview 代号风格lbtn插件
 * 特点：代号风格菜单、距离显示
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";

export function createCodenameLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const assetPath = "extension/十周年UI/ui/assets/lbtn/";

	return {
		...base,
		skinName: "codename",

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
		},

		initArenaReady() {
			const self = this;
			lib.arenaReady.push(() => {
				self.initRoundUpdate();
				self.createSortButton();
				self.createTopRightMenu();
				self.initDistanceButtons();
			});
		},

		// 初始化距离显示按钮
		initDistanceButtons() {
			const self = this;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
			const btnClass = isRight ? ".meiguiButton_new" : ".meiguiButton_new1";
			const btn = ui.arena.querySelector(btnClass);
			if (btn) {
				btn.onclick = () => self.toggleDistanceDisplay();
			}
		},

		// 创建整理手牌按钮
		createSortButton() {
			const self = this;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";

			const btn = ui.create.node("img");
			btn.src = `${lib.assetURL}${assetPath}uibutton/code_zhengli.png`;
			btn.style.cssText = `display:block;position:absolute;background-color:transparent;width:55px;height:50px;bottom:1%;left:40px;z-index:4;right:auto;${isRight ? "right:calc(100% - 380px);z-index:3;" : "right:calc(100% - 1260px);z-index:3;"}`;

			btn.onclick = () => self.sortHandCards();

			document.body.appendChild(btn);
		},

		// 创建右上角菜单
		createTopRightMenu() {
			const self = this;
			const isTouch = lib.config.phonelayout;
			const topOffset = isTouch ? "10px" : "60px";

			const menuBtn = ui.create.node("img");
			menuBtn.src = `${lib.assetURL}${assetPath}CD/codecaidan.png`;
			menuBtn.style.cssText = `display:block;--w:56px;--h:calc(var(--w)*74/71);width:var(--w);height:var(--h);position:absolute;top:${topOffset};right:55px;background-color:transparent;z-index:5;`;
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

		// 显示距离显示
		showDistanceDisplay() {
			const self = this;
			game.players.forEach(player => {
				if (player !== game.me && player.isAlive()) {
					const distance = get.distance(game.me, player);
					const distanceText = distance === Infinity ? "∞" : distance.toString();
					const display = ui.create.div(".distance-display", player);
					display.innerHTML = `距离：${distanceText}`;
					player._distanceDisplay = display;
				}
			});

			self.distanceClickHandler = e => {
				if (!e.target.closest(".player") && !e.target.closest(".meiguiButton_new") && !e.target.closest(".meiguiButton_new1")) {
					self.closeDistanceDisplay();
				}
			};
			document.addEventListener("click", self.distanceClickHandler);
		},

		// 关闭距离显示
		closeDistanceDisplay() {
			game.players.forEach(player => {
				if (player._distanceDisplay) {
					player._distanceDisplay.remove();
					player._distanceDisplay = null;
				}
			});

			if (this.distanceClickHandler) {
				document.removeEventListener("click", this.distanceClickHandler);
				this.distanceClickHandler = null;
			}
		},

		// 切换距离显示
		toggleDistanceDisplay() {
			const isShowing = game.players.some(p => p !== game.me && p._distanceDisplay);
			if (isShowing) {
				this.closeDistanceDisplay();
			} else {
				this.showDistanceDisplay();
			}
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

				// 功能按钮 - 注意：toggleDistanceDisplay需要通过plugin对象调用
				if (isRight) {
					ui.create.div(".huanfuButton_new", ui.arena, base.click.huanfu);
					ui.create.div(".jiluButton_new", ui.arena, ui.click.pause);
					ui.create.div(".meiguiButton_new", ui.arena);
				} else {
					ui.create.div(".huanfuButton_new1", ui.arena, base.click.huanfu);
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
				const node = ui.create.div(".cardRoundNumber", ui.arena).hide();
				node.node = {
					cardPileNumber: ui.create.div(".cardPileNumber", node),
					roundNumber: ui.create.div(".roundNumber", node),
				};
				node.totalCards = 0;

				node.updateRoundCard = function () {
					const cardNum = ui.cardPile.childNodes.length || 0;
					if (this.totalCards === 0) this.totalCards = cardNum;

					const round = Math.max(1, game.roundNumber || 1);
					this.node.roundNumber.innerHTML = `第<span>${round}</span>轮`;
					this.setNumberAnimation(cardNum, this.totalCards);
					this.show();
					game.addVideo("updateCardRoundTime", null, { cardNumber: cardNum, roundNumber: round });
				};

				node.setNumberAnimation = function (currentNum, totalNum, step) {
					const item = this.node.cardPileNumber;
					clearTimeout(item.interval);

					if (!item._num) {
						item.innerHTML = `<span>${currentNum}/${totalNum}</span>`;
						item._num = currentNum;
					} else if (item._num !== currentNum) {
						if (!step) step = 500 / Math.abs(item._num - currentNum);
						item._num += item._num > currentNum ? -1 : 1;
						item.innerHTML = `<span>${item._num}/${totalNum}</span>`;
						if (item._num !== currentNum) {
							item.interval = setTimeout(() => this.setNumberAnimation(currentNum, totalNum, step), step);
						}
					}
				};

				game.addVideo("createCardRoundTime");
				return node;
			},
		},
	};
}
