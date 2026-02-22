const { TypeDataModel } = foundry.abstract;
const fields = foundry.data.fields;

const numberField = (initial = 0, options = {}) =>
	new fields.NumberField({ initial, ...options });

const numberValueField = (initial = null, options = {}) => {
	const nullable = initial === null ? true : options.nullable;
	return new fields.NumberField({ initial, nullable, ...options });
};

const stringField = (initial = "", options = {}) =>
	new fields.StringField({ initial, ...options });
const htmlField = (initial = "", options = {}) =>
	new fields.HTMLField({ initial, ...options });
const booleanField = (initial = false, options = {}) =>
	new fields.BooleanField({ initial, ...options });
const schemaField = (schema) => new fields.SchemaField(schema);
const arrayField = (elementField, initial = []) =>
	new fields.ArrayField(elementField, { initial });

const roundNumber = (value, decimals = 6) =>
	Number(Math.round(value * 10 ** decimals) / 10 ** decimals);

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
		alt: numberField(0),
		stat: stringField(statKey),
		default_stat: stringField(statKey),
	});

const resistanceSchema = () =>
	schemaField({
		value: numberField(0),
		immune: booleanField(false),
	});

const actionResourceSchema = (baseInitial = 1) =>
	schemaField({
		value: numberField(0),
		max: numberValueField(null),
		base: numberField(baseInitial),
		alt: numberField(0),
	});

const makeDefaultDamageFormula = () => ({
	formula: "",
	type: "none",
	stat: "none",
});

const damageFormulaSchema = () =>
	schemaField({
		formula: stringField(""),
		type: stringField("none"),
		stat: stringField("none"),
	});

const damageFormulaArrayField = () =>
	arrayField(damageFormulaSchema(), [makeDefaultDamageFormula()]);

const movementSchema = () =>
	schemaField({
		value: numberField(0),
		max: numberValueField(null),
		base: numberField(6),
		alt: numberField(0),
		alt_mult: numberField(1),
	});

const actionSchemaDefinition = () => ({
	mode: stringField("arme"),
	range_type: stringField("ranged"),
	requires: stringField(""),
	cost: schemaField({
		action: schemaField({
			amount: numberField(1),
			unit: stringField("main"),
		}),
		ester: schemaField({
			amount: numberField(0),
			unit: stringField("none"),
		}),
		uses: schemaField({
			value: numberValueField(null),
			max: numberValueField(null),
			unit: stringField("none"),
		}),
		cooldown: schemaField({
			amount: numberField(0),
			unit: stringField("none"),
		}),
	}),
	selection: schemaField({
		target: schemaField({
			amount: numberField(1),
			unit: stringField("enemy"),
			visibility: stringField("visible"),
			include_self: booleanField(false),
		}),
		zone: schemaField({
			shape: stringField("circle"),
			range_secondary: numberField(0),
			range: numberField(0),
			min_range: numberField(0),
			long_range: numberField(0),
			has_long_range: booleanField(false),
		}),
	}),
	effect: schemaField({
		text: htmlField(""),
	}),
	weapon_attributes: schemaField({
		use_dex: booleanField(false),
		todo: stringField(""),
	}),
	jdt: schemaField({
		enabled: booleanField(false),
		stat: stringField("arme"),
		bonus: numberField(0),
	}),
	jds: schemaField({
		enabled: booleanField(false),
		dd: numberField(0),
		stat: stringField("none"),
		text: stringField(""),
		jdd_saved: booleanField(false),
	}),
	jdd: schemaField({
		enabled: booleanField(false),
		damage_formulas: damageFormulaArrayField(),
	}),
	jdd_saved: schemaField({
		enabled: booleanField(false),
		damage_formulas: damageFormulaArrayField(),
	}),
	concentration: schemaField({
		enabled: booleanField(false),
		stat: stringField("none"),
		dd: numberField(0),
		enemy_attack_bonus: numberField(0),
	}),
});

