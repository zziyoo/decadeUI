/**
 * Character插件基础类
 * 提供所有样式共用的基础功能
 */
import { _status } from "noname";
import { skillButtonTooltip } from "../../../src/ui/skillButtonTooltip.js";

export function createBaseCharacterPlugin(lib, game, ui, get, ai, _status, app) {
	return {
		name: "character",

		// 模式过滤
		filter: () => !["chess", "tafang"].includes(get.mode()),

		// 资源路径
		assetPath: "extension/十周年UI/ui/assets/character/",
		audioPath: "extension/十周年UI/ui/assets/lbtn/shousha/",

		// 有效势力列表
		validGroups: ["wei", "shu", "wu", "qun", "ye", "jin", "daqin", "western", "shen", "key", "Han", "qin"],

		// 官阶翻译
		guanjieTranslation: {
			1: ["士兵"],
			2: ["十夫长"],
			3: ["百夫长"],
			4: ["千夫长"],
			5: ["校尉"],
			6: ["先锋将军"],
			7: ["骠骑将军"],
			8: ["领军将军"],
			9: ["中军将军"],
			10: ["大将军"],
			11: ["大元帅"],
		},

		// 段位翻译
		duanweiTranslation: {
			1: ["青铜Ⅰ", "青铜Ⅱ", "青铜Ⅲ"],
			2: ["白银Ⅰ", "白银Ⅱ", "白银Ⅲ"],
			3: ["黄金Ⅰ", "黄金Ⅱ", "黄金Ⅲ", "黄金Ⅳ"],
			4: ["翡翠Ⅰ", "翡翠Ⅱ", "翡翠Ⅲ", "翡翠Ⅳ"],
			5: ["大师Ⅰ", "大师Ⅱ", "大师Ⅲ", "大师Ⅳ", "大师Ⅴ"],
			6: ["传说Ⅰ", "传说Ⅱ", "绝世传说"],
		},

		// 工具方法
		utils: {
			// 播放音频
			playAudio(path) {
				game.playAudio(path);
			},

			// 生成随机数据
			generateRandomData(player) {
				const guanjieLevel = Math.floor(Math.random() * 11 + 1);
				return {
					winRate: Math.floor(Math.random() * (95 - 50 + 1)) + 50 + "%",
					guanjieLevel,
					lucky: Math.floor(Math.random() * 10000 + 1),
					popularity: Math.floor(Math.random() * 10000 + 1),
					escapeRate: Math.floor(Math.random() * (10 - 0 + 1) + 0),
					rankLevel: Math.floor(Math.random() * 6 + 1),
					level: Math.floor(Math.random() * 101) + 100,
					gailevel: Math.floor(Math.random() * (80 - 20 + 1)) + 20,
					vipLevel: Math.min(guanjieLevel + 1, 10),
					mvpCount: Math.floor(Math.random() * (60 - 20 + 1)) + 20,
				};
			},

			// 计算胜率
			calculateWinRate() {
				const gameRecord = lib.config.gameRecord?.[lib.config.mode];
				if (gameRecord && lib.config.mode !== "guozhan" && !_status.connectMode) {
					const wins = gameRecord.str?.match(/(\d+)胜/g)?.map(w => parseInt(w)) || [0];
					const losses = gameRecord.str?.match(/(\d+)负/g)?.map(l => parseInt(l)) || [0];
					const totalWins = wins.reduce((a, b) => a + b, 0);
					const totalLosses = losses.reduce((a, b) => a + b, 0);
					const total = totalWins + totalLosses;
					return total > 0 ? (totalWins / total) * 100 : 0;
				}
				return Math.random() * 100;
			},

			// 生成随机百分比
			getRandomPercentage: () => (Math.random() * 100).toFixed(2),

			// 数字转图片
			numberToImages(number, imgPath) {
				const str = number.toString();
				let html = "";
				for (const char of str) {
					const src = char === "." ? `${imgPath}point.png` : `${imgPath}${char}.png`;
					html += `<img src="${lib.assetURL}${src}" alt="${char}" style="--w:25px;--h:calc(var(--w)*52/38);width:var(--w);height:var(--h);margin-right:-9px;">`;
				}
				html += `<img src="${lib.assetURL}${imgPath}personui_percentage.png" alt="%" style="--w:27px;--h:calc(var(--w)*51/41);width:var(--w);height:var(--h);margin-left:1px;">`;
				return html;
			},

			// 创建星级
			createStars(container, rarity) {
				const starMap = { legend: 5, epic: 4, rare: 3, junk: 2 };
				const num = starMap[rarity] || 3;
				for (let i = 0; i < num; i++) ui.create.div(".item", container);
				for (let i = 0; i < 5 - num; i++) ui.create.div(".item.huixing", container);
			},

			// 获取武将分包
			getPack(name) {
				const pack = Object.keys(lib.characterPack).find(p => lib.characterPack[p][name]);
				if (pack) {
					if (lib.characterSort[pack]) {
						const sort = Object.keys(lib.characterSort[pack]).find(s => lib.characterSort[pack][s].includes(name));
						if (sort) return lib.translate[sort];
					}
					return lib.translate[pack + "_character_config"] || lib.translate[pack];
				}
				return "暂无分包";
			},

			// 获取武将名文本
			getCharacterNameText(name, name2) {
				const getName = n => (n === "unknown" ? "未知" : get.slimNameHorizontal(n));
				if (name && name2) return `${getName(name)} / ${getName(name2)}`;
				return getName(name);
			},

			// 创建武将按钮
			createCharButton(name, parent) {
				if (!name || !lib.character[name]) return;
				ui.create.button(name, "character", parent?.firstChild, true);
			},

			// 获取千幻样式等阶
			getQhlyLevel(name) {
				if (lib.config["extension_千幻聆音_enable"] && typeof game.qhly_getSkinLevel === "function" && typeof game.qhly_getSkin === "function") {
					const level = game.qhly_getSkinLevel(name, game.qhly_getSkin(name), true, false);
					const map = {
						xiyou: "rare",
						shishi: "epic",
						chuanshuo: "legend",
						putong: "common",
						dongtai: "legend",
						jueban: "unique",
						xianding: "restrictive",
					};
					return map[level] || "junk";
				}
				return "junk";
			},

			// 获取千幻样式名
			getQhlySkinTranslation(name) {
				if (lib.config["extension_千幻聆音_enable"] && typeof game.qhly_getSkinInfo === "function" && typeof game.qhly_getSkin === "function") {
					return game.qhly_getSkinInfo(name, game.qhly_getSkin(name), null).translation || "经典形象";
				}
				return "经典形象";
			},

			// 提取图片路径
			extractImagePath(bg) {
				if (!bg) return "";
				if (bg.startsWith('url("')) return bg.slice(5, bg.indexOf('")'));
				if (bg.startsWith("url('")) return bg.slice(5, bg.indexOf("')"));
				return bg;
			},

			// 获取立绘路径
			getLihuiPath(originalPath) {
				return originalPath.replace(/image\/character/, "image/lihui");
			},

			// 设置立绘
			setLihuiDiv(skinDiv, playerSkin) {
				const originalPath = this.extractImagePath(playerSkin);
				const testImg = new Image();
				testImg.onerror = () => (skinDiv.style.backgroundImage = playerSkin);
				testImg.onload = function () {
					skinDiv.style.backgroundImage = `url("${this.src}")`;
				};
				testImg.src = this.getLihuiPath(originalPath);
			},
		},

		// 获取势力背景图（子类可覆盖）
		getGroupBackgroundImage(group) {
			if (!this.validGroups.includes(group)) group = "default";
			return `${this.assetPath}shousha/character/name2_${group}.png`;
		},

		// 基础precontent
		precontent() {
			const plugin = this;
			app.reWriteFunction(lib, {
				setIntro: [
					function (args, node) {
						if (get.itemtype(node) !== "player") return;
						if (lib.config.touchscreen) {
							lib.setLongPress(node, e => plugin.click.playerIntro.call(plugin, e, node));
						} else if (lib.config.right_info) {
							node.oncontextmenu = function (e) {
								e?.preventDefault();
								e?.stopPropagation();
								plugin.click.playerIntro.call(plugin, e, this);
								return false;
							};
						}
						return node;
					},
				],
			});
		},

		// 点击事件
		click: {
			// 身份点击
			identity(e) {
				e.stopPropagation();
				const player = this.parentNode;
				if (!game.getIdentityList) return;
				if (player.node.guessDialog) {
					player.node.guessDialog.classList.toggle("hidden");
				} else {
					const list = game.getIdentityList(player);
					if (!list) return;
					const dialog = ui.create.div(".guessDialog", player);
					ui.create.div(dialog);
					lib.setScroll(dialog);
					player.node.guessDialog = dialog;
				}
			},

			// 玩家详情弹窗（子类实现）
			playerIntro(e, node) {
				e?.preventDefault();
				e?.stopPropagation();
				// 子类实现具体逻辑
			},
		},

		// 创建技能列表（通用）
		createSkillList(container, player, dialogContainer) {
			container.innerHTML = "<div></div>";
			lib.setScroll(container.firstChild);

			let skills = player.getSkills(null, false, false).slice(0);
			skills = skills.filter(s => lib.skill[s] && s !== "jiu" && !lib.skill[s].nopop && !lib.skill[s].equipSkill && lib.translate[s + "_info"]);

			if (player === game.me && player.hiddenSkills?.length) {
				skills.addArray(player.hiddenSkills);
			}

			// 手牌区
			this.showHandCards(container.firstChild, player);

			// 技能区
			if (skills.length) {
				const modeMap = {
					doudizhu: "武将技能·斗地主",
					identity: "武将技能·身份",
					versus: "武将技能·团战",
					single: "武将技能·1v1",
					guozhan: "武将技能·国战",
				};
				ui.create.div(".xcaption", modeMap[lib.config.mode] || "武将技能", container.firstChild);
				skills.forEach(name => this.createSkillItem(container.firstChild, name, player, dialogContainer));
			}

			// 装备区
			this.showEquipmentArea(container.firstChild, player);

			// 判定区
			this.showJudgeArea(container.firstChild, player);
		},

		// 显示手牌
		showHandCards(container, player) {
			const allShown = player.isUnderControl() || (!game.observe && game.me?.hasSkillTag("viewHandcard", null, player, true));
			const shownHs = player.getShownCards();

			if (shownHs.length) {
				ui.create.div(".xcaption", player.hasCard(c => !shownHs.includes(c), "h") ? "明置的手牌" : "手牌区域", container);
				shownHs.forEach(item => {
					const card = game.createCard(get.name(item, false), get.suit(item, false), get.number(item, false), get.nature(item, false));
					card.style.zoom = "0.6";
					container.appendChild(card);
				});

				if (allShown) {
					const hs = player.getCards("h");
					hs.removeArray(shownHs);
					if (hs.length) {
						ui.create.div(".xcaption", "其他手牌", container);
						hs.forEach(item => {
							const card = game.createCard(get.name(item, false), get.suit(item, false), get.number(item, false), get.nature(item, false));
							card.style.zoom = "0.6";
							container.appendChild(card);
						});
					}
				}
			} else if (allShown) {
				const hs = player.getCards("h");
				if (hs.length) {
					ui.create.div(".xcaption", "手牌区域", container);
					hs.forEach(item => {
						const card = game.createCard(get.name(item, false), get.suit(item, false), get.number(item, false), get.nature(item, false));
						card.style.zoom = "0.6";
						container.appendChild(card);
					});
				}
			}
		},

		// 显示装备区
		showEquipmentArea(container, player) {
			const equips = player.getCards("e");
			const hasExtraEquip = player.extraEquip?.length > 0;

			if (!equips.length && !hasExtraEquip) return;

			ui.create.div(".xcaption", "装备区域", container);

			// 显示实际装备
			equips.forEach(card => {
				const isQiexie = card.name.startsWith("qiexie_");
				let str0 = get.translation(isQiexie ? card.name : card);
				let str1 = get.translation(card.name + "_info");

				if (card.cards?.length) str0 += `（${get.translation(card.cards)}）`;
				if (lib.card[card.name]?.cardPrompt) str1 = lib.card[card.name].cardPrompt(card, player);
				if (isQiexie && lib.translate[card.name + "_append"]) {
					str1 += `<br><br><div style="font-size:0.85em;font-family:xinwei;line-height:1.2;">${lib.translate[card.name + "_append"]}</div>`;
				}

				ui.create.div(".xskill.equip-skill", `<div data-color>${str0}</div><div>${str1}</div>`, container);
			});

			// 显示视为装备（extraEquip）
			if (hasExtraEquip) {
				const shownEquips = new Set();
				player.extraEquip.forEach(info => {
					const [skillName, equipName, preserve] = info;
					// 检查是否满足视为装备的条件
					if (preserve && !preserve(player)) return;
					// 避免重复显示同一装备
					if (shownEquips.has(equipName)) return;
					shownEquips.add(equipName);

					const skillTrans = lib.translate[skillName] || skillName;
					const equipTrans = lib.translate[equipName] || equipName;
					const equipInfo = lib.translate[equipName + "_info"] || "";
					ui.create.div(".xskill.equip-skill", `<div data-color>【${skillTrans}】视为装备【${equipTrans}】</div><div>${equipInfo}</div>`, container);
				});
			}
		},

		// 显示判定区
		showJudgeArea(container, player) {
			const judges = player.getCards("j");
			if (!judges.length) return;

			ui.create.div(".xcaption", "判定区域", container);
			judges.forEach(card => {
				let str0 = get.translation(card);
				const str1 = get.translation(card.name + "_info");
				if ((card.cards?.length && !lib.card[card]?.blankCard) || player.isUnderControl(true)) {
					str0 += `（${get.translation(card.cards)}）`;
				}
				ui.create.div(".xskill", `<div data-color>${str0}</div><div>${str1}</div>`, container);
			});
		},

		// 创建技能项
		createSkillItem(container, name, player, dialogContainer) {
			const info = get.info(name);
			let skillName = lib.translate[name];

			// 转换技状态显示
			if (get.is.zhuanhuanji(name, player)) {
				const state = player.storage[name];
				const stateText = state ? "阴" : "阳";
				skillName = `${skillName}[${stateText}]`;
			}

			// 获取技能描述并格式化
			const rawSkillInfo = skillButtonTooltip.getSkillDescription(name, player);
			const skillInfo = skillButtonTooltip.formatSkillDescription(rawSkillInfo);

			// 禁用技能
			if (player.forbiddenSkills[name]) {
				const conflict = player.forbiddenSkills[name].length ? `（与${get.translation(player.forbiddenSkills[name])}冲突）` : "（双将禁用）";
				ui.create.div(".xskill", `<div data-color><span style="opacity:0.5">${skillName}</span></div><div><span style="opacity:0.5">${conflict}${skillInfo}</span></div>`, container);
				return;
			}

			// 隐藏技能
			if (player.hiddenSkills.includes(name)) {
				if (lib.skill[name].preHidden && get.mode() === "guozhan") {
					const el = ui.create.div(".xskill", `<div data-color><span style="opacity:0.5">${skillName}</span></div><div><span style="opacity:0.5">${skillInfo}</span><br><div class="underlinenode on gray" style="position:relative;padding-left:0;padding-top:7px">预亮技能</div></div>`, container);
					const node = el.querySelector(".underlinenode");
					if (_status.prehidden_skills.includes(name)) node.classList.remove("on");
					node.link = name;
					node.listen(ui.click.hiddenskill);
				} else {
					ui.create.div(".xskill", `<div data-color><span style="opacity:0.5">${skillName}</span></div><div><span style="opacity:0.5">${skillInfo}</span></div>`, container);
				}
				return;
			}

			// 觉醒/失效技能
			if (!player.getSkills().includes(name) || player.awakenedSkills.includes(name)) {
				ui.create.div(".xskill", `<div data-color><span style="opacity:0.5">${skillName}</span></div><div><span style="opacity:0.5">${skillInfo}</span></div>`, container);
				return;
			}

			// 自动发动技能
			if (lib.skill[name].frequent || lib.skill[name].subfrequent) {
				const el = ui.create.div(".xskill", `<div data-color>${skillName}</div><div>${skillInfo}<br><div class="underlinenode on gray" style="position:relative;padding-left:0;padding-top:7px">自动发动</div></div>`, container);
				const node = el.querySelector(".underlinenode");

				const shouldDisable = (lib.skill[name].frequent && lib.config.autoskilllist.includes(name)) || lib.skill[name].subfrequent?.some(sub => lib.config.autoskilllist.includes(name + "_" + sub));
				if (shouldDisable) node.classList.remove("on");

				node.link = name;
				node.listen(ui.click.autoskill2);
				return;
			}

			// 可点击技能
			if (lib.skill[name].clickable && player.isIn() && player.isUnderControl(true) && player === game.me) {
				const el = ui.create.div(".xskill", `<div data-color>${skillName}</div><div>${skillInfo}<br><div class="menubutton skillbutton" style="position:relative;margin-top:5px;color:rgba(255,203,0,1);">点击发动</div></div>`, container);
				const btn = el.querySelector(".skillbutton");

				if (!_status.gameStarted || (lib.skill[name].clickableFilter && !lib.skill[name].clickableFilter(player))) {
					btn.classList.add("disabled");
					btn.style.opacity = 0.5;
				} else {
					btn.link = player;
					btn.func = lib.skill[name].clickable;
					btn.classList.add("pointerdiv");
					btn.listen(() => {
						dialogContainer?.hide();
						game.resume2();
					});
					btn.listen(ui.click.skillbutton);
				}
				return;
			}

			// 普通技能
			ui.create.div(".xskill", `<div data-color>${skillName}</div><div>${skillInfo}</div>`, container);
		},
	};
}
