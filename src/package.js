/**
 * @fileoverview 扩展包信息定义
 */

import { lib } from "noname";
import "./features/didYouKnow.js";

/**
 * 生成扩展包信息
 * @param {Object} otherInfo - info.json中的其他信息
 * @returns {Object}
 */
export const mainpackage = otherInfo => {
	const pkg = {
		character: { character: {}, translate: {} },
		card: { card: {}, translate: {}, list: [] },
		skill: { skill: {}, translate: {} },
	};

	const pack = { ...pkg, ...otherInfo };

	const githubUrl = "https://github.com/zziyoo/decadeUI";
	const copyHandler = `navigator.clipboard.writeText('${githubUrl}').then(() => alert('已成功复制，粘贴到浏览器打开，部分进不去需要翻墙')).catch(() => alert('复制失败，请手动复制'))`;

	pack.intro = `<a href="javascript:void(0)" onclick="${copyHandler}" style="color: #FFFACD;">点击复制仓库地址</a>`;

	// 点击头像播放音效并打开欢迎welcomeDialog窗口
	if (!window.decadeUIWelcome) {
		window.decadeUIWelcome = {};
	}
	Object.assign(window.decadeUIWelcome, {				//长按1.5s切换子右/点点头像与音效
		mode: window.decadeUIWelcome.mode || "ziyoo",
		_audioName: null,
		_audio: null,
		_longPressTimer: null,
		_longPressTriggered: false,
		_lastToggleAt: 0,
		longPressStart() {
			this._longPressTriggered = false;
			clearTimeout(this._longPressTimer);
			this._longPressTimer = setTimeout(() => {
				this._longPressTriggered = true;
				this._lastToggleAt = Date.now();
				this.toggle();
			}, 1500);
		},
		longPressEnd() {
			clearTimeout(this._longPressTimer);
		},
		toggle() {
			this.mode = this.mode === "diandian" ? "ziyoo" : "diandian";
			const isDiandian = this.mode === "diandian";
			const avatar = document.querySelector(".decade-author-avatar");
			if (avatar) {
				avatar.src = `${lib.assetURL}extension/十周年UI/image/ui/avatar/avatar_${isDiandian ? "diandian" : "ziyoo"}.jpg`;
			}
			const name = document.querySelector(".decade-author-name");
			if (name) {
				name.textContent = isDiandian ? "点点" : "子右";
			}
		},
		show() {
			if (this._longPressTriggered || Date.now() - this._lastToggleAt < 800) {
				this._longPressTriggered = false;
				return;
			}
			const audioName = this.mode === "diandian" ? "Ciallo.mp3" : "manbo.mp3";
			if (audioName !== this._audioName || !this._audio || this._audio.paused) {
				this._audioName = audioName;
				this._audio = new Audio(`extension/十周年UI/audio/${audioName}`);
				this._audio.play();
			}
			// 打开欢迎窗口
			import("./features/welcomeDialog.js").then(module => {
				module.createWelcomeDialog();
			});
		},
	});

	Object.defineProperty(pack, "author", {
		get() {
			const isDiandian = window.decadeUIWelcome?.mode === "diandian";
			return `<img src="${lib.assetURL}extension/十周年UI/image/ui/avatar/avatar_${isDiandian ? "diandian" : "ziyoo"}.jpg" class="author-avatar decade-author-avatar" onclick="window.decadeUIWelcome.show()" onmousedown="window.decadeUIWelcome.longPressStart()" onmouseup="window.decadeUIWelcome.longPressEnd()" onmouseleave="window.decadeUIWelcome.longPressEnd()" ontouchstart="window.decadeUIWelcome.longPressStart()" ontouchend="window.decadeUIWelcome.longPressEnd()" ontouchcancel="window.decadeUIWelcome.longPressEnd()" oncontextmenu="return false" style="cursor:pointer;border-radius:50%;width:50px;height:50px;vertical-align:bottom;touch-action:manipulation;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none"><span class="decade-author-name">${isDiandian ? "点点" : "子右"}</span><br>${window.decadeUIDidYouKnow.getHTML()}`;
		},
	});

	return pack;
};

// 	// 点击头像播放音效并打开欢迎welcomeDialog窗口
// 	if (!window.decadeUIWelcome) {
// 		window.decadeUIWelcome = {
// 			show: () => {
// 				// 播放音效
// 				new Audio("extension/十周年UI/audio/manbo.mp3").play();
// 				// 打开欢迎窗口
// 				import("./features/welcomeDialog.js").then(module => {
// 					module.createWelcomeDialog();
// 				});
// 			},
// 		};
// 	}

// 	Object.defineProperty(pack, "author", {
// 		get() {
// 			return `<img src="${lib.assetURL}extension/十周年UI/image/ui/avatar/avatar_ziyoo.jpg" class="author-avatar" onclick="window.decadeUIWelcome.show()" style="cursor:pointer;border-radius:50%;width:50px;height:50px;vertical-align:bottom">子右<br>${window.decadeUIDidYouKnow.getHTML()}`;
// 		},
// 	});

// 	return pack;
// };