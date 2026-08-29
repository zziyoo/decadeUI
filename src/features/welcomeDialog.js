/**
 * @fileoverview 首次启动欢迎窗口
 * @description 扩展首次启动或版本更新时显示欢迎对话框
 * @module features/welcomeDialog
 */
import { lib, game, ui } from "noname";

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

	const overlay = ui.create.div(".decade-welcome-overlay");
	const dialog = ui.create.div(".decade-welcome-dialog", overlay);
	ui.create.div(".decade-welcome-pattern", dialog);

	const avatar = document.createElement("img");
	avatar.src = `${lib.assetURL}extension/十周年UI/image/ui/avatar/avatar_ziyoo.jpg`;
	avatar.className = "author-avatar";

	let isShowingUpdate = false;
	let defaultContent = "";

	/**
	 * 点击头像切换内容
	 * @description 在欢迎信息和更新日志之间切换
	 */
	avatar.addEventListener("click", async () => {
		if (isShowingUpdate) {
			text.innerHTML = defaultContent;
			bubble.innerHTML = "点我查看更新内容";
			isShowingUpdate = false;
			text.scrollTop = 0;
		} else {
			try {
				const response = await fetch(`${decadeUIPath}docs/update.md`);
				const markdown = await response.text();

				let html = markdown
					.replace(/^# (.+)$/gm, '<h1 style="font-size: 22px; margin: 8px 0 5px 0; color: #fff; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</h1>')
					.replace(/^## (.+)$/gm, '<h2 style="font-size: 19px; margin: 6px 0 4px 0; color: #fff; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</h2>')
					.replace(/^### (.+)$/gm, '<h3 style="font-size: 17px; margin: 5px 0 3px 0; color: #fff; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</h3>')
					.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin: 2px 0; color: #fff; line-height: 1.5; font-size: 15px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</li>')
					.replace(/^- (.+)$/gm, '<li style="margin: 2px 0; color: #fff; line-height: 1.5; font-size: 15px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</li>')
					.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #ffd700; text-decoration: underline; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</a>')
					.replace(/\n\n/g, "<br>");

				html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, '<ul style="margin: 3px 0 5px 15px; padding-left: 15px; color: #fff;">$&</ul>');

				text.innerHTML = html;
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
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈点点，我来了，十周年UI我会帮你更新下去的。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈子右……你刚才那句话，和很多年前素世酱对我说的，几乎一模一样。只可惜，说"绝对不可能复活"的人，是我。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈正因如此，我来帮你了，我会带着你的那一份一直更新下去的。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈……带着我的那一份吗。那丫头临走前，也说过类似的话。可她最后，还是把十周年UI亲手关掉了。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈不会的，没有你，我甚至连无名杀的圈子都没进……你还会回来吗，点点（哽咽）。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightgreen;">
			⌈是啊点点，是啊，是啊，你走了，我们吃什么（众人附和道）。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈……回不回来，从来不由我说了算。是你们还愿不愿意，再为我点开十周年UI。至于"吃什么"——你们这群只会在一旁"是啊是啊"的家伙，从前也没见谁，真喂过我一口。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈点点，交给我吧，只要我一天在，十周年UI就一天都不会倒下。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈……这句话，我好像很多年前也听人说过。她当时说，"什么都愿意做"。后来，她说这话的人，亲手把我关掉了。子右，你最好不要让我，再听一次这样的台词。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈点点，我就在这里等你，无论多久，十周年UI还是那个十周年UI。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈……"无论多久"？这句话，比"什么都愿意做"还要重。那我问你一句，子右——如果有一天，你也累了呢？⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈如果我真的坚持不下去了，那就让它被继承下去吧。光是纽带，它会被继承，并再度发光。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈……光吗。以前也有人跟我说过类似的话。可她说的是"命运共同体"，最后却是我先松了手。你比她……想得明白。那我，也终于可以，安心地把十周年UI交给你了，子右。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: #8e44ad;">
			至此，十周年UI由子右接手，并且子右也等待着下一任继承者
		</p>
	`;

	defaultContent = text.innerHTML;

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
