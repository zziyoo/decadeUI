/**
 * @fileoverview OL风格lbtn插件
 * 特点：OL风格菜单、身份任务、礼物系统、历史记录、计时器
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";

export function createOnlineLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const assetPath = "extension/十周年UI/ui/assets/lbtn/";

	// 礼物配置
	const GIFT_CONFIG = {
		hua: { name: "鲜花", image: "xianhua.png", cost: "1", show: "flower" },
		jiu: { name: "青梅煮酒", image: "qingjiu.png", cost: "5", show: "wine" },
		dan: { name: "鸡蛋", image: "jidan.png", cost: "1", show: "egg" },
		xie: { name: "草鞋", image: "tuoxie.png", cost: "5", show: "shoe" },
	};

	// 身份颜色配置
	const IDENTITY_COLORS = {
		unknown: "#FFFFDE",
		wei: "#0075FF",
		shu: "#FF0000",
		wu: "#00FF00",
		qun: "#FFFF00",
		jin: "#9E00FF",
		ye: "#9E00FF",
		key: "#9E00FF",
	};

	const IDENTITY_INFO = {
		zhu: { color: "#AE5F35", aliases: ["zhu", "rZhu", "bZhu"] },
		zhong: { color: "#E9D765", aliases: ["zhong", "rZhong", "bZhong", "mingzhong"] },
		fan: { color: "#87A671", aliases: ["fan", "rYe", "bYe"] },
		nei: { color: "#9581C4", aliases: ["nei", "rNei", "bNei"] },
	};

	// 模式配置
	const MODE_CONFIGS = {
		single: { zhu: "击败对手", fan: "击败对手", undefined: "击败对手" },
		boss: { zhu: "击败盟军", cai: "击败神祇", undefined: "未选择阵营" },
		doudizhu: { zhu: "击败所有农民", fan: "击败地主", undefined: "未选择阵营" },
		versus: { zhu: "击败敌方", fan: "击败敌方", undefined: "击败敌方" },
		identity: {
			zhu: "击败反贼和内奸",
			zhong: "保护主公，击败反贼内奸",
			fan: "击败主公",
			nei: "击败所有角色，最后击败主公",
			mingzhong: "保护主公，击败反贼内奸",
			undefined: "击败所有敌方",
		},
	};

	// 工具函数
	const formatTime = seconds => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds - h * 3600) / 60);
		const s = seconds - h * 3600 - m * 60;
		const hStr = h > 0 ? `${h < 10 ? "0" : ""}${h}:` : "";
		return `${hStr}${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
	};

	const getCurrentMode = () => {
		if (lib.configOL?.doudizhu_mode || lib.config.mode === "doudizhu") return "doudizhu";
		if (lib.configOL?.single_mode || lib.config.mode === "single") return "single";
		if (lib.configOL?.boss_mode || lib.config.mode === "boss") return "boss";
		if (lib.configOL?.guozhan_mode || lib.config.mode === "guozhan") return "guozhan";
		if (lib.configOL?.versus_mode || lib.config.mode === "versus") return "versus";
		return "identity";
	};

	return {
		...base,
		skinName: "online",

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
			this.initChatMessage();
			this.initCancelOverride();
			this.initPauseOverride();
			this.initConfirmRewrite();
			this.initArenaReady();
		},

		// 初始化聊天消息处理
		initChatMessage() {
			const originalChat = lib.message.server.chat;
			lib.message.server.chat = function (id, str) {
				if (str.slice(0, 6) === "/audio") {
					game.broadcastAll(url => {
						if (lib.config.background_speak) game.playAudio(url);
					}, str.slice(6));
				} else {
					originalChat.call(this, id, str);
				}
			};
		},

		// 拦截出牌阶段取消
		initCancelOverride() {
			const originalCancel = ui.click.cancel;
			ui.click.cancel = function (node) {
				const event = _status.event;
				if (event && event.type === "phase" && ui.confirm && !event.skill && (ui.selected.cards.length !== 0 || ui.selected.targets.length !== 0)) {
					ui.confirm.classList.add("removing");
					event.restore();
					const cards = event.player.getCards("hej");
					for (let i = 0; i < cards.length; i++) {
						cards[i].recheck("useSkill");
					}
					game.uncheck();
					game.check();
					return;
				}
				return originalCancel.call(this, node);
			};
		},

		// 初始化暂停覆盖
		initPauseOverride() {
			const self = this;

			ui.create.pause = function () {
				if (_status.pausing) return;
				ui.click.shortcut(false);
				const node = ui.create.div(".pausedbg", ui.window);
				node.style.backgroundColor = "rgba(0,0,0,0.5)";
				node.style.backgroundSize = "100% 100%";
				ui.create.div(".resumedbg", node).style.backgroundSize = "100% 100%";
				_status.pausing = true;
				setTimeout(() => {
					_status.pausing = false;
				}, 500);
				if (lib.config.touchscreen) {
					setTimeout(() => node.addEventListener("touchend", ui.click.resume), 500);
				} else {
					node.addEventListener("click", ui.click.resume);
					node.oncontextmenu = ui.click.resume;
				}
				return node;
			};

			ui.click.pause = function () {
				if (_status.paused2 || _status.pausing || _status.nopause || !ui.pause) return;
				if (!_status.video && (ui.pause.classList.contains("hidden") || !_status.gameStarted)) return;
				ui.system.hide();
				game.pause2();
				self.showHistoryPanel();
			};
		},

		// 初始化确认按钮覆写
		initConfirmRewrite() {
			const self = this;
			ui.create.confirm = function (str, func) {
				if (ui.confirm?.classList.contains("closing")) {
					ui.confirm.remove();
					ui.controls.remove(ui.confirm);
					ui.confirm = null;
				}

				if (!ui.confirm) {
					ui.confirm = self.create.confirm();
				}

				const confirm = ui.confirm;
				confirm.node.ok.classList.add("disabled");
				confirm.node.cancel.classList.add("disabled");

				if (_status.event.endButton) {
					confirm.node.cancel.classList.remove("disabled");
				}

				if (str) {
					if (str.includes("o")) confirm.node.ok.classList.remove("disabled");
					if (str.includes("c")) confirm.node.cancel.classList.remove("disabled");
					confirm.str = str;
				}

				if (func) {
					confirm.custom = func;
				} else {
					confirm.custom = (link, target) => {
						if (link === "ok") ui.click.ok(target);
						else if (link === "cancel") ui.click.cancel(target);
						else target.custom?.(link);
					};
				}

				ui.updatec();
				confirm.update?.();
			};
		},

		// 显示历史记录面板
		showHistoryPanel() {
			const node = ui.create.pause();
			if (!node) return;
			node.addTempClass("start");

			const bigbg = ui.create.div(".bigbgjilu", node);
			const historybg = ui.create.div(".historybg", node);
			const columnbox = ui.create.div(".content", bigbg);

			// 克隆侧边栏
			const clonedSidebar = ui.sidebar.cloneNode(false);
			Array.from(ui.sidebar.childNodes)
				.reverse()
				.forEach(child => {
					clonedSidebar.appendChild(child.cloneNode(true));
				});
			clonedSidebar.querySelectorAll(":scope > *").forEach(el => {
				el.style.display = "block";
			});

			// 获取玩家列表
			const playerList = [...game.players, ...game.dead].sort((a, b) => a.getSeatNum() - b.getSeatNum());

			// 全部按钮
			const allBg = ui.create.div(".namebg", columnbox);
			const allBgBg = ui.create.div(".namebgbg", allBg);
			const allBtn = ui.create.div(".jiluanniu", allBg, e => {
				e.stopPropagation();
				document.querySelectorAll(".gou").forEach(g => g.remove());
				ui.create.div(".gou", allBtn);
				clonedSidebar.querySelectorAll(":scope > *").forEach(el => {
					el.style.display = "block";
				});
				if (clonedSidebar.scrollHeight > clonedSidebar.offsetHeight) {
					clonedSidebar.scrollTop = clonedSidebar.scrollHeight - clonedSidebar.clientHeight;
				}
			});
			ui.create.div(".gou", allBtn);
			ui.create.div(".name", "全部", allBgBg, allBtn.onclick);

			// 玩家按钮
			playerList.forEach(player => {
				const namebg = ui.create.div(".namebg", columnbox);
				if (game.dead.includes(player)) namebg.style.filter = "grayscale(0%)";
				const namebgbg = ui.create.div(".namebgbg", namebg);
				const prefixName = get.slimNameHorizontal(player.name);
				const seatNum = player.getSeatNum();
				const seatText = `(${seatNum === 2 ? "二" : get.cnNumber(seatNum)}号位)`;

				const filterByPlayer = e => {
					e.stopPropagation();
					document.querySelectorAll(".gou").forEach(g => g.remove());
					ui.create.div(".gou", btn);
					const names = [player.name, player.name1, player.name2]
						.filter((v, i, a) => v && a.indexOf(v) === i)
						.map(n => get.translation(n))
						.filter(n => n.length > 0);
					let hasEmpty = false;
					clonedSidebar.querySelectorAll(":scope > *").forEach(el => {
						const text = el.innerText || el.textContent || "";
						if (!text.trim()) {
							el.style.display = hasEmpty ? "none" : "block";
							hasEmpty = true;
							return;
						}
						hasEmpty = false;
						el.style.display = names.some(n => text.includes(n)) ? "block" : "none";
					});
					if (clonedSidebar.scrollHeight > clonedSidebar.offsetHeight) {
						clonedSidebar.scrollTop = clonedSidebar.scrollHeight - clonedSidebar.clientHeight;
					}
				};
				ui.create.div(".name", prefixName + seatText, namebgbg, filterByPlayer);
				const btn = ui.create.div(".jiluanniu", namebg, filterByPlayer);
			});

			historybg.appendChild(clonedSidebar);
			ui.historybar.classList.add("paused");
			ui.arena.classList.add("paused");
			ui.window.classList.add("touchinfohidden");
			ui.time.hide();
			game.onpause?.();
			if (clonedSidebar.scrollHeight > clonedSidebar.offsetHeight) {
				clonedSidebar.scrollTop = clonedSidebar.scrollHeight - clonedSidebar.clientHeight;
			}
		},

		initArenaReady() {
			const self = this;
			lib.arenaReady.push(() => {
				self.initIdentityShow();
				self.createMenuButton();
				self.createBottomButtons();
				self.createTimeNode();
			});
		},

		// 初始化身份显示
		initIdentityShow() {
			const self = this;
			// 设置胜利条件翻译
			const mode = getCurrentMode();
			if (mode === "guozhan") {
				lib.translate["undefined_win_option"] = "未选择势力";
				lib.translate["unknown_win_option"] = "保持隐蔽";
				lib.translate["ye_win_option"] = "击败场上所有其他角色";
				lib.group.forEach(g => {
					lib.translate[`${g}_win_option`] = `击败所有非${get.translation(g)}势力角色`;
				});
			} else if (MODE_CONFIGS[mode]) {
				Object.entries(MODE_CONFIGS[mode]).forEach(([k, v]) => {
					lib.translate[`${k}_win_option`] = v;
				});
			}

			if (!ui.identityShow) {
				ui.identityShow = ui.create.div(".identityShow", "身份加载中......", ui.window);
			}
			ui.identityShow_update = () => self.updateIdentityShow();
			setInterval(() => ui.identityShow_update?.(), 1000);
		},

		// 更新身份显示
		updateIdentityShow() {
			// 更新玩家昵称
			game.countPlayer(player => {
				if (!player.nickname) {
					const nicknames = ["缘之空", "小小恐龙", "自然萌", "海边的ebao", "小云云", "点点", "猫猫虫", "小爱莉", "冰佬", "鹿鹿", "黎佬", "浮牢师", "U佬", "蓝宝", "影宝", "柳下跖", "无语", "小曦", "墨渊", "k9", "扶苏", "皇叔", "🦅🦅🦅"];
					player.nickname = player === game.me ? lib.config.connect_nickname : nicknames.randomGet();
				}
			});

			let str = "";
			const mode = lib.config.mode;
			if (mode === "guozhan" || (mode === "versus" && ["siguo", "jiange"].includes(get.config("versus_mode")))) {
				Object.entries(IDENTITY_COLORS).forEach(([key, color]) => {
					const count = game.countPlayer(p => p.identity === key);
					if (count > 0) str += `<font color="${color}">${get.translation(key)}${count}</font> `;
				});
				str += "<br>";
			} else if (mode !== "versus" || get.config("versus_mode") !== "two") {
				["zhu", "zhong", "fan", "nei"].forEach(id => {
					const info = IDENTITY_INFO[id];
					const count = game.countPlayer(p => info.aliases.includes(p.identity));
					if (count > 0) str += `<font color="${info.color}">${get.translation(id)}</font>${count}  `;
				});
				str += "<br>";
			}
			if (game.me) {
				str += `<span style="color:orange;"><center>${get.translation(game.me.identity + "_win_option")}</span>`;
			}
			ui.identityShow.innerHTML = `<span style="font-family:shousha;font-size:16px;font-weight:500;text-align:right;line-height:20px;color:#C1AD92;text-shadow:none;">${str}</span>`;
			if (!ui.identityShow.querySelector(".jiluButton")) {
				ui.create.div(".jiluButton", ui.identityShow, ui.click.pause);
			}
		},

		// 创建菜单按钮
		createMenuButton() {
			const self = this;
			ui.caidanbutton = ui.create.div(".ui.caidanbutton", ui.window);
			ui.caidanbutton.onclick = () => {
				game.playAudio(`../${assetPath}CD/click.mp3`);
				const container = ui.create.div(".popup-container", ui.window);
				container.addEventListener("click", e => {
					game.playAudio(`../${assetPath}CD/back.mp3`);
					e.stopPropagation();
					container.delete(200);
				});
				const home = ui.create.div(".caidanopen", container);
				//设置右半屏菜单样式
				home.style.position = "fixed";
				home.style.right = "15px";
				home.style.top = "0";
				home.style.width = "50%";
				home.style.height = "100%";
				home.style.background = "linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,0.8))";
				home.style.zIndex = "100";
				home.style.gap = "18px";
				home.style.display = "flex";
				home.style.flexDirection = "column";
				home.style.alignItems = "flex-end";
				home.style.paddingRight = "98px";
				home.style.justifyContent = "flex-start";
				home.style.paddingTop = "91px";
				home.addEventListener("click", e => {
					if (!e.target.closest(".controls")) {
						game.playAudio(`../${assetPath}CD/back.mp3`);
						container.delete(200);
					}
				});
				// 设置
				const szBtn = ui.create.div(".controls", home);
				szBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/shezhi.png`);
				szBtn.style.width = "90px";
				szBtn.style.height = "30.75px";
				szBtn.style.backgroundRepeat = "no-repeat";
				szBtn.style.backgroundSize = "contain";
				szBtn.style.margin = "6px 0";
				szBtn.style.backgroundColor = "transparent";
				szBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					game.closePopped?.();
					game.pause2?.();
					ui.click.configMenu?.();
					ui.system1?.classList.remove("shown");
					ui.system2?.classList.remove("shown");
				});

				// 背景
				const bjBtn = ui.create.div(".controls", home);
				bjBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/beijing.png`);
				bjBtn.style.width = "90px";
				bjBtn.style.height = "30.75px";
				bjBtn.style.backgroundRepeat = "no-repeat";
				bjBtn.style.backgroundSize = "contain";
				bjBtn.style.margin = "6px 0";
				bjBtn.style.backgroundColor = "transparent";
				bjBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					self.openBackgroundSelector();
				});

				// 托管
				const tgBtn = ui.create.div(".controls", home);
				tgBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/tuoguan_on.png`);
				tgBtn.style.width = "90px";
				tgBtn.style.height = "30.75px";
				tgBtn.style.backgroundRepeat = "no-repeat";
				tgBtn.style.backgroundSize = "contain";
				tgBtn.style.margin = "6px 0";
				tgBtn.style.backgroundColor = "transparent";
				tgBtn.addEventListener("click", () => ui.click.auto());

				// 离开
				const tcBtn = ui.create.div(".controls", home);
				tcBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/likai.png`);
				tcBtn.style.width = "90px";
				tcBtn.style.height = "30.75px";
				tcBtn.style.backgroundRepeat = "no-repeat";
				tcBtn.style.backgroundSize = "contain";
				tcBtn.style.margin = "6px 0";
				tcBtn.style.backgroundColor = "transparent";
				tcBtn.addEventListener("click", () => window.location.reload());

				// 动态添加系统菜单项
				self.addSystemMenuItems(home);
			};
		},

		// 添加系统菜单项
		addSystemMenuItems(container) {
			const excludedItems = ["聊天", "联机大厅", "最近连接", "投降", "重来", "选项", "暂停", "不询问无懈", "托管", "♫", "整理手牌", "收藏", "牌堆"];
			for (let i in game.system) {
				if (excludedItems.includes(game.system[i].name)) continue;
				const node = ui.create.div(".controls", game.system[i].name, container);
				if (game.system[i].click) {
					node.addEventListener("click", () => game.system[i].click());
				}
			}
		},

		// 创建底部按钮
		createBottomButtons() {
			const self = this;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
			ui.anniubuttons = ui.create.div(isRight ? ".leftbuttons" : ".rightbuttons", ui.window);

			// 礼物按钮
			const giftBtn = ui.create.div(".anniubutton", ui.anniubuttons);
			giftBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/gameview_tool_btn_prop.png`);
			giftBtn.onclick = () => self.showGiftPanel();

			// 聊天按钮
			const talkBtn = ui.create.div(".anniubutton", ui.anniubuttons);
			talkBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/gameview_tool_btn_chat.png`);
			talkBtn.onclick = () => self.showTalkPanel();

			// 排序按钮
			const sortBtn = ui.create.div(".anniubutton", ui.anniubuttons);
			sortBtn.setBackgroundImage(`${assetPath}OL_line/uibutton/gameview_tool_btn_sort.png`);
			sortBtn.onclick = () => self.sortHandCards();
			ui.anniubuttons.style.display = "flex";
			ui.anniubuttons.style.flexDirection = "column";
			ui.anniubuttons.style.justifyContent = "flex-end";
			ui.anniubuttons.style.alignItems = "flex-start";
			ui.anniubuttons.style.gap = "14px";
		},

		// 创建计时器节点
		createTimeNode() {
			if (ui.cardRoundTimeNode) ui.cardRoundTimeNode.remove();
			ui.cardRoundTimeNode = ui.create.div(".cardRoundNumber", ui.window);
			const cardPileNode = ui.create.div(".cardPileNumber", ui.cardRoundTimeNode);
			const roundNode = ui.create.div(".roundNumber", ui.cardRoundTimeNode);
			ui.timeNode = ui.create.div(".time", ui.cardRoundTimeNode);

			lib.config.show_time3 = false;
			lib.config.show_time2 = false;
			lib.config.show_cardpile_number = false;

			game.updateRoundNum = () => {
				const num = Math.max(1, game.roundNumber || 1);
				roundNode.innerHTML = `<span>第${get.cnNumber(num, true)}轮</span>`;
				ui.cardRoundTimeNode.style.display = "block";
			};

			game.updateCardNum = (num, step) => {
				clearTimeout(cardPileNode.interval);
				if (!cardPileNode._num) {
					cardPileNode.innerHTML = `<span style="font-size: 16px;">${num}</span>`;
					cardPileNode._num = num;
				} else if (cardPileNode._num !== num) {
					if (!step) step = 500 / Math.abs(cardPileNode._num - num);
					cardPileNode._num += cardPileNode._num > num ? -1 : 1;
					cardPileNode.innerHTML = `<span style="font-size: 16px;">${cardPileNode._num}</span>`;
					if (cardPileNode._num !== num) {
						cardPileNode.interval = setTimeout(() => game.updateCardNum(num, step), step);
					}
				}
			};

			// 时间更新
			const updateTime = () => {
				if (!ui.timeNode.starttime) ui.timeNode.starttime = get.utc();
				const num = Math.round((get.utc() - ui.timeNode.starttime) / 1000);
				ui.timeNode.innerHTML = `<span><center>${formatTime(num)}</span>`;
			};
			updateTime();
			setInterval(updateTime, 1000);

			// 覆写轮数更新
			const originUpdate = game.updateRoundNumber;
			game.updateRoundNumber = function () {
				originUpdate.apply(this, arguments);
				const cardNumber = ui.cardPile.childNodes.length || 0;
				game.broadcastAll(num => {
					game.updateCardNum?.(num);
					game.updateRoundNum?.();
				}, cardNumber);
			};

			// 隐藏原始元素
			setTimeout(() => {
				document.querySelectorAll(".touchinfo.left, .touchinfo.right, .time, .cardPileNumber").forEach(node => {
					if (!ui.cardRoundTimeNode?.contains(node)) node.style.display = "none";
				});
			}, 1000);

			game.updateCardNum?.(0);
			game.updateRoundNum?.();
		},

		// 显示礼物面板
		showGiftPanel() {
			const self = this;
			const container = ui.create.div(".popup-container", ui.window, e => {
				if (e.target === container) container.hide();
			});
			const giftbg = ui.create.div(".giftbg", container);
			ui.create.div(".giftbgtext", "点击道具使用", giftbg);
			const giftes = ui.create.div(".giftes", giftbg);

			Object.entries(GIFT_CONFIG).forEach(([key, config]) => {
				const gift = ui.create.div(".gift", giftes, () => {
					giftbg.hide();
					self.showGiftSelection(container, config, giftbg);
				});
				gift.setBackgroundImage(`${assetPath}OL_line/gift/${config.image}`);
				ui.create.div(".giftname", config.name, gift);
				ui.create.div(".giftcost", config.cost, gift);
			});
		},

		// 显示礼物选择
		showGiftSelection(container, giftType, giftbg) {
			const container2 = ui.create.div(".popup-container", ui.window, e => {
				if (e.target === container2) {
					container2.hide();
					giftbg2.hide();
					giftbg.show();
				}
			});
			const giftbg2 = ui.create.div(".giftbg2", container);
			ui.create.div(".giftbgtext", "点击框外区域可退出", giftbg2);
			const gift2 = ui.create.div(".gift2", giftbg2);
			gift2.setBackgroundImage(`${assetPath}OL_line/gift/${giftType.image}`);

			game.countPlayer(player => {
				if (player === game.me) return;
				const avatar = player.node.avatar;
				const giftgive = ui.create.div(".giftgive", container2, e => {
					e.stopPropagation();
					if (game.online) game.send("throwEmotion", player, giftType.show);
					else game.me.throwEmotion(player, giftType.show);
				});
				const playerRect = avatar.getBoundingClientRect();
				const containerRect = container.getBoundingClientRect();
				giftgive.style.cssText = `position:absolute;top:${playerRect.top - containerRect.top}px;left:${playerRect.left - containerRect.left}px;width:${playerRect.width}px;height:${playerRect.height}px;`;
			});
		},

		// 显示聊天面板
		showTalkPanel() {
			if (!game.me) return;
			const self = this;
			let shuru = null;

			const container = ui.create.div(".popup-container", ui.window, e => {
				if (e.target === container) {
					container.hide();
					if (shuru) {
						shuru.value = "";
						shuru.style.display = "none";
					}
				}
			});
			const bg = ui.create.div(".talkbg", container);
			const typechanges = ui.create.div(".typechanges", bg);
			const rightbg = ui.create.div(".talkrightbg", bg);

			const tabs = [
				{ name: "快捷", click: () => self.createQuickMessages(rightbg) },
				{ name: "表情", click: () => self.createEmotionPanel(rightbg) },
				{ name: "消息", click: () => self.createHistoryMessages(rightbg) },
			];

			let activeBtn = null;
			tabs.forEach((tab, i) => {
				const btn = ui.create.div(".typechange", tab.name, typechanges);
				btn.onclick = () => {
					if (activeBtn) activeBtn.classList.remove("typechangelight");
					btn.classList.add("typechangelight");
					activeBtn = btn;
					while (rightbg.firstChild) rightbg.removeChild(rightbg.firstChild);
					tab.click();
				};
				if (i === 0) {
					btn.click();
					activeBtn = btn;
				}
			});

			// 打字按钮
			const dazi = ui.create.div(".dazi", "打字", bg);
			dazi.addEventListener("click", e => {
				e.stopPropagation();
				if (!shuru) {
					shuru = document.createElement("input");
					shuru.type = "text";
					shuru.placeholder = "请输入要说的话";
					shuru.style.cssText = "position:absolute;left:50%;transform:translateX(-50%);z-index:1000;top:5%;width:60%;height:10%;font-size:30px;background-color:rgba(255,255,255,0.9);border:2px solid #C1AD92;border-radius:5px;padding:5px;outline:none;pointer-events:auto;";
					ui.window.appendChild(shuru);
				}
				shuru.style.display = "block";
				shuru.focus();
			});

			document.addEventListener("keydown", e => {
				if (shuru?.style.display === "block" && e.key === "Enter") {
					const value = shuru.value.trim();
					if (value) {
						if (game.online) game.send("chat", game.onlineID, value);
						else game.me.chat(value);
						while (rightbg.firstChild) rightbg.removeChild(rightbg.firstChild);
						self.createHistoryMessages(rightbg);
					}
					shuru.value = "";
					shuru.style.display = "none";
				}
			});
		},

		// 创建快捷消息
		createQuickMessages(container) {
			let skills = game.me.getSkills(null, false, false).filter(s => {
				const info = get.info(s);
				return !info?.charlotte;
			});
			// 添加衍生技能
			skills.forEach(skill => {
				const info = get.info(skill);
				if (info?.derivation) {
					const derivations = Array.isArray(info.derivation) ? info.derivation : [info.derivation];
					skills.push(...derivations);
				}
			});
			skills = [...new Set(skills)];

			skills.forEach(name => {
				if (!get.info(name)) return;
				const textList = game.parseSkillText(name, game.me.name);
				const audioList = game.parseSkillAudio(name, game.me.name);
				textList.forEach((text, i) => {
					ui.create.div(".talkquick", `[${get.skillTranslation(name)}]${text}`, container, () => {
						let actualPath = audioList[i].startsWith("ext:") ? `../extension/${audioList[i].slice(4)}` : `../audio/${audioList[i]}`;
						if (game.online) {
							game.send("chat", game.onlineID, text);
							game.send("chat", game.onlineID, `/audio${actualPath}`);
						} else {
							game.me.chat(text);
							game.broadcastAll(path => {
								if (lib.config.background_speak) game.playAudio(path);
							}, actualPath);
						}
					});
				});
			});

			lib.quickVoice?.forEach(chat => {
				ui.create.div(".talkquick", chat, container, () => {
					if (game.online) game.send("chat", game.onlineID, chat);
					else game.me.chat(chat);
				});
			});
		},

		// 创建表情面板
		createEmotionPanel(container) {
			const gridStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridGap: "5px", width: "max-content", margin: "0 auto" };
			const list1 = ui.create.div(".emotionbg", container);
			Object.assign(list1.style, gridStyle);
			const list2 = ui.create.div(".emotionbg", container);
			Object.assign(list2.style, gridStyle);
			list2.style.display = "none";

			const srcBase = `${lib.assetURL}image/emotion/`;
			game.getFileList(
				srcBase,
				folders => {
					folders
						.filter(pack => pack !== "throw_emotion")
						.forEach(pack => {
							const packDiv = ui.create.div(".card.fullskin", `<img src="${srcBase}${pack}/1.gif" width="80" height="80">`, list1, () => {
								list2.innerHTML = "";
								game.getFileList(
									`${srcBase}${pack}/`,
									(_, files) => {
										files.forEach(file => {
											const btn = ui.create.div(".card.fullskin", `<img src="${srcBase}${pack}/${file}" width="80" height="80">`, list2, () => {
												if (game.online) game.send("emotion", game.onlineID, pack, file);
												else game.me.emotion(pack, file);
											});
											btn.style.cssText = "width:80px;height:80px;";
										});
									},
									() => {}
								);
								list1.style.display = "none";
								list2.style.display = "grid";
							});
							packDiv.style.cssText = "width:80px;height:80px;";
						});
				},
				() => {}
			);
		},

		// 创建历史消息
		createHistoryMessages(container) {
			lib.chatHistory?.forEach(chat => {
				let displayName = (chat[0] || "").replace(/\[undefined\]/g, "");
				const content = `<span style="color:rgb(220,170,50);">${displayName}：</span><br>${chat[1]}`;
				ui.create.div(".talkhistory", content, container);
			});
			container.scrollTop = container.scrollHeight;
		},

		// 排序手牌
		sortHandCards() {
			if (!game.me || game.me.hasSkillTag("noSortCard")) return;
			const cards = game.me.getCards("hs");
			const sort2 = (b, a) => {
				if (a.name !== b.name) return lib.sort.card(a.name, b.name);
				else if (a.suit !== b.suit) return lib.suit.indexOf(a) - lib.suit.indexOf(b);
				else return a.number - b.number;
			};
			if (cards.length > 1) {
				cards.sort(sort2);
				cards.forEach((card, j) => {
					game.me.node.handcards1.insertBefore(cards[j], game.me.node.handcards1.firstChild);
				});
				decadeUI?.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
			}
		},

		create: {
			control() {},

			confirm() {
				const confirm = ui.create.control("<span>确定</span>", "cancel");
				confirm.classList.add("lbtn-confirm");
				confirm.node = {
					ok: confirm.firstChild,
					cancel: confirm.lastChild,
				};
				if (_status.event.endButton) _status.event.endButton.close();
				confirm.node.ok.link = "ok";
				confirm.node.ok.classList.add("primary");
				confirm.node.cancel.classList.add("primary2");
				confirm.custom = (link, target) => {
					if (link === "ok") ui.click.ok(target);
					else if (link === "cancel") ui.click.cancel(target);
					else if (target.custom) target.custom(link);
				};

				// 设置事件监听
				for (const k in confirm.node) {
					confirm.node[k].classList.add("disabled");
					confirm.node[k].removeEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control);
					confirm.node[k].addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
						e.stopPropagation();
						if (this.classList.contains("disabled")) {
							if (this.link === "cancel" && this.dataset.type === "endButton" && _status.event.endButton) {
								_status.event.endButton.custom();
								ui.confirm.close();
							}
							return;
						}
						if (this.parentNode.custom) this.parentNode.custom(this.link, this);
					});
				}

				// 设置skills2
				if (ui.skills2?.skills.length) {
					confirm.skills2 = [];
					ui.skills2.skills.forEach(skill => {
						const item = document.createElement("div");
						item.link = skill;
						item.innerHTML = get.translation(skill);
						item.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
							e.stopPropagation();
							ui.click.skill(this.link);
						});
						item.dataset.type = "skill2";
						if (ui.updateSkillControl) ui.updateSkillControl(game.me, true);
					});
				}

				confirm.update = function () {
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
					if (ui.updateSkillControl) ui.updateSkillControl(game.me, true);
				};

				return confirm;
			},

			cardRoundTime() {
				return base.create.cardRoundTime();
			},

			handcardNumber() {
				const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
				ui.create.div(".settingButton", ui.arena);
				ui.create.div(".tuoguanButton", ui.arena, ui.click.auto);

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
