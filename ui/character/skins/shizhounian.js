/**
 * 十周年风格角色弹窗
 * 功能：立绘显示、分包信息、简洁布局、千幻聆音样式支持
 */
import { _status } from "noname";
import { createBaseCharacterPlugin } from "./base.js";
import { skillButtonTooltip } from "../../../src/ui/skillButtonTooltip.js";

/**
 * 创建十周年风格角色插件
 * @param {Object} lib - 游戏库对象
 * @param {Object} game - 游戏对象
 * @param {Object} ui - UI对象
 * @param {Object} get - 获取函数集合
 * @param {Object} ai - AI对象
 * @param {Object} _status - 状态对象
 * @param {Object} app - 应用对象
 * @returns {Object} 插件配置对象
 */
export function createShizhounianCharacterPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseCharacterPlugin(lib, game, ui, get, ai, _status, app);

	const IMAGE_PATH = "extension/十周年UI/ui/assets/character/shizhounian/";

	return {
		...base,
		skinName: "shizhounian",

		/**
		 * 获取势力背景图片路径
		 * @param {string} group - 势力名称
		 * @returns {string} 图片路径
		 */
		getGroupBackgroundImage(group) {
			if (!this.validGroups.includes(group)) group = "default";
			return `${IMAGE_PATH}skt_${group}.png`;
		},

		/**
		 * 获取等阶图标路径
		 * @param {string} rarity - 稀有度
		 * @returns {string} 图片路径
		 */
		getRarityIcon(rarity) {
			return `${IMAGE_PATH}rarity_${rarity}.png`;
		},

		/**
		 * 获取等阶背景路径
		 * @param {string} rarity - 稀有度
		 * @returns {string} 图片路径
		 */
		getPeIcon(rarity) {
			return `${IMAGE_PATH}pe_${rarity}.png`;
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
				const dialog = ui.create.div(".shizhounian-character-dialog.popped", container);
				const leftPane = ui.create.div(".left", dialog);
				const rightPane = ui.create.div(".right", dialog);

				plugin._buildMainDialog(dialog, leftPane, rightPane, player);

				container.classList.remove("hidden");
				game.pause2();
			};

			return container;
		},

		/**
		 * 构建主对话框内容
		 * @private
		 * @param {HTMLElement} dialog - 对话框元素
		 * @param {HTMLElement} leftPane - 左侧面板
		 * @param {HTMLElement} rightPane - 右侧面板
		 * @param {Object} player - 玩家对象
		 */
		_buildMainDialog(dialog, leftPane, rightPane, player) {
			const group = player.group;
			dialog.style.backgroundImage = `url("${this.getGroupBackgroundImage(group)}")`;

			const { name, name2 } = this._getPlayerNames(player);

			this._createCharacterSkins(dialog, player, name, name2);
			this._createRarityInfo(dialog, name);
			this._createCharacterName(dialog, name, name2, group);
			this._createPackInfo(dialog, name);

			leftPane.innerHTML = "<div></div>";
			rightPane.innerHTML = "<div></div>";
			lib.setScroll(rightPane.firstChild);

			this._createSkillSection(rightPane.firstChild, player);
			this.showHandCards(rightPane.firstChild, player);
			this.showEquipmentArea(rightPane.firstChild, player);
			this.showJudgeArea(rightPane.firstChild, player);
		},

		/**
		 * 获取玩家武将名称
		 * @private
		 * @param {Object} player - 玩家对象
		 * @returns {{name: string, name2: string}} 武将名称
		 */
		_getPlayerNames(player) {
			let name = player.name1 || player.name;
			let name2 = player.name2;

			if (player.classList?.contains("unseen") && player !== game.me) {
				name = "unknown";
			}
			if (player.classList?.contains("unseen2") && player !== game.me) {
				name2 = "unknown";
			}

			return { name, name2 };
		},

		/**
		 * 创建武将立绘
		 * @private
		 * @param {HTMLElement} dialog - 对话框元素
		 * @param {Object} player - 玩家对象
		 * @param {string} name - 主将名称
		 * @param {string} name2 - 副将名称
		 */
		_createCharacterSkins(dialog, player, name, name2) {
			const skin1 = ui.create.div(".skin1", dialog);
			const skin2 = ui.create.div(".skin2", dialog);

			if (name !== "unknown") {
				const playerSkin = player.style.backgroundImage || player.childNodes[0]?.style.backgroundImage;
				this.utils.setLihuiDiv(skin1, playerSkin);
			} else {
				skin1.style.backgroundImage = `url("${IMAGE_PATH}../unknown.png")`;
			}

			if (name2) {
				if (name2 !== "unknown") {
					const playerSkin2 = player.childNodes[1]?.style.backgroundImage;
					this.utils.setLihuiDiv(skin2, playerSkin2);
				} else {
					skin2.style.backgroundImage = `url("${IMAGE_PATH}../unknown.png")`;
				}
			}
		},

		/**
		 * 创建稀有度信息
		 * @private
		 * @param {HTMLElement} dialog - 对话框元素
		 * @param {string} name - 武将名称
		 */
		_createRarityInfo(dialog, name) {
			const rarity = game.getRarity(name) || "junk";
			const pe = ui.create.div(".pe1", dialog);
			const peUrl = lib.config["extension_千幻聆音_enable"] ? this.getPeIcon(this.utils.getQhlyLevel(name)) : this.getPeIcon(rarity);
			pe.style.backgroundImage = `url("${peUrl}")`;

			const skinName = this.utils.getQhlySkinTranslation(name);
			const value = `${skinName}*${get.translation(name)}`;
			ui.create.div(".pn1", value, pe);
		},

		/**
		 * 创建武将名称
		 * @private
		 * @param {HTMLElement} dialog - 对话框元素
		 * @param {string} name - 主将名称
		 * @param {string} name2 - 副将名称
		 * @param {string} group - 势力
		 */
		_createCharacterName(dialog, name, name2, group) {
			const nametext = this.utils.getCharacterNameText(name, name2);
			const namestyle = ui.create.div(".name", nametext, dialog);
			namestyle.dataset.camp = group;

			if (name && name2) {
				namestyle.style.fontSize = "18px";
				namestyle.style.letterSpacing = "1px";
			}

			const rarity = game.getRarity(name) || "junk";
			const head = ui.create.node("img");
			head.src = this.getRarityIcon(rarity);
			head.style.cssText =
				"display:inline-block;width:61.6px;height:53.2px;top:-13px;position:absolute;background-color:transparent;z-index:1;margin-left:5px;";
			namestyle.appendChild(head);
		},

		/**
		 * 创建分包信息
		 * @private
		 * @param {HTMLElement} dialog - 对话框元素
		 * @param {string} name - 武将名称
		 */
		_createPackInfo(dialog, name) {
			ui.create.div(".pack", this.utils.getPack(name), dialog);
		},

		/**
		 * 创建技能区域
		 * @private
		 * @param {HTMLElement} container - 容器元素
		 * @param {Object} player - 玩家对象
		 */
		_createSkillSection(container, player) {
			let oSkills = player.getSkills(null, false, false).slice(0);
			if (player === game.me) {
				oSkills = oSkills.concat(player.hiddenSkills);
			}

			if (!oSkills.length) return;

			oSkills.forEach(skillName => {
				const translation = lib.translate[skillName];
				if (!translation || !lib.translate[skillName + "_info"]) return;

				this._createSkillItem(container, skillName, player);
			});
		},

		/**
		 * 创建技能项
		 * @private
		 * @param {HTMLElement} container - 容器元素
		 * @param {string} skillName - 技能名称
		 * @param {Object} player - 玩家对象
		 */
		_createSkillItem(container, skillName, player) {
			const translation = lib.translate[skillName];
			const isAwakened = !player.getSkills().includes(skillName) || player.awakenedSkills.includes(skillName);

			const rawSkillInfo = skillButtonTooltip.getSkillDescription(skillName, player);
			const formattedSkillInfo = skillButtonTooltip.formatSkillDescription(rawSkillInfo);

			const skillNameHtml = isAwakened ? `<span style="opacity:0.5">${translation}： </span>` : `${translation}： `;
			const skillInfoHtml = isAwakened
				? `<span style="opacity:0.5;text-indent:10px">${formattedSkillInfo}</span>`
				: `<span style="text-indent:10px">${formattedSkillInfo}</span>`;

			let skillContent = `<div data-color>${skillNameHtml}</div><div>${skillInfoHtml}`;

			if (lib.skill[skillName].clickable && player === game.me) {
				skillContent += '<br><div class="menubutton skillbutton" style="position:relative;margin-top:5px">点击发动</div>';
			}
			skillContent += "</div>";

			const skillDiv = ui.create.div(".xskill", skillContent, container);

			this._attachSkillButtonHandler(skillDiv, skillName, player);
			this._attachAutoSkillHandler(container, skillName, translation);
		},

		/**
		 * 附加技能按钮处理器
		 * @private
		 * @param {HTMLElement} skillDiv - 技能元素
		 * @param {string} skillName - 技能名称
		 * @param {Object} player - 玩家对象
		 */
		_attachSkillButtonHandler(skillDiv, skillName, player) {
			if (!lib.skill[skillName].clickable || player !== game.me) return;

			const skillButton = skillDiv.querySelector(".skillbutton");
			if (!skillButton) return;

			if (!_status.gameStarted || (lib.skill[skillName].clickableFilter && !lib.skill[skillName].clickableFilter(player))) {
				skillButton.classList.add("disabled");
				skillButton.style.opacity = 0.5;
			} else {
				skillButton.link = player;
				skillButton.func = lib.skill[skillName].clickable;
				skillButton.classList.add("pointerdiv");
				skillButton.listen(() => {
					if (this.playerDialog?.delete) {
						this.playerDialog.delete();
					}
				});
				skillButton.listen(ui.click.skillbutton);
			}
		},

		/**
		 * 附加自动发动技能处理器
		 * @private
		 * @param {HTMLElement} container - 容器元素
		 * @param {string} skillName - 技能名称
		 * @param {string} translation - 技能翻译
		 */
		_attachAutoSkillHandler(container, skillName, translation) {
			if (!lib.skill[skillName].frequent && !lib.skill[skillName].subfrequent) return;

			const underlinenode = ui.create.div(".underlinenode on gray", `【${translation}】自动发动`, container);
			underlinenode.style.position = "relative";
			underlinenode.style.paddingLeft = "0";
			underlinenode.style.paddingBottom = "3px";

			if (lib.skill[skillName].frequent && lib.config.autoskilllist.includes(skillName)) {
				underlinenode.classList.remove("on");
			}
			if (lib.skill[skillName].subfrequent) {
				lib.skill[skillName].subfrequent.forEach(sub => {
					if (lib.config.autoskilllist.includes(`${skillName}_${sub}`)) {
						underlinenode.classList.remove("on");
					}
				});
			}
			underlinenode.link = skillName;
			underlinenode.listen(ui.click.autoskill2);
		},
	};
}
