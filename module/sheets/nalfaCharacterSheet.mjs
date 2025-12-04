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
			template: "systems/nalfa/templates/partials/character/header.hbs",
			classes: ["nalfa-sheet", "character-sheet"],
		},
		sheet: {
			template: "systems/nalfa/templates/partials/character/sheet.hbs",
			classes: ["nalfa-sheet", "character-sheet", "sheet-body"],
		},
	};

	/** ─── PREPARE CONTEXT ──────────────────────────────────────── */
	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);

		const withBaseAlt = (source = {}) => {
			return (source.base ?? 0) + (source.alt ?? 0);
		};
		const withBaseAltMult = (source = {}) => {
			return (source.base ?? 0) * (source.alt_mult ?? 1) + (source.alt ?? 0);
		};

		const statValues = {};
		for (const [stat, statObj] of Object.entries(baseData.document.system.stats ?? {})) {
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
		for (const [stat, statObj] of Object.entries(baseData.document.system.stats ?? {})) {
			const save = statObj?.save ?? {};
			save.value = statBased(save, stat);
		}

		// Update skills
		const skillsObj = baseData.document.system.attributes.skills ?? {};
		for (const [key, skillObj] of Object.entries(skillsObj)) {
			skillObj.value = statBased(skillObj);
		}

		// Defense & evasion
		const defenseObj = baseData.document.system.attributes.defense ?? {};
		defenseObj.value = withBaseAlt(defenseObj);

		const evasionObj = baseData.document.system.attributes.evasion ?? {};
		evasionObj.value = withBaseAlt(evasionObj);

		// Initiative and passive perception
		const initiativeObj = baseData.document.system.attributes.initiative ?? {};
		initiativeObj.value = statBased(initiativeObj);

		const passivePerceptionObj = baseData.document.system.attributes.passive_percep ?? {};
		passivePerceptionObj.value = statBased(passivePerceptionObj);

		// Bonuses (casting, concentration, weapon, ...)
		const bonusesObj = baseData.document.system.attributes.bonuses ?? {};
		for (const [key, bonusObj] of Object.entries(bonusesObj)) {
			const computed = statBased(bonusObj);
			bonusObj.value = computed;
		}

		// Death rolls
		const deathObj = baseData.document.system.attributes.death?.passing_throw ?? {};
		deathObj.value = statBased(deathObj);

		// Max health: table[profile][charLevel]
		const charLevel = Number(baseData.document.system.attributes?.level ?? 1);
		const profile = baseData.document.system.profile ?? "none";
		const maxHealthTable = {
			none: [1],
			squishy: [0, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52],
			soft: [0, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59],
			sturdy: [0, 10, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66],
			tanky: [0, 11, 18, 24, 29, 35, 40, 46, 51, 57, 62, 68, 73],
		};
		const healthObj = baseData.document.system.attributes.hp ?? {};
		const profileArray = maxHealthTable[profile] ?? maxHealthTable.none;
		const profileHealth = profileArray[charLevel] ?? 1;
		healthObj.profile = profileHealth;
		healthObj.max = profileHealth + withBaseAlt(healthObj);

		// Spell charges: table[chargeType][charLevel]
		const maxChargeTable = {
			lvl1: [0, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
			lvl2: [0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 3, 3, 3],
			lvl3: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2],
			special: [0, 0, 1, 1, 2, 3, 3, 3, 3, 4, 4, 4, 4],
		};
		for (const [key, slot] of Object.entries(
			baseData.document.system.spell_charges ?? {}
		)) {
			slot.max = maxChargeTable[key][charLevel] ?? 0;
		}

		// Actions (compute total and set value if null)
		const actionsObj = baseData.document.system.actions ?? {};
		for (const [key, actionObj] of Object.entries(actionsObj)) {
			if (key == "movement") {
				actionObj.max = withBaseAltMult(actionObj);
			} else {
				actionObj.max = withBaseAlt(actionObj);
			}
		}

		return {
			isOwner: this.actor.isOwner,
			isEditable: this.isEditable,
			actor: baseData.document,
			sysData: baseData.document.system,
			config: CONFIG.nalfa,
		};
	}
}
