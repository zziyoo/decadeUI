/**
 * @fileoverview OL风格角色弹窗
 * 特点：将灯系统、段位信息、详细资料、衍生技能显示
 */
import { _status } from "noname";
import { createBaseCharacterPlugin } from "./base.js";
import { skillButtonTooltip } from "../../../src/ui/skillButtonTooltip.js";

/**
 * 创建OL风格角色插件
 * @param {object} lib - 游戏库对象
 * @param {object} game - 游戏对象
 * @param {object} ui - UI对象
 * @param {object} get - 获取器对象
 * @param {object} ai - AI对象
 * @param {object} _status - 状态对象
 * @param {object} app - 应用对象
 * @returns {object} OL风格角色插件对象
 */
export function createOnlineCharacterPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseCharacterPlugin(lib, game, ui, get, ai, _status, app);

	const IMAGE_PATH = "extension/十周年UI/ui/assets/character/online/";
	const AUDIO_PATH = "../extension/十周年UI/ui/assets/lbtn/shousha/caidan.mp3";

	/**
	 * 常量配置
	 * @type {object}
	 */
	const CONSTANTS = {
		GUANJIE_TRANSLATION: {
			1: ["骁卒", ["步卒", "伍长", "什长", "队率", "屯长", "部曲"]],
			2: ["校尉", ["县尉", "都尉", "步兵校尉", "典军校尉"]],
			3: ["郎将", ["骑郎将", "车郎将", "羽林中郎将", "虎贲中郎将"]],
			4: ["偏将军", ["折冲将军", "虎威将军", "征虏将军", "荡寇将军"]],
			5: ["将军", ["监军将军", "抚军将军", "典军将军", "领军将军"]],
			6: ["上将军", ["后将军", "左将军", "右将军", "前将军"]],
			7: ["国护军", ["护军", "左护军", "右护军", "中护军"]],
			8: ["国都护", ["都护", "左都护", "右都护", "中都护"]],
			9: ["统帅", ["卫将军"]],
			10: ["统帅", ["车骑将军"]],
			11: ["统帅", ["骠骑将军"]],
			12: ["大将军", ["大将军"]],
			13: ["大司马", ["大司马"]],
		},
		DUANWEI_TRANSLATION: {
			1: ["新兵一", "新兵二", "新兵三"],
			2: ["骁骑一", "骁骑二", "骁骑三"],
			3: ["先锋一", "先锋二", "先锋三", "先锋四"],
			4: ["大将一", "大将二", "大将三", "大将四"],
			5: ["主帅一", "主帅二", "主帅三", "主帅四", "主帅五"],
			6: ["枭雄", "至尊枭雄", "绝世枭雄"],
		},
		JIANGDENG_CLASSES: ["biao", "jiang", "jie", "wenwu", "guo", "jiangjie", "zu", "shan", "cui", "sp", "shen", "mou", "qi", "xian"],
		SUIT_CONFIG: {
			spade: { symbol: "♠", color: "#2e2e2e", image: "spade.png" },
			heart: { symbol: "♥", color: "#e03c3c", image: "heart.png" },
			club: { symbol: "♣", color: "#2e2e2e", image: "club.png" },
			diamond: { symbol: "♦", color: "#e03c3c", image: "diamond.png" },
		},
		EQUIP_TYPE_ICONS: { equip1: "equip1.png", equip2: "equip2.png", equip3: "equip3.png", equip4: "equip4.png", equip5: "equip5.png" },
	};

	return {
		...base,
		skinName: "online",

		/**
		 * 获取势力背景图
		 * @param {string} group - 势力名称
		 * @returns {string} 背景图路径
		 */
		getOlsBackgroundImage(group) {
			if (!this.validGroups.includes(group)) group = "default";
			return `${IMAGE_PATH}ols_${group}.png`;
		},

		/**
		 * 生成随机数据
		 * @param {Player} player - 玩家对象
		 * @returns {object} 包含胜率、官阶等级、人气值等随机数据
		 */
		generateRandomData(player) {
			const guanjieLevel = Math.floor(Math.random() * 13 + 1);
			const winRate = get.SL ? get.SL(player) * 100 + "%" : Math.floor(Math.random() * 45 + 50) + "%";
			return {
				winRate,
				guanjieLevel,
				popularity: Math.floor(Math.random() * 10000 + 1),
				escapeRate: Math.floor(Math.random() * 11),
				rankLevel: Math.floor(Math.random() * 6 + 1),
				level: [Math.floor(Math.random() * 21) + 180, 200, 200].randomGet(),
				vipLevel: Math.min(guanjieLevel + 1, 10),
				mvpCount: Math.floor(Math.random() * 41 + 20),
			};
		},

		/**
		 * 创建边框颜色
		 * @param {HTMLElement} kuang - 边框元素
		 * @param {string} group - 势力名称
		 */
		createBiankuangColor(kuang, group) {
			const tempPlayer = document.createElement("div");
			tempPlayer.classList.add("player");
			const tempCampWrap = document.createElement("div");
			tempCampWrap.classList.add("camp-wrap");
			tempCampWrap.setAttribute("data-camp", group);
			tempPlayer.appendChild(tempCampWrap);
			const tempCampBack = document.createElement("div");
			tempCampBack.classList.add("camp-back");
			tempCampWrap.appendChild(tempCampBack);
			document.body.appendChild(tempPlayer);

			const computedStyle = window.getComputedStyle(tempCampBack);
			let backgroundStyle = computedStyle.background || computedStyle.backgroundColor;
			document.body.removeChild(tempPlayer);

			const match = backgroundStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
			if (match) {
				kuang.style.backgroundImage = `url(${new URL(match[1], window.location.href).href})`;
			} else {
				kuang.style.background = backgroundStyle;
			}
		},

		click: {
			...base.click,

			/**
			 * 玩家信息点击处理
			 * @param {Event} e - 事件对象
			 * @param {HTMLElement} node - 节点元素
			 */
			playerIntro(e, node) {
				e?.preventDefault();
				e?.stopPropagation();
				const plugin = this;
				const player = node || this;

				if (plugin.playerDialog) {
					plugin.playerDialog.remove?.();
					plugin.playerDialog = null;
				}

				const manager = plugin.createCharacterInfoManager();
				plugin.playerDialog = manager;
				manager.show(player, "name1", true);
			},
		},

		/**
		 * 创建角色信息管理器
		 * @returns {object} 角色信息管理器对象
		 */
		createCharacterInfoManager() {
			const plugin = this;

			return {
				/**
				 * 显示角色信息对话框
				 * @param {Player} player - 玩家对象
				 * @param {string} nametype - 名称类型（name1或name2）
				 * @param {boolean} bool - 是否显示
				 */
				show(player, nametype, bool) {
					if (!bool) return;

					game.playAudio(AUDIO_PATH);

					let name = player.name1 || player.name;
					let name2 = player.name2;
					if (player.classList.contains("unseen") && player !== game.me) name = "unknown";
					if (player.classList.contains("unseen2") && player !== game.me) name2 = "unknown";

					const container = ui.create.div(".popup-container.hidden", ui.window, ev => {
						if (ev.target === container) {
							game.playAudio(AUDIO_PATH);
							container.hide();
							plugin.playerDialog = null;
							game.resume2();
						}
					});
					container.style.backgroundColor = "RGBA(0, 0, 0, 0.5)";

					const dialog = ui.create.div(".online-character-dialog.popped", container);
					const blackBg1 = ui.create.div(".blackBg.one", dialog);
					const blackBg2 = ui.create.div(".blackBg.two", dialog);
					ui.create.div(".basicInfo", blackBg1);
					const rightPane = ui.create.div(".right", blackBg2);

					const randomData = plugin.generateRandomData(player);

					const biankuang = ui.create.div(".biankuang2", blackBg1);
					const leftPane = ui.create.div(".left2", biankuang);
					leftPane.setBackground(name, "character");

					const biankuang3 = ui.create.div(".biankuang3", blackBg1);
					plugin.createBiankuangColor(biankuang3, name === "unknown" ? player.group : lib.character[name][1]);

					const biankuang4 = ui.create.div(".biankuang4", blackBg1);
					const groupForBg = name === "unknown" ? player.group : lib.character[name][1];
					biankuang4.setBackgroundImage(plugin.getOlsBackgroundImage(groupForBg));

					ui.create.div(".wanjia", biankuang, `${player.nickname}Lv.${randomData.level}`);
					const shenglv = ui.create.div(".shenglv", biankuang);
					shenglv.innerHTML = randomData.winRate;
					const taolv = ui.create.div(".taolv", biankuang);
					taolv.innerHTML = randomData.escapeRate + "%";
					const renqizz = ui.create.div(".renqi", biankuang);
					renqizz.innerHTML = randomData.popularity;

					const diaozhui = ui.create.div(".diaozhui", biankuang4);
					diaozhui.setBackgroundImage(`${IMAGE_PATH}diaozhui.png`);
					diaozhui.addEventListener("click", () => {
						game.playAudio(AUDIO_PATH);
						container.hide();
						plugin.playerDialog = null;
						game.resume2();
					});

					let popuperContainer = null;
					const xinxi = ui.create.div(".xinxi", blackBg1);
					xinxi.onclick = () => {
						game.playAudio(AUDIO_PATH);
						if (!popuperContainer) {
							popuperContainer = plugin.createDetailPopup(player, randomData);
						}
						popuperContainer.style.display = "block";
					};

					const nametext = name === "unknown" ? "未知" : get.slimNameHorizontal(name);
					const namestyle = ui.create.div(".name", nametext, dialog);
					namestyle.dataset.camp = player.group;

					if (name && name2) {
						namestyle.style.fontSize = "20px";
						namestyle.style.letterSpacing = "1px";
					}

					const peijian = ui.create.div(".peijian", biankuang4);
					peijian.setBackgroundImage(`${IMAGE_PATH}p1.png`);

					let sjright = null;
					let sjleft = null;
					if (name2) {
						sjright = ui.create.div(".sjright", leftPane);
						sjright.onclick = ev => {
							ev.stopPropagation();
							sjright.style.display = "none";
							namestyle.innerHTML = name2 === "unknown" ? "未知" : get.slimNameHorizontal(name2);
							plugin.createRightPanel(dialog, rightPane, player, "name2");
							leftPane.setBackground(name2, "character");
							plugin.createBiankuangColor(biankuang3, name2 === "unknown" ? player.group : lib.character[name2][1]);
							biankuang4.setBackgroundImage(plugin.getOlsBackgroundImage(name2 === "unknown" ? player.group : lib.character[name2][1]));

							if (!sjleft) {
								sjleft = ui.create.div(".sjleft", leftPane);
								sjleft.onclick = ev2 => {
									ev2.stopPropagation();
									sjleft.style.display = "none";
									sjright.style.display = "block";
									namestyle.innerHTML = nametext;
									plugin.createRightPanel(dialog, rightPane, player, "name1");
									leftPane.setBackground(name, "character");
									plugin.createBiankuangColor(biankuang3, name === "unknown" ? player.group : lib.character[name][1]);
									biankuang4.setBackgroundImage(plugin.getOlsBackgroundImage(groupForBg));
								};
							} else {
								sjleft.style.display = "block";
							}
						};
					}

					plugin.createRightPanel(dialog, rightPane, player, nametype);

					container.classList.remove("hidden");
					game.pause2();
				},
			};
		},

		/**
		 * 创建右侧面板
		 * @param {HTMLElement} dialog - 对话框元素
		 * @param {HTMLElement} rightPane - 右侧面板元素
		 * @param {Player} player - 玩家对象
		 * @param {string} nametype - 名称类型（name1或name2）
		 */
		createRightPanel(dialog, rightPane, player, nametype) {
			dialog.classList.add("single");
			rightPane.innerHTML = "<div></div>";
			lib.setScroll(rightPane.firstChild);

			let skills;
			if (player.name2 && nametype) {
				skills = nametype === "name1" ? lib.character[player.name1][3].slice(0) : lib.character[player.name2][3].slice(0);
			} else {
				skills = player.getSkills(null, false, false).slice(0);
			}
			skills = skills.filter(s => lib.skill[s] && s !== "jiu" && !lib.skill[s].nopop && !lib.skill[s].equipSkill && lib.translate[s + "_info"]);
			if (player === game.me && player.hiddenSkills?.length && !nametype) {
				skills.addArray(player.hiddenSkills);
			}

			if (skills.length) {
				ui.create.div(".xcaption", "武将技能", rightPane.firstChild);
				const hasSkills = [];
				skills.forEach(name => {
					if (hasSkills.includes(name)) return;
					if (player.name2 && nametype) {
						if (nametype === "name1" && lib.character[player.name2][3].includes(name)) return;
						if (nametype === "name2" && lib.character[player.name1][3].includes(name)) return;
					}
					this.createOLSkillItem(rightPane.firstChild, name, player, hasSkills);
				});
			}

			this.showHandCards(rightPane.firstChild, player);
			this.createOLEquipmentSection(rightPane.firstChild, player);
			this.showJudgeArea(rightPane.firstChild, player);
		},

		/**
		 * 创建OL风格技能项
		 * @param {HTMLElement} container - 容器元素
		 * @param {string} name - 技能名称
		 * @param {Player} player - 玩家对象
		 * @param {string[]} hasSkills - 已显示的技能列表
		 */
		createOLSkillItem(container, name, player, hasSkills) {
			const info = get.info(name);
			const getTypeText = () => {
				if (info.juexingji || info.limited) {
					return player.awakenedSkills.includes(name) ? "已发动" : "未发动";
				}
				return info.enable ? "主动" : "被动";
			};
			const typeText = getTypeText();
			const typeTag = `<span class="skill-type-tag">(${typeText})</span>`;

			const skillName = lib.translate[name];

			const rawSkillInfo = skillButtonTooltip.getSkillDescription(name, player);
			const skillInfo = skillButtonTooltip.formatSkillDescription(rawSkillInfo);

			ui.create.div(".xskill", `<div data-color>${skillName}</div>${typeTag}<div>${skillInfo}</div>`, container);

			if (info.derivation) {
				const derivations = Array.isArray(info.derivation) ? info.derivation : [info.derivation];
				derivations.forEach(skill => {
					hasSkills.push(skill);
					const ysInfo = get.info(skill);
					const ysName = get.skillTranslation(skill);
					const ysDesc = get.translation(skill + "_info");
					let has;
					if (ysInfo.juexingji || ysInfo.limited) {
						has = !player.hasSkill(skill) ? (player.awakenedSkills.includes(skill) ? "已发动" : "未生效") : "未发动";
					} else {
						has = player.hasSkill(skill) ? "已生效" : "未生效";
					}
					const color = has === "未生效" ? 'style="color:#978a81;"' : "";
					ui.create.div(
						".xskill",
						`<span class="yanshengji" ${color}>${ysName}(${has})</span><span class="yanshengjiinfo">${ysDesc}</span>`,
						container
					);
				});
			}
		},

		/**
		 * 创建OL风格装备区
		 * @param {HTMLElement} container - 容器元素
		 * @param {Player} player - 玩家对象
		 */
		createOLEquipmentSection(container, player) {
			const equips = player.getCards("e");
			if (equips.length) {
				ui.create.div(".xcaption", "装备区", container);
				equips.forEach(card => {
					const suitConfig = CONSTANTS.SUIT_CONFIG[card.suit] || { symbol: "", color: "#FFFFFF" };
					const typeIcon = CONSTANTS.EQUIP_TYPE_ICONS[get.subtype(card)] || "default.png";
					const dianshu = get.strNumber(card.number);

					const firstLine =
						`<div style="display:flex;align-items:center;gap:8px;position:relative;">` +
						`<span style="color:#f7d229;font-weight:bold;">${get.translation(card.name).replace(/[【】]/g, "")}</span>` +
						`<img src="${IMAGE_PATH}${typeIcon}" style="width:14px;height:20px;vertical-align:middle">` +
						`<div style="margin-left:0;display:flex;align-items:center;gap:2px;">` +
						(suitConfig.image
							? `<img src="${IMAGE_PATH}${suitConfig.image}" style="width:16px;height:16px;margin-left:-2px;margin-top:3px;filter:drop-shadow(0 0 1px white);">`
							: `<span style="color:${suitConfig.color};margin-left:-2px;margin-top:3px;text-shadow:0 0 1px white;position:relative;">${suitConfig.symbol}</span>`) +
						`<span style="margin-left:3px;margin-top:3px;font-size:18px;color:${suitConfig.color === "#e03c3c" ? suitConfig.color : "#efdbb6"};font-family:shousha;">${dianshu || ""}</span>` +
						`</div></div>`;

					let desc = "";
					if (get.subtypes(card).includes("equip1")) {
						let num = 1;
						const cardInfo = get.info(card);
						if (typeof cardInfo?.distance?.attackFrom === "number") {
							num -= cardInfo.distance.attackFrom;
						}
						desc += `攻击范围 :   ${num}<br>`;
					}
					desc += get.translation(card.name + "_info").replace(/[【】]/g, "");

					const special = card.cards?.find(item => item.name === card.name && lib.card[item.name]?.cardPrompt);
					if (special) {
						desc = lib.card[special.name].cardPrompt(special, player);
					}

					ui.create.div(".xskillx", `${firstLine}<div style="margin-top:4px;white-space:pre-wrap;">${desc}</div>`, container);
				});
			}

			if (player.extraEquip?.length) {
				const shownEquips = new Set();
				player.extraEquip.forEach(info => {
					const [skillName, equipName, preserve] = info;
					if (preserve && !preserve(player)) return;
					if (shownEquips.has(equipName)) return;
					shownEquips.add(equipName);

					const skillTrans = lib.translate[skillName] || skillName;
					const equipTrans = lib.translate[equipName] || equipName;
					const equipInfo = lib.translate[equipName + "_info"] || "";
					ui.create.div(
						".xskillx",
						`<div style="color:#f7d229;font-weight:bold;">【${skillTrans}】视为装备【${equipTrans}】</div><div style="margin-top:4px;white-space:pre-wrap;">${equipInfo}</div>`,
						container
					);
				});
			}
		},

		/**
		 * 创建详细资料弹窗
		 * @param {Player} player - 玩家对象
		 * @param {object} randomData - 随机数据对象
		 * @returns {HTMLElement} 弹窗元素
		 */
		createDetailPopup(player, randomData) {
			const popup = ui.create.div(".popup-container.online-detail-popup", { background: "rgb(0,0,0,0.8)" }, ui.window);
			popup.style.display = "none";

			const guanbi = ui.create.div(".guanbi", popup);
			guanbi.addEventListener("click", () => {
				popup.style.display = "none";
				game.playAudio(AUDIO_PATH);
			});

			const bigdialog = ui.create.div(".bigdialog", popup);

			const minixingxiang = ui.create.div(".minixingxiang", bigdialog);
			ui.create.div(".nameX", player.nickname, minixingxiang);
			ui.create.div(".dengjiX", randomData.level + "级", minixingxiang);
			ui.create.div(".huiyuanX", "会员" + randomData.vipLevel, minixingxiang);
			minixingxiang.setBackgroundImage(`${IMAGE_PATH}../xinsha/xingxiang${Math.floor(Math.random() * 6)}.png`);

			const guanjie = ui.create.div(".guanjie", bigdialog);
			guanjie.setBackgroundImage(`${IMAGE_PATH}sactx_${randomData.guanjieLevel}.png`);
			const guanjieInfo = CONSTANTS.GUANJIE_TRANSLATION[randomData.guanjieLevel];
			ui.create.div(".guanjiewenzi", `<center>${guanjieInfo[0]}<br><center>${guanjieInfo[1].randomGet()}`, guanjie);
			ui.create.div(".xinyufen", "100", bigdialog);
			ui.create.div(".renqizhi", `${randomData.popularity}`, bigdialog);

			const jddialog = ui.create.div(".jddialog", bigdialog);
			const jiangdengsuiji = CONSTANTS.JIANGDENG_CLASSES.randomGets(
				randomData.guanjieLevel > 8 ? randomData.guanjieLevel + 1 : [randomData.guanjieLevel - 1, randomData.guanjieLevel].randomGet()
			);
			let jiangdengLiang = [];
			let jiangdengLiangguanjie = randomData.guanjieLevel > 4 ? ["biao", "sp", "guo", "jiang", "jie"] : ["biao", "guo", "jiang"];
			if (randomData.guanjieLevel > 6) jiangdengLiangguanjie.push("jiangjie");

			CONSTANTS.JIANGDENG_CLASSES.forEach(name => {
				if (jiangdengLiangguanjie.includes(name) || jiangdengsuiji.includes(name)) {
					jiangdengLiang.push(name);
				}
			});

			CONSTANTS.JIANGDENG_CLASSES.forEach(name => {
				const jdditu = ui.create.div(".jdditu", jddialog);
				const isLit = jiangdengLiang.includes(name);
				const jdtubiao = ui.create.div(isLit ? ".jdtubiao" : ".jdtubiaoan", jdditu);
				jdtubiao.setBackgroundImage(`${IMAGE_PATH}${name}.png`);
				if (isLit) ui.create.div(`.jd${name}donghua`, jdtubiao);
			});

			const paiwei = ui.create.div(".paiweiditu", bigdialog);
			const duanwei = ui.create.div(".duanwei", paiwei);
			const duanweiInfo = CONSTANTS.DUANWEI_TRANSLATION[randomData.rankLevel];
			ui.create.div(".duanweishuzi", `<center>${duanweiInfo.randomGet()}`, paiwei);
			duanwei.setBackgroundImage(`${IMAGE_PATH}pwtx_${randomData.rankLevel}.png`);
			ui.create.div(".shenglvx", `百场胜率 ${randomData.winRate}<br>MVP        ${randomData.mvpCount}次`, paiwei);
			ui.create.div(".paiweiType", "排位赛", paiwei);
			ui.create.div(".typeleft", paiwei);
			ui.create.div(".typeright", paiwei);

			const shanchangdialog = ui.create.div(".shanchangdialog", bigdialog);
			const shanchang = Object.keys(lib.character)
				.filter(key => !lib.filter.characterDisabled(key))
				.randomGets(5);

			shanchang.forEach(charName => {
				const group = lib.character[charName][1];
				const charPic = ui.create.div(".shanchang", shanchangdialog);
				charPic.setBackground(charName, "character");

				const huanfu = ui.create.div(".huanfu", charPic);
				huanfu.onclick = () => {
					window.zyile_charactercard
						? window.zyile_charactercard(charName, charPic, false)
						: ui.click.charactercard(charName, charPic, lib.config.mode === "guozhan" ? "guozhan" : true);
				};

				const kuang = ui.create.div(".kuang", charPic);
				ui.create.div(".xing", kuang);
				ui.create.div(".charName", get.slimNameHorizontal(charName), kuang);
				const shili = ui.create.div(".shili", kuang);
				shili.setBackgroundImage(this.getOlsBackgroundImage(group));
				this.createBiankuangColor(kuang, group);
			});

			return popup;
		},
	};
}
