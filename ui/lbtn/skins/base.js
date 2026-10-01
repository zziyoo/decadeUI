/**
 * @fileoverview lbtn插件基础类
 * 提供所有样式共用的基础功能
 */
import { lib, game, ui, get, ai, _status } from "noname";

/**
 * 创建基础lbtn插件
 */
export function createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	return {
		name: "lbtn",

		// 模式过滤
		filter: () => !["chess", "tafang"].includes(get.mode()),

		// 支持的游戏模式
		supportedModes: ["identity", "doudizhu", "guozhan", "versus", "single", "boss"],

		// 身份颜色配置
		identityColors: {
			zhu: "#ae5f35",
			zhong: "#e9d765",
			fan: "#87a671",
			nei: "#9581c4",
		},

		// 国战势力颜色
		groupColors: {
			unknown: "#FFFFDE",
			wei: "#0075FF",
			shu: "#FF0000",
			wu: "#00FF00",
			qun: "#FFFF00",
			jin: "#9E00FF",
			ye: "#9E00FF",
			key: "#9E00FF",
		},

		// 身份提示映射
		identityTips: {
			zhu: ".Tipzhugong",
			zhong: ".Tipzhongchen",
			fan: ".Tipfanzei",
			nei: ".Tipneijian",
		},

		// 斗地主身份提示
		doudizhuTips: {
			zhu: ".Tipdizhu",
			fan: ".Tipnongmin",
		},

		// 国战势力提示
		groupTips: {
			unknown: ".Tipundefined",
			undefined: ".Tipundefined",
			wei: ".Tipweiguo",
			shu: ".Tipshuguo",
			wu: ".Tipwuguo",
			qun: ".Tipqunxiong",
			jin: ".Tipjinguo",
			ye: ".Tipyexinjia",
		},

		// 工具方法
		utils: {
			playAudio(path) {
				game.playAudio(path);
			},

			createImage(src, style) {
				const img = ui.create.node("img");
				img.src = lib.assetURL + src;
				img.style.cssText = style;
				return img;
			},

			createDiv(className, container, clickHandler) {
				const div = ui.create.div(className, container);
				if (clickHandler) div.addEventListener("click", clickHandler);
				return div;
			},

			formatTime(seconds) {
				const h = Math.floor(seconds / 3600);
				const m = Math.floor((seconds - h * 3600) / 60);
				const s = seconds - h * 3600 - m * 60;
				const pad = n => (n < 10 ? "0" + n : n);
				return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
			},
		},

		// 初始化轮次更新
		initRoundUpdate() {
			const originUpdateRoundNumber = game.updateRoundNumber;
			game.updateRoundNumber = function () {
				originUpdateRoundNumber.apply(this, arguments);
				if (ui.cardRoundTime) ui.cardRoundTime.updateRoundCard();
			};
		},

		// 手牌排序
		sortHandCards() {
			if (!game.me || game.me.hasSkillTag("noSortCard")) return;
			const cards = game.me.getCards("hs");
			if (cards.length <= 1) return;

			cards.sort((b, a) => {
				if (a.name !== b.name) return lib.sort.card(a.name, b.name);
				if (a.suit !== b.suit) return lib.suit.indexOf(a) - lib.suit.indexOf(b);
				return a.number - b.number;
			});

			cards.forEach(card => {
				game.me.node.handcards1.insertBefore(card, game.me.node.handcards1.firstChild);
			});

			if (typeof decadeUI !== "undefined") {
				decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
			}
		},

		// 全选/反选手牌
		toggleSelectAllCards(updateButtonFn) {
			const event = _status.event;
			if (!event?.isMine?.() || !event.allowChooseAll || event.complexCard || event.complexSelect) return;

			const selectCard = event.selectCard;
			if (!selectCard) return;

			const range = get.select(selectCard);
			if (range[1] <= 1) return;

			const selecteds = [...ui.selected.cards];
			ui.selected.cards.length = 0;
			game.check();

			const selectables = get.selectableCards();
			const cards = selecteds.length ? [...new Set(selectables).difference(selecteds)] : selectables;

			if (cards.length <= range[1]) {
				ui.selected.cards.push(...cards);
			} else {
				ui.selected.cards.push(...cards.randomGets(range[1]));
			}

			ui.selected.cards.forEach(card => {
				card.classList.add("selected");
				card.updateTransform?.(true, 0);
			});

			selecteds.forEach(card => {
				card.classList.remove("selected");
				card.updateTransform?.(false, 0);
			});

			game.check();
			updateButtonFn?.();
			event.custom?.add?.card?.();
		},

		// 打开背景选择器
		openBackgroundSelector(audioPath) {
			const container = ui.create.div(".popup-container", { background: "rgba(0, 0, 0, 0.8)" }, ui.window);

			ui.create.div(".bgback", container, () => {
				game.playAudio(audioPath || "../extension/十周年UI/ui/assets/lbtn/shousha/caidan.mp3");
				container.hide();
				game.resume2();
			});

			const bigdialog = ui.create.div(".bgdialog", container);
			const bgbg = ui.create.div(".backgroundsbg", bigdialog);
			this.loadBackgroundImages(bgbg);
		},

		// 加载背景图片
		loadBackgroundImages(container) {
			const backgroundItems = lib.configMenu.appearence.config.image_background.item;
			const hiddenBgs = lib.config.hiddenBackgroundPack || [];
			const self = this;

			for (const fileName in backgroundItems) {
				if (fileName === "default" || hiddenBgs.includes(fileName)) continue;

				const img = ui.create.div(".backgrounds", container);
				img.dataset.name = fileName;

				if (fileName.startsWith("custom_")) {
					game.getDB("image", fileName, fileToLoad => {
						if (!fileToLoad) return;
						const reader = new FileReader();
						reader.onload = e => {
							img.style.backgroundImage = `url(${e.target.result})`;
							img.style.backgroundSize = "cover";
						};
						reader.readAsDataURL(fileToLoad, "UTF-8");
					});
				} else {
					img.setBackgroundImage(`image/background/${fileName}.jpg`);
				}

				if (fileName === lib.config.image_background) {
					ui.create.div(".bgxuanzhong", img);
				}

				img.addEventListener("click", function () {
					self.handleBackgroundClick(this, container, fileName);
				});

				ui.create.div(".buttontext", backgroundItems[fileName], img);
			}

			this.addBackgroundControls(container);
		},

		// 处理背景点击
		handleBackgroundClick(img, container, fileName) {
			const editItem = container.querySelector(".backgrounds:last-child");
			const isEditMode = editItem?.classList.contains("active");

			if (isEditMode) {
				const textDiv = img.querySelector(".buttontext");
				if (textDiv?.innerHTML === "隐藏") {
					this.hideBackground(container, fileName);
					return;
				} else if (textDiv?.innerHTML === "删除") {
					this.deleteBackground(container, fileName);
					return;
				}
			}

			document.querySelectorAll(".bgxuanzhong").forEach(el => el.remove());
			ui.create.div(".bgxuanzhong", img);
			game.saveConfig("image_background", fileName);
			lib.init.background();
			game.updateBackground();
		},

		// 隐藏背景
		hideBackground(container, fileName) {
			container.parentNode.noclose = true;
			if (!lib.config.prompt_hidebg) {
				alert("隐藏的背景可通过选项-其它-重置隐藏内容恢复");
				game.saveConfig("prompt_hidebg", true);
			}
			lib.config.hiddenBackgroundPack.add(fileName);
			game.saveConfig("hiddenBackgroundPack", lib.config.hiddenBackgroundPack);
			delete lib.configMenu.appearence.config.image_background.item[fileName];

			if (lib.config.image_background === fileName) {
				game.saveConfig("image_background", "default");
				lib.init.background();
				game.updateBackground();
			}

			this.refreshBackgrounds(container);
		},

		// 删除背景
		deleteBackground(container, fileName) {
			if (!confirm("是否删除此背景？（此操作不可撤销）")) return;

			container.parentNode.noclose = true;
			lib.config.customBackgroundPack.remove(fileName);
			game.saveConfig("customBackgroundPack", lib.config.customBackgroundPack);

			if (fileName.startsWith("cdv_")) {
				game.removeFile(`image/background/${fileName}.jpg`);
			} else {
				game.deleteDB("image", fileName);
			}

			delete lib.configMenu.appearence.config.image_background.item[fileName];

			if (lib.config.image_background === fileName) {
				game.saveConfig("image_background", "default");
				lib.init.background();
				game.updateBackground();
			}

			this.refreshBackgrounds(container);
		},

		// 刷新背景列表
		refreshBackgrounds(container) {
			while (container.firstChild) container.removeChild(container.firstChild);
			this.loadBackgroundImages(container);
		},

		// 添加背景控制按钮
		addBackgroundControls(container) {
			const self = this;

			// 添加背景按钮
			const addItem = ui.create.div(".backgrounds", container);
			ui.create.div(".buttontext", "添加背景", addItem);

			const input = document.createElement("input");
			input.type = "file";
			input.accept = "image/*";
			input.multiple = true;
			input.style.display = "none";
			document.body.appendChild(input);

			addItem.addEventListener("click", () => input.click());

			input.onchange = e => {
				const files = Array.from(e.target.files || []);
				if (!files.length) return;

				let processed = 0;
				files.forEach(file => {
					let name = file.name.split(".")[0];
					let link = `${game.writeFile ? "cdv_" : "custom_"}${name}`;

					// 避免重名
					if (lib.configMenu.appearence.config.image_background.item[link]) {
						for (let i = 1; i < 1000; i++) {
							if (!lib.configMenu.appearence.config.image_background.item[`${link}_${i}`]) {
								link = `${link}_${i}`;
								break;
							}
						}
					}

					lib.configMenu.appearence.config.image_background.item[link] = name;

					const callback = () => {
						lib.config.customBackgroundPack.add(link);
						game.saveConfig("customBackgroundPack", lib.config.customBackgroundPack);
						processed++;
						if (processed === files.length) self.refreshBackgrounds(container);
					};

					if (game.writeFile) {
						game.writeFile(file, "image/background", `${link}.jpg`, callback);
					} else {
						game.putDB("image", link, file, callback);
					}
				});
			};

			// 编辑背景按钮
			const editItem = ui.create.div(".backgrounds", container);
			ui.create.div(".buttontext", "编辑背景", editItem);

			editItem.addEventListener("click", function () {
				this.classList.toggle("active");
				const items = Array.from(container.querySelectorAll(".backgrounds"));
				const isActive = this.classList.contains("active");

				items.slice(0, -2).forEach(item => {
					const fname = item.dataset.name;
					if (!fname) return;
					const textDiv = item.querySelector(".buttontext");
					if (!textDiv) return;

					if (isActive) {
						textDiv.innerHTML = fname.startsWith("custom_") || fname.startsWith("cdv_") ? "删除" : "隐藏";
					} else {
						textDiv.innerHTML = lib.configMenu.appearence.config.image_background.item[fname] || fname;
					}
				});
			});
		},

		// 拦截出牌阶段取消
		initCancelIntercept() {
			const originalCancel = ui.click.cancel;
			ui.click.cancel = function (node) {
				const event = _status.event;
				if (event?.type === "phase" && ui.confirm && !event.skill && (ui.selected.cards.length || ui.selected.targets.length)) {
					ui.confirm.classList.add("removing");
					event.restore();
					event.player.getCards("hej").forEach(c => c.recheck("useSkill"));
					game.uncheck();
					game.check();
					return;
				}
				return originalCancel.call(this, node);
			};
		},

		// 基础precontent重写
		initBaseRewrites() {
			// 内容
			Object.assign(game.videoContent, {
				createCardRoundTime: () => (ui.cardRoundTime = this.create.cardRoundTime()),
				createhandcardNumber: () => (ui.handcardNumber = this.create.handcardNumber()),
				updateCardRoundTime: opts => {
					if (!ui.cardRoundTime) return;
					const round = Math.max(1, game.roundNumber || 1);
					ui.cardRoundTime.node.roundNumber.innerHTML = `<span>第${round}轮</span>`;
					ui.cardRoundTime.setNumberAnimation(opts.cardNumber);
				},
				updateCardnumber: () => {},
			});

			// 重写UI创建
			app.reWriteFunction(ui.create, {
				me: [() => this.create.control(), null],
				arena: [
					null,
					() => {
						if (ui.time3) {
							clearInterval(ui.time3.interval);
							ui.time3.delete();
						}
						if (ui.cardPileNumber) ui.cardPileNumber.delete();
						ui.cardRoundTime = this.create.cardRoundTime();
						ui.handcardNumber = this.create.handcardNumber();
					},
				],
				cards: [null, () => ui.cardRoundTime?.updateRoundCard()],
			});

			// 重写配置菜单
			app.reWriteFunction(lib.configMenu.appearence.config, {
				update: [
					null,
					(res, config, map) => {
						[
							"control_style",
							"custom_button",
							"custom_button_system_top",
							"custom_button_system_bottom",
							"custom_button_control_top",
							"custom_button_control_bottom",
							"radius_size",
						].forEach(k => map[k]?.hide());
					},
				],
			});

			// 重写确认对话框
			game.Check.confirm = function (event, confirm) {
				ui.arena.classList.add("selecting");
				if (
					event.filterTarget &&
					(!event.filterCard || !event.position || (typeof event.position == "string" && !event.position.includes("e")))
				) {
					ui.arena.classList.add("tempnoe");
				}
				game.countChoose();
				if (!_status.noconfirm && !_status.event.noconfirm) {
					ui.create.confirm(confirm);
				}
			};

			// 拦截取消
			this.initConfirmRewrite();
			this.initCancelIntercept();
		},

		// 确认对话框重写
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

		// 创建器
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

				// 确认按钮点击处理
				confirm.custom = (link, target) => {
					if (link === "ok") ui.click.ok(target);
					else if (link === "cancel") ui.click.cancel(target);
					else target.custom?.(link);
				};

				app.reWriteFunction(confirm, {
					close: [
						function () {
							this.classList.add("closing");
						},
					],
				});

				// 按钮事件
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
						this.parentNode.custom?.(this.link, this);
					});
				});

				// 技能按钮 - 仅shousha样式在确认按钮旁显示gskills
				const isShousha = lib.config.extension_十周年UI_newDecadeStyle === "off";
				if (lib.config.phonelayout && ui.skills2?.skills?.length && isShousha) {
					confirm.skills2 = ui.skills2.skills.map(skill => {
						const item = document.createElement("div");
						item.link = skill;
						item.innerHTML = get.translation(skill);
						item.addEventListener(lib.config.touchscreen ? "touchend" : "click", function (e) {
							e.stopPropagation();
							ui.click.skill(this.link);
						});
						item.dataset.type = "skill2";
						return item;
					});
				}

				confirm.update = () => {
					// 仅shousha样式处理skills2
					if (lib.config.phonelayout && confirm.skills2 && isShousha) {
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

			handcardNumber() {
				const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
				const className = isRight ? ".handcardNumber" : ".handcardNumber1";
				const node = ui.create.div(className, ui.arena).hide();

				node.node = {
					cardPicture: ui.create.div(".cardPicture", node),
					cardNumber: ui.create.div(".cardNumber", node),
				};

				node.updateCardnumber = function () {
					if (!game.me) return;
					const current = game.me.countCards("h") || 0;
					let limit = game.me.getHandcardLimit() || 0;
					const color = current > limit ? "red" : "white";
					if (limit === Infinity) limit = "∞";

					this.node.cardNumber.innerHTML = `<span><font color="${color}">${current}</font><sp style="font-size:15px;font-family:yuanli;color:#FFFCF5;">/</sp>${limit}</span>`;
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
					time: ui.create.div(".time", node),
				};

				node.updateRoundCard = function () {
					const cardNum = ui.cardPile.childNodes.length || 0;
					const round = Math.max(1, game.roundNumber || 1);
					this.node.roundNumber.innerHTML = `<span>第${round}轮</span>`;
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

		click: {
			confirm(link, target) {
				if (link === "ok") ui.click.ok(target);
				else if (link === "cancel") ui.click.cancel(target);
				else target.custom?.(link);
			},

			huanfu() {
				game.playAudio("../extension/十周年UI/ui/assets/lbtn/CD/huanfu.mp3");
				if (window.zyile_charactercard) {
					window.zyile_charactercard(game.me, false);
				} else {
					ui.click.charactercard(game.me.name, game.zhu, lib.config.mode === "mode_guozhan" ? "guozhan" : true);
				}
			},
		},
	};
}
