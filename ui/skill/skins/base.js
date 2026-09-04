/**
 * @fileoverview 技能插件基础类
 * 提供所有样式共用的基础功能
 */
import { lib, game, ui, get, ai, _status } from "noname";

/**
 * 创建基础技能插件
 */
export function createBaseSkillPlugin(lib, game, ui, get, ai, _status, app) {
	return {
		name: "skill",

		// 模式过滤
		filter: () => !["chess", "tafang"].includes(get.mode()),

		content(next) {},

		// 初始化定时器
		initTimer() {
			if (this.refreshTimer) clearInterval(this.refreshTimer);
			this.refreshTimer = setInterval(() => {
				if (game.me) ui.updateSkillControl?.(game.me, true);
			}, 1000);
		},

		// 检查技能类型
		checkSkill(skill) {
			const info = lib.skill[skill];
			if (!info) return -1;
			return info.enable ? 1 : 0;
		},

		// 点击技能
		clickSkill() {
			if (this.classList.contains("usable")) {
				const skill = this.dataset.id;
				const item = ui.skillControlArea.querySelector(`[data-id="${skill}"]`);
				if (item) app.mockTouch(item);
			}
		},

		// 创建技能控制节点
		createSkills(skills, node) {
			let same = true;
			if (node) {
				if (skills?.length) {
					for (let i = 0; i < node.skills.length; i++) {
						if (node.skills[i] !== skills[i]) {
							same = false;
							break;
						}
					}
				}
				if (same) return node;
				node.close();
				node.delete();
			}

			if (!skills?.length) return;

			// 创建隐藏的控制节点，放在skillControlArea中
			node = ui.create.div(".control.skillControl", ui.skillControlArea);

			// 继承control的所有方法（保持功能完整）
			Object.assign(node, lib.element.control);

			// 确保节点不显示
			node.style.display = "none";

			skills.forEach(skill => {
				const item = ui.create.div(node);
				item.link = skill;
				item.dataset.id = skill;
				item.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control);
			});

			node.skills = skills;
			node.custom = ui.click.skill;
			return node;
		},

		// 更新装备标记位置
		updateMark(player) {
			const eh = player.node.equips.childNodes.length * 22;
			const bv = Math.max(88, eh) * 0.8 + 1.6;
			player.node.marks.style.bottom = `${bv}px`;
		},

		// 基础重写函数
		initBaseRewrites() {
			// 玩家技能变化时更新
			const methods = ["addSkill", "removeSkill", "addSkillTrigger", "removeSkillTrigger"];
			methods.forEach(method => {
				app.reWriteFunction(lib.element.player, {
					[method]: [
						null,
						function () {
							ui.updateSkillControl(this, true);
						},
					],
				});
			});

			app.reWriteFunction(lib.element.player, {
				awakenSkill: [
					null,
					function () {
						ui.updateSkillControl(this);
					},
				],
				restoreSkill: [
					null,
					function () {
						ui.updateSkillControl(this);
					},
				],
			});

			// 控制关闭时更新
			app.reWriteFunction(lib.element.control, {
				close: [
					null,
					function () {
						if (this.classList.contains("skillControl")) ui.skillControl?.update();
					},
				],
			});

			// 游戏循环和切换
			app.reWriteFunction(game, {
				loop: [
					() => {
						if (game.boss && !ui.skillControl) ui.updateSkillControl(game.me);
						ui.skillControl?.update();
					},
					null,
				],
				swapControl: [null, () => ui.updateSkillControl(game.me, true)],
				swapPlayer: [null, () => ui.updateSkillControl(game.me, true)],
			});

			// 内容
			game.videoContent.updateSkillControl = (player, clear) => ui.updateSkillControl(player, clear);
		},

		// 基础recontent重写
		initRecontentRewrites() {
			app.reWriteFunction(ui.create, {
				dialog: [
					null,
					function (dialog) {
						dialog.classList.add("xdialog");
						app.reWriteFunction(dialog, {
							hide: [
								null,
								function () {
									app.emit("dialog:change", dialog);
								},
							],
						});
					},
				],
			});

			app.reWriteFunction(lib.element.dialog, {
				open: [
					null,
					function () {
						app.emit("dialog:change", this);
					},
				],
				close: [
					null,
					function () {
						app.emit("dialog:change", this);
					},
				],
			});

			app.reWriteFunction(lib.element.player, {
				markSkill: [
					function (args, name) {
						const info = lib.skill[name];
						if (!info) return;
						if (info.limited || info.intro?.content === "limited") return this;
					},
				],
			});

			app.reWriteFunction(lib.configMenu.appearence.config, {
				update: [
					null,
					function (res, config, map) {
						map.button_press.hide();
					},
				],
			});

			app.on("playerUpdateE", player => this.updateMark(player));
		},

		// 标记元素定义
		element: {
			mark: {
				delete() {
					this.remove();
				},
				setName(name) {
					name = get.translation(name) || name;
					const hasName = name?.trim();
					this.classList.toggle("unshow", !hasName);
					this.node.name.innerHTML = hasName || "";
					return this;
				},
				setCount(count) {
					const isNum = typeof count === "number";
					this.node.count.innerHTML = isNum ? count : "";
					this.node.count.classList.toggle("unshow", !isNum);
					return this;
				},
				setExtra(extra) {
					if (!Array.isArray(extra)) extra = [extra];
					const str = extra
						.filter(item => item && typeof item === "string")
						.map(item => (item.startsWith("#") ? `<br><div>${item.slice(1)}</div>` : `<div>${item}</div>`))
						.join("");
					this.node.extra.classList.toggle("unshow", !str);
					this.node.extra.innerHTML = str || "";
					return this;
				},
				setBackground(name, type) {
					const skill = lib.skill[this.name];
					if (skill?.intro?.markExtra) return this;
					if (type === "character") {
						name = get.slimNameHorizontal(name) || name;
						this._characterMark = true;
						return this.setExtra(name);
					}
					return this;
				},
				_customintro(uiintro) {
					const node = this;
					const info = node.info;
					const player = node.parentNode.parentNode;

					if (info.name) {
						if (typeof info.name === "function") {
							const named = info.name(player.storage[node.skill], player);
							if (named) uiintro.add(named);
						} else {
							uiintro.add(info.name);
						}
					} else if (info.name !== false) {
						uiintro.add(get.translation(node.skill));
					}

					if (typeof info.mark === "function") {
						const stint = info.mark(uiintro, player.storage[node.skill], player);
						if (stint) {
							const placetext = uiintro.add(`<div class="text" style="display:inline">${stint}</div>`);
							if (!stint.startsWith('<div class="skill"')) uiintro._place_text = placetext;
						}
					} else {
						const stint = get.storageintro(info.content, player.storage[node.skill], player, uiintro, node.skill);
						if (stint) {
							if (stint.startsWith("@")) {
								uiintro.add(`<div class="caption">${stint.slice(1)}</div>`);
							} else {
								const placetext = uiintro.add(`<div class="text" style="display:inline">${stint}</div>`);
								if (!stint.startsWith('<div class="skill"')) uiintro._place_text = placetext;
							}
						}
					}
					uiintro.add(ui.create.div(".placeholder.slim"));
				},
			},
		},

		click: {
			mark(e) {
				e.stopPropagation();
				delete this._waitingfordrag;
				if (_status.dragged || _status.clicked || ui.intro) return;
				const rect = this.getBoundingClientRect();
				ui.click.touchpop();
				ui.click.intro.call(this, { clientX: rect.left + 18, clientY: rect.top + 12 });
				_status.clicked = false;
			},
		},
	};
}
