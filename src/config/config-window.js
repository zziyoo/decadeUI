/**
 * @fileoverview 十周年UI配置窗口
 * @description 提供独立的配置界面，包含外观、卡牌、部件、其他四大类设置
 */
import { lib, game, ui } from "noname";
import { config } from "./index.js";

let currentOverlay = null;
let lastActiveTab = "appearance";

/**
 * 加载配置窗口的CSS样式文件
 * @description 避免重复加载，只在首次调用时创建link标签
 */
function loadStyles() {
	if (document.getElementById("decade-config-window-styles")) return;

	const link = document.createElement("link");
	link.id = "decade-config-window-styles";
	link.rel = "stylesheet";
	link.href = `${lib.assetURL}extension/十周年UI/src/config/config-window.css`;
	document.head.appendChild(link);
}

/**
 * 创建配置窗口
 * @description 构建包含遮罩层、对话框、标签栏和内容区的完整配置界面
 */
function createConfigWindow() {
	if (currentOverlay) return;

	loadStyles();

	const overlay = ui.create.div(".decade-config-overlay");
	const dialog = ui.create.div(".decade-config-dialog", overlay);
	const pattern = ui.create.div(".decade-config-pattern", dialog);

	const title = ui.create.div(".decade-config-title", dialog);
	title.innerHTML = "十周年UI配置中心";

	const avatar = document.createElement("img");
	avatar.src = `${lib.assetURL}extension/十周年UI/image/ui/avatar/avatar_ziyoo.jpg`;
	avatar.className = "decade-config-avatar";
	avatar.onclick = () => {
		overlay.remove();
		currentOverlay = null;
	};
	dialog.appendChild(avatar);

	const sidebar = ui.create.div(".decade-config-sidebar", dialog);
	const content = ui.create.div(".decade-config-content", dialog);

	const tabs = [
		{ id: "appearance", name: "整体外观" },
		{ id: "card", name: "卡牌相关" },
		{ id: "component", name: "部件管理" },
		{ id: "misc", name: "其他设置" },
	];

	let currentTab = lastActiveTab;

	tabs.forEach(tab => {
		const btn = ui.create.div(".decade-config-tab", sidebar);
		btn.innerHTML = tab.name;
		if (tab.id === currentTab) {
			btn.classList.add("active");
		}

		btn.onclick = () => {
			if (currentTab === tab.id) return;
			currentTab = tab.id;
			lastActiveTab = tab.id;

			Array.from(sidebar.children).forEach(child => {
				child.classList.remove("active");
			});
			btn.classList.add("active");

			loadConfigs(content, currentTab);
		};
	});

	loadConfigs(content, currentTab);

	overlay.addEventListener("click", e => {
		if (e.target === overlay) {
			overlay.remove();
			currentOverlay = null;
		}
	});

	document.body.appendChild(overlay);
	currentOverlay = overlay;
}

/**
 * 加载指定标签页的配置项
 * @param {HTMLElement} container - 内容容器元素
 * @param {string} tabId - 标签页ID
 * @description 根据标签页ID渲染对应的配置项列表，支持开关、选择、输入框三种类型
 */
