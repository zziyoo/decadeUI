/**
 * 宝宝杀风格角色弹窗
 * 功能：VIP系统、官阶、简化布局、可爱风格
 */
import { _status } from "noname";
import { createBaseCharacterPlugin } from "./base.js";

const IMAGE_PATH = "extension/十周年UI/ui/assets/character/baby/";
const AUDIO_PATH = "../extension/十周年UI/ui/assets/lbtn/shousha/caidan.mp3";

const GUANJIE_TRANSLATION = {
	1: ["骁卒", ["步卒", "伍长", "什长", "队率", "屯长", "部曲"]],
	2: ["校尉", ["县尉", "都尉", "步兵校尉", "典军校尉"]],
	3: ["郎将", ["骑郎将", "车郎将", "羽林中郎将", "虎贲中郎将"]],
	4: ["偏将军", ["折冲将军", "虎威将军", "征虏将军", "荡寇将军"]],
	5: ["将军", ["监军将军", "抚军将军", "典军将军", "领军将军"]],
	6: ["上将军", ["后将军", "左将军", "右将军", "前将军"]],
	7: ["国护军", ["护军", "左护军", "右护军", "中护军"]],
	8: ["国都护", ["都护", "左都护", "右都护", "中都护"]],
	9: ["大将军", ["大将军"]],
};

/**
 * 创建宝宝杀风格角色插件
 * @param {Object} lib - 游戏库对象
 * @param {Object} game - 游戏对象
 * @param {Object} ui - UI对象
 * @param {Object} get - 获取函数集合
 * @param {Object} ai - AI对象
 * @param {Object} _status - 状态对象
 * @param {Object} app - 应用对象
 * @returns {Object} 插件配置对象
 */
