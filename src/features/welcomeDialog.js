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

				const escapeHtml = str => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

				let html = escapeHtml(markdown)
					.replace(/^# (.+)$/gm, '<h1 style="font-size: 22px; margin: 8px 0 5px 0; color: #fff; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</h1>')
					.replace(/^## (.+)$/gm, '<h2 style="font-size: 19px; margin: 6px 0 4px 0; color: #fff; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</h2>')
					.replace(/^### (.+)$/gm, '<h3 style="font-size: 17px; margin: 5px 0 3px 0; color: #fff; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</h3>')
					.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin: 2px 0; color: #fff; line-height: 1.5; font-size: 15px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</li>')
					.replace(/^- (.+)$/gm, '<li style="margin: 2px 0; color: #fff; line-height: 1.5; font-size: 15px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">$1</li>')
					.replace(/\[(.+?)\]\((.+?)\)/g, (m, linkText, url) => (/^https?:\/\//i.test(url) ? `<a href="${url}" style="color: #ffd700; text-decoration: underline; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">${linkText}</a>` : linkText))
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
			⌈祥酱，谢谢你今天愿意来见我。请不要生睦酱的气，是我硬是拜托她想来祥酱的家的。抱歉，无论怎样都想当面道歉。真的没打算删去十周年UI的，那天预定的只有一个扩展，就是十周年UI。但是，事情都已经发生了，实在没有办法。抱歉，一定伤害到祥酱你了吧。我想你不原谅也是当然的。擅自删除了重要我们的扩展，真的很抱歉。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈装作一副为了别人的样子啊。想玩不玩是你们的自由，随你们喜欢。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈但是，十周年UI是我们重要的……⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈直到现在还执迷于过去，真让人看不下去。差不多，你也该忘记了吧。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈为什么？为什么要说忘记这种话呢？我们，以前感情明明那么好。每天都开心，大家在一起，现在却玩着不同的扩展也太奇怪了吧。「UI是命运共同体」，这么说的人不正是祥酱吗？⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈命运……？那么，整个无名杀算什么？⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈不是的！⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈哪里不是？言语和行动相互矛盾，十周年UI已经结束了，绝对不可能复活。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈为什么？拜托了，我想让十周年UI重新开始。想回去我们那时候的快乐时光。灯酱和立希酱也是这么期望的，我也打算找睦酱和祥酱回来的。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈是这样一回事吗？⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightgreen;">
			⌈我……⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈为什么，只有我这么想吗？但是，更新十周年UI的是祥酱啊。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈正因如此，我已经亲手将她结束了。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈没有结束！我一直为了十周年UI努力着。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈谁也没有求你那样做。这是最后通牒，从现在开始，不要再和我扯上关系了。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈等等，不要走！不是的！我，真的对大家很重视，最喜欢了。不要！拜托了！拜托了！要是没有祥酱你们的话，我……⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈放开！⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈要怎么做才能回来？只要是我能做的，我什么都愿意做！⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈你是抱着多大的觉悟说出这种话的？区区一介学生，有办法背负他人的人生吗？「什么都愿意做」就是这么沉重的话，做不到的事情就不要说出口。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈但是，我真的……⌋
		</p>
		<p style="margin: 0 0 15px 0; color: lightblue;">
			⌈你这个人，满脑子都只想着自己呢。⌋
		</p>
		<p style="margin: 0 0 15px 0; color: yellow;">
			⌈诶……？⌋
		</p>
		<p style="margin: 0 0 15px 0;">
			至此……十周年UI无期限停更，等待后续有缘人接手…………
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
