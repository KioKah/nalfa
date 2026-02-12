const { TypeDataModel } = foundry.abstract;
const fields = foundry.data.fields;

const numberField = (initial = 0, options = {}) =>
	new fields.NumberField({ initial, ...options });

const numberValueField = (initial = null, options = {}) => {
	const nullable = initial === null ? true : options.nullable;
	return new fields.NumberField({ initial, nullable, ...options });
};

const stringField = (initial = "") => new fields.StringField({ initial });
const htmlField = (initial = "") => new fields.HTMLField({ initial });
const booleanField = (initial = false) => new fields.BooleanField({ initial });
const schemaField = (schema) => new fields.SchemaField(schema);

const saveSchema = () =>
	schemaField({
		base: numberField(0),
		alt: numberField(0),
		value: numberValueField(null),
		auto_fail: booleanField(false),
	});

const statSchema = () =>
	schemaField({
		base: numberField(0),
		value: numberValueField(null),
		alt: numberField(0),
		save: saveSchema(),
	});

const rollStatSchema = ({ defaultStat = null, stat = null } = {}) => {
	const schema = {
		value: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
	};

	if (defaultStat !== null) {
		schema.default_stat = stringField(defaultStat);
	}
	if (stat !== null) {
		schema.stat = stringField(stat);
	}

	return schemaField(schema);
};

const skillSchema = (statKey) =>
	schemaField({
		value: numberValueField(null),
		base: numberField(0),
		stat: stringField(statKey),
		default_stat: stringField(statKey),
	});

const resistanceSchema = () =>
	schemaField({
		value: numberField(0),
		immune: booleanField(false),
	});

const actionSchema = (baseInitial = 1) =>
	schemaField({
		value: numberField(0),
		max: numberValueField(null),
		base: numberField(baseInitial),
		alt: numberField(0),
	});

const movementSchema = () =>
	schemaField({
		value: numberField(0),
		max: numberValueField(null),
		base: numberField(6),
		alt: numberField(0),
		alt_mult: numberField(1),
	});

const baseAttributesSchema = () => ({
	hp: schemaField({
		value: numberField(1),
		abso: numberField(0),
		max: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
		formula: stringField(""),
	}),
	defense: schemaField({
		value: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
	}),
	evasion: schemaField({
		value: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
	}),
	initiative: schemaField({
		value: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
		stat: stringField("dex"),
		stat_coef: numberField(2),
	}),
	passive_percep: schemaField({
		value: numberValueField(null),
		base: numberField(8),
		alt: numberField(0),
		stat: stringField("wis"),
	}),
	range_modifier: schemaField({
		flat: numberField(0),
		mult: numberField(1),
	}),
	carrying_capacity: numberValueField(null),
	skills: schemaField({
		athlet: skillSchema("str"),
		robust: skillSchema("str"),
		adress: skillSchema("dex"),
		discre: skillSchema("dex"),
		acroba: skillSchema("dex"),
		cultur: skillSchema("int"),
		magie: skillSchema("int"),
		nature: skillSchema("int"),
		medeci: skillSchema("int"),
		percep: skillSchema("wis"),
		sereni: skillSchema("wis"),
		intuit: skillSchema("wis"),
		intimi: skillSchema("cha"),
		trompe: skillSchema("cha"),
		persua: skillSchema("cha"),
		perfor: skillSchema("cha"),
		sante: skillSchema("con"),
		endura: skillSchema("con"),
	}),
	resistances: schemaField({
		tran: resistanceSchema(),
		perf: resistanceSchema(),
		cont: resistanceSchema(),
		soni: resistanceSchema(),
		sang: resistanceSchema(),
		feu: resistanceSchema(),
		eau: resistanceSchema(),
		terr: resistanceSchema(),
		air: resistanceSchema(),
		natu: resistanceSchema(),
		givr: resistanceSchema(),
		foud: resistanceSchema(),
		radt: resistanceSchema(),
		obsc: resistanceSchema(),
		arca: resistanceSchema(),
		chao: resistanceSchema(),
		necr: resistanceSchema(),
		psyc: resistanceSchema(),
	}),
});

