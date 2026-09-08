/**
 * @fileoverview 首次启动欢迎窗口
 * @description 扩展首次启动或版本更新时显示欢迎对话框
 * @module features/welcomeDialog
 */
import { lib, game, ui } from "noname";
import { WELCOME_HISTORY } from "./welcomeHistory.js";
import { UPDATE_HISTORY } from "./welcomeUpdateHistory.js";

/**
 * 将更新日志markdown转换为HTML
 * @param {string} markdown - 原始markdown文本
 * @returns {string} 转换后的HTML
 */
function updateMdToHtml(markdown) {
	let html = markdown
		.replace(/\r\n/g, "\n")
		.replace(/^### (.+)$/gm, '<h3 style="font-size: 17px; margin: 5px 0 3px 0; color: #fff; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</h3>')
		.replace(/^## (.+)$/gm, '<h2 style="font-size: 19px; margin: 6px 0 4px 0; color: #fff; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</h2>')
		.replace(/^# (.+)$/gm, '<h1 style="font-size: 22px; margin: 8px 0 5px 0; color: #fff; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</h1>')
		.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin: 2px 0; color: #fff; line-height: 1.5; font-size: 15px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</li>')
		.replace(/^- (.+)$/gm, '<li style="margin: 2px 0; color: #fff; line-height: 1.5; font-size: 15px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</li>')
		.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #ffd700; text-decoration: underline; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</a>')
		.replace(/\n\n/g, "<br>")
		.replace(/\n/g, "<br>");
	html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, '<ul style="margin: 3px 0 5px 15px; padding-left: 15px; color: #fff;">$&</ul>');
	return html;
}

/**
 * 加载欢迎窗口样式表
 * @description 动态加载CSS文件，避免重复加载
 */
function loadStyles() {
	if (document.getElementById("decade-welcome-styles")) return;

	const link = document.createElement("link");
	link.id = "decade-welcome-styles";
	link.rel = "stylesheet";
	link.href = `${lib.assetURL}extension/十周年UI/src/features/welcomeDialog.css`;
	document.head.appendChild(link);
}

/**
 * 检查是否需要显示欢迎窗口
 * @param {Object} extensionInfo - 扩展信息对象
 * @param {string} extensionInfo.version - 当前扩展版本号
 * @returns {boolean} 是否需要显示欢迎窗口
 */
function shouldShowWelcome(extensionInfo) {
	const storageKey = "extension_十周年UI_welcomeVersion";
	const lastVersion = lib.config[storageKey];
	const currentVersion = extensionInfo.version;

	if (!lastVersion || lastVersion !== currentVersion) {
		game.saveConfig(storageKey, currentVersion);
		return true;
	}

	return false;
}

/**
 * 创建欢迎对话框
 * @description 显示欢迎信息和更新日志，支持点击头像切换内容
 */
export function createWelcomeDialog() {
	loadStyles();

	// 避免多个欢迎框叠加（如长按头像与自动弹出同时触发）
	const existing = document.querySelector(".decade-welcome-overlay");
	if (existing) {
		existing.remove();
	}

	const overlay = ui.create.div(".decade-welcome-overlay");
	const dialog = ui.create.div(".decade-welcome-dialog", overlay);
	ui.create.div(".decade-welcome-pattern", dialog);

	const avatar = document.createElement("img");
	avatar.src = `${lib.assetURL}extension/十周年UI/image/ui/avatar/avatar_ziyoo.jpg`;
	avatar.className = "author-avatar";

	let isShowingUpdate = false;
	let isShowingHistory = false;
	let historyTab = "qianyan";
	let defaultContent = "";
	/**
	 * 点击头像切换内容
	 * @description 在欢迎信息和更新日志之间切换
	 */
	avatar.addEventListener("click", async () => {
		if (isShowingHistory) {
			historyBubble.innerHTML = "点我查看历史更新";
			text.innerHTML = defaultContent;
			isShowingHistory = false;
			text.scrollTop = 0;
			return;
		}
		if (isShowingUpdate) {
			text.innerHTML = defaultContent;
			bubble.innerHTML = "点我查看更新内容";
			isShowingUpdate = false;
			text.scrollTop = 0;
		} else {
			try {
				const response = await fetch(`${decadeUIPath}docs/update.md`);
				const markdown = await response.text();
				text.innerHTML = updateMdToHtml(markdown);
				bubble.innerHTML = "点我返回前言";
				isShowingUpdate = true;
				text.scrollTop = 0;
			} catch (e) {
				text.innerHTML = '<p style="color: #fff; text-align: center;">更新日志加载失败 (´；ω；`)</p>';
			}
		}
	});

	dialog.appendChild(avatar);

	const bubble = ui.create.div(".decade-welcome-bubble", dialog);
	bubble.innerHTML = "点我查看更新内容";

	const text = ui.create.div(".decade-welcome-text", dialog);
	text.innerHTML = `
		<p style="margin: 0 0 15px 0; color: #ffd700;">
			风雨激荡，山河依旧，一片丹心付九州
		</p>
		<p style="margin: 0 0 15px 0; color: #ffd700;">
			秋风萧瑟犹觉爽，换了人间，壮志未休
		</p>
		<p style="margin: 0 0 15px 0; color: #ffd700;">
			五十年风云几度，回望来时路，九泉当含笑
		</p>
		<p style="margin: 0 0 15px 0; color: #ffd700;">
			昔山河万里，今灯火长明，多少旧梦已如愿
		</p>
		<p style="margin: 0 0 15px 0; color: #ffd700;">
			今依旧
		</p>
		<p style="margin: 0; color: #fff;">
			----九月九日纪念教员同志
		</p>
	`;

	defaultContent = text.innerHTML;

	const diandianAvatar = document.createElement("img");
	diandianAvatar.src = `${lib.assetURL}extension/十周年UI/image/ui/avatar/avatar_diandian.jpg`;
	diandianAvatar.className = "author-avatar";
	diandianAvatar.style.left = "30px";
	diandianAvatar.style.right = "auto";
	dialog.appendChild(diandianAvatar);

	const historyBubble = ui.create.div(".decade-welcome-bubble", dialog);
	historyBubble.style.left = "115px";
	historyBubble.style.right = "auto";
	historyBubble.innerHTML = "点我查看历史更新";

	const tabStyle = active =>
		active ? "color: #fff;" : "color: rgba(255, 255, 255, 0.45);";
	const tabBase =
		"font-size: 17px; font-weight: bold; cursor: pointer; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6); transition: all 0.3s ease;";

	const renderQianyanItems = () =>
		WELCOME_HISTORY.slice()
			.reverse()
			.map(item => {
				const bodyHtml = item.dialogs
					.map(d => `<p style="margin: 0 0 12px 0; color: ${d.color};">${d.text}</p>`)
					.join("");
				return `
				<div class="decade-welcome-history-item" style="position: relative; width: 100%; box-sizing: border-box; margin-bottom: 12px;">
					<div class="decade-welcome-history-head" style="position: relative; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; border-radius: 12px; padding: 10px 14px; cursor: pointer; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35);">
						<span class="era-badge" style="background: #ff6b9d; color: #fff; font-size: 12px; font-weight: bold; padding: 2px 10px; border-radius: 10px; flex-shrink: 0;">${item.era}</span>
						<span class="history-title" style="color: #fff; font-size: 16px; font-weight: bold; flex: 1; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);">${item.title}</span>
						${item.isCurrent ? '<span class="current-badge" style="background: rgba(255, 255, 255, 0.6); color: #ff6b9d; font-size: 12px; font-weight: bold; padding: 2px 10px; border-radius: 10px; flex-shrink: 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);">当前前言</span>' : ""}
						<span class="history-date" style="color: rgba(255, 255, 255, 0.8); font-size: 13px; flex-shrink: 0;">${item.date}</span>
						<span class="history-arrow" style="color: #fff; font-size: 14px; flex-shrink: 0;">▾</span>
					</div>
					<div class="decade-welcome-history-body" style="position: relative; display: none; padding: 10px 6px 4px 12px;">${bodyHtml}</div>
				</div>
			`;
			})
			.join("");

	const renderGengxinItems = () =>
		UPDATE_HISTORY.slice()
			.reverse()
			.map(item => {
				const bodyHtml = updateMdToHtml(item.md);
				return `
				<div class="decade-welcome-history-item" style="position: relative; width: 100%; box-sizing: border-box; margin-bottom: 12px;">
					<div class="decade-welcome-history-head" style="position: relative; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; border-radius: 12px; padding: 10px 14px; cursor: pointer; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35);">
						<span class="history-title" style="color: #fff; font-size: 16px; font-weight: bold; flex: 1; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);">${item.title}</span>
						${item.isCurrent ? '<span class="current-badge" style="background: rgba(255, 255, 255, 0.6); color: #ff6b9d; font-size: 12px; font-weight: bold; padding: 2px 10px; border-radius: 10px; flex-shrink: 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);">当前更新</span>' : ""}
						<span class="history-date" style="color: rgba(255, 255, 255, 0.8); font-size: 13px; flex-shrink: 0;">${item.date}</span>
						<span class="history-arrow" style="color: #fff; font-size: 14px; flex-shrink: 0;">▾</span>
					</div>
					<div class="decade-welcome-history-body" style="position: relative; display: none; padding: 10px 6px 4px 12px;">${bodyHtml}</div>
				</div>
			`;
			})
			.join("");

	const renderHistoryTab = tab => {
		const isQianyan = tab === "qianyan";
		text.innerHTML = `
			<div class="decade-welcome-history" style="position: relative; width: 100%; box-sizing: border-box;">
				<div style="position: relative; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
					<span id="decade-welcome-tab-qianyan" style="${tabBase} ${tabStyle(isQianyan)}">历史前言</span>
					<span id="decade-welcome-tab-gengxin" style="${tabBase} ${tabStyle(!isQianyan)}">版本更新</span>
				</div>
				${isQianyan ? renderQianyanItems() : renderGengxinItems()}
			</div>
		`;
		historyTab = tab;
		text.scrollTop = 0;

		text.querySelector("#decade-welcome-tab-qianyan").addEventListener("click", () => {
			if (historyTab !== "qianyan") renderHistoryTab("qianyan");
		});
		text.querySelector("#decade-welcome-tab-gengxin").addEventListener("click", () => {
			if (historyTab !== "gengxin") renderHistoryTab("gengxin");
		});

		text.querySelectorAll(".decade-welcome-history-head").forEach(head => {
			head.addEventListener("click", () => {
				const item = head.parentElement;
				const body = item.querySelector(".decade-welcome-history-body");
				const isOpen = !item.classList.contains("open");
				item.classList.toggle("open");
				body.style.display = isOpen ? "block" : "none";
			});
		});
	};

	const toggleHistory = () => {
		if (isShowingHistory) {
			text.innerHTML = defaultContent;
			isShowingHistory = false;
			historyBubble.innerHTML = "点我查看历史更新";
			text.scrollTop = 0;
			return;
		}
		if (isShowingUpdate) {
			isShowingUpdate = false;
			bubble.innerHTML = "点我查看更新内容";
		}
		isShowingHistory = true;
		historyBubble.innerHTML = "点我返回前言";
		renderHistoryTab("qianyan");
	};

	diandianAvatar.addEventListener("click", toggleHistory);
	historyBubble.addEventListener("click", toggleHistory);

	lib.setScroll(text);

	overlay.addEventListener("click", e => {
		if (e.target === overlay) {
			overlay.remove();
		}
	});

	document.body.appendChild(overlay);
}

/**
 * 初始化欢迎对话框
 * @param {Object} extensionInfo - 扩展信息对象
 * @param {string} extensionInfo.version - 当前扩展版本号
 * @description 检查版本并在需要时延迟显示欢迎窗口
 */
export function setupWelcomeDialog(extensionInfo) {
	if (!shouldShowWelcome(extensionInfo)) {
		return;
	}

	setTimeout(() => {
		createWelcomeDialog();
	}, 1000);
}
