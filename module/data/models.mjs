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

const attackSchemaFields = () => ({
	mode: stringField("arme"),
	damage_formulas: arrayField(
		schemaField({
			formula: stringField(""),
			type: stringField("none"),
			stat: stringField("none"),
		}),
		[
			{
				formula: "",
				type: "none",
				stat: "none",
			},
		],
	),
	cost: schemaField({
		value: numberField(1),
		action_unit: stringField("main"),
		ester_level: stringField("lvl1"),
	}),
	weapon_attributes: schemaField({
		use_dex: booleanField(false),
		todo: stringField(""),
	}),
	todo: schemaField({
		action: stringField(""),
		cost: stringField(""),
		cooldown: stringField(""),
		target_range: stringField(""),
		targets: stringField(""),
		area: stringField(""),
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
		damage_formulas: arrayField(
			schemaField({
				formula: stringField(""),
				type: stringField("none"),
				stat: stringField("none"),
			}),
			[
				{
					formula: "",
					type: "none",
					stat: "none",
				},
			],
		),
	}),
	jdd: schemaField({
		enabled: booleanField(false),
		formula1: stringField(""),
		stat1: stringField("arme"),
		damage_type1: stringField("none"),
		formula2: stringField(""),
		stat2: stringField("none"),
		damage_type2: stringField("none"),
	}),
	concentration: schemaField({
		enabled: booleanField(false),
		stat: stringField("none"),
		dd: numberField(0),
		enemy_attack_bonus: numberField(0),
	}),
});

const attackSchema = () => schemaField(attackSchemaFields());

const makeDefaultDamageFormula = () => ({
	formula: "",
	type: "none",
	stat: "none",
});

const normalizeDamageFormula = (entry = {}) => {
	if (typeof entry === "string") {
		return {
			...makeDefaultDamageFormula(),
			formula: entry,
		};
	}

	if (!entry || typeof entry !== "object") {
		return makeDefaultDamageFormula();
	}

	return {
		formula: String(entry.formula ?? ""),
		type: String(entry.type ?? "none"),
		stat: String(entry.stat ?? "none"),
	};
};

const migrateDamageFormulaArray = (entries) => {
	if (Array.isArray(entries) && entries.length > 0) {
		return entries.map((entry) => normalizeDamageFormula(entry));
	}

	return [makeDefaultDamageFormula()];
};

const migrateAttackPayload = (payload) => {
	if (!payload || typeof payload !== "object") return;

	if ("damage_formulas" in payload || "jdd" in payload) {
		payload.damage_formulas = migrateDamageFormulaArray(payload.damage_formulas);
	}

	if ("cost" in payload && payload.cost && typeof payload.cost === "object") {
		if (typeof payload.cost.ester_level !== "string") {
			payload.cost.ester_level = "lvl1";
		}
	}

	if ("jds" in payload && payload.jds && typeof payload.jds === "object") {
		if ("text" in payload.jds) {
			payload.jds.text = String(payload.jds.text ?? "");
		}
		if ("damage_formulas" in payload.jds) {
			payload.jds.damage_formulas = migrateDamageFormulaArray(
				payload.jds.damage_formulas,
			);
		}
	}

	if (
		"concentration" in payload &&
		payload.concentration &&
		typeof payload.concentration === "object"
	) {
		delete payload.concentration.enemy_attack_stat;
		if ("enemy_attack_bonus" in payload.concentration) {
			const enemyAttackBonus = Number(payload.concentration.enemy_attack_bonus ?? 0);
			payload.concentration.enemy_attack_bonus = Number.isFinite(enemyAttackBonus)
				? enemyAttackBonus
				: 0;
		}
	}
};

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
			attack: attackSchema(),
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

const itemDescriptionSchema = () => ({
	description: schemaField({
		value: htmlField(""),
		source: htmlField(""),
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
	action: attackSchema(),
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
	static migrateData(source) {
		super.migrateData(source);

		if (typeof source.description === "string") {
			source.description = {
				value: source.description,
				source: "",
			};
		}

		if (source.identification && typeof source.identification === "object") {
			const identification = source.identification;
			if (typeof identification.needs_identification !== "boolean") {
				identification.needs_identification = Boolean(
					identification.needs_identification,
				);
			}
		}

		for (const key of ["equippable", "equipped"]) {
			const slots = source[key];
			if (!slots || typeof slots !== "object") continue;

			if (typeof slots.two_handed !== "boolean") {
				slots.two_handed = false;
			}
			if (typeof slots.body !== "boolean") {
				slots.body = false;
			}
		}

		migrateAttackPayload(source.action);

		return source;
	}

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
	static migrateData(source) {
		super.migrateData(source);

		migrateAttackPayload(source);
		return source;
	}

	static defineSchema() {
		const baseSchema = super.defineSchema();
		return {
			...baseSchema,
			...attackSchemaFields(),
			casting: schemaField({
				condition: stringField(""),
				target: schemaField({
					value: numberField(0),
					target_unit: stringField("entity"),
					area: schemaField({
						mechanic: booleanField(false),
						value: numberField(0),
						shape: stringField(""),
					}),
				}),
				range: schemaField({
					range_type: stringField("ranged"),
					value: numberField(1),
					min_value: numberField(0),
					long_value: numberField(0),
					shape: stringField(""),
				}),
				cast_duration: schemaField({
					value: numberField(0),
					duration_unit: stringField("instant"),
				}),
				cooldown: htmlField(""),
				max_uses_by: schemaField({
					sr: numberField(-1),
					lr: numberField(-1),
				}),
			}),
		};
	}
}

export class CurrencyData extends BaseItemData {
	static migrateData(source) {
		super.migrateData(source);
		delete source.add_denomination;
		delete source.done;
		return source;
	}

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
