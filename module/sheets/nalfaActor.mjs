// TODO: Come back later to use this class

export default class NalfaActor extends Actor {
	prepareDerivedData() {
		super.prepareDerivedData();

		const sys = this.system;

		/* ---------------- Helpers ---------------- */

		const withBaseAlt = (s = {}) => (s.base ?? 0) + (s.alt ?? 0);

		const withBaseAltMult = (s = {}) => (s.base ?? 0) * (s.alt_mult ?? 1) + (s.alt ?? 0);

		/* ---------------- Stats ---------------- */

		const statValues = {};

		for (const [stat, statObj] of Object.entries(sys.stats ?? {})) {
			const total = withBaseAlt(statObj);

			statObj.value = total;
			statValues[stat] = total;
		}

		const statBased = (src = {}, stat = null) => {
			const statValue = statValues[stat ?? src.stat] ?? 0;
			const coef = src.stat_coef ?? 1;

			return statValue * coef + withBaseAlt(src);
		};

		/* ---------------- Saves ---------------- */

		for (const statObj of Object.values(sys.stats ?? {})) {
			const save = statObj?.save ?? {};
			save.value = statBased(save);
		}

		/* ---------------- Skills ---------------- */

		for (const skill of Object.values(sys.attributes?.skills ?? {})) {
			skill.value = statBased(skill);
		}

		/* ---------------- Roll Stats ---------------- */

		for (const rollStat of Object.values(sys.roll_stats ?? {})) {
			const key = rollStat.stat ?? rollStat.default_stat ?? "none";
			const statValue = statValues[key] ?? 0;

			rollStat.value = statValue + withBaseAlt(rollStat);
		}

		/* ---------------- Defense ---------------- */

		const defenseTable = {
			squishy: 8,
			soft: 9,
			sturdy: 10,
			tanky: 11,
		};

		const profile = sys.profile ?? "none";

		const defense = sys.attributes?.defense ?? {};
		defense.value = (defenseTable[profile] ?? 0) + withBaseAlt(defense);

		/* ---------------- Evasion ---------------- */

		const evasion = sys.attributes?.evasion ?? {};
		evasion.value = withBaseAlt(evasion);

		/* ---------------- Initiative / Passive ---------------- */

		const init = sys.attributes?.initiative ?? {};
		init.value = statBased(init);

		const pp = sys.attributes?.passive_percep ?? {};
		pp.value = statBased(pp);

		/* ---------------- Bonuses ---------------- */

		for (const bonus of Object.values(sys.attributes?.bonuses ?? {})) {
			bonus.value = statBased(bonus);
		}

		/* ---------------- Death ---------------- */

		const death = sys.attributes?.death?.passing_throw ?? {};
		death.value = statBased(death);

		/* ---------------- HP ---------------- */

		const level = Number(sys.attributes?.level ?? 1);

		const maxHealthTable = {
			none: [1],
			squishy: [0, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52],
			soft: [0, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59],
			sturdy: [0, 10, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66],
			tanky: [0, 11, 18, 24, 29, 35, 40, 46, 51, 57, 62, 68, 73],
		};

		const hp = sys.attributes?.hp ?? {};

		const profArr = maxHealthTable[profile] ?? maxHealthTable.none;

		const profHP = profArr[level] ?? 1;

		hp.profile = profHP;
		hp.max = profHP + withBaseAlt(hp);

		/* ---------------- Spell Charges ---------------- */

		const maxChargeTable = {
			lvl1: [0, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
			lvl2: [0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 3, 3, 3],
			lvl3: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2],
			special: [0, 0, 1, 1, 2, 3, 3, 3, 3, 4, 4, 4, 4],
		};

		for (const [k, slot] of Object.entries(sys.spell_charges ?? {})) {
			slot.max = maxChargeTable[k]?.[level] ?? 0;
		}

		/* ---------------- Actions ---------------- */

		for (const [k, action] of Object.entries(sys.actions ?? {})) {
			if (k === "movement") {
				action.max = withBaseAltMult(action);
			} else {
				action.max = withBaseAlt(action);
			}
		}

		/* ---------------- UI ---------------- */

		sys.ui ??= {};
		sys.ui.valueMode ??= "values";
	}
}
