/**
 * @fileoverview 新杀风格lbtn插件
 * 特点：新杀风格按钮布局、全选/反选按钮
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";

export function createXinshaLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const assetPath = "extension/十周年UI/ui/assets/lbtn/";

	return {
		...base,
		skinName: "xinsha",

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

				// 问号按钮
				if (["identity", "doudizhu", "guozhan", "versus", "single", "martial"].includes(lib.config.mode)) {
					self.createQuestionButton();
				}

				// 阴影背景
				self.createShadowBg();

				// 主按钮
				self.createMainButton();

				// 左侧小按钮（记录、换肤、笑脸）
				self.createSideButtons();

				// 整理手牌按钮
				self.createSortButton();

				// 全选按钮
				self.createSelectAllButton();
			});
		},

		// 初始化全选按钮覆盖
		initSelectAllOverride() {
			// 禁用原生全选按钮
			ui.create.cardChooseAll = () => null;

			// 移除已存在的全选控件
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

		// 创建问号按钮
		createQuestionButton() {
			const self = this;
			const isTouch = lib.config.phonelayout;
			const bottomOffset = isTouch ? "calc(100% - 55px)" : "calc(100% - 105px)";

			const btn = ui.create.node("img");
			btn.src = `${lib.assetURL}${assetPath}CD/new_wenhao.png`;
			btn.style.cssText = `display:block;width:40px;height:29px;position:absolute;bottom:${bottomOffset};left:calc(100% - 160px);background-color:transparent;z-index:3;`;

			if (["identity", "doudizhu", "versus", "guozhan"].includes(lib.config.mode)) {
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
			}

			document.body.appendChild(btn);
		},

		// 创建阴影背景
		createShadowBg() {
			const shadow = ui.create.node("img");
			shadow.src = `${lib.assetURL}${assetPath}uibutton/yinying.png`;
			shadow.style.cssText = "display:block;width:100%;height:20%;position:absolute;bottom:0px;background-color:transparent;z-index:-1;";
			document.body.appendChild(shadow);
		},

		// 创建左侧小按钮（记录、换肤、笑脸）- 仅触屏布局
		createSideButtons() {
			if (!lib.config.phonelayout) return;

			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";

			// 记录按钮
			const jiluBtn = ui.create.div(isRight ? ".jiluButton_new" : ".jiluButton_new1", document.body);
			jiluBtn.onclick = () => ui.click.pause();

			// 换肤按钮
			const huanfuBtn = ui.create.div(isRight ? ".huanfuButton_new" : ".huanfuButton_new1", document.body);
			huanfuBtn.onclick = () => {
				game.playAudio(`../${assetPath}CD/huanfu.mp3`);
				if (window.zyile_charactercard) {
					window.zyile_charactercard(game.me, false);
				} else {
					ui.click.charactercard(game.me.name, game.zhu, lib.config.mode === "guozhan" ? "guozhan" : true);
				}
			};

			// 笑脸按钮（聊天）
			const xiaolianBtn = ui.create.div(isRight ? ".xiaolianButton_new" : ".xiaolianButton_new1", document.body);
			xiaolianBtn.onclick = () => {
				if (lib.config["extension_说话_enable"]) {
					game.showChatWordBackground?.();
				} else {
					game.showChatWordBackgroundX?.();
				}
			};
		},

		// 创建主按钮
		createMainButton() {
			const self = this;
			const isTouch = lib.config.phonelayout;
			const bottomOffset = isTouch ? "calc(100% - 69px)" : "calc(100% - 129px)";

			// 按钮背景
			const btnBg = ui.create.node("img");
			btnBg.src = `${lib.assetURL}${assetPath}CD/new_button3.png`;
			btnBg.style.cssText = `display:block;--w:56px;--h:calc(var(--w)*74/71);width:var(--w);height:var(--h);position:absolute;bottom:${bottomOffset};left:calc(100% - 110px);background-color:transparent;z-index:1;`;
			document.body.appendChild(btnBg);

			// 按钮点击区域
			const btn = ui.create.node("div");
			btn.style.cssText = `display:block;--w:56px;--h:calc(var(--w)*74/71);width:var(--w);height:var(--h);position:absolute;bottom:${bottomOffset};left:calc(100% - 110px);background-color:transparent;z-index:1;`;
			btn.onclick = () => {
				game.playAudio(`../${assetPath}CD/click.mp3`);
				self.createMainMenu();
			};
			document.body.appendChild(btn);
		},

		// 创建主菜单
		createMainMenu() {
			const self = this;
			const container = ui.create.div(".popup-container", { background: "rgb(0,0,0,0)" }, ui.window);

			container.addEventListener("click", e => {
				game.playAudio(`../${assetPath}CD/back.mp3`);
				e.stopPropagation();
				container.delete(200);
			});

			const home = ui.create.div(".buttonyjcm", container);

			// 设置按钮
			const szBtn = ui.create.div(".controls", home);
			szBtn.setBackgroundImage(`${assetPath}uibutton/button_sz.png`);
			szBtn.addEventListener("click", () => {
				game.playAudio(`../${assetPath}CD/button.mp3`);
				ui.click.configMenu?.();
				ui.system1.classList.remove("shown");
				ui.system2.classList.remove("shown");
			});

			// 背景按钮
			const bjBtn = ui.create.div(".controls", home);
			bjBtn.setBackgroundImage(`${assetPath}uibutton/button_bj.png`);
			bjBtn.addEventListener("click", () => {
				game.playAudio(`../${assetPath}CD/button.mp3`);
				self.openBackgroundSelector(`../${assetPath}shousha/caidan.mp3`);
			});

			// 托管按钮
			const tgBtn = ui.create.div(".controls", home);
			tgBtn.setBackgroundImage(`${assetPath}uibutton/button_tg.png`);
			tgBtn.addEventListener("click", () => {
				game.playAudio(`../${assetPath}CD/button.mp3`);
				ui.click.auto();
			});

			// 退出按钮
			const tcBtn = ui.create.div(".controls", home);
			tcBtn.setBackgroundImage(`${assetPath}uibutton/button_tc.png`);
			tcBtn.addEventListener("click", () => {
				game.playAudio(`../${assetPath}CD/button.mp3`);
				window.location.reload();
			});
		},

		// 创建整理手牌按钮
		createSortButton() {
			const self = this;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";

			const btn = ui.create.node("img");
			btn.src = `${lib.assetURL}${assetPath}uibutton/new_zhengli.png`;

			const style = isRight
				? "display:block;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 46px);left:calc(100% - 335px);background-color:transparent;z-index:3;"
				: "display:block;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 33px);right:calc(100% - 335px);background-color:transparent;z-index:3;";

			btn.style.cssText = style;
			btn.onclick = () => {
				game.playAudio("../extension/十周年UI/audio/card_click.mp3");
				self.sortHandCards();
			};

			// 定时检测手牌数
			setInterval(() => {
				btn.style.display = game.me?.getCards("hs").length >= 4 ? "block" : "none";
			}, 1000);

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
						? `${lib.assetURL}${assetPath}uibutton/fanxuan.png`
						: `${lib.assetURL}${assetPath}uibutton/quanxuan.png`;
			};
			updateImage();

			const style = isRight
				? "display:none;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 46px);left:calc(100% - 430px);background-color:transparent;z-index:3;"
				: "display:none;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 33px);right:calc(100% - 430px);background-color:transparent;z-index:3;";

			btn.style.cssText = style;

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
				if (range[1] <= 1) {
					btn.style.display = "none";
					return;
				}
				btn.style.display = "block";
				updateImage();
			}, 100);

			document.body.appendChild(btn);
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

				// 设置按钮
				ui.create.div(".settingButton", ui.arena);

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
