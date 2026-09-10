/**
 * @fileoverview 手杀风格技能插件
 * 特点：失效技能显示、转换技图标、技能次数显示、判定图标位置调整、gskillControl支持
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseSkillPlugin } from "./base.js";
import { getAvailableSkills, isGSkillCacheSame, shouldSkipEquipSkill } from "./gskillMixin.js";
import { skillButtonTooltip } from "../../../src/ui/skillButtonTooltip.js";

const ASSETS_PATH = "extension/十周年UI/ui/assets/skill/shousha";

/**
 * 创建手杀风格技能插件
 * @param {Object} lib - 无名杀库对象
 * @param {Object} game - 游戏对象
 * @param {Object} ui - UI对象
 * @param {Object} get - 获取器对象
 * @param {Object} ai - AI对象
 * @param {Object} _status - 状态对象
 * @param {Object} app - 应用对象
 * @returns {Object} 插件对象
 */
export function createShoushaSkillPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseSkillPlugin(lib, game, ui, get, ai, _status, app);

	const plugin = {
		...base,

		/**
		 * 预加载内容，初始化技能控制相关功能
		 */
		precontent() {
			this.initTimer();
			this._extendUICreate();
			this._extendUI();
			base.initBaseRewrites.call(this);

			app.reWriteFunction(game, {
				loop: [
					() => {
						if (game.boss && !ui.skillControl) ui.updateSkillControl(game.me);
						ui.skillControl?.update();
						if (!lib.config.phonelayout) {
							if (game.me) ui.updateSkillControl(game.me);
						}
					},
					null,
				],
			});

			ui.skillControlArea = ui.create.div();
		},

		/**
		 * 重新加载内容
		 */
		recontent() {
			base.initRecontentRewrites.call(this);
		},

		/**
		 * 扩展 ui.create 对象，添加技能相关的创建方法
		 */
		_extendUICreate() {
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
					ui.skillControl?.update();
					return ui.gskills;
				},
				skillControl: clear => {
					if (!ui.skillControl) {
						const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
						const cls = isRight ? ".skill-control" : ".skill-controlzuoshou";
						const node = ui.create.div(cls, ui.arena);
						node.node = {
							enable: ui.create.div(".enable", node),
							trigger: ui.create.div(".trigger", node),
						};
						node._cachedGSkills = [];
						Object.assign(node, plugin.controlElement);
						ui.skillControl = node;
					}
					if (clear) {
						ui.skillControl.node.enable.innerHTML = "";
						ui.skillControl.node.trigger.innerHTML = "";
					}
					return ui.skillControl;
				},
			});
		},

		/**
		 * 获取虚拟装备提供的技能列表
		 * @param {Object} player - 玩家对象
		 * @returns {Array<string>} 技能ID数组
		 */
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

		/**
		 * 扩展 ui 对象，添加技能控制更新方法
		 */
		_extendUI() {
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
					const control = ui.create.skillControl(clear);
					control.add(skills, eSkills);
					if (gSkills?.length) control.setGSkills(gSkills, eSkills);
					control.addCachedGSkills(eSkills);
					control.update();

					game.addVideo("updateSkillControl", player, clear);
				}

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
			};
		},

		controlElement: {
			/**
			 * 设置全局技能缓存
			 * @param {Array<string>} skills - 技能ID数组
			 * @returns {Object} 当前对象（支持链式调用）
			 */
			setGSkills(skills) {
				if (!skills?.length) return this;
				if (isGSkillCacheSame(this._cachedGSkills, skills)) return this;
				this._cachedGSkills = skills.slice();
				return this;
			},

			/**
			 * 添加缓存的全局技能到界面
			 * @param {Array<string>} eSkills - 装备技能数组
			 * @returns {Object} 当前对象（支持链式调用）
			 */
			addCachedGSkills(eSkills) {
				if (!this._cachedGSkills?.length) return this;
				this._cachedGSkills.forEach(skillId => {
					if (skillId === "_recasting") return;
					if (this.querySelector(`[data-id="${skillId}"]`)) return;

					const info = get.info(skillId);
					if (!info) return;

					if (shouldSkipEquipSkill(skillId, eSkills, { lib, game, ui, get, ai, _status })) return;

					const skillName = get.translation(skillId).slice(0, 2);
					const cls = info.limited ? ".xiandingji" : ".skillitem";
					const node = ui.create.div(cls, this.node.enable, skillName);
					node.dataset.id = skillId;
					node.dataset.gskill = "true";

					if (info.zhuanhuanji) {
						const isYang = !game.me?.yangedSkills?.includes(skillId);
						ui.create.div(isYang ? ".yang" : ".ying", node, "");
					}
					if (game.me && get.is.locked(skillId, game.me)) node.classList.add("locked");

					ui.create.div(".skillitem-child", node, skillName);

					node.addEventListener(lib.config.touchscreen ? "touchend" : "click", () => {
						if (lib.config["extension_十周年UI_bettersound"]) {
							game.playAudio("..", "extension", "十周年UI", "audio/SkillBtn");
						}
					});
					app.listen(node, plugin.clickSkill);

					skillButtonTooltip.attach(node, skillId, game.me);
				});
				return this;
			},

			/**
			 * 为技能节点添加次数显示
			 * @param {HTMLElement} node - 技能节点
			 * @param {number} num - 剩余次数
			 */
			addSkillNumber(node, num) {
				const nums = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
				const text = document.createElement("span");
				text.classList.add("numText");
				const child = document.createElement("span");
				child.classList.add("numText-child");
				child.innerText = nums[num] || `(${num})`;
				node.appendChild(child);
				node.appendChild(text);
				text.innerText = nums[num] || `(${num})`;
			},

			/**
			 * 获取技能的剩余使用次数
			 * @param {string} skillId - 技能ID
			 * @param {Object} player - 玩家对象
			 * @returns {number|null} 剩余次数，如果技能无次数限制则返回null
			 */
			getSkillRemainingCount(skillId, player) {
				if (!player.hasSkill(skillId)) return null;

				let skills = [skillId];
				const group = get.info(skillId)?.group;
				if (group) skills.add(...(typeof group === "string" ? [group] : group));

				skills = skills.filter(s => get.info(s)?.usable !== undefined);
				if (!skills.length) return null;

				for (const skill of skills) {
					let num = get.info(skill).usable;
					if (typeof num === "function") num = num(skill, player);
					if (typeof num === "number" && (skill === "dbquedi" || num > 1)) {
						let used = get.skillCount(skill, player);
						used += player?.storage?.counttrigger?.[skill] || 0;
						return num - used;
					}
				}
				return null;
			},

			/**
			 * 检查技能是否通过势力过滤
			 * @param {Object} skillInfo - 技能信息对象
			 * @returns {boolean} 是否通过过滤
			 */
			checkGroupFilter(skillInfo) {
				if (!skillInfo || !skillInfo.filter) return true;
				const str = skillInfo.filter.toString();
				if (!str.includes("player.group")) return true;

				let sub = str.substr(str.indexOf("player.group"));
				for (const quote of ["'", '"']) {
					if (sub.includes(quote)) {
						sub = sub.substr(sub.indexOf(quote) + 1);
						if (sub.includes(quote)) {
							const group = sub.substr(0, sub.indexOf(quote));
							return !group || group === game.me.group;
						}
					}
				}
				return true;
			},

			/**
			 * 为技能节点添加锁定标记和转换技图标
			 * @param {HTMLElement} node - 技能节点
			 * @param {string} skillId - 技能ID
			 */
			addSkillLocksAndButtons(node, skillId) {
				const player = game.me;

				if (this.skshixiaoSkillBlocker?.includes(skillId)) {
					node.classList.add("shixiao");
					ui.create.div(".suo1.fengyinsuo", node, "");
					node.style["-webkit-text-fill-color"] = "silver";
					node.style["-webkit-text-stroke"] = "0.8px rgba(0,0,0,0.55)";
				}

				const info = get.info(skillId);
				if (info?.zhuanhuanji) {
					const isYang = !player.yangedSkills?.includes(skillId);
					ui.create.div(isYang ? ".yang" : ".ying", node, "");
				}
			},

			/**
			 * 添加技能到技能控制面板
			 * @param {string|Array<string>} skill - 技能ID或技能ID数组
			 * @param {Array<string>} eSkills - 装备技能数组
			 * @returns {Object} 当前对象（支持链式调用）
			 */
			add(skill, eSkills) {
				this.skshixiaoSkillBlocker = game.me.getSkills(null, false, false).filter(s => {
					if (game.me.getStorage("skill_blocker")?.some(i => lib.skill[i]?.skillBlocker?.(s, game.me))) return true;
					if (game.me.disabledSkills?.[s]?.length > 0 && game.me.disabledSkills[s].some(x => x !== `${s}_awake`)) return true;
					if (game.me.shixiaoedSkills?.includes(s)) return true;
					if (game.me.isTempBanned(s)) return true;
					return false;
				});

				this.skshixiaoSkillBlocker.forEach(s => {
					const group = lib.skill[s]?.group;
					if (Array.isArray(group)) this.skshixiaoSkillBlocker.add(...group);
					else if (typeof group === "string") this.skshixiaoSkillBlocker.add(group);
				});

				if (Array.isArray(skill)) {
					this.skshixiaoSkillBlocker.forEach(s => {
						if (!skill.includes(s)) skill.add(s);
					});
					const sortlist = game.expandSkills(game.me.getSkills(null, false, false));
					skill.sort((a, b) => sortlist.indexOf(a) - sortlist.indexOf(b));
				}

				if (Array.isArray(skill)) {
					skill.forEach(s => this.add(s, eSkills));
					return this;
				}

				if (lib.config["extension_十周年UI_aloneEquip"] && eSkills?.length) {
					const expandedE = game.expandSkills(eSkills.slice());
					const expandedS = game.expandSkills([skill]);
					if (expandedS.some(s => expandedE.includes(s))) return this;
				}

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
				const showSkills = enableSkills.length ? enableSkills : skills;

				showSkills.forEach(item => {
					if (!lib.skill[item.id]) return;
					if (!this.checkGroupFilter(lib.skill[item.id])) return;
					if (lib.skill[item.id].viewAsFilter && !this.checkGroupFilter({ filter: lib.skill[item.id].viewAsFilter })) return;

					let node = this.querySelector(`[data-id="${item.id}"]`);
					if (node) return;

					if (lib.config["extension_十周年UI_aloneEquip"] && eSkills?.length) {
						if (game.expandSkills(eSkills.slice()).includes(item.id)) return;
					}

					if (item.type === "enable") {
						const name = get.translation(item.name).slice(0, 2);
						const classRules = [
							{ key: "jianjie_huoji", cls: ".skillitem_smh_huoji" },
							{ key: "jianjie_lianhuan", cls: ".skillitem_smh_lianhuan" },
							{ key: "jianjie_yeyan", cls: ".skillitem_smh_yeyan" },
						];
						const matched = classRules.find(r => item.id.includes(r.key));
						const cls = matched?.cls || ".skillitem";

						node = ui.create.div(cls, this.node.enable, name);
						const remaining = this.getSkillRemainingCount(item.id, game.me);
						if (remaining !== null) this.addSkillNumber(node, remaining);

						this.addSkillLocksAndButtons(node, item.id);
						ui.create.div(".skillitem-child", node, name);
						node.dataset.id = item.id;

						node.addEventListener("click", () => {
							if (lib.config["extension_十周年UI_bettersound"]) {
								game.playAudio("..", "extension", "十周年UI", "audio/SkillBtn");
							}
						});
						app.listen(node, plugin.clickSkill);

						skillButtonTooltip.attach(node, item.id, game.me);

						return;
					}

					if (!item.info || !item.translation || item.id === "jiu") return;
					if (eSkills?.includes(item.id)) return;

					const skillName = get.translation(item.name).slice(0, 2);
					node = ui.create.div(".skillitem", this.node.trigger, skillName);
					this.addSkillLocksAndButtons(node, item.id);

					const remaining = this.getSkillRemainingCount(item.id, game.me);
					if (remaining !== null) this.addSkillNumber(node, remaining);

					ui.create.div(".skillitem-child", node, skillName);
					node.dataset.id = item.id;

					skillButtonTooltip.attach(node, item.id, game.me);
				});

				return this;
			},

			/**
			 * 更新技能控制面板的显示状态
			 */
			update() {
				const skills = getAvailableSkills(ui);
				if (ui.gskills?.skills) skills.addArray(ui.gskills.skills);

				Array.from(this.node.enable.childNodes).forEach(item => {
					const skillId = item.dataset.id;
					let isUsable = skills.includes(skillId);
					if (isUsable && game.me && !lib.skill[skillId]?.enable && get.is.locked(skillId, game.me)) isUsable = false;

					item.classList.toggle("usable", isUsable);
					item.classList.toggle("select", _status.event.skill === skillId);
				});

				const count = this.node.enable.childNodes.length;
				const width = count > 2 ? "200px" : count > 0 ? "114px" : "0px";
				this.node.enable.style.width = width;
				this.node.enable.style.setProperty("transform", `translateX(-${count > 2 ? 20 : 0}px)`, "important");

				const num = this.node.enable.childNodes.length;
				const num2 = this.node.trigger.childNodes.length;

				game.players.concat(game.dead).forEach(player => {
					let offset = 75;
					if (game.me === player) {
						const adjustedNum = num === 2 ? 4 : num;
						offset -= Math.ceil(adjustedNum / 2) * 44 + (Math.ceil(num2 / 3) - 1) * 28;
					} else {
						offset = -17;
					}
					player.getCards("j").forEach(card => {
						card.node.judgeMark?.node?.judge?.style.setProperty("top", `${offset}px`, "important");
					});
				});

				const level1 = Math.min(4, this.node.trigger.childNodes.length);
				const level2 = count > 2 ? 4 : count > 0 ? 2 : 0;
				ui.arena.dataset.sclevel = Math.max(level1, level2);
			},
		},

		/**
		 * 创建全局技能显示
		 * @param {Array<string>} skills - 技能ID数组
		 * @returns {null}
		 */
		createGSkills(skills) {
			if (ui.skillControl && skills?.length) {
				ui.skillControl.setGSkills(skills, []);
				ui.skillControl.addCachedGSkills([]);
			}
			return null;
		},

		/**
		 * 检查图片资源是否存在
		 * @param {string} url - 图片URL
		 * @returns {boolean} 图片是否存在
		 */
		checkImageExists(url) {
			const xhr = new XMLHttpRequest();
			xhr.open("Get", url, false);
			xhr.send();
			return xhr.status !== 404;
		},

		/**
		 * 更新玩家的技能标记显示（限定技、转换技、觉醒技等）
		 * @param {Object} player - 玩家对象
		 * @param {Object} xiandingji - 限定技/转换技对象，键为技能ID，值为是否已使用
		 * @param {Object} juexingji - 觉醒技对象，键为技能ID
		 */
		updateSkillMarks(player, xiandingji, juexingji) {
			let node = player.node.xSkillMarks;
			if (!node) {
				node = player.node.xSkillMarks = ui.create.div(".skillMarks", player);
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
					if (!info.zhuanhuanji && !info.zhuanhuanji2) {
						item = ui.create.div(".skillMarkItem.xiandingji", node, get.skillTranslation(skill, player).slice(0, 2));
					} else {
						const url = `${lib.assetURL}${ASSETS_PATH}/zhuanhuanji/${skill}_yang.png`;
						try {
							if (this.checkImageExists(url)) {
								item = ui.create.div(".skillMarkItem.zhuanhuanji", node, "");
								item.setBackgroundImage(`${ASSETS_PATH}/zhuanhuanji/${skill}_yang.png`);
							} else {
								item = ui.create.div(".skillMarkItem.zhuanhuanji", node, get.skillTranslation(skill, player).slice(0, 2));
								item.setBackgroundImage(`${ASSETS_PATH}/zhuanhuanji/ditu_yang.png`);
								item.style.setProperty("--w", "42px");
							}
						} catch (e) {
							item = ui.create.div(".skillMarkItem.zhuanhuanji", node, get.skillTranslation(skill, player).slice(0, 2));
							item.setBackgroundImage(`${ASSETS_PATH}/zhuanhuanji/ditu_yang.png`);
							item.style.setProperty("--w", "42px");
						}
					}
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
				const item = ui.create.div(cls, node, get.skillTranslation(skill, player).slice(0, 2));
				item.dataset.id = skill;
			});
		},

		/**
		 * 初始化定时器，定期更新技能控制面板
		 */
		initTimer() {
			if (plugin.refreshTimer) clearInterval(plugin.refreshTimer);
			plugin.refreshTimer = setInterval(() => {
				if (game.me) {
					ui.skillControl?.update();
				}
			}, 1000);
		},
	};

	return plugin;
}
