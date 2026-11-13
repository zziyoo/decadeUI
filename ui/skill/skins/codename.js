/**
 * @fileoverview 代号风格技能插件
 * @description 合并区域布局、技能名4字显示、被动技优先排序
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseSkillPlugin } from "./base.js";
import { getAvailableSkills, updateSkillUsability, isGSkillCacheSame, shouldSkipEquipSkill } from "./gskillMixin.js";
import { skillButtonTooltip } from "../../../src/ui/skillButtonTooltip.js";

export function createCodenameSkillPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseSkillPlugin(lib, game, ui, get, ai, _status, app);

	const plugin = {
		...base,

		precontent() {
			this.initCreateMethods();
			this.initUpdateMethods();
			base.initBaseRewrites.call(this);
			game.videoContent.updateSkillControl = (player, clear) => ui.updateSkillControl(player, clear);
			this.initTimer();
			ui.skillControlArea = ui.create.div();
		},

		recontent() {
			this.initDialogRewrites();
			this.initPlayerRewrites();
			this.initConfigRewrites();
			this.initEventListeners();
		},

		initCreateMethods() {
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
				skillControl: clear => {
					if (!ui.skillControl) {
						ui.skillControl = plugin.createSkillControl();
					}
					if (clear) {
						ui.skillControl.node.combined.innerHTML = "";
					}
					return ui.skillControl;
				},
			});
		},

		createSkillControl() {
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
			const cls = isRight ? ".skill-control" : ".skill-controlzuoshou";
			const node = ui.create.div(cls, ui.arena);
			node.node = {
				combined: ui.create.div(".combined", node),
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

		initUpdateMethods() {
			ui.updateSkillControl = (player, clear) => {
				const eSkills = player.getSkills("e", true, false).slice(0);
				eSkills.addArray(plugin._getExtraEquipSkills(player));
				let skills = player.getSkills("invisible", null, false);
				let gSkills = ui.skills2?.skills.length ? ui.skills2.skills : null;

				skills = skills.filter(skill => {
					const info = get.info(skill);
					return !info?.nopop || info.enable || skill.startsWith("olhedao_tianshu_");
				});

				const iSkills = player.invisibleSkills.slice(0);
				game.expandSkills(iSkills);
				skills.addArray(iSkills.filter(s => get.info(s)?.enable));

				// 过滤掉通过global关联的技能，避免重复
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
					if (gSkills?.length) skillControl.setGSkills(gSkills, eSkills);
					skillControl.addCachedGSkills(eSkills);
					skillControl.update();
					game.addVideo("updateSkillControl", player, clear);
				}

				const { xiandingji, juexingji } = plugin.processSkillMarks(player);
				plugin.updateSkillMarks(player, xiandingji, juexingji);
			};
		},

		processSkillMarks(player) {
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

			return { xiandingji, juexingji };
		},

		controlElement: {
			// 设置gskill缓存
			setGSkills(skills, eSkills) {
				if (!skills?.length) return this;
				if (isGSkillCacheSame(this._cachedGSkills, skills)) return this;
				this._cachedGSkills = skills.slice();
				return this;
			},

			// 添加缓存的gskill到DOM
			addCachedGSkills(eSkills) {
				if (!this._cachedGSkills?.length) return this;

				this._cachedGSkills.forEach(skillId => {
					if (this.querySelector(`[data-id="${skillId}"]`)) return;

					const info = get.info(skillId);
					if (!info) return;

					if (shouldSkipEquipSkill(skillId, eSkills, { lib, game, ui, get, ai, _status })) return;

					// 代号风格显示6字技能名
					const skillName = get.translation(skillId).slice(0, 6);
					const cls = info.limited ? ".xiandingji.enable-skill" : ".skillitem.enable-skill";
					const node = ui.create.div(cls, this.node.combined, skillName);
					node.dataset.id = skillId;
					node.dataset.gskill = "true";

					node.addEventListener("click", () => {
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

				// 排序：被动技 > 主动技（代号风格特有）
				showSkills.sort((a, b) => {
					const aIsEnable = a.type === "enable";
					const bIsEnable = b.type === "enable";
					if (aIsEnable && !bIsEnable) return 1;
					if (!aIsEnable && bIsEnable) return -1;
					return 0;
				});

				showSkills.forEach(item => {
					if (this.hasExistingNode(item.id)) return;

					if (lib.config["extension_十周年UI_aloneEquip"] && eSkills?.length) {
						if (game.expandSkills(eSkills.slice()).includes(item.id)) return;
					}

					if (item.type === "enable") {
						this.createEnableSkillNode(item);
					} else {
						this.createTriggerSkillNode(item, eSkills);
					}
				});

				return this;
			},

			hasExistingNode(skillId) {
				return this.querySelector(`[data-id="${skillId}"]`);
			},

			createEnableSkillNode(item) {
				// 代号风格显示6字技能名
				const skillName = get.translation(item.name).slice(0, 6);
				const cls = lib.skill[item.id].limited ? ".xiandingji.enable-skill" : ".skillitem.enable-skill";
				const node = ui.create.div(cls, this.node.combined, skillName);
				node.dataset.id = item.id;

				node.addEventListener("click", () => {
					if (lib.config["extension_十周年UI_bettersound"]) {
						game.playAudio("..", "extension", "十周年UI", "audio/SkillBtn");
					}
				});
				app.listen(node, plugin.clickSkill);

				// 添加悬浮提示
				skillButtonTooltip.attach(node, item.id, game.me);
			},

			createTriggerSkillNode(item, eSkills) {
				if (!item.info || !item.translation) return;
				if (eSkills?.includes(item.id)) return;

				// 代号风格显示4字技能名
				const skillName = get.translation(item.name).slice(0, 4);
				const node = ui.create.div(".skillitem.trigger-skill", this.node.combined, skillName);
				node.dataset.id = item.id;

				// 添加悬浮提示
				skillButtonTooltip.attach(node, item.id, game.me);
			},

			update() {
				const skills = getAvailableSkills(ui);

				// 重新排序：主动技优先（update时统一排序）
				const combinedNodes = Array.from(this.node.combined.childNodes);
				if (combinedNodes.length > 1) {
					combinedNodes.sort((a, b) => {
						const aIsEnable = a.classList.contains("enable-skill");
						const bIsEnable = b.classList.contains("enable-skill");
						if (aIsEnable && !bIsEnable) return -1;
						if (!aIsEnable && bIsEnable) return 1;
						return 0;
					});
					combinedNodes.forEach(node => this.node.combined.appendChild(node));
				}

				updateSkillUsability(this.node.combined.childNodes, skills, { lib, game, ui, get, ai, _status });

				const count = this.node.combined.childNodes.length;
				const level = count > 2 ? 4 : count > 0 ? 2 : 0;
				ui.arena.dataset.sclevel = level;

				// 超过15个启用滚动
				this.node.combined.classList.toggle("scroll-enabled", count > 15);
			},

			getAllSkills() {
				return getAvailableSkills(ui);
			},
		},

		updateSkillMarks(player, xiandingji, juexingji) {
			let node = player.node.xSkillMarks;
			if (!node) {
				node = player.node.xSkillMarks = ui.create.div(".skillMarks", player);
			}
			node.style.display = "";

			this.cleanupSkillMarks(node, xiandingji, juexingji);
			this.createSkillMarks(node, xiandingji, juexingji, player);
		},

		cleanupSkillMarks(node, xiandingji, juexingji) {
			Array.from(node.childNodes).forEach(item => {
				if (!xiandingji.hasOwnProperty(item.dataset.id) && !juexingji[item.dataset.id]) {
					item.remove();
				}
			});

			Array.from(node.querySelectorAll(".juexingji")).forEach(item => {
				if (!juexingji[item.dataset.id]) item.remove();
			});
		},

		createSkillMarks(node, xiandingji, juexingji, player) {
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

			Object.keys(juexingji).forEach(skill => {
				if (player.hiddenSkills.includes(skill) && player !== game.me) return;
				if (node.querySelector(`[data-id="${skill}"]`)) return;

				const info = lib.skill[skill];
				const cls = info.dutySkill ? ".skillMarkItem.duty" : ".skillMarkItem.juexingji";
				const item = ui.create.div(cls, node, "");
				item.dataset.id = skill;
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
	};

	return plugin;
}