function loadConfigs(container, tabId) {
	container.innerHTML = "";
	container.scrollTop = 0;
	const configs = getConfigsByTab(tabId);

	configs.forEach(configItem => {
		if (configItem.isTitle) {
			const titleEl = ui.create.div(".decade-config-section-title", container);
			titleEl.innerHTML = configItem.name;
			return;
		}

		const configKey = `extension_十周年UI_${configItem.key}`;
		const configDef = config[configItem.key];
		if (!configDef) return;

		const item = ui.create.div(".decade-config-item", container);

		const table = document.createElement("table");
		table.className = "decade-config-table";

		const tr = document.createElement("tr");
		const tdName = document.createElement("td");
		tdName.className = "decade-config-name";
		tdName.innerHTML = configItem.name;

		let introDiv = null;
		if (configDef.intro) {
			introDiv = document.createElement("div");
			introDiv.className = "decade-config-intro";
			introDiv.innerHTML = configDef.intro;

			tdName.onclick = function (e) {
				e.stopPropagation();
				introDiv.classList.toggle("show");
			};
		}

		const tdControl = document.createElement("td");
		tdControl.className = "decade-config-control";

		if (configItem.type === "toggle") {
			const currentValue = lib.config[configKey];
			const initValue = currentValue !== undefined ? currentValue : configDef.init;

			const toggle = document.createElement("div");
			toggle.className = `decade-config-toggle ${initValue ? "on" : "off"}`;

			const slider = document.createElement("div");
			slider.className = "decade-config-toggle-slider";
			toggle.appendChild(slider);

			toggle.onclick = function () {
				const newValue = !lib.config[configKey];
				game.saveConfig(configKey, newValue);

				toggle.className = `decade-config-toggle ${newValue ? "on" : "off"}`;

				if (configDef.onclick) {
					configDef.onclick(newValue);
				} else if (configDef.update) {
					configDef.update();
				}
			};

			tdControl.appendChild(toggle);
		} else if (configItem.type === "select") {
			const currentValue = lib.config[configKey] ?? configDef.init;
			const optionsContainer = document.createElement("div");
			optionsContainer.className = "decade-config-options";

			Object.keys(configDef.item).forEach(key => {
				const option = document.createElement("div");
				option.className = "decade-config-option";
				if (key === currentValue) {
					option.classList.add("selected");
					option.style.cssText = "margin-right: 8px; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(168, 237, 234, 0.4) !important;";
				} else {
					option.style.cssText = "margin-right: 8px; margin-bottom: 8px; box-shadow: none !important;";
				}

				let displayText = configDef.item[key];
				if (typeof displayText === "string" && displayText.includes("<")) {
					const temp = document.createElement("div");
					temp.innerHTML = displayText;
					const textContent = temp.textContent || temp.innerText;
					displayText = textContent.trim() || key;
				}

				option.textContent = displayText;
				option.dataset.value = key;

				option.onclick = function () {
					if (this.dataset.value === lib.config[configKey]) return;

					Array.from(optionsContainer.children).forEach(child => {
						child.classList.remove("selected");
						child.style.cssText = "margin-right: 8px; margin-bottom: 8px; box-shadow: none !important;";
					});

					this.classList.add("selected");
					this.style.cssText = "margin-right: 8px; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(168, 237, 234, 0.4) !important;";

					const newValue = this.dataset.value;

					if (configDef.onclick) {
						configDef.onclick(newValue);
					} else {
						game.saveConfig(configKey, newValue);

						if (configDef.update) {
							configDef.update();
						}
					}
				};

				optionsContainer.appendChild(option);
			});

			tdControl.appendChild(optionsContainer);
		} else if (configItem.type === "input") {
			const input = document.createElement("input");
			input.type = "text";
			input.className = "decade-config-input";
			input.value = lib.config[configKey] ?? configDef.init;

			input.addEventListener("blur", function () {
				const newValue = this.value.trim();

				if (newValue) {
					if (configDef.onblur) {
						configDef.onblur.call(this);
					} else {
						game.saveConfig(configKey, newValue);
					}

					if (configDef.update) {
						configDef.update();
					}
				}
			});

			input.addEventListener("keydown", function (e) {
				if (e.key === "Enter") {
					this.blur();
				}
			});

			tdControl.appendChild(input);
		}

		tr.appendChild(tdName);
		tr.appendChild(tdControl);
		table.appendChild(tr);

		if (introDiv) {
			const trIntro = document.createElement("tr");
			const tdIntro = document.createElement("td");
			tdIntro.colSpan = 2;
			tdIntro.appendChild(introDiv);
			trIntro.appendChild(tdIntro);
			table.appendChild(trIntro);
		}

		item.appendChild(table);
	});
}

/**
 * 获取指定标签页的配置项列表
 * @param {string} tabId - 标签页ID (appearance/card/component/misc)
 * @returns {Array} 配置项数组
 * @description 返回包含配置项定义的数组，每项包含key、name、type等属性
 */