const actionSchema = () => schemaField(actionSchemaDefinition());

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
	main: actionResourceSchema(1),
	bonus: actionResourceSchema(1),
	concentration: actionResourceSchema(1),
	reaction: actionResourceSchema(1),
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

		const withBaseAlt = (source = {}) => (source.base ?? 0) + (source.alt ?? 0);
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
		const defenseProfile = defenseTable[profile] ?? 0;
		defenseObj.value = defenseProfile + withBaseAlt(defenseObj);

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
			squishy: [0, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52],
			soft: [0, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59],
			sturdy: [0, 10, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66],
			tanky: [0, 11, 18, 24, 29, 35, 40, 46, 51, 57, 62, 68, 73],
		};
		const healthObj = sys.attributes?.hp ?? {};
		const profileArray = maxHealthTable[profile] ?? maxHealthTable.none;
		const profileHealth = profileArray[charLevel] ?? 1;
		healthObj.profile = profileHealth;
		healthObj.max = profileHealth + withBaseAlt(healthObj);

		const maxChargeTable = {
			lvl1: [0, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
			lvl2: [0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 3, 3, 3],
			lvl3: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2],
			special: [0, 0, 1, 1, 2, 3, 3, 3, 3, 4, 4, 4, 4],
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
			attack: actionSchema(),
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

const DEFAULT_ACTION_DESCRIPTION_TEXT = [
	"<table><tbody><tr>",
	'<td colspan="2" data-colwidth="352,0">',
	"<p style=\"text-align: center\">Nom de l'Action</p>",
	"</td>",
	"</tr><tr>",
	'<td colspan="2" data-colwidth="352,0">',
	'<p style="text-align: center">Effets</p>',
	"</td>",
	"</tr><tr>",
	'<td data-colwidth="352">',
	'<p style="text-align: center">Portée :</p>',
	"</td>",
	"<td>",
	'<p style="text-align: center">CD :</p>',
	"</td>",
	"</tr><tr>",
	'<td data-colwidth="352">',
	'<p style="text-align: center">Sort Niveau(?)</p>',
	"</td>",
	"<td>",
	"<p style=\"text-align: center\">(Type d'action)</p>",
	"</td>",
	"</tr></tbody></table>",
].join("");

const itemDescriptionSchema = (textInitial = "", loretextInitial = "") => ({
	description: schemaField({
		text: htmlField(textInitial),
		loretext: htmlField(loretextInitial),
	}),
});

const itemRaritySchema = () => ({
	rarity: stringField("unknown"),
});

const recommendedLevelSchema = () => ({
	recommended_level: schemaField({
		min: numberField(0),
		max: numberField(0),
	}),
});

const equipSlotsSchema = (coinPouchDefault = false) =>
	schemaField({
		main_hand: booleanField(false),
		off_hand: booleanField(false),
		two_handed: booleanField(false),
		body: booleanField(false),
		coin_pouch: booleanField(coinPouchDefault),
	});

const physicalSchema = () => ({
	weight: numberField(0),
	quantity: numberField(1),
	total_weight: numberValueField(null),
	equippable: equipSlotsSchema(),
	equipped: equipSlotsSchema(),
	cursed: booleanField(false),
	identification: schemaField({
		needs_identification: booleanField(false),
		identified: booleanField(false),
		true_name: stringField(""),
		unidentified: schemaField({
			name: stringField(""),
			description: htmlField(""),
		}),
	}),
});

const currencyPhysicalSchema = () => ({
	weight: numberField(0),
	quantity: numberField(1),
	equippable: equipSlotsSchema(true),
	equipped: equipSlotsSchema(true),
});

const actionableSchema = () => ({
	action: actionSchema(),
});

const racePointBuySchema = () =>
	schemaField({
		stat_advantage: schemaField({
			str: stringField("choice"),
			dex: stringField("choice"),
			int: stringField("choice"),
			wis: stringField("choice"),
			cha: stringField("choice"),
			con: stringField("choice"),
		}),
	});

const denominationSchema = () =>
	schemaField({
		amount: numberField(0),
		short_name: stringField(""),
		monetary_value: numberField(1),
		weight_coefficient: numberField(1),
		valid: booleanField(false),
		value: numberValueField(null),
		weight: numberValueField(null),
	});

export class BaseItemData extends TypeDataModel {
	prepareDerivedData() {
		super.prepareDerivedData();

		if (
			this.weight === undefined ||
			this.quantity === undefined ||
			this.total_weight === undefined
		) {
			return;
		}

		const weight = Number(this.weight ?? 0);
		const quantity = Number(this.quantity ?? 0);

		if (!Number.isFinite(weight) || !Number.isFinite(quantity)) {
			this.total_weight = null;
			return;
		}

		this.total_weight = roundNumber(weight * quantity);
	}

	static defineSchema() {
		return {
			...itemDescriptionSchema(),
		};
	}
}

export class WeaponData extends BaseItemData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...itemRaritySchema(),
			...recommendedLevelSchema(),
			...physicalSchema(),
			...actionableSchema(),
			weapon_attributes: arrayField(stringField(""), []),
		};
	}
}

export class TrinketData extends BaseItemData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...itemRaritySchema(),
			...recommendedLevelSchema(),
			...physicalSchema(),
			...actionableSchema(),
			trinket_type: stringField("none"),
		};
	}
}

export class ToolData extends BaseItemData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...itemRaritySchema(),
			...recommendedLevelSchema(),
			...physicalSchema(),
			...actionableSchema(),
		};
	}
}

export class BackpackData extends BaseItemData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...itemRaritySchema(),
			...recommendedLevelSchema(),
			...physicalSchema(),
			capacity: numberField(35),
		};
	}
}