export function createBabyCharacterPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseCharacterPlugin(lib, game, ui, get, ai, _status, app);

	return {
		...base,
		skinName: "baby",

		/**
		 * 获取边框背景图片路径
		 * @param {string} group - 势力名称
		 * @returns {string} 图片路径
		 */
		getBabyBackgroundImage(group) {
			if (!this.validGroups.includes(group)) group = "default";
			return `${IMAGE_PATH}baby_${group}.png`;
		},

		/**
		 * 获取势力背景图片路径
		 * @param {string} group - 势力名称
		 * @returns {string} 图片路径
		 */
		getBabysBackgroundImage(group) {
			if (!this.validGroups.includes(group)) group = "default";
			return `${IMAGE_PATH}babys_${group}.png`;
		},

		/**
		 * 获取稀有度图片路径
		 * @param {string} name - 武将名称
		 * @returns {string} 图片路径
		 */
		getRarityImageUrl(name) {
			let rarity = game.getRarity(name) || "junk";
			if (lib.config["extension_千幻聆音_enable"] && typeof game.qhly_getSkinLevel === "function") {
				rarity = this.utils.getQhlyLevel(name);
			}
			return `${IMAGE_PATH}../pe_${rarity}.png`;
		},

		/**
		 * 初始化玩家属性
		 * @param {Object} player - 玩家对象
		 */
		initPlayerProperties(player) {
			if (!player.guanjiejibie) player.guanjiejibie = Math.floor(Math.random() * 9 + 1);
			if (!player.dengji) player.dengji = [Math.floor(Math.random() * 21) + 180, 200, 200].randomGet();
			if (!player.xvipjibie) player.xvipjibie = Math.floor(Math.random() * 8 + 1);
			if (!player.xingxiangIndex) player.xingxiangIndex = Math.floor(Math.random() * 6);
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
			container.style.backgroundColor = "RGBA(0, 0, 0, 0.85)";

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
				const dialog = ui.create.div(".baby-character-dialog.popped", container);
				const blackBg1 = ui.create.div(".blackBg.one", dialog);
				const blackBg2 = ui.create.div(".blackBg.two", dialog);
				ui.create.div(".basicInfo", blackBg1);
				const rightPane = ui.create.div(".right", blackBg2);

				plugin._buildMainDialog(dialog, blackBg1, blackBg2, rightPane, player);

				container.classList.remove("hidden");
				game.pause2();
			};

			return container;
		},

		/**
		 * 构建主对话框内容
		 * @private
		 * @param {HTMLElement} dialog - 对话框元素
		 * @param {HTMLElement} blackBg1 - 背景1
		 * @param {HTMLElement} blackBg2 - 背景2
		 * @param {HTMLElement} rightPane - 右侧面板
		 * @param {Object} player - 玩家对象
		 */
		_buildMainDialog(dialog, blackBg1, blackBg2, rightPane, player) {
			const { name, name2 } = this._getPlayerNames(player);
			this.initPlayerProperties(player);

			const biankuang = this._createCharacterFrame(blackBg1, player);
			this._createDecorations(blackBg1, player);
			this._createCharacterName(dialog, name, name2, player.group);
			this._createRarityInfo(dialog, name);
			this._createPlayerInfo(blackBg2, player);
			this._createRankInfo(blackBg2, player);
			this._createCharacterDetails(blackBg2, name, player);
			this._createCloseButton(blackBg2);

			dialog.classList.add("single");
			this.createSkillList(rightPane, player, null);
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

			if (player.classList.contains("unseen") && player !== game.me) {
				name = "unknown";
			}
			if (player.classList.contains("unseen2") && player !== game.me) {
				name2 = "unknown";
			}

			return { name, name2 };
		},

		/**
		 * 创建武将边框
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 * @returns {HTMLElement} 边框元素
		 */
		_createCharacterFrame(parent, player) {
			const useZLLT = lib.config.extension_十周年UI_ZLLT === true;
			const biankuang = ui.create.div(useZLLT ? ".biankuang" : ".biankuang2", parent);
			const leftPane = ui.create.div(useZLLT ? ".left" : ".left2", biankuang);

			const playerSkin = player.node.avatar.style.backgroundImage || player.childNodes[0]?.style.backgroundImage;
			leftPane.style.backgroundImage = playerSkin;

			return biankuang;
		},

		/**
		 * 创建装饰元素
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 */
		_createDecorations(parent, player) {
			const biankuang3 = ui.create.div(".biankuang3", parent);
			biankuang3.setBackgroundImage(this.getBabyBackgroundImage(player.group));

			const biankuang4 = ui.create.div(".biankuang4", parent);
			biankuang4.setBackgroundImage(this.getBabysBackgroundImage(player.group));
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
				namestyle.style.fontSize = "20px";
				namestyle.style.letterSpacing = "1px";
			}
		},

		/**
		 * 创建稀有度信息
		 * @private
		 * @param {HTMLElement} dialog - 对话框元素
		 * @param {string} name - 武将名称
		 */
		_createRarityInfo(dialog, name) {
			const pe = ui.create.div(".pe1", dialog);
			pe.style.backgroundImage = `url("${this.getRarityImageUrl(name)}")`;
		},

		/**
		 * 创建玩家信息
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 */
		_createPlayerInfo(parent, player) {
			const biankuang4 = parent.previousElementSibling.querySelector(".biankuang4");
			const wjxin = ui.create.div(".wjxin", biankuang4);
			wjxin.setBackgroundImage(`${IMAGE_PATH}geren.png`);

			const minixingxiang = ui.create.div(".minixingxiang", wjxin);

			const xvip = ui.create.div(".minikuang", minixingxiang);
			xvip.setBackgroundImage(`${IMAGE_PATH}vip${player.xvipjibie}.png`);

			const xvipName = ui.create.div(".viptp", xvip);
			xvipName.setBackgroundImage(`${IMAGE_PATH}level${player.xvipjibie}.png`);

			ui.create.div(".nameX", player.nickname, minixingxiang);
			ui.create.div(".dengjiX", String(player.dengji), minixingxiang);

			minixingxiang.setBackgroundImage(`${IMAGE_PATH}xingxiang${player.xingxiangIndex}.png`);
		},

		/**
		 * 创建官阶信息
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 * @param {Object} player - 玩家对象
		 */
		_createRankInfo(parent, player) {
			const biankuang4 = parent.previousElementSibling.querySelector(".biankuang4");
			const guanjie = ui.create.div(".guanjie", biankuang4);
			guanjie.setBackgroundImage(`${IMAGE_PATH}vip_icon_${player.guanjiejibie}.png`);

			const guanjieInfo = GUANJIE_TRANSLATION[player.guanjiejibie];
			ui.create.div(".guanjiewenzi", `<center>${guanjieInfo[0]}`, biankuang4);
			ui.create.div(".guanjiewenziX", `<center>${guanjieInfo[1][0]}`, biankuang4);
		},

		/**
		 * 创建武将详细信息
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 * @param {string} name - 武将名称
		 * @param {Object} player - 玩家对象
		 */
		_createCharacterDetails(parent, name, player) {
			const biankuang4 = parent.previousElementSibling.querySelector(".biankuang4");

			const rarity = game.getRarity(name) || "junk";
			const xingxing = ui.create.div(".xingxing", biankuang4);
			xingxing.setBackgroundImage(`${IMAGE_PATH}${rarity}.png`);

			const sex = lib.character[player.name]?.sex || "male";
			const xingbie = ui.create.div(".xingbie", biankuang4);
			xingbie.setBackgroundImage(`${IMAGE_PATH}${sex}.png`);

			const duihuak = ui.create.div(".duihuak", biankuang4);
			duihuak.setBackgroundImage(`${IMAGE_PATH}seatinfo.png`);

			ui.create.div(".pack", this.utils.getPack(name), biankuang4);
		},

		/**
		 * 创建关闭按钮
		 * @private
		 * @param {HTMLElement} parent - 父元素
		 */
		_createCloseButton(parent) {
			const biankuang4 = parent.previousElementSibling.querySelector(".biankuang4");
			const diaozhui = ui.create.div(".diaozhui", biankuang4);
			diaozhui.setBackgroundImage(`${IMAGE_PATH}basebtn.png`);
			diaozhui.style.cursor = "pointer";
			diaozhui.style.pointerEvents = "auto";
			diaozhui.style.zIndex = "1000";

			diaozhui.addEventListener("click", ev => {
				ev.stopPropagation();
				game.playAudio(AUDIO_PATH);
				const container = diaozhui.closest(".popup-container");
				if (container?.delete) {
					container.delete();
				}
			});
		},
	};
}