const baseActionsSchema = () => ({
	main: actionSchema(1),
	bonus: actionSchema(1),
	concentration: actionSchema(1),
	reaction: actionSchema(1),
	movement: movementSchema(),
});

export class BaseActorData extends TypeDataModel {
	prepareBaseData() {
		super.prepareBaseData();
		this.ui ??= {};
		this.ui.valueMode ??= "values";
	}

	prepareDerivedData() {
		super.prepareDerivedData();

		const sys = this;

		const withBaseAlt = (source = {}) =>
			(source.base ?? 0) + (source.alt ?? 0);
		const withBaseAltMult = (source = {}) =>
			(source.base ?? 0) * (source.alt_mult ?? 1) + (source.alt ?? 0);

		const statValues = {};
		for (const [stat, statObj] of Object.entries(sys.stats ?? {})) {
			const total = withBaseAlt(statObj);
			statObj.value = total;
			statValues[stat] = total;
		}

		const statBased = (source = {}, stat = null) => {
			const statValue = statValues[stat ?? source.stat] ?? 0;
			const statCoef = source.stat_coef ?? 1;
			return statValue * statCoef + withBaseAlt(source);
		};

		for (const [stat, statObj] of Object.entries(sys.stats ?? {})) {
			const save = statObj?.save ?? {};
			save.value = statBased(save, stat);
		}

		for (const skillObj of Object.values(sys.attributes?.skills ?? {})) {
			skillObj.value = statBased(skillObj);
		}

		for (const rollStat of Object.values(sys.roll_stats ?? {})) {
			const statKey = rollStat.stat ?? rollStat.default_stat ?? "none";
			const statValue = statValues[statKey] ?? 0;
			rollStat.value = statValue + withBaseAlt(rollStat);
		}

		const defenseTable = {
			squishy: 8,
			soft: 9,
			sturdy: 10,
			tanky: 11,
		};
		const profile = sys.profile ?? "none";
		const defenseObj = sys.attributes?.defense ?? {};
		defenseObj.value =
			(defenseTable[profile] ?? 0) + withBaseAlt(defenseObj);

		const evasionObj = sys.attributes?.evasion ?? {};
		evasionObj.value = withBaseAlt(evasionObj);

		const initiativeObj = sys.attributes?.initiative ?? {};
		initiativeObj.value = statBased(initiativeObj);

		const passivePerceptionObj = sys.attributes?.passive_percep ?? {};
		passivePerceptionObj.value = statBased(passivePerceptionObj);

		const bonusesObj = sys.attributes?.bonuses ?? {};
		for (const bonusObj of Object.values(bonusesObj)) {
			bonusObj.value = statBased(bonusObj);
		}

		const deathObj = sys.attributes?.death?.passing_throw ?? {};
		deathObj.value = statBased(deathObj);

		const charLevel = Number(sys.attributes?.level ?? 1);
		const maxHealthTable = {
			none: [1],
			squishy: [
				0, 8, 12, 16, 20, 24, 28,
				32, 36, 40, 44, 48, 52,
			],
			soft: [
				0, 9, 14, 18, 23, 27, 32,
				36, 41, 45, 50, 54, 59,
			],
			sturdy: [
				0, 10, 16, 21, 26, 31, 36,
				41, 46, 51, 56, 61, 66,
			],
			tanky: [
				0, 11, 18, 24, 29, 35, 40,
				46, 51, 57, 62, 68, 73,
			],
		};
		const healthObj = sys.attributes?.hp ?? {};
		const profileArray = maxHealthTable[profile] ?? maxHealthTable.none;
		const profileHealth = profileArray[charLevel] ?? 1;
		healthObj.profile = profileHealth;
		healthObj.max = profileHealth + withBaseAlt(healthObj);

		const maxChargeTable = {
			lvl1: [
				0, 4, 5, 6, 6, 6, 6,
				6, 6, 6, 6, 6, 6,
			],
			lvl2: [
				0, 0, 0, 0, 1, 2, 2,
				2, 2, 3, 3, 3, 3,
			],
			lvl3: [
				0, 0, 0, 0, 0, 0, 0,
				0, 1, 1, 2, 2, 2,
			],
			special: [
				0, 0, 1, 1, 2, 3, 3,
				3, 3, 4, 4, 4, 4,
			],
		};
		for (const [key, slot] of Object.entries(sys.spell_charges ?? {})) {
			slot.max = maxChargeTable[key]?.[charLevel] ?? 0;
		}

		for (const [key, actionObj] of Object.entries(sys.actions ?? {})) {
			if (key === "movement") {
				actionObj.max = withBaseAltMult(actionObj);
			} else {
				actionObj.max = withBaseAlt(actionObj);
			}
		}
	}

