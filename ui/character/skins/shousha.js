/**
 * 手杀风格角色弹窗
 * 功能：官阶系统、详细资料、胜率显示、查看名片
 */
import { _status } from "noname";
import { createBaseCharacterPlugin } from "./base.js";
import { applyOutcropAvatar } from "../../../src/ui/outcropAvatar.js";
import { skillButtonTooltip } from "../../../src/ui/skillButtonTooltip.js";
import { SHOUSHA_CONSTANTS, SHOUSHA_LAYOUT } from "../../constants.js";

/**
 * 创建手杀风格角色插件
 * @param {Object} lib - 游戏库对象
 * @param {Object} game - 游戏对象
 * @param {Object} ui - UI对象
 * @param {Object} get - 获取函数集合
 * @param {Object} ai - AI对象
 * @param {Object} _status - 状态对象
 * @param {Object} app - 应用对象
 * @returns {Object} 插件配置对象
 */
export function createShoushaCharacterPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseCharacterPlugin(lib, game, ui, get, ai, _status, app);

	return {
		...base,
		skinName: "shousha",

		/**
		 * 获取势力背景图片路径
		 * @param {string} group - 势力名称
		 * @returns {string} 图片路径
		 */
		getGroupBackgroundImage(group) {
			if (!group || group === "unknown") {
				return `${SHOUSHA_CONSTANTS.IMAGE_PATH}character/name2_unknown.png`;
			}
			if (!this.validGroups.includes(group)) group = "default";
			return `${SHOUSHA_CONSTANTS.IMAGE_PATH}character/name2_${group}.png`;
		},

		/**
		 * 创建露头面板
		 * @param {HTMLElement} parent - 父元素
		 * @returns {HTMLElement} 创建的面板元素
		 */
		createLeftPane(parent) {
			const skin = lib.config["extension_十周年UI_outcropSkin"];
			const classMap = { shizhounian: ".left3", shousha: ".left2" };
			return ui.create.div(classMap[skin] || ".left", parent);
		},

		click: {
			...base.click,

			/**
			 * 玩家信息弹窗点击处理
			 * @param {Event} e - 事件对象
			 * @param {HTMLElement} node - 节点元素
			 */
			playerIntro(e, node) {
				e?.preventDefault();
				e?.stopPropagation();
				const plugin = this;
				const player = node || this;

				if (plugin.playerDialog) {
					plugin.playerDialog.delete();
					plugin.playerDialog = null;
				}

				const container = plugin._createDialogContainer();
				plugin.playerDialog = container;
				container.show(player, plugin);
			},
		},

		/**
		 * 创建对话框容器
		 * @private
		 * @returns {HTMLElement} 容器元素
		 */
		_createDialogContainer() {
			const container = ui.create.div(".popup-container.hidden", ui.window);

			container.delete = function () {
				this.remove();
				game.resume2();
			};

			container.addEventListener("click", ev => {
				if (ev.target === container) {
					container.delete();
				}
			});

			/**
			 * 显示对话框
			 * @param {Object} player - 玩家对象
			 * @param {Object} plugin - 插件对象
			 */
			container.show = function (player, plugin) {
				const randomData = plugin.utils.generateRandomData(player);
				const dialog = ui.create.div(".shousha-character-dialog.popped", container);
				const blackBg1 = ui.create.div(".blackBg.one", dialog);
				const blackBg2 = ui.create.div(".blackBg.two", dialog);
				const basicInfo = ui.create.div(".basicInfo", blackBg1);

				plugin._buildMainDialog(blackBg1, blackBg2, basicInfo, player, randomData, container);

				dialog.classList.add("single");
				container.classList.remove("hidden");
				game.pause2();
			};

			return container;
		},

		/**
		 * 构建主对话框内容
		 * @private
		 * @param {HTMLElement} blackBg1 - 背景1
		 * @param {HTMLElement} blackBg2 - 背景2
		 * @param {HTMLElement} basicInfo - 基础信息容器
		 * @param {Object} player - 玩家对象
		 * @param {Object} randomData - 随机数据
		 * @param {HTMLElement} container - 容器元素
		 */
		_buildMainDialog(blackBg1, blackBg2, basicInfo, player, randomData, container) {
			this.createOfficialInfo(blackBg1, player, randomData);

			const fightbg = ui.create.div(".fight-bg", blackBg1);
			const rightPane = ui.create.div(".right", blackBg2);
			const mingcheng = ui.create.div(".mingcheng", basicInfo);
			const dengji = ui.create.div(".dengji", basicInfo);

			this.createRateDisplay(fightbg, player, randomData);
			this._createViewCardButton(blackBg1, player, randomData, container);
			this.createCharacterCards(blackBg2, rightPane, player);

			const nickname = player.nickname || (player === game.me ? lib.config.connect_nickname : get.translation(player.name));
			mingcheng.textContent = nickname;
			dengji.textContent = `Lv：${player === game.me ? 220 : randomData.level}`;

			this.createSkillList(rightPane, player, container);
		},

		/**
		 * 创建查看名片按钮
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 * @param {Object} randomData - 随机数据
		 * @param {HTMLElement} mainContainer - 主容器
		 */
		_createViewCardButton(parent, player, randomData, mainContainer) {
			const viewCard = ui.create.div(".viewBusinessCard", "查看名片", parent);
			viewCard.onclick = () => {
				mainContainer.delete();
				const popup = this.createDetailPopup(player, randomData);
				document.body.appendChild(popup);
				popup.style.display = "block";
			};
		},

		/**
		 * 创建官阶信息
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 * @param {Object} randomData - 随机数据
		 */
		createOfficialInfo(parent, player, randomData) {
			const officalbg = ui.create.div(".offical-bg", parent);
			const officalIcon = ui.create.div(".offical-icon", officalbg);

			const isMe = player === game.me;
			const level = isMe ? 11 : randomData.guanjieLevel;
			const text = isMe ? "大元帅" : this.guanjieTranslation[level][0];

			officalIcon.setBackgroundImage(`${SHOUSHA_CONSTANTS.IMAGE_PATH_PREFIX}offical_icon_${level}.png`);
			ui.create.div(".offical-text", `<center>${text}`, officalbg);
		},

		/**
		 * 创建胜率显示
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 * @param {Object} randomData - 随机数据
		 */
		createRateDisplay(parent, player, randomData) {
			const isMe = player === game.me;
			const winRate = isMe ? this.utils.calculateWinRate().toFixed(2) : this.utils.getRandomPercentage();
			const runRate = isMe ? "0.00" : this.utils.getRandomPercentage();
			const imgPath = `${SHOUSHA_CONSTANTS.IMAGE_PATH}num/`;

			const shenglv = ui.create.div(".shenglv", parent);
			const taolv = ui.create.div(".shenglv", parent);

			shenglv.innerHTML = `<span>胜&nbsp;率：</span><div style="margin-top:-30px;margin-left:60px;display:flex;align-items:flex-start;">${this.utils.numberToImages(winRate, imgPath)}</div>`;
			taolv.innerHTML = `<span>逃&nbsp;率：</span><div style="margin-top:-30px;margin-left:60px;display:flex;align-items:flex-start;">${this.utils.numberToImages(runRate, imgPath)}</div>`;
		},

		/**
		 * 创建武将卡片展示
		 * @param {HTMLElement} blackBg2 - 背景容器2
		 * @param {HTMLElement} rightPane - 右侧面板
		 * @param {Object} player - 玩家对象
		 */
		createCharacterCards(blackBg2, rightPane, player) {
			if (!player.name2) {
				this._createSingleCharacterCard(blackBg2, player);
			} else {
				this._createDualCharacterCards(blackBg2, rightPane, player);
			}
		},

		/**
		 * 创建单武将卡片
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 */
		_createSingleCharacterCard(parent, player) {
			const isUnseen = player.classList.contains("unseen") && player !== game.me;
			let name = player.name1 || player.name;
			if (isUnseen) name = "unknown";

			const { biankuang, leftPane } = this._createCharacterPane(name, player.group, isUnseen, parent, player);

			if (!isUnseen) {
				const playerSkin = player.style.backgroundImage || player.childNodes[0]?.style.backgroundImage;
				if (playerSkin) {
					leftPane.style.backgroundImage = playerSkin;
				} else {
					leftPane.setBackground(name, "character");
				}
			}

			this.utils.createCharButton(name, leftPane);

			const nameDiv = ui.create.div(".biankuangname", biankuang);
			nameDiv.innerHTML = get.slimName(name);

			if (!isUnseen) {
				const stars = ui.create.div(".xing", biankuang);
				this.utils.createStars(stars, game.getRarity(player.name));
			}
		},

		/**
		 * 创建双武将卡片
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 * @param {HTMLElement} rightPane - 右侧面板
		 * @param {Object} player - 玩家对象
		 */
		_createDualCharacterCards(parent, rightPane, player) {
			rightPane.style.left = SHOUSHA_LAYOUT.DUAL_CHARACTER_LEFT;
			rightPane.style.width = SHOUSHA_LAYOUT.DUAL_CHARACTER_WIDTH;

			let name1 = player.name1 || player.name;
			let name2 = player.name2;
			const group1 = lib.character[name1]?.[1];
			const group2 = lib.character[name2]?.[1];

			const isUnseen1 = player.classList.contains("unseen") && player !== game.me;
			const isUnseen2 = player.classList.contains("unseen2") && player !== game.me;

			if (isUnseen1) name1 = "unknown";
			if (isUnseen2) name2 = "unknown";

			const { biankuang: biankuang1, leftPane: leftPane1 } = this._createCharacterPane(name1, group1, isUnseen1, parent, player, ".biankuang");
			const { biankuang: biankuang2, leftPane: leftPane2 } = this._createCharacterPane(name2, group2, isUnseen2, parent, player, ".biankuang2");

			if (!isUnseen1) {
				const playerSkin1 = player.node.avatar.style.backgroundImage || player.childNodes[0]?.style.backgroundImage;
				leftPane1.style.backgroundImage = playerSkin1;
			}
			if (!isUnseen2) {
				const playerSkin2 = player.childNodes[1]?.style.backgroundImage;
				if (playerSkin2) {
					leftPane2.style.backgroundImage = playerSkin2;
				} else {
					leftPane2.setBackground(name2, "character");
				}
			}

			this.utils.createCharButton(name1, leftPane1);
			this.utils.createCharButton(name2, leftPane2);

			const nameDiv1 = ui.create.div(".biankuangname", biankuang1);
			const nameDiv2 = ui.create.div(".biankuangname2", biankuang2);
			nameDiv1.innerHTML = get.slimName(name1);
			nameDiv2.innerHTML = get.slimName(name2);

			if (!isUnseen1) {
				const stars1 = ui.create.div(".xing", biankuang1);
				this.utils.createStars(stars1, game.getRarity(player.name));
			}
			if (!isUnseen2) {
				const stars2 = ui.create.div(".xing", biankuang2);
				this.utils.createStars(stars2, game.getRarity(player.name2));
			}
		},

		/**
		 * 创建武将面板
		 * @private
		 * @param {string} name - 武将名称
		 * @param {string} group - 势力
		 * @param {boolean} isUnseen - 是否未知
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 * @param {string} className - 类名
		 * @returns {{biankuang: HTMLElement, leftPane: HTMLElement}} 创建的元素
		 */
		_createCharacterPane(name, group, isUnseen, parent, player, className = ".biankuang") {
			const biankuang = ui.create.div(className, parent);
			const leftPane = this.createLeftPane(biankuang);

			if (isUnseen) {
				biankuang.setBackgroundImage(this.getGroupBackgroundImage("unknown"));
				leftPane.setBackgroundImage(`${SHOUSHA_CONSTANTS.IMAGE_PATH}hidden_image.jpg`);
			} else {
				biankuang.setBackgroundImage(this.getGroupBackgroundImage(group));
			}

			return { biankuang, leftPane };
		},

		/**
		 * 创建详细资料弹窗
		 * @param {Object} player - 玩家对象
		 * @param {Object} randomData - 随机数据
		 * @returns {HTMLElement} 弹窗元素
		 */
		createDetailPopup(player, randomData) {
			const popup = ui.create.div(".popup-container", { background: "rgb(0,0,0,0.8)" }, ui.window);

			popup.delete = function () {
				this.style.display = "none";
				game.playAudio(`${SHOUSHA_CONSTANTS.AUDIO_PATH}caidan.mp3`);
				setTimeout(() => this.remove(), 300);
			};

			popup.addEventListener("click", ev => {
				if (ev.target === popup) {
					popup.delete();
				}
			});

			const guanbi = ui.create.div(".guanbi", popup);
			guanbi.addEventListener("click", () => popup.delete());

			const bigdialog = ui.create.div(".bigdialog", popup);

			this.createAvatarInfo(bigdialog, player);
			this.createRankInfo(bigdialog, player, randomData);
			this.createDuanweiInfo(bigdialog, player, randomData);
			this.createSkillInfo(bigdialog, player);

			return popup;
		},

		/**
		 * 创建头像信息
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 */
		createAvatarInfo(parent, player) {
			const minixingxiang = ui.create.div(".minixingxiang", parent);
			const minixingxiangdi = ui.create.div(".minixingxiangdi", parent);
			const xingbie = ui.create.div(".xingbie", minixingxiangdi);
			const xingbietu = ["pubui_icon_male", "pubui_icon_female"];
			xingbie.setBackgroundImage(`${SHOUSHA_CONSTANTS.IMAGE_PATH}${xingbietu.randomGet()}.png`);

			const nickname = player === game.me ? lib.config.connect_nickname : get.translation(SHOUSHA_CONSTANTS.NICKNAMES.randomGet(1));
			const title = get.translation(SHOUSHA_CONSTANTS.TITLES.randomGet(1));

			ui.create.div(".nameX", minixingxiang).textContent = nickname;
			ui.create.div(".wanjiachenghao", parent).textContent = title;

			minixingxiang.setBackgroundImage(`${SHOUSHA_CONSTANTS.IMAGE_PATH}xingxiang${Math.floor(Math.random() * 6)}.png`);
		},

		/**
		 * 创建官阶信息
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 * @param {Object} randomData - 随机数据
		 */
		createRankInfo(parent, player, randomData) {
			const guanjie = ui.create.div(".guanjie", parent);
			const guanjieInfo = ui.create.div(".guanjieInfo", parent);
			const level = player === game.me ? 11 : randomData.guanjieLevel;
			guanjie.setBackgroundImage(`${SHOUSHA_CONSTANTS.IMAGE_PATH_PREFIX}offical_icon_${level}.png`);
			guanjieInfo.setBackgroundImage(`${SHOUSHA_CONSTANTS.IMAGE_PATH_PREFIX}offical_label_${level}.png`);
		},

		/**
		 * 创建段位信息
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 * @param {Object} randomData - 随机数据
		 */
		createDuanweiInfo(parent, player, randomData) {
			const paiwei = ui.create.div(".paiweiditu", parent);
			const duanwei = ui.create.div(".duanwei", paiwei);
			const isMe = player === game.me;

			if (isMe) {
				ui.create.div(".duanweishuzi", "<center>绝世传说", paiwei);
				duanwei.setBackgroundImage(`${SHOUSHA_CONSTANTS.IMAGE_PATH_PREFIX}pwtx_6.png`);
			} else {
				const duanweiInfo = this.duanweiTranslation[randomData.rankLevel];
				ui.create.div(".duanweishuzi", `<center>${duanweiInfo.randomGet()}`, paiwei);
				duanwei.setBackgroundImage(`${SHOUSHA_CONSTANTS.IMAGE_PATH_PREFIX}pwtx_${randomData.rankLevel}.png`);
			}

			ui.create.div(".xinyufen", `鲜花<br>${randomData.lucky}`, paiwei);
			ui.create.div(".renqizhi", `鸡蛋<br>${randomData.popularity}`, paiwei);
			ui.create.div(".paiweiType", "本赛季", paiwei);
			ui.create.div(".typeleft", paiwei);

			const typeright = ui.create.div(".typeright", paiwei);
			const width = isMe ? 0 : (randomData.gailevel / 100) * SHOUSHA_LAYOUT.PROGRESS_BAR_MAX_WIDTH;
			typeright.style.width = `${width}px`;

			const percentage = isMe ? "0%" : `${randomData.gailevel}%`;
			const level = isMe ? "220级" : `${randomData.level}级`;
			ui.create.div(".dengjiX", percentage, paiwei);
			ui.create.div(".huiyuanX", level, paiwei);

			const vipType = SHOUSHA_CONSTANTS.VIP_TYPES.randomGet(1);
			ui.create.div(".gonghui", paiwei).textContent = `(${vipType})`;
		},

		/**
		 * 创建技能列表
		 * @param {HTMLElement} rightPane - 右侧面板
		 * @param {Object} player - 玩家对象
		 * @param {HTMLElement} container - 容器元素
		 */
		createSkillList(rightPane, player, container) {
			rightPane.innerHTML = "<div></div>";
			lib.setScroll(rightPane.firstChild);

			const skills = this._getFilteredSkills(player);
			const allShown = player.isUnderControl() || (!game.observe && game.me?.hasSkillTag("viewHandcard", null, player, true));
			const shownHs = player.getShownCards();

			this._showHandCards(rightPane.firstChild, player, shownHs, allShown);
			this._showSkills(rightPane.firstChild, player, skills, container);
			this._showEquipment(rightPane.firstChild, player);
			this._showJudgeCards(rightPane.firstChild, player);
		},

		/**
		 * 获取过滤后的技能列表
		 * @private
		 * @param {Object} player - 玩家对象
		 * @returns {Array} 技能列表
		 */
		_getFilteredSkills(player) {
			let skills = player.getSkills(null, false, false).slice(0);
			skills = skills.filter(
				skill =>
					lib.skill[skill] && skill !== "jiu" && !lib.skill[skill].nopop && !lib.skill[skill].equipSkill && lib.translate[skill + "_info"]
			);
			if (player === game.me && player.hiddenSkills?.length) {
				skills.addArray(player.hiddenSkills);
			}
			return skills;
		},

		/**
		 * 显示手牌
		 * @private
		 * @param {HTMLElement} container - 容器元素
		 * @param {Object} player - 玩家对象
		 * @param {Array} shownHs - 明置手牌
		 * @param {boolean} allShown - 是否全部可见
		 */
		_showHandCards(container, player, shownHs, allShown) {
			if (shownHs.length) {
				const caption = player.hasCard(card => !shownHs.includes(card), "h") ? "明置的手牌" : "手牌区域";
				ui.create.div(".xcaption", caption, container);
				this._appendCards(container, shownHs);

				if (allShown) {
					const hs = player.getCards("h");
					hs.removeArray(shownHs);
					if (hs.length) {
						ui.create.div(".xcaption", "其他手牌", container);
						this._appendCards(container, hs);
					}
				}
			} else if (allShown) {
				const hs = player.getCards("h");
				if (hs.length) {
					ui.create.div(".xcaption", "手牌区域", container);
					this._appendCards(container, hs);
				}
			}
		},

		/**
		 * 添加卡牌到容器
		 * @private
		 * @param {HTMLElement} container - 容器元素
		 * @param {Array} cards - 卡牌数组
		 */
		_appendCards(container, cards) {
			cards.forEach(item => {
				const card = game.createCard(get.name(item, false), get.suit(item, false), get.number(item, false), get.nature(item, false));
				card.style.zoom = SHOUSHA_LAYOUT.CARD_ZOOM;
				container.appendChild(card);
			});
		},

		/**
		 * 显示技能
		 * @private
		 * @param {HTMLElement} container - 容器元素
		 * @param {Object} player - 玩家对象
		 * @param {Array} skills - 技能列表
		 * @param {HTMLElement} dialogContainer - 对话框容器
		 */
		_showSkills(container, player, skills, dialogContainer) {
			if (!skills.length) return;

			const modeCaptionMap = {
				doudizhu: "武将技能·斗地主",
				identity: "武将技能·身份",
				versus: "武将技能·团战",
				single: "武将技能·1v1",
				guozhan: "武将技能·国战",
			};
			const captionText = modeCaptionMap[lib.config.mode] || "武将技能";
			ui.create.div(".xcaption", captionText, container);

			skills.forEach(name => {
				this._createSkillItem(container, name, player, dialogContainer);
			});
		},

		/**
		 * 创建技能项
		 * @private
		 * @param {HTMLElement} container - 容器元素
		 * @param {string} name - 技能名称
		 * @param {Object} player - 玩家对象
		 * @param {HTMLElement} dialogContainer - 对话框容器
		 */
		_createSkillItem(container, name, player, dialogContainer) {
			const skillEnabled = get.info(name)?.enable;
			const skillIcon = skillEnabled ? "sp_zhu" : "sp_bei";
			const baseIcon = `<img src="${SHOUSHA_CONSTANTS.IMAGE_PATH}${skillIcon}.png" style="width:25px;height:25px;margin-bottom:-7px;">`;
			const transparentIcon = `<img src="${SHOUSHA_CONSTANTS.IMAGE_PATH}${skillIcon}.png" style="width:25px;height:25px;margin-bottom:-7px;opacity:0.5;">`;
			const skillName = `【${lib.translate[name]}】`;

			const rawSkillInfo = skillButtonTooltip.getSkillDescription(name, player);
			const skillInfo = skillButtonTooltip.formatSkillDescription(rawSkillInfo);

			if (player.forbiddenSkills[name]) {
				this._createForbiddenSkill(container, skillName, skillInfo, player.forbiddenSkills[name]);
			} else if (player.hiddenSkills.includes(name)) {
				this._createHiddenSkill(container, name, skillName, skillInfo, transparentIcon, player);
			} else if (!player.getSkills().includes(name) || player.awakenedSkills.includes(name)) {
				this._createInactiveSkill(container, skillName, skillInfo, transparentIcon);
			} else if (lib.skill[name].frequent || lib.skill[name].subfrequent) {
				this._createFrequentSkill(container, name, skillName, skillInfo, baseIcon);
			} else if (lib.skill[name].clickable && player.isIn() && player.isUnderControl(true) && player === game.me) {
				this._createClickableSkill(container, name, skillName, skillInfo, baseIcon, player, dialogContainer);
			} else {
				ui.create.div(".xskill", baseIcon + `<div data-color>${skillName}</div><div>${skillInfo}</div>`, container);
			}
		},

		/**
		 * 创建禁用技能项
		 * @private
		 */
		_createForbiddenSkill(container, skillName, skillInfo, conflicts) {
			const conflict = conflicts.length ? `（与${get.translation(conflicts)}冲突）` : "（双将禁用）";
			ui.create.div(
				".xskill",
				`<div data-color><span style="opacity:0.5">${skillName}</span></div><div><span style="opacity:0.5">${conflict}${skillInfo}</span></div>`,
				container
			);
		},

		/**
		 * 创建隐藏技能项
		 * @private
		 */
		_createHiddenSkill(container, name, skillName, skillInfo, icon, player) {
			if (lib.skill[name].preHidden && get.mode() === "guozhan") {
				const el = ui.create.div(
					".xskill",
					icon +
						`<div data-color><span style="opacity:0.5">${skillName}</span></div><div><span style="opacity:0.5">${skillInfo}</span><br><div class="underlinenode on gray" style="position:relative;padding-left:0;padding-top:7px">预亮技能</div></div>`,
					container
				);
				const underlinenode = el.querySelector(".underlinenode");
				if (_status.prehidden_skills.includes(name)) underlinenode.classList.remove("on");
				underlinenode.link = name;
				underlinenode.listen(ui.click.hiddenskill);
			} else {
				ui.create.div(
					".xskill",
					icon +
						`<div data-color><span style="opacity:0.5">${skillName}</span></div><div><span style="opacity:0.5">${skillInfo}</span></div>`,
					container
				);
			}
		},

		/**
		 * 创建未激活技能项
		 * @private
		 */
		_createInactiveSkill(container, skillName, skillInfo, icon) {
			ui.create.div(
				".xskill",
				icon + `<div data-color><span style="opacity:0.5">${skillName}</span></div><div><span style="opacity:0.5">${skillInfo}</span></div>`,
				container
			);
		},

		/**
		 * 创建自动发动技能项
		 * @private
		 */
		_createFrequentSkill(container, name, skillName, skillInfo, icon) {
			const el = ui.create.div(
				".xskill",
				icon +
					`<div data-color>${skillName}</div><div>${skillInfo}<br><div class="underlinenode on gray" style="position:relative;padding-left:0;padding-top:7px">自动发动</div></div>`,
				container
			);
			const underlinenode = el.querySelector(".underlinenode");
			const shouldDisable =
				(lib.skill[name].frequent && lib.config.autoskilllist.includes(name)) ||
				(lib.skill[name].subfrequent && lib.skill[name].subfrequent.some(sub => lib.config.autoskilllist.includes(name + "_" + sub)));
			if (shouldDisable) underlinenode.classList.remove("on");
			underlinenode.link = name;
			underlinenode.listen(ui.click.autoskill2);
		},

		/**
		 * 创建可点击技能项
		 * @private
		 */
		_createClickableSkill(container, name, skillName, skillInfo, icon, player, dialogContainer) {
			const el = ui.create.div(
				".xskill",
				icon +
					`<div data-color>${skillName}</div><div>${skillInfo}<br><div class="menubutton skillbutton" style="position:relative;margin-top:5px;color:rgba(255,203,0,1);">点击发动</div></div>`,
				container
			);
			const intronode = el.querySelector(".skillbutton");
			if (!_status.gameStarted || (lib.skill[name].clickableFilter && !lib.skill[name].clickableFilter(player))) {
				intronode.classList.add("disabled");
				intronode.style.opacity = 0.5;
			} else {
				intronode.link = player;
				intronode.func = lib.skill[name].clickable;
				intronode.classList.add("pointerdiv");
				intronode.listen(() => {
					if (dialogContainer.delete) {
						dialogContainer.delete();
					} else {
						dialogContainer.hide?.();
						game.resume2();
					}
				});
				intronode.listen(ui.click.skillbutton);
			}
		},

		/**
		 * 显示装备区域
		 * @private
		 * @param {HTMLElement} container - 容器元素
		 * @param {Object} player - 玩家对象
		 */
		_showEquipment(container, player) {
			const eSkills = player.getCards("e");
			if (eSkills.length) {
				ui.create.div(".xcaption", "装备区域", container);
				eSkills.forEach(card => {
					const cards = card.cards;
					const isQiexie = card.name.startsWith("qiexie_");
					const displayName = card.name + "_info";
					let str = [get.translation(isQiexie ? card.name : card), get.translation(displayName)];

					if (Array.isArray(cards) && cards.length && (cards.length !== 1 || cards[0].name !== card.name)) {
						str[0] += `（${get.translation(cards)}）`;
					}
					if (lib.card[card.name]?.cardPrompt) {
						str[1] = lib.card[card.name].cardPrompt(card, player);
					}
					if (isQiexie && lib.translate[card.name + "_append"]) {
						str[1] += `<br><br><div style="font-size:0.85em;font-family:xinwei;line-height:1.2;">${lib.translate[card.name + "_append"]}</div>`;
					}
					ui.create.div(".xskill", `<div data-color>${str[0]}</div><div>${str[1]}</div>`, container);
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
					ui.create.div(".xskill", `<div data-color>【${skillTrans}】视为装备【${equipTrans}】</div><div>${equipInfo}</div>`, container);
				});
			}
		},

		/**
		 * 显示判定区域
		 * @private
		 * @param {HTMLElement} container - 容器元素
		 * @param {Object} player - 玩家对象
		 */
		_showJudgeCards(container, player) {
			const judges = player.getCards("j");
			if (!judges.length) return;

			ui.create.div(".xcaption", "判定区域", container);
			judges.forEach(card => {
				const cards = card.cards;
				let str = [get.translation(card), get.translation(card.name + "_info")];
				if ((Array.isArray(cards) && cards.length && !lib.card[card]?.blankCard) || player.isUnderControl(true)) {
					str[0] += `（${get.translation(cards)}）`;
				}
				ui.create.div(".xskill", `<div data-color>${str[0]}</div><div>${str[1]}</div>`, container);
			});
		},

		/**
		 * 创建擅长武将信息
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 */
		createSkillInfo(parent, player) {
			const buttons = this._getActionButtons(player);
			this._createActionButtons(parent, buttons);
			this._createShowcaseCharacters(parent);
		},

		/**
		 * 获取操作按钮配置
		 * @private
		 * @param {Object} player - 玩家对象
		 * @returns {Array} 按钮配置数组
		 */
		_getActionButtons(player) {
			return player === game.me
				? [
						{ class: "useless1", text: "分享" },
						{ class: "useless2", text: "展示(诏令－1)" },
						{ class: "useless3", text: "调整武将" },
						{ class: "useless4", text: "我的家园" },
					]
				: [
						{ class: "useless1", text: "拉黑名单" },
						{ class: "useless2", text: "私聊" },
						{ class: "useless3", text: "加为好友" },
						{ class: "useless4", text: "教训他" },
					];
		},

		/**
		 * 创建操作按钮
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 * @param {Array} buttons - 按钮配置
		 */
		_createActionButtons(parent, buttons) {
			buttons.forEach(btn => {
				const button = ui.create.div(`.${btn.class}`, parent, get.translation(btn.text));
				button.setBackgroundImage(`${SHOUSHA_CONSTANTS.IMAGE_PATH}useless1.png`);
				button.onclick = function () {
					this.style.transform = "scale(0.9)";
					setTimeout(() => (this.style.transform = "scale(1)"), 100);
					game.playAudio(`${SHOUSHA_CONSTANTS.AUDIO_PATH}label.mp3`);
				};
			});
		},

		/**
		 * 创建展示武将
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 */
		_createShowcaseCharacters(parent) {
			const shanchangdialog = ui.create.div(".shanchangdialog", parent);
			const characters = Object.keys(lib.character)
				.filter(key => !lib.filter.characterDisabled(key))
				.randomGets(SHOUSHA_LAYOUT.MAX_SHOWCASE_CHARACTERS);

			characters.forEach(charName => {
				if (!lib.character[charName]) return;
				const group = lib.character[charName][1];
				const charContainer = ui.create.div(".shanchang", shanchangdialog);
				const kuang = ui.create.div(".kuang", charContainer);
				kuang.setBackgroundImage(this.getGroupBackgroundImage(group));

				const leftPane = this.createLeftPane(kuang);
				leftPane.setBackground(charName, "character");
				applyOutcropAvatar(charName, leftPane);

				const xing = ui.create.div(".xing", kuang);
				this.utils.createStars(xing, game.getRarity(charName));

				const biankuangname = ui.create.div(".biankuangname", kuang);
				biankuangname.innerHTML = get.slimName(charName);

				if (window.zyile_charactercard) {
					const huanfu = ui.create.div(".huanfu", charContainer);
					huanfu.onclick = () => window.zyile_charactercard(charName, charContainer, false);
				}
			});
		},
	};
}
