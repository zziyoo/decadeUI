/**
 * @fileoverview 十周年风格lbtn插件
 * 特点：十周年风格菜单、手牌整理、全选按钮
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";

export function createShizhounianLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const assetPath = "extension/十周年UI/ui/assets/lbtn/";

	return {
		...base,
		skinName: "shizhounian",

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

				// 问号按钮
				if (self.supportedModes.includes(lib.config.mode)) {
					self.createQuestionButton();
				}

				// 整理手牌按钮
				self.createSortButton();

				// 右上角菜单
				self.createTopRightMenu();
			});
		},

		// 创建问号按钮
		createQuestionButton() {
			const self = this;
			const isTouch = lib.config.phonelayout;
			const bottomOffset = isTouch ? "calc(100% - 55px)" : "calc(100% - 105px)";

			const btn = ui.create.node("img");
			btn.src = `${lib.assetURL}${assetPath}CD/wenhao.png`;
			btn.style.cssText = `display:block;width:40px;height:29px;position:absolute;bottom:${bottomOffset};left:calc(100% - 159.5px);background-color:transparent;z-index:3;`;

			btn.onclick = () => {
				const container = ui.create.div(".popup-container", ui.window);
				game.playAudio(`../${assetPath}shousha/label.mp3`);

				const mode = lib.config.mode;
				if (mode === "identity") {
					const cls = self.identityTips[game.me?.identity];
					if (cls) ui.create.div(cls, container);
				} else if (mode === "doudizhu") {
					const cls = self.doudizhuTips[game.me?.identity];
					if (cls) ui.create.div(cls, container);
				} else if (mode === "versus") {
					ui.create.div(".Tiphu", container);
				} else if (mode === "guozhan") {
					const cls = self.groupTips[game.me?.group] || ".Tipweizhi";
					ui.create.div(cls, container);
				}

				container.addEventListener("click", () => {
					game.playAudio(`../${assetPath}shousha/caidan.mp3`);
					container.delete(200);
				});
			};

			document.body.appendChild(btn);
		},

		// 创建整理手牌按钮
		createSortButton() {
			const self = this;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
			const isTouch = lib.config.phonelayout;
			const sortImg = isTouch ? "zhengli.png" : "zhenglix.png";

			let style;
			if (isTouch) {
				style = isRight
					? `display:block;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 35px);left:calc(100% - 380px);background-color:transparent;z-index:7;`
					: `display:block;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 35px);left:calc(100% - 1260px);background-color:transparent;z-index:7;`;
			} else {
				style = isRight
					? `display:block;--w:45px;--h:calc(var(--w)*110/170);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 45px);left:calc(100% - 305px);background-color:transparent;z-index:7;`
					: `display:block;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 33px);right:calc(100% - 367.2px);background-color:transparent;z-index:4;`;
			}

			const btn = ui.create.node("img");
			btn.src = `${lib.assetURL}${assetPath}uibutton/${sortImg}`;
			btn.style.cssText = style;
			btn.style.display = "none";

			btn.onclick = () => self.sortHandCards();

			// 定时检测手牌数
			setInterval(() => {
				btn.style.display = game.me?.getCards("hs").length >= 4 ? "block" : "none";
			}, 1000);

			document.body.appendChild(btn);
		},

		// 创建右上角菜单
		createTopRightMenu() {
			const self = this;
			const isTouch = lib.config.phonelayout;
			const topOffset = isTouch ? "10px" : "60px";

			// 阴影背景
			const shadow = ui.create.node("img");
			shadow.src = `${lib.assetURL}${assetPath}uibutton/yinying.png`;
			shadow.style.cssText = "display:block;width:100%;height:30%;position:absolute;bottom:0px;background-color:transparent;z-index:-4;";
			document.body.appendChild(shadow);

			// 菜单按钮
			const menuBtn = ui.create.node("img");
			menuBtn.src = `${lib.assetURL}${assetPath}CD/button3.png`;
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

				// 设置按钮
				const szBtn = ui.create.div(".SZ", menuPopup);
				szBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					ui.click.configMenu?.();
					ui.system1.classList.remove("shown");
					ui.system2.classList.remove("shown");
					closeMenu();
				});

				// 离开按钮
				const lkBtn = ui.create.div(".LK", menuPopup);
				lkBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					window.location.reload();
				});

				// 背景按钮
				const bjBtn = ui.create.div(".BJ", menuPopup);
				bjBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					self.openBackgroundSelector(`../${assetPath}shousha/caidan.mp3`);
				});

				// 投降按钮
				const txBtn = ui.create.div(".TX", menuPopup);
				txBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					game.over();
				});

				// 托管按钮
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

			cardRoundTime() {
				return base.create.cardRoundTime();
			},

			handcardNumber() {
				const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
				const isTouch = lib.config.phonelayout;

				// 设置按钮
				ui.create.div(".settingButton", ui.arena);

				// 功能按钮（仅触屏布局）
				if (isTouch) {
					if (isRight) {
						ui.create.div(".huanfuButton_new", ui.arena, base.click.huanfu);
						ui.create.div(".jiluButton_new", ui.arena, ui.click.pause);
						ui.create.div(".meiguiButton_new", ui.arena, ui.click.pause);
						ui.create.div(".xiaolianButton_new", ui.arena, ui.click.pause);
					} else {
						ui.create.div(".huanfuButton_new1", ui.arena, base.click.huanfu);
						ui.create.div(".jiluButton_new1", ui.arena, ui.click.pause);
						ui.create.div(".meiguiButton_new1", ui.arena, ui.click.pause);
						ui.create.div(".xiaolianButton_new1", ui.arena, ui.click.pause);
					}
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
		},
	};
}