function getConfigsByTab(tabId) {
	const configMap = {
		appearance: [
			{ isTitle: true, name: "样式设置" },
			{ key: "newDecadeStyle", name: "切换样式", type: "select" },
			{ key: "outcropSkin", name: "露头样式", type: "select" },
			{ key: "borderStyle", name: "边框风格•仅一将", type: "select" },
			{ key: "borderLevel", name: "等阶边框", type: "select" },
			{ isTitle: true, name: "功能开关" },
			{ key: "aloneEquip", name: "单独装备栏", type: "toggle" },
			{ key: "meanPrettify", name: "菜单美化", type: "toggle" },
			{ key: "dynamicSkin", name: "动态皮肤", type: "toggle" },
			{ key: "dynamicSkinOutcrop", name: "动皮露头", type: "toggle" },
			{ key: "killEffect", name: "击杀特效", type: "toggle" },
		],
		card: [
			{ isTitle: true, name: "卡牌效果" },
			{ key: "cardGhostEffect", name: "幻影出牌", type: "toggle" },
			{ key: "autoSelect", name: "自动选择", type: "toggle" },
			{ key: "cardPrompt", name: "出牌信息提示", type: "toggle" },
			{ key: "cardAlternateName", name: "牌名辅助", type: "toggle" },
			{ isTitle: true, name: "卡牌样式" },
			{ key: "cardPrettify", name: "卡牌美化", type: "select" },
			{ key: "cardkmh", name: "卡牌边框", type: "select" },
			{ key: "chupaizhishi", name: "出牌指示", type: "select" },
			{ isTitle: true, name: "尺寸调整" },
			{ key: "cardScale", name: "手牌大小", type: "input" },
			{ key: "discardScale", name: "弃牌堆卡牌大小", type: "input" },
			{ key: "handTipHeight", name: "出牌信息提示高度", type: "input" },
			{ key: "handFoldMin", name: "手牌折叠", type: "input" },
		],
		component: [
			{ isTitle: true, name: "进度条设置" },
			{ key: "jindutiaoYangshi", name: "进度条样式", type: "select" },
			{ key: "jindutiaoST", name: "进度条速度", type: "select" },
			{ key: "jindutiaoSet", name: "进度条高度", type: "input" },
			{ isTitle: true, name: "界面元素" },
			{ key: "JDTSYangshi", name: "阶段提示", type: "select" },
			{ key: "GTBBYangshi", name: "狗托播报", type: "select" },
			{ key: "GTBBFont", name: "播报字体", type: "select" },
			{ key: "GTBBTime", name: "时间间隔", type: "select" },
			{ key: "playerMarkStyle", name: "标记样式", type: "select" },
			{ key: "loadingStyle", name: "光标+loading框", type: "select" },
			{ key: "gainSkillsVisible", name: "获得技能显示", type: "select" },
			{ isTitle: true, name: "插件功能" },
			{ key: "characterPlugin", name: "武将详情插件", type: "toggle" },
		],
		misc: [
			{ isTitle: true, name: "音效与视觉" },
			{ key: "bettersound", name: "更多音效", type: "toggle" },
			{ key: "skillDieAudio", name: "中二模式", type: "toggle" },
			{ key: "showDistanceDisplay", name: "手杀距离显示", type: "toggle" },
			{ key: "audioEasterEggs", name: "武将彩蛋", type: "toggle" },
			{ key: "wujiangbeijing", name: "武将背景", type: "toggle" },
			{ key: "shiliyouhua", name: "官方势力", type: "toggle" },
			{ isTitle: true, name: "游戏功能" },
			{ key: "enableRecastInteraction", name: "重铸交互", type: "toggle" },
			{ key: "enableEquipCopy", name: "装备入手", type: "toggle" },
			{ key: "mx_decade_characterDialog", name: "自由选将筛选框", type: "select" },
			{ key: "rightLayout", name: "左右布局", type: "select" },
			{ key: "eruda", name: "调试助手", type: "toggle" },
		],
	};

	return configMap[tabId] || [];
}

/**
 * 显示配置窗口
 * @description 对外暴露的接口，用于打开十周年UI配置中心
 */
export function showDecadeConfigWindow() {
	createConfigWindow();
}

/**
 * 隐藏配置窗口
 * @description 对外暴露的接口，用于关闭配置窗口并清理遮罩层
 */
export function hideDecadeConfigWindow() {
	if (currentOverlay) {
		currentOverlay.remove();
		currentOverlay = null;
	}
}
