/**
 * @fileoverview 新杀风格技能插件
 * @description 转换技翻转动画、gskillControl支持
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseSkillPlugin } from "./base.js";
import { getAvailableSkills, updateSkillUsability, isGSkillCacheSame, shouldSkipEquipSkill } from "./gskillMixin.js";
import { skillButtonTooltip } from "../../../src/ui/skillButtonTooltip.js";

export function createXinshaSkillPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseSkillPlugin(lib, game, ui, get, ai, _status, app);

	const plugin = {
		...base,

		precontent() {
			this.initCreateFunctions();
			this.initUpdateFunctions();
			base.initBaseRewrites.call(this);

			// gskillControl 更新
			app.reWriteFunction(game, {
				loop: [
					() => {
						if (game.boss && !ui.skillControl) ui.updateSkillControl(game.me);
						ui.skillControl?.update();
						if (!lib.config.phonelayout) {
							if (ui.gskillControl) ui.gskillControl.update();
							else if (game.me) ui.updateSkillControl(game.me);
						}
					},
					null,
				],
			});

			game.videoContent.updateSkillControl = (player, clear) => ui.updateSkillControl(player, clear);
			this.initTimer();
			ui.skillControlArea = ui.create.div();
		},

		recontent() {
			this.initDialogRewrites();
			this.initPlayerRewrites();
			this.initConfigRewrites();
			this.initEventListeners();
			this.initTimer();
		},

		initCreateFunctions() {
			Object.assign(ui.create, {
				skills: skills => {
					ui.skills = plugin.createSkills(skills, ui.skills);
					ui.skillControl?.update();
					return ui.skills;
				},
				skills2: skills => {
					ui.skills2 = plugin.createSkills(skills, ui.skills2);
					ui.skillControl?.update();
					return ui.skills2;
				},
				skills3: skills => {
					ui.skills3 = plugin.createSkills(skills, ui.skills3);
					ui.skillControl?.update();
					return ui.skills3;
				},
				gskills: skills => {
					ui.gskills = plugin.createGSkills(skills, ui.gskills);
					if (lib.config.phonelayout) {
						ui.skillControl?.update();
					} else {
						ui.gskillControl?.update();
					}
					return ui.gskills;
				},
				skillControl: clear => {
					if (!ui.skillControl) {
						ui.skillControl = plugin.createSkillControl();
					}
					if (clear) {
						ui.skillControl.node.enable.innerHTML = "";
						ui.skillControl.node.trigger.innerHTML = "";
					}
					return ui.skillControl;
				},
				gskillControl: clear => {
					if (lib.config.phonelayout) return null;
					if (!ui.gskillControl) {
						const node = ui.create.div(".gskill-control", ui.arena);
						node.node = {
							enable: ui.create.div(".enable", node),
							trigger: ui.create.div(".trigger", node),
						};
						node._cachedSkills = [];
						Object.assign(node, plugin.gskillControlElement);
						ui.gskillControl = node;
					}
					if (clear) {
						ui.gskillControl.node.enable.innerHTML = "";
						ui.gskillControl.node.trigger.innerHTML = "";
						ui.gskillControl._cachedSkills = [];
					}
					return ui.gskillControl;
				},
			});
		},

		createSkillControl() {
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
			const cls = isRight ? ".skill-control" : ".skill-controlzuoshou";
			const node = ui.create.div(cls, ui.arena);
			node.node = {
				enable: ui.create.div(".enable", node),
				trigger: ui.create.div(".trigger", node),
			};
			node._cachedGSkills = [];
			Object.assign(node, plugin.controlElement);
			return node;
		},

		// 获取虚拟装备的技能
		_getExtraEquipSkills(player) {
			const skills = [];
			if (!player?.extraEquip?.length) return skills;
			for (const [sourceSkill, equipName] of player.extraEquip) {
				const info = lib.skill[sourceSkill];
				if (info?.group) {
					const groups = Array.isArray(info.group) ? info.group : [info.group];
					groups.forEach(g => {
						if (lib.skill[g]?.equipSkill) skills.push(g);
					});
				}
				if (equipName && lib.card[equipName]?.skills) {
					skills.push(...lib.card[equipName].skills);
				}
			}
			return skills;
		},

		initUpdateFunctions() {
			ui.updateSkillControl = (player, clear) => {
				const eSkills = player.getSkills("e", true, false).slice(0);
				eSkills.addArray(plugin._getExtraEquipSkills(player));
				let skills = player.getSkills("invisible", null, false);
				let gSkills = ui.skills2?.skills?.length ? ui.skills2.skills : null;

				skills = skills.filter(skill => {
					const info = get.info(skill);
					return !info?.nopop || info.enable || skill.startsWith("olhedao_tianshu_");
				});

				const iSkills = player.invisibleSkills.slice(0);
				game.expandSkills(iSkills);
				skills.addArray(iSkills.filter(s => get.info(s)?.enable));

				// 过滤global关联技能避免重复
				if (gSkills) {
					const globalSkills = new Set();
					skills.forEach(s => {
						const info = get.info(s);
						if (info?.global) {
							const globals = Array.isArray(info.global) ? info.global : [info.global];
							globals.forEach(g => globalSkills.add(g));
						}
					});
					gSkills = gSkills.filter(s => !globalSkills.has(s));
				}

				if (player === game.me) {
					const skillControl = ui.create.skillControl(clear);
					skillControl.add(skills, eSkills);
					if (lib.config.phonelayout) {
						if (gSkills?.length) skillControl.setGSkills(gSkills, eSkills);
						skillControl.addCachedGSkills(eSkills);
					}
					skillControl.update();

					if (!lib.config.phonelayout) {
						const gskillControl = ui.create.gskillControl(false);
						if (gskillControl) {
							if (gSkills?.length) gskillControl.setSkills(gSkills, eSkills);
							gskillControl.update();
						}
					}

					game.addVideo("updateSkillControl", player, clear);
				}

				plugin.updateSkillMarksForPlayer(player);
			};
		},

		updateSkillMarksForPlayer(player) {
			const xiandingji = {};
			const juexingji = {};

			player.getSkills("invisible", null, false).forEach(skill => {
				const info = get.info(skill);
				if (!info) return;

				if (get.is.zhuanhuanji(skill, player) || info.limited || info.intro?.content === "limited") {
					xiandingji[skill] = player.awakenedSkills.includes(skill);
				}
				if ((info.juexingji || info.dutySkill) && player.awakenedSkills.includes(skill)) {
					juexingji[skill] = true;
				}
			});

			plugin.updateSkillMarks(player, xiandingji, juexingji);
		},

		// 更新转换技标记（带翻转动画）
		updateZhuanhuanjiMark(mark, skillId) {
			if (!game.me) return;
			const info = lib.skill[skillId];
			if (!info?.zhuanhuanji) return;

			const storage = game.me.storage[skillId];
			const isYin = storage === true || storage === "yin";
			const newState = isYin ? "yin" : "yang";
			const oldState = mark.dataset.state;

			if (oldState && oldState !== newState) {
				mark.classList.remove("yang", "yin");
				mark.classList.add(newState, "flipping");
				mark.dataset.state = newState;
				mark.addEventListener("animationend", function handler() {
					mark.classList.remove("flipping");
					mark.removeEventListener("animationend", handler);
				});
			} else if (!oldState) {
				mark.classList.add(newState);
				mark.dataset.state = newState;
			}
		},

		// 更新限定技标记
		updateXiandingjiMark(node, skillId) {
			if (!game.me) return;
			const isUsed = game.me.awakenedSkills.includes(skillId);
			node.classList.toggle("used", isUsed);
		},

		// gskillControl 控制元素
		gskillControlElement: {
			// 设置技能列表，仅在变化时重建DOM
			setSkills(skills, eSkills) {
				if (!skills?.length) {
					this._cachedSkills = [];
					this.node.enable.innerHTML = "";
					return this;
				}

				if (isGSkillCacheSame(this._cachedSkills, skills)) return this;

				this._cachedSkills = skills.slice();
				this.node.enable.innerHTML = "";

				skills.forEach(skillId => {
					const info = get.info(skillId);
					if (!info) return;

					if (shouldSkipEquipSkill(skillId, eSkills, { lib, game, ui, get, ai, _status })) return;

					const skillName = get.translation(skillId).slice(0, 2);
					const isLimited = info.limited;
					const cls = isLimited ? ".xiandingji" : ".skillitem";
					const node = ui.create.div(cls, this.node.enable, skillName);
					node.dataset.id = skillId;

					if (info.zhuanhuanji) {
						node.classList.add("zhuanhuanji");
						const mark = ui.create.div(".zhuanhuanji-mark", node);
						plugin.updateZhuanhuanjiMark(mark, skillId);
					}

					if (isLimited) {
						ui.create.div(".xiandingji-mark", node);
						plugin.updateXiandingjiMark(node, skillId);
					}

					if (game.me && get.is.locked(skillId, game.me)) node.classList.add("locked");

					node.addEventListener(lib.config.touchscreen ? "touchend" : "click", () => {
						if (lib.config["extension_十周年UI_bettersound"]) {
							game.playAudio("..", "extension", "十周年UI", "audio/SkillBtn");
						}
					});
					app.listen(node, plugin.clickSkill);

					// 添加悬浮提示
					skillButtonTooltip.attach(node, skillId, game.me);
				});

				return this;
			},

			update() {
				const availableSkills = getAvailableSkills(ui);

				Array.from(this.node.enable.childNodes).forEach(item => {
					const skillId = item.dataset.id;
					let isUsable = availableSkills.includes(skillId);
					if (isUsable && game.me && !lib.skill[skillId]?.enable && get.is.locked(skillId, game.me)) isUsable = false;

					item.classList.toggle("usable", isUsable);
					item.classList.toggle("select", _status.event.skill === skillId);

					const mark = item.querySelector(".zhuanhuanji-mark");
					if (mark) plugin.updateZhuanhuanjiMark(mark, skillId);
					if (item.classList.contains("xiandingji")) plugin.updateXiandingjiMark(item, skillId);
				});
			},
		},

		controlElement: {
			// 设置gskill缓存（触屏布局用）
			setGSkills(skills, eSkills) {
				if (!skills?.length) return this;
				if (isGSkillCacheSame(this._cachedGSkills, skills)) return this;
				this._cachedGSkills = skills.slice();
				return this;
			},

			// 添加缓存的gskill到DOM（触屏布局用）
			addCachedGSkills(eSkills) {
				if (!this._cachedGSkills?.length) return this;
				this._cachedGSkills.forEach(skillId => {
					if (this.querySelector(`[data-id="${skillId}"]`)) return;

					const info = get.info(skillId);
					if (!info) return;

					if (shouldSkipEquipSkill(skillId, eSkills, { lib, game, ui, get, ai, _status })) return;

					const skillName = get.translation(skillId).slice(0, 2);
					const isLimited = info.limited;
					const cls = isLimited ? ".xiandingji" : ".skillitem";
					const node = ui.create.div(cls, this.node.enable, skillName);
					node.dataset.id = skillId;
					node.dataset.gskill = "true";

					if (info.zhuanhuanji) {
						node.classList.add("zhuanhuanji");
						const mark = ui.create.div(".zhuanhuanji-mark", node);
						plugin.updateZhuanhuanjiMark(mark, skillId);
					}

					if (isLimited) {
						ui.create.div(".xiandingji-mark", node);
						plugin.updateXiandingjiMark(node, skillId);
					}

					if (game.me && get.is.locked(skillId, game.me)) node.classList.add("locked");

					node.addEventListener(lib.config.touchscreen ? "touchend" : "click", () => {
						if (lib.config["extension_十周年UI_bettersound"]) {
							game.playAudio("..", "extension", "十周年UI", "audio/SkillBtn");
						}
					});
					app.listen(node, plugin.clickSkill);

					// 添加悬浮提示
					skillButtonTooltip.attach(node, skillId, game.me);
				});
				return this;
			},

			add(skill, eSkills) {
				if (Array.isArray(skill)) {
					skill.forEach(s => this.add(s, eSkills));
					return this;
				}

				if (lib.config["extension_十周年UI_aloneEquip"] && eSkills?.length) {
					const expandedE = game.expandSkills(eSkills.slice());
					const expandedS = game.expandSkills([skill]);
					if (expandedS.some(s => expandedE.includes(s))) return this;
				}

				// 展开技能(含group/global)
				const expandWithGlobal = skillId => {
					const result = [skillId];
					const info = get.info(skillId);
					if (info?.group) {
						const groups = Array.isArray(info.group) ? info.group : [info.group];
						groups.forEach(g => {
							if (lib.skill[g]) result.push(g);
						});
					}
					if (info?.global) {
						const globals = Array.isArray(info.global) ? info.global : [info.global];
						globals.forEach(g => {
							if (lib.skill[g]) result.push(g);
						});
					}
					return result;
				};

				const skills = expandWithGlobal(skill).map(s => app.get.skillInfo(s));
				const enableSkills = skills.filter(s => s.type === "enable");
				// 优先显示主动技能
				const showSkills = enableSkills.length ? enableSkills : skills;

				showSkills.forEach(item => {
					let node = this.querySelector(`[data-id="${item.id}"]`);
					if (node) return;

					if (lib.config["extension_十周年UI_aloneEquip"] && eSkills?.length) {
						if (game.expandSkills(eSkills.slice()).includes(item.id)) return;
					}

					if (item.type === "enable") {
						const skillName = get.translation(item.name).slice(0, 2);
						const isLimited = lib.skill[item.id].limited;
						const cls = isLimited ? ".xiandingji" : ".skillitem";
						node = ui.create.div(cls, this.node.enable, skillName);
						node.dataset.id = item.id;

						if (lib.skill[item.id]?.zhuanhuanji) {
							node.classList.add("zhuanhuanji");
							const mark = ui.create.div(".zhuanhuanji-mark", node);
							plugin.updateZhuanhuanjiMark(mark, item.id);
						}

						if (isLimited) {
							ui.create.div(".xiandingji-mark", node);
							plugin.updateXiandingjiMark(node, item.id);
						}

						if (get.is.locked(item.id, game.me)) node.classList.add("locked");

						node.addEventListener(lib.config.touchscreen ? "touchend" : "click", () => {
							if (lib.config["extension_十周年UI_bettersound"]) {
								game.playAudio("..", "extension", "十周年UI", "audio/SkillBtn");
							}
						});
						app.listen(node, plugin.clickSkill);

						// 添加悬浮提示
						skillButtonTooltip.attach(node, item.id, game.me);

						return;
					}

					if (!item.info || !item.translation) return;
					if (eSkills?.includes(item.id)) return;

					const targetNode = lib.config.phonelayout ? "trigger" : "enable";
					node = ui.create.div(".skillitem", this.node[targetNode], get.translation(item.name).slice(0, 2));
					node.dataset.id = item.id;

					// 添加悬浮提示
					skillButtonTooltip.attach(node, item.id, game.me);

					if (lib.skill[item.id]?.zhuanhuanji) {
						node.classList.add("zhuanhuanji");
						const mark = ui.create.div(".zhuanhuanji-mark", node);
						plugin.updateZhuanhuanjiMark(mark, item.id);
					}

					if (get.is.locked(item.id, game.me)) node.classList.add("locked");
				});

				return this;
			},

			update() {
				const skills = getAvailableSkills(ui);
				if (lib.config.phonelayout && ui.gskills?.skills) skills.addArray(ui.gskills.skills);

				Array.from(this.node.enable.childNodes).forEach(item => {
					const skillId = item.dataset.id;
					let isUsable = skills.includes(skillId);
					if (isUsable && game.me && !lib.skill[skillId]?.enable && get.is.locked(skillId, game.me)) isUsable = false;

					item.classList.toggle("usable", isUsable);
					item.classList.toggle("select", _status.event.skill === skillId);

					const mark = item.querySelector(".zhuanhuanji-mark");
					if (mark) plugin.updateZhuanhuanjiMark(mark, skillId);
					if (item.classList.contains("xiandingji")) plugin.updateXiandingjiMark(item, skillId);
				});

				const level1 = Math.min(4, this.node.trigger.childNodes.length);
				const count = this.node.enable.childNodes.length;
				const level2 = count > 2 ? 4 : count > 0 ? 2 : 0;
				ui.arena.dataset.sclevel = Math.max(level1, level2);
			},
		},

		// 创建gskills（兼容层）
		createGSkills(skills, node) {
			// 触屏布局下同步更新 skillControl 的 gskill 缓存
			if (lib.config.phonelayout) {
				if (ui.skillControl && skills?.length) {
					ui.skillControl.setGSkills(skills, []);
					ui.skillControl.addCachedGSkills([]);
				}
				return null;
			}

			if (plugin.isSameSkills(skills, node)) return node;

			if (node) {
				node.close();
				node.delete();
			}

			if (!skills?.length) return;

			const newNode = ui.create.div(".gskill-control", ui.skillControlArea);
			Object.assign(newNode, lib.element.control);
			newNode.style.display = "none";

			skills.forEach(skill => {
				const item = ui.create.div(newNode);
				item.link = skill;
				item.dataset.id = skill;
				item.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control);
			});

			newNode.skills = skills;
			newNode.custom = ui.click.skill;

			if (ui.gskillControl && skills.length) {
				ui.gskillControl.setSkills(skills, []);
			}

			return newNode;
		},

		isSameSkills(skills, node) {
			if (!node) return false;
			if (!skills?.length) return true;
			for (let i = 0; i < node.skills.length; i++) {
				if (node.skills[i] !== skills[i]) return false;
			}
			return true;
		},

		updateSkillMarks(player, xiandingji, juexingji) {
			let node = player.node.xSkillMarks;
			if (!node) {
				node = player.node.xSkillMarks = ui.create.div(".skillMarks", player);
			}

			const playerMarkStyle = lib.config["extension_十周年UI_playerMarkStyle"];
			if (playerMarkStyle !== "decade") {
				node.style.display = "none";
				return;
			}
			node.style.display = "";

			Array.from(node.childNodes).forEach(item => {
				if (!xiandingji.hasOwnProperty(item.dataset.id) && !juexingji[item.dataset.id]) {
					item.remove();
				}
			});

			Object.entries(xiandingji).forEach(([skill, used]) => {
				if (player.hiddenSkills.includes(skill) && player !== game.me) return;

				const info = lib.skill[skill];
				let item = node.querySelector(`[data-id="${skill}"]`);

				if (!item) {
					const cls = info.zhuanhuanji ? ".skillMarkItem.zhuanhuanji" : ".skillMarkItem.xiandingji";
					item = ui.create.div(cls, node, "");
				}

				item.classList.toggle("used", used);
				item.dataset.id = skill;
			});

			Array.from(node.querySelectorAll(".juexingji")).forEach(item => {
				if (!juexingji[item.dataset.id]) item.remove();
			});

			Object.keys(juexingji).forEach(skill => {
				if (player.hiddenSkills.includes(skill) && player !== game.me) return;
				if (node.querySelector(`[data-id="${skill}"]`)) return;

				const info = lib.skill[skill];
				const cls = info.dutySkill ? ".skillMarkItem.duty" : ".skillMarkItem.juexingji";
				const item = ui.create.div(cls, node, "");
				item.dataset.id = skill;
			});

			plugin.updateXinfuFaluMarks(player);
			plugin.updateStarcanxiMarks(player);
		},

		updateXinfuFaluMarks(player) {
			if (!player.hasSkill("xinfu_falu")) return;
			const node = player.node.xSkillMarks;
			if (!node) return;

			const suitMap = { spade: "spade", heart: "heart", club: "club", diamond: "diamond" };
			const faluMarks = {};

			lib.suit.forEach(suit => {
				const markName = `xinfu_falu_${suit}`;
				if (player.hasMark(markName)) faluMarks[markName] = true;
			});

			node.querySelectorAll('[data-id^="xinfu_falu_"]').forEach(mark => mark.remove());

			Object.keys(faluMarks).forEach(markName => {
				const suit = markName.slice("xinfu_falu_".length);
				if (suitMap[suit]) {
					const item = ui.create.div(".skillMarkItem", node, "");
					item.dataset.id = markName;
					item.classList.add(`xinfu-falu-${suit}`);
				}
			});
		},

		updateStarcanxiMarks(player) {
			if (!player.hasSkill("starcanxi")) return;
			const node = player.node.xSkillMarks;
			if (!node) return;

			const factions = ["qun", "shu", "wei", "wu", "jin", "shen"];
			const canxiSkills = {};

			factions.forEach(faction => {
				const skillName = `starcanxi_${faction}`;
				if (player.hasSkill(skillName)) canxiSkills[skillName] = true;
			});

			factions.forEach(faction => {
				const mark = node.querySelector(`[data-id="starcanxi_${faction}"]`);
				if (mark) mark.remove();
			});

			Object.keys(canxiSkills).forEach(skillName => {
				const faction = skillName.slice("starcanxi_".length);
				const item = ui.create.div(".skillMarkItem", node, "");
				item.dataset.id = skillName;
				item.classList.add(`starcanxi-${faction}`);
			});
		},

		initDialogRewrites() {
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
		},

		initPlayerRewrites() {
			app.reWriteFunction(lib.element.player, {
				markSkill: [
					function (args, name) {
						const info = lib.skill[name];
						if (!info) return;
						if (info.limited || info.intro?.content === "limited") return this;
					},
				],
			});
		},

		initConfigRewrites() {
			app.reWriteFunction(lib.configMenu.appearence.config, {
				update: [
					null,
					function (res, config, map) {
						map.button_press.hide();
					},
				],
			});
		},

		initEventListeners() {
			app.on("playerUpdateE", player => plugin.updateMark(player));
		},

		initTimer() {
			if (plugin.refreshTimer) clearInterval(plugin.refreshTimer);
			plugin.refreshTimer = setInterval(() => {
				plugin.refreshAllMarks();
				if (game.me) {
					ui.skillControl?.update();
					ui.gskillControl?.update();
				}
			}, 1000);
		},

		refreshAllMarks() {
			game.players?.forEach(player => {
				if (player?.node) {
					plugin.updateXinfuFaluMarks(player);
					plugin.updateStarcanxiMarks(player);
				}
			});
		},
	};

	return plugin;
}