	static defineSchema() {
		return {
			race: stringField(""),
			class: stringField(""),
			profile: stringField("none"),
			stats: schemaField({
				str: statSchema(),
				dex: statSchema(),
				int: statSchema(),
				wis: statSchema(),
				cha: statSchema(),
				con: statSchema(),
			}),
			roll_stats: schemaField({
				arme: rollStatSchema({ defaultStat: "str" }),
				incant: rollStatSchema({ stat: "none" }),
			}),
			attributes: schemaField(baseAttributesSchema()),
			spell_charges: schemaField({
				lvl1: schemaField({
					value: numberField(0),
					max: numberValueField(null),
				}),
				lvl2: schemaField({
					value: numberField(0),
					max: numberValueField(null),
				}),
				lvl3: schemaField({
					value: numberField(0),
					max: numberValueField(null),
				}),
				special: schemaField({
					value: numberField(0),
					max: numberValueField(null),
				}),
			}),
			actions: schemaField(baseActionsSchema()),
			attack: schemaField({
				name: stringField(""),
				mode: stringField("arme"),
				weapon_attributes: schemaField({
					use_dex: booleanField(false),
					todo: stringField("other ones"),
				}),
				todo: schemaField({
					action: stringField("which one(s)"),
					cost: stringField("X per short/long rest / spell charges"),
					cooldown: stringField("before next cast"),
					target_range: stringField("range"),
					targets: stringField("what kind how many"),
					area: stringField("if shape target is not a single point"),
				}),
				jdt: schemaField({
					enabled: booleanField(false),
					stat: stringField("arme"),
					bonus: numberField(0),
				}),
				jds: schemaField({
					enabled: booleanField(false),
					dd: numberField(0),
					stat: stringField(""),
				}),
				jdd: schemaField({
					enabled: booleanField(false),
					formula1: stringField(""),
					stat1: stringField("arme"),
					damage_type1: stringField(""),
					formula2: stringField(""),
					stat2: stringField(""),
					damage_type2: stringField(""),
				}),
				concentration: schemaField({
					enabled: booleanField(false),
					stat: stringField(""),
					dd: numberField(0),
				}),
			}),
			ui: schemaField({
				valueMode: stringField("values"),
			}),
		};
	}
}

export class CharacterData extends BaseActorData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			attributes: schemaField({
				...baseAttributesSchema(),
				level: numberField(1),
				exhaustion: numberField(0),
				death: schemaField({
					passing_throw: schemaField({
						base: numberField(11),
						stat: stringField("none"),
						value: numberValueField(null),
					}),
					successes: numberField(0),
					failures: numberField(0),
				}),
			}),
		};
	}
}

export class NPCData extends BaseActorData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			attributes: schemaField({
				...baseAttributesSchema(),
				elite: booleanField(false),
			}),
			description: htmlField(""),
			difficulty: numberField(1),
		};
	}
}

export class ItemData extends TypeDataModel {
	static defineSchema() {
		return {
			rarity: stringField("unknown"),
			description: htmlField(""),
		};
	}
}
