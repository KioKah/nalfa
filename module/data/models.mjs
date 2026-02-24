import {
	createDefaultDamageFormula,
	createDefaultItemAction,
} from "../itemActions.mjs";

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

const damageFormulaSchema = () =>
	schemaField({
		formula: stringField(""),
		type: stringField("none"),
		stat: stringField("none"),
	});

const damageFormulaArrayField = () =>
	arrayField(damageFormulaSchema(), [createDefaultDamageFormula()]);

const movementSchema = () =>
	schemaField({
		value: numberField(0),
		max: numberValueField(null),
		base: numberField(6),
		alt: numberField(0),
		alt_mult: numberField(1),
	});

const actionSchemaDefinition = () => ({
	mode: stringField("physical"),
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
	jdt: schemaField({
		enabled: booleanField(false),
		stat: stringField("physical"),
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

const itemActionSchemaDefinition = () => ({
	name: stringField(""),
	...actionSchemaDefinition(),
});

const itemActionSchema = () => schemaField(itemActionSchemaDefinition());

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
	reach: schemaField({
		value: numberValueField(null),
		base: numberField(1),
		alt: numberField(0),
		alt_mult: numberField(1),
	}),
	range_coef: schemaField({
		value: numberValueField(null),
		base: numberField(1),
		alt_mult: numberField(1),
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

const ITEM_TYPES_WITH_MODIFIERS = new Set(["Class", "Trinket"]);
const MODIFIER_MODES_BY_NUMBER = {
	1: "multiply",
	2: "add",
	3: "downgrade",
	4: "upgrade",
	5: "override",
};

const normalizeModifierMode = (mode) => {
	if (typeof mode === "number") {
		return MODIFIER_MODES_BY_NUMBER[mode] ?? null;
	}

	const modeString = String(mode ?? "")
		.trim()
		.toLowerCase();
	if (!modeString) return null;
	if (Object.hasOwn(MODIFIER_MODES_BY_NUMBER, modeString)) {
		return MODIFIER_MODES_BY_NUMBER[modeString] ?? null;
	}
	if (["add", "multiply", "override", "upgrade", "downgrade"].includes(modeString)) {
		return modeString;
	}
	return null;
};

const toFiniteNumber = (value) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
};

const isTrinketEquipped = (item) =>
	Object.values(item.system?.equipped ?? {}).some((equipped) => equipped === true);

const isModifierSourceItemActive = (item) => {
	if (!ITEM_TYPES_WITH_MODIFIERS.has(item.type)) return false;
	if (item.type === "Trinket") return isTrinketEquipped(item);
	return true;
};

const applyModifierToNumber = (mode, current, delta) => {
	switch (mode) {
		case "add":
			return current + delta;
		case "multiply":
			return current * delta;
		case "override":
			return delta;
		case "upgrade":
			return Math.max(current, delta);
		case "downgrade":
			return Math.min(current, delta);
		default:
			return null;
	}
};

const collectActorItemModifiers = (actor, systemData) => {
	const valueMap = new Map();
	if (!actor?.items) return valueMap;

	for (const item of actor.items) {
		if (!isModifierSourceItemActive(item)) continue;

		for (const modifier of item.system?.modifiers ?? []) {
			const path = String(modifier?.path ?? "").trim();
			if (!path) continue;
			if (!path.endsWith(".base")) continue;

			const mode = normalizeModifierMode(modifier?.mode);
			if (!mode) continue;

			const delta = toFiniteNumber(modifier?.value);
			if (delta === null) continue;

			const baseValue =
				valueMap.get(path) ?? toFiniteNumber(foundry.utils.getProperty(systemData, path));
			if (baseValue === null) continue;

			const nextValue = applyModifierToNumber(mode, baseValue, delta);
			if (nextValue === null || !Number.isFinite(nextValue)) continue;

			valueMap.set(path, nextValue);
		}
	}

	return valueMap;
};

const HAND_SLOT_LABELS = Object.freeze({
	main_hand: "main principale",
	off_hand: "main secondaire",
	two_handed: "deux mains",
});

const getWeaponDaBySlot = (weaponSystem = {}, slot = "") => {
	const da = weaponSystem.da ?? {};
	if (slot === "main_hand") return String(da.main_hand ?? "").trim();
	if (slot === "off_hand") return String(da.dual_wield ?? "").trim();
	if (slot === "two_handed") return String(da.two_handed ?? "").trim();
	return "";
};

const analyzeActorEquippedWeapons = (actor) => {
	const result = {
		mainWeapon: null,
		mainWeaponSlot: "",
		canUseDex: false,
		daValue: "",
		damageType: "none",
		invalidConfiguration: false,
		warning: "",
	};
	if (!actor?.items) return result;

	const equippedWeapons = [];
	const warnings = [];

	for (const item of actor.items) {
		if (item.type !== "Weapon") continue;

		const system = item.system ?? {};
		const equippable = system.equippable ?? {};
		const equipped = system.equipped ?? {};
		const isMainHand = equipped.main_hand === true;
		const isOffHand = equipped.off_hand === true;
		const isTwoHanded = equipped.two_handed === true;

		if (!isMainHand && !isOffHand && !isTwoHanded) continue;

		const activeSlots = [];
		if (isMainHand) activeSlots.push("main_hand");
		if (isOffHand) activeSlots.push("off_hand");
		if (isTwoHanded) activeSlots.push("two_handed");

		if (activeSlots.length > 1) {
			warnings.push(`L'arme "${item.name}" est équipée sur plusieurs emplacements.`);
		}

		for (const slot of activeSlots) {
			if (equippable[slot] === true) continue;
			const slotLabel = HAND_SLOT_LABELS[slot] ?? slot;
			warnings.push(
				`L'arme "${item.name}" est équipée en ${slotLabel} sans y être équipable.`,
			);
		}

		equippedWeapons.push({
			item,
			system,
			isMainHand,
			isOffHand,
			isTwoHanded,
		});
	}

	const mainOccupants = equippedWeapons.filter((entry) => entry.isMainHand || entry.isTwoHanded);
	const offOccupants = equippedWeapons.filter((entry) => entry.isOffHand || entry.isTwoHanded);
	const twoHandedOccupants = equippedWeapons.filter((entry) => entry.isTwoHanded);

	if (mainOccupants.length > 1) {
		warnings.push(
			"Configuration d'armes invalide : plusieurs armes occupent la main principale.",
		);
	}
	if (offOccupants.length > 1) {
		warnings.push(
			"Configuration d'armes invalide : plusieurs armes occupent la main secondaire.",
		);
	}
	if (twoHandedOccupants.length > 1) {
		warnings.push(
			"Configuration d'armes invalide : plusieurs armes sont équipées en deux mains.",
		);
	}
	if (
		twoHandedOccupants.length > 0 &&
		equippedWeapons.some((entry) => !entry.isTwoHanded && (entry.isMainHand || entry.isOffHand))
	) {
		warnings.push(
			"Configuration d'armes invalide : une arme à deux mains occupe déjà les deux mains.",
		);
	}

	let mainWeaponEntry = null;
	if (mainOccupants.length > 0) {
		mainWeaponEntry = mainOccupants.find((entry) => entry.isMainHand && !entry.isTwoHanded);
		mainWeaponEntry ??= mainOccupants[0];
	} else if (offOccupants.length > 0) {
		mainWeaponEntry = offOccupants[0];
	}

	const mainWeaponSlot = mainWeaponEntry
		? (mainWeaponEntry.isTwoHanded
			? "two_handed"
			: (mainWeaponEntry.isMainHand ? "main_hand" : "off_hand"))
		: "";
	const mainWeapon = mainWeaponEntry?.item ?? null;
	const mainWeaponSystem = mainWeaponEntry?.system ?? {};
	const weaponAttributes = mainWeaponSystem.weapon_attributes ?? {};
	const canUseDex = weaponAttributes.can_use_dex === true;
	const daValue = getWeaponDaBySlot(mainWeaponSystem, mainWeaponSlot);
	const damageType = String(mainWeaponSystem.damage_type ?? "none").trim() || "none";

	const uniqueWarnings = [...new Set(warnings)];
	result.mainWeapon = mainWeapon;
	result.mainWeaponSlot = mainWeaponSlot;
	result.canUseDex = canUseDex;
	result.daValue = daValue;
	result.damageType = damageType;
	result.invalidConfiguration = uniqueWarnings.length > 0;
	result.warning = uniqueWarnings.join(" ");

	return result;
};

export class BaseActorData extends TypeDataModel {
	prepareBaseData() {
		super.prepareBaseData();
		this.ui ??= {};
		this.ui.valueMode ??= "values";
	}

	prepareDerivedData() {
		super.prepareDerivedData();

		const sys = this;
		const modifierMap = collectActorItemModifiers(this.parent, sys);
		const getNumberAtPath = (path, fallback = 0) => {
			const modifiedValue = modifierMap.get(path);
			if (modifiedValue !== undefined) return modifiedValue;

			const baseValue = toFiniteNumber(foundry.utils.getProperty(sys, path));
			return baseValue === null ? fallback : baseValue;
		};
		const withBaseAlt = (basePath, altPath) =>
			getNumberAtPath(basePath, 0) + getNumberAtPath(altPath, 0);
		const withBaseAltMult = (basePath, altMultPath, altPath) =>
			getNumberAtPath(basePath, 0) * getNumberAtPath(altMultPath, 1) +
			getNumberAtPath(altPath, 0);

		const statValues = {};
		for (const [stat, statObj] of Object.entries(sys.stats ?? {})) {
			const total = withBaseAlt(`stats.${stat}.base`, `stats.${stat}.alt`);
			statObj.value = total;
			statValues[stat] = total;
		}

		const equippedWeapons = analyzeActorEquippedWeapons(this.parent);
		const weaponState = sys.weapon_state ?? {};
		weaponState.main_weapon_name = equippedWeapons.mainWeapon?.name ?? "";
		weaponState.main_weapon_slot = equippedWeapons.mainWeaponSlot;
		weaponState.main_weapon_can_use_dex = equippedWeapons.canUseDex;
		weaponState.invalid_configuration = equippedWeapons.invalidConfiguration;
		weaponState.warning = equippedWeapons.warning;

		const actorDa = sys.da ?? {};
		actorDa.value = equippedWeapons.daValue || "d2+1";
		sys.damage_type = equippedWeapons.damageType || "none";

		const statBased = ({ path, stat = null, defaultStat = "none" } = {}) => {
			if (!path) return 0;
			const statKey = stat ?? foundry.utils.getProperty(sys, `${path}.stat`) ?? defaultStat;
			const statValue = statValues[statKey] ?? 0;
			const statCoef = getNumberAtPath(`${path}.stat_coef`, 1);
			return statValue * statCoef + withBaseAlt(`${path}.base`, `${path}.alt`);
		};

		for (const [stat, statObj] of Object.entries(sys.stats ?? {})) {
			const save = statObj?.save ?? {};
			save.value = statBased({ path: `stats.${stat}.save`, stat });
		}

		for (const [skill, skillObj] of Object.entries(sys.attributes?.skills ?? {})) {
			skillObj.value = statBased({ path: `attributes.skills.${skill}` });
		}

		const physicalRollStat = sys.roll_stats?.physical ?? {};
		const strTotal = statValues.str ?? 0;
		const dexTotal = statValues.dex ?? 0;
		const physicalStatTotal = equippedWeapons.canUseDex
			? Math.max(strTotal, dexTotal)
			: strTotal;
		physicalRollStat.default_stat =
			equippedWeapons.canUseDex && dexTotal >= strTotal ? "dex" : "str";
		physicalRollStat.value =
			physicalStatTotal + withBaseAlt("roll_stats.physical.base", "roll_stats.physical.alt");

		for (const [key, rollStat] of Object.entries(sys.roll_stats ?? {})) {
			if (key === "physical") continue;
			const statKey =
				foundry.utils.getProperty(sys, `roll_stats.${key}.stat`) ??
				foundry.utils.getProperty(sys, `roll_stats.${key}.default_stat`) ??
				"none";
			const statValue = statValues[statKey] ?? 0;
			rollStat.value =
				statValue + withBaseAlt(`roll_stats.${key}.base`, `roll_stats.${key}.alt`);
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
		defenseObj.value =
			defenseProfile + withBaseAlt("attributes.defense.base", "attributes.defense.alt");

		const evasionObj = sys.attributes?.evasion ?? {};
		evasionObj.value = withBaseAlt("attributes.evasion.base", "attributes.evasion.alt");

		const initiativeObj = sys.attributes?.initiative ?? {};
		initiativeObj.value = statBased({ path: "attributes.initiative" });

		const passivePerceptionObj = sys.attributes?.passive_percep ?? {};
		passivePerceptionObj.value = statBased({ path: "attributes.passive_percep" });

		const reachObj = sys.attributes?.reach ?? {};
		reachObj.value = withBaseAltMult(
			"attributes.reach.base",
			"attributes.reach.alt_mult",
			"attributes.reach.alt",
		);

		const rangeCoefObj = sys.attributes?.range_coef ?? {};
		rangeCoefObj.value =
			getNumberAtPath("attributes.range_coef.base", 1) *
			getNumberAtPath("attributes.range_coef.alt_mult", 1);

		const bonusesObj = sys.attributes?.bonuses ?? {};
		for (const [key, bonusObj] of Object.entries(bonusesObj)) {
			bonusObj.value = statBased({ path: `attributes.bonuses.${key}` });
		}

		const deathObj = sys.attributes?.death?.passing_throw ?? {};
		deathObj.value = statBased({ path: "attributes.death.passing_throw" });

		const charLevel = Math.max(1, Math.trunc(getNumberAtPath("attributes.level", 1)));
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
		healthObj.max = profileHealth + withBaseAlt("attributes.hp.base", "attributes.hp.alt");

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
				actionObj.max = withBaseAltMult(
					`actions.${key}.base`,
					`actions.${key}.alt_mult`,
					`actions.${key}.alt`,
				);
			} else {
				actionObj.max = withBaseAlt(`actions.${key}.base`, `actions.${key}.alt`);
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
				physical: rollStatSchema({ defaultStat: "str" }),
				incant: rollStatSchema({ stat: "none" }),
			}),
			da: schemaField({
				value: stringField("d2+1"),
			}),
			damage_type: stringField("none"),
			weapon_state: schemaField({
				main_weapon_name: stringField(""),
				main_weapon_slot: stringField(""),
				main_weapon_can_use_dex: booleanField(false),
				invalid_configuration: booleanField(false),
				warning: stringField(""),
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
	'<p style="text-align: center">Nom de l\'Action</p>',
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
	'<p style="text-align: center">(Type d\'action)</p>',
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
			loretext: htmlField(""),
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
	actions: arrayField(itemActionSchema(), [createDefaultItemAction()]),
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

const itemModifierSchema = () =>
	schemaField({
		category: stringField("stats"),
		path: stringField(""),
		mode: stringField("add"),
		value: numberField(0),
	});

const weaponDamageDieSchema = () =>
	schemaField({
		main_hand: stringField(""),
		two_handed: stringField(""),
		dual_wield: stringField(""),
	});

const weaponAttributesSchema = () =>
	schemaField({
		can_use_dex: booleanField(false),
		list: arrayField(stringField(""), []),
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
			da: weaponDamageDieSchema(),
			damage_type: stringField("none"),
			weapon_attributes: weaponAttributesSchema(),
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
			modifiers: arrayField(itemModifierSchema(), []),
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
			modifiers: arrayField(itemModifierSchema(), []),
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
