import {
	rollAttack,
	rollDamageSet,
	rollConcentration,
	rollSavePrompt,
	rollSkill,
	rollStatSave,
} from "../rolls/rolls.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class NalfaCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
	/** ─── DEFAULT OPTIONS ───────────────────────────────────────────────────────── */
	static DEFAULT_OPTIONS = {
		classes: ["nalfa", "sheet", "actor-sheet"],
		position: {
			width: 812,
		},
		form: {
			submitOnChange: true,
		},
	};

	get title() {
		return `Feuille de personnage - ${this.actor?.name || "Inconnu"}`;
	}

	/** ─── TEMPLATE ───────────────────────────────────────────────────────────────── */
	static PARTS = {
		header: {
			template: "systems/nalfa/templates/sheets/character/header.hbs",
			classes: ["nalfa-sheet", "character-sheet"],
		},
		tabs: {
			template: "systems/nalfa/templates/sheets/character/tabs.hbs",
			classes: ["nalfa-sheet", "character-sheet"],
		},
		sheet: {
			template: "systems/nalfa/templates/sheets/character/body.hbs",
			classes: ["nalfa-sheet", "character-sheet", "sheet-body"],
		},
	};

	static TABS = {
		primary: {
			tabs: [
				{ id: "character", label: "Personnage" },
				{ id: "resources", label: "Ressources" },
				{ id: "combat", label: "Combat" },
			],
			initial: "character",
		},
	};

	/** ─── PREPARE CONTEXT ──────────────────────────────────────── */
	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);
		const sysData = baseData.document.system;

		const withBaseAlt = (source = {}) => {
			return (source.base ?? 0) + (source.alt ?? 0);
		};
		const withBaseAltMult = (source = {}) => {
			return (source.base ?? 0) * (source.alt_mult ?? 1) + (source.alt ?? 0);
		};

		const statValues = {};
		for (const [stat, statObj] of Object.entries(sysData.stats ?? {})) {
			const total = withBaseAlt(statObj);
			statObj.value = total;
			statValues[stat] = total;
		}

		const statBased = (source = {}, stat = null) => {
			const statValue = statValues[stat ?? source.stat] ?? 0;
			const statCoef = source.stat_coef ?? 1;
			return statValue * statCoef + withBaseAlt(source);
		};

		// Update saves (always derived)
		for (const [stat, statObj] of Object.entries(sysData.stats ?? {})) {
			const save = statObj?.save ?? {};
			save.value = statBased(save, stat);
		}

		// Update skills
		const skillsObj = sysData.attributes.skills ?? {};
		for (const [key, skillObj] of Object.entries(skillsObj)) {
			skillObj.value = statBased(skillObj);
		}

		// Roll stats (arme/incant)
		const rollStatsObj = sysData.roll_stats ?? {};
		for (const rollStat of Object.values(rollStatsObj)) {
			const statKey = rollStat.stat ?? rollStat.default_stat ?? "none";
			const statValue = statValues[statKey] ?? 0;
			rollStat.value = statValue + withBaseAlt(rollStat);
		}

		// Defense: table[profile]
		const defenseObj = sysData.attributes.defense ?? {};
		const defenseTable = {
			squishy: 8,
			soft: 9,
			sturdy: 10,
			tanky: 11,
		};
		const profile = sysData.profile ?? "none";
		const profileDefense = defenseTable[profile] ?? 0;
		defenseObj.value = profileDefense + withBaseAlt(defenseObj);

		// Evasion
		const evasionObj = sysData.attributes.evasion ?? {};
		evasionObj.value = withBaseAlt(evasionObj);

		// Initiative and passive perception
		const initiativeObj = sysData.attributes.initiative ?? {};
		initiativeObj.value = statBased(initiativeObj);

		const passivePerceptionObj = sysData.attributes.passive_percep ?? {};
		passivePerceptionObj.value = statBased(passivePerceptionObj);

		// Bonuses (casting, concentration, weapon, ...)
		const bonusesObj = sysData.attributes.bonuses ?? {};
		for (const [key, bonusObj] of Object.entries(bonusesObj)) {
			const computed = statBased(bonusObj);
			bonusObj.value = computed;
		}

		// Death rolls
		const deathObj = sysData.attributes.death?.passing_throw ?? {};
		deathObj.value = statBased(deathObj);

		// Max health: table[profile][charLevel]
		const charLevel = Number(sysData.attributes?.level ?? 1);
		const maxHealthTable = {
			none: [1],
			squishy: [0, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52],
			soft: [0, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59],
			sturdy: [0, 10, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66],
			tanky: [0, 11, 18, 24, 29, 35, 40, 46, 51, 57, 62, 68, 73],
		};
		const healthObj = sysData.attributes.hp ?? {};
		const profileArray = maxHealthTable[profile] ?? maxHealthTable.none;
		const profileHealth = profileArray[charLevel] ?? 1;
		healthObj.profile = profileHealth;
		healthObj.max = profileHealth + withBaseAlt(healthObj);
		const isKO = Number(healthObj.value ?? 0) <= 0;

		// Spell charges: table[chargeType][charLevel]
		const maxChargeTable = {
			lvl1: [0, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
			lvl2: [0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 3, 3, 3],
			lvl3: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2],
			special: [0, 0, 1, 1, 2, 3, 3, 3, 3, 4, 4, 4, 4],
		};
		for (const [key, slot] of Object.entries(sysData.spell_charges ?? {})) {
			slot.max = maxChargeTable[key][charLevel] ?? 0;
		}

		// Actions (compute total and set value if null)
		const actionsObj = sysData.actions ?? {};
		for (const [key, actionObj] of Object.entries(actionsObj)) {
			if (key == "movement") {
				actionObj.max = withBaseAltMult(actionObj);
			} else {
				actionObj.max = withBaseAlt(actionObj);
			}
		}

		const uiObj = sysData.ui ?? {};
		uiObj.valueMode ??= "values";
		const tabs = this._prepareTabs("primary");

		return {
			isOwner: this.actor.isOwner,
			isEditable: this.isEditable,
			actor: baseData.document,
			sysData: sysData,
			config: CONFIG.nalfa,
			tabs,
			isKO,
		};
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		if (this.tabGroups) {
			for (const [group, active] of Object.entries(this.tabGroups)) {
				if (active) this.changeTab(active, group);
			}
		}
		this.element
			?.querySelector("[data-action='roll-basic-attack']")
			?.addEventListener("click", this._onRollBasicAttack.bind(this));
		this.element
			?.querySelector("[data-action='roll-basic-damage']")
			?.addEventListener("click", this._onRollBasicDamage.bind(this));
		this.element
			?.querySelector("[data-action='roll-basic-save']")
			?.addEventListener("click", this._onRollBasicSave.bind(this));
		this.element
			?.querySelector("[data-action='roll-concentration']")
			?.addEventListener("click", this._onRollConcentration.bind(this));
		this.element
			?.querySelectorAll("[data-action='roll-stat-save']")
			.forEach((element) =>
				element.addEventListener("click", this._onRollStatSave.bind(this))
			);
		this.element
			?.querySelectorAll("[data-action='roll-skill']")
			.forEach((element) =>
				element.addEventListener("click", this._onRollSkill.bind(this))
			);
	}

	async _onRollBasicAttack(event) {
		event.preventDefault();
		return rollAttack(this.actor, "weapon");
	}

	async _onRollBasicDamage(event) {
		event.preventDefault();
		return rollDamageSet(this.actor);
	}
	async _onRollBasicSave(event) {
		event.preventDefault();
		return rollSavePrompt(this.actor);
	}

	async _onRollConcentration(event) {
		event.preventDefault();
		return rollConcentration(this.actor);
	}

	async _onRollStatSave(event) {
		event.preventDefault();
		const statKey = event.currentTarget?.dataset?.stat;
		if (!statKey) return null;
		return rollStatSave(this.actor, statKey);
	}

	async _onRollSkill(event) {
		event.preventDefault();
		const skillKey = event.currentTarget?.dataset?.skill;
		if (!skillKey) return null;
		return rollSkill(this.actor, skillKey);
	}

	// activateListeners(html) {
	// 	super.activateListeners(html);
	// }
}