export class ConsumableData extends BaseItemData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...itemRaritySchema(),
			...recommendedLevelSchema(),
			...physicalSchema(),
			...actionableSchema(),
			consumable_type: stringField("other"),
			auto_destroy: booleanField(false),
		};
	}
}

export class LootData extends BaseItemData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...itemRaritySchema(),
			...recommendedLevelSchema(),
			...physicalSchema(),
		};
	}
}

export class BookData extends BaseItemData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...itemRaritySchema(),
			...physicalSchema(),
		};
	}
}

export class ActionData extends BaseItemData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...itemDescriptionSchema(DEFAULT_ACTION_DESCRIPTION_TEXT),
			...actionSchemaDefinition(),
		};
	}
}

export class CurrencyData extends BaseItemData {
	prepareDerivedData() {
		super.prepareDerivedData();

		const baseCoinWeight = Number(this.base_coin_weight ?? 0);
		let totalValue = 0;
		let totalWeight = 0;
		let hasBaseDenomination = false;

		this.currency_base = "";

		for (const denomination of this.denominations ?? []) {
			const amount = Number(denomination.amount ?? 0);
			const shortName = String(denomination.short_name ?? "").trim();
			const monetaryValue = Number(denomination.monetary_value ?? 0);
			const weightCoefficient = Number(denomination.weight_coefficient ?? 0);

			denomination.valid =
				Number.isFinite(amount) &&
				amount >= 0 &&
				shortName.length > 0 &&
				Number.isFinite(monetaryValue) &&
				monetaryValue > 0 &&
				Number.isFinite(weightCoefficient) &&
				weightCoefficient >= 0;

			if (!denomination.valid) {
				denomination.value = null;
				denomination.weight = null;
				continue;
			}

			const value = roundNumber(amount * monetaryValue);
			const weight = roundNumber(amount * baseCoinWeight * weightCoefficient);

			denomination.value = value;
			denomination.weight = weight;
			totalValue += value;
			totalWeight += weight;

			if (!hasBaseDenomination && monetaryValue === 1) {
				hasBaseDenomination = true;
				this.currency_base = denomination.short_name;
			}
		}

		const allDenominationsValid = (this.denominations ?? []).every(
			(denomination) => denomination.valid,
		);
		const hasValidWeight = allDenominationsValid && baseCoinWeight >= 0;
		const calculatedWeight = hasValidWeight ? roundNumber(totalWeight) : 0;

		for (const slot of ["main_hand", "off_hand", "two_handed", "body"]) {
			this.equippable[slot] = false;
			this.equipped[slot] = false;
		}
		this.equippable.coin_pouch = true;
		this.equipped.coin_pouch = true;

		this.quantity = 1;
		this.weight = calculatedWeight;
		this.total_weight = hasValidWeight ? calculatedWeight : null;
		this.all_valid = hasValidWeight && hasBaseDenomination;

		if (this.all_valid) {
			this.total_value = roundNumber(totalValue);
			return;
		}

		this.total_value = null;
	}

	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...currencyPhysicalSchema(),
			denominations: arrayField(denominationSchema(), [
				{
					amount: 0,
					short_name: "",
					monetary_value: 1,
					weight_coefficient: 1,
					valid: false,
					value: null,
					weight: null,
				},
			]),
			base_coin_weight: numberField(0.005),
			total_value: numberValueField(null),
			currency_base: stringField(""),
			total_weight: numberValueField(null),
			all_valid: booleanField(false),
		};
	}
}

export class RaceData extends BaseItemData {
	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			height: schemaField({
				min: numberField(0),
				max: numberField(0),
			}),
			weight: schemaField({
				min: numberField(0),
				max: numberField(0),
			}),
			life_expectancy: numberField(0),
			size: stringField("medium"),
			playable_classes: arrayField(stringField(""), []),
			racial_traits: arrayField(stringField(""), []),
			point_buy: racePointBuySchema(),
		};
	}
}

export class ClassData extends BaseItemData {
	prepareDerivedData() {
		super.prepareDerivedData();
		if (this.attributes?.armor_score) {
			this.attributes.armor_score.value = this.attributes.armor_score.base;
		}
	}

	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			stat_ester: stringField("str"),
			choices: schemaField({
				bonus_skill_points: schemaField({
					value: numberField(0),
					max: numberField(8),
				}),
				malus_skill_points: schemaField({
					value: numberField(0),
					max: numberField(5),
				}),
			}),
			attributes: schemaField({
				actions: schemaField({
					main: numberField(1),
					bonus: numberField(1),
					reaction: numberField(1),
					concentration: numberField(1),
					movement: numberField(6),
				}),
				armor_score: schemaField({
					base: numberField(0),
					stat: stringField("none"),
					value: numberValueField(null),
				}),
			}),
		};
	}
}

export class JobData extends BaseItemData {}

export class WeaponAttributeData extends BaseItemData {}
