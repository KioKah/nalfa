import {
	arrayField,
	booleanField,
	htmlField,
	numberField,
	numberValueField,
	schemaField,
	stringField,
} from "../base.mjs";
import {
	createDefaultActionData,
	createDefaultDamageFormula,
} from "../../../actions/core.mjs";
import {
	createDefaultEmbeddedAction,
	getDefaultEmbeddedActionShorthand,
} from "../../../actions/embedded.mjs";

export const DEFAULT_ACTION_DESCRIPTION_TEXT = [
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
	'<p style="text-align: center">Portee :</p>',
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

export const DEFAULT_ACTION_DESCRIPTION_LORETEXT = "<p><em>-</em></p>";

const damageFormulaSchema = (initial = createDefaultDamageFormula()) =>
	schemaField({
		formula: stringField(initial.formula ?? ""),
		type: stringField(initial.type ?? "none"),
		stat: stringField(initial.stat ?? "none"),
		effect: stringField(initial.effect ?? "damage"),
	});

const damageFormulaArrayField = (initial = [createDefaultDamageFormula()]) => {
	return arrayField(damageFormulaSchema(), initial);
};

export const actionSchemaDefinition = () => {
	const defaults = createDefaultActionData();

	return {
		mode: stringField(defaults.mode),
		weapon_usage: stringField(defaults.weapon_usage),
		range_type: stringField(defaults.range_type),
		requires: stringField(defaults.requires),
		cost: schemaField({
			actions: schemaField({
				note: htmlField(defaults.cost.actions.note),
				options: arrayField(
					schemaField({
						main: numberField(1),
						bonus: numberField(0),
						reaction: numberField(0),
						condition: stringField(""),
					}),
					defaults.cost.actions.options,
				),
			}),
			movement: schemaField({
				mode: stringField(defaults.cost.movement.mode),
				amount: numberField(defaults.cost.movement.amount),
				variable: stringField(defaults.cost.movement.variable),
			}),
			nalfa: schemaField({
				amount: numberField(defaults.cost.nalfa.amount),
				category: stringField(defaults.cost.nalfa.category),
				overload: schemaField({
					enabled: booleanField(defaults.cost.nalfa.overload.enabled),
					amount: numberField(defaults.cost.nalfa.overload.amount),
					effect: htmlField(defaults.cost.nalfa.overload.effect),
					jdd: schemaField({
						enabled: booleanField(defaults.cost.nalfa.overload.jdd.enabled),
						damage_formulas: damageFormulaArrayField(
							defaults.cost.nalfa.overload.jdd.damage_formulas,
						),
					}),
				}),
			}),
			uses: schemaField({
				value: numberValueField(defaults.cost.uses.value),
				max: numberValueField(defaults.cost.uses.max),
				unit: stringField(defaults.cost.uses.unit),
			}),
			cooldown: schemaField({
				amount: numberField(defaults.cost.cooldown.amount),
				unit: stringField(defaults.cost.cooldown.unit),
			}),
		}),
		selection: schemaField({
			target: schemaField({
				amount: stringField(defaults.selection.target.amount),
				unit: stringField(defaults.selection.target.unit),
				visibility: stringField(defaults.selection.target.visibility),
				include_self: booleanField(defaults.selection.target.include_self),
			}),
			zone: schemaField({
				shape: stringField(defaults.selection.zone.shape),
				range_secondary: numberField(defaults.selection.zone.range_secondary),
				range: numberField(defaults.selection.zone.range),
				min_range: numberField(defaults.selection.zone.min_range),
				long_range: numberField(defaults.selection.zone.long_range),
				has_long_range: booleanField(defaults.selection.zone.has_long_range),
			}),
		}),
		effect: schemaField({
			text: htmlField(defaults.effect.text),
		}),
		jdt: schemaField({
			enabled: booleanField(defaults.jdt.enabled),
			stat: stringField(defaults.jdt.stat),
			bonus: numberField(defaults.jdt.bonus),
		}),
		jds: schemaField({
			enabled: booleanField(defaults.jds.enabled),
			dd: numberField(defaults.jds.dd),
			stat: stringField(defaults.jds.stat),
			text: stringField(defaults.jds.text),
			fails_on_save: booleanField(defaults.jds.fails_on_save),
		}),
		jdd: schemaField({
			enabled: booleanField(defaults.jdd.enabled),
			damage_formulas: damageFormulaArrayField(defaults.jdd.damage_formulas),
		}),
		jdd_saved: schemaField({
			enabled: booleanField(defaults.jdd_saved.enabled),
			mode: stringField(defaults.jdd_saved.mode),
			damage_formulas: damageFormulaArrayField(defaults.jdd_saved.damage_formulas),
		}),
		concentration: schemaField({
			enabled: booleanField(defaults.concentration.enabled),
			stat: stringField(defaults.concentration.stat),
			dd: numberField(defaults.concentration.dd),
			enemy_attack_bonus: numberField(defaults.concentration.enemy_attack_bonus),
		}),
	};
};

export const actionSchema = () => schemaField(actionSchemaDefinition());

const embeddedActionSchema = () => {
	const defaults = createDefaultEmbeddedAction();

	return schemaField({
		name: stringField(defaults.name),
		shorthand: stringField(defaults.shorthand),
		source_uuid: stringField(defaults.source_uuid),
		source_version: stringField(defaults.source_version),
		source_hash: stringField(defaults.source_hash),
		always_refresh: booleanField(defaults.always_refresh),
		...actionSchemaDefinition(),
	});
};

const defaultEmbeddedActionArrayInitial = () => [
	createDefaultEmbeddedAction({ shorthand: getDefaultEmbeddedActionShorthand("") }),
];

export const itemDescriptionSchema = (textInitial = "", loretextInitial = "") => ({
	description: schemaField({
		text: htmlField(textInitial),
		loretext: htmlField(loretextInitial),
	}),
});

const actionSyncSchema = () => ({
		sync: schemaField({
			id: stringField(""),
			class_key: stringField(""),
			level: numberValueField(null),
			slot: numberValueField(null),
			upgraded: numberField(0),
			lineage: stringField(""),
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
	actions: arrayField(embeddedActionSchema(), defaultEmbeddedActionArrayInitial()),
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

const weaponAttackSchema = () =>
	schemaField({
		main_hand: stringField(""),
		secondary_hand: stringField(""),
		two_hands: stringField(""),
	});

const weaponAttributesSchema = () =>
	schemaField({
		list: arrayField(stringField(""), []),
	});

export const weaponItemSchema = (baseSchema) => ({
	...baseSchema,
	...itemRaritySchema(),
	...recommendedLevelSchema(),
	...physicalSchema(),
	...actionableSchema(),
	attack: weaponAttackSchema(),
	damage_type: stringField("none"),
	weapon_attributes: weaponAttributesSchema(),
});

export const trinketItemSchema = (baseSchema) => ({
	...baseSchema,
	...itemRaritySchema(),
	...recommendedLevelSchema(),
	...physicalSchema(),
	...actionableSchema(),
	modifiers: arrayField(itemModifierSchema(), []),
	trinket_type: stringField("none"),
});

export const toolItemSchema = (baseSchema) => ({
	...baseSchema,
	...itemRaritySchema(),
	...recommendedLevelSchema(),
	...physicalSchema(),
	...actionableSchema(),
});

export const backpackItemSchema = (baseSchema) => ({
	...baseSchema,
	...itemRaritySchema(),
	...recommendedLevelSchema(),
	...physicalSchema(),
	capacity: numberField(35),
});

export const consumableItemSchema = (baseSchema) => ({
	...baseSchema,
	...itemRaritySchema(),
	...recommendedLevelSchema(),
	...physicalSchema(),
	...actionableSchema(),
	consumable_type: stringField("other"),
	auto_destroy: booleanField(false),
});

export const lootItemSchema = (baseSchema) => ({
	...baseSchema,
	...itemRaritySchema(),
	...recommendedLevelSchema(),
	...physicalSchema(),
});

export const bookItemSchema = (baseSchema) => ({
	...baseSchema,
	...itemRaritySchema(),
	...physicalSchema(),
});

export const actionItemSchema = (baseSchema) => ({
	...baseSchema,
	...actionSyncSchema(),
	shorthand: stringField(""),
	...itemDescriptionSchema(
		DEFAULT_ACTION_DESCRIPTION_TEXT,
		DEFAULT_ACTION_DESCRIPTION_LORETEXT,
	),
	...actionSchemaDefinition(),
});

export const currencyItemSchema = (baseSchema) => ({
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
});

export const raceItemSchema = (baseSchema) => ({
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
});

export const classItemSchema = (baseSchema) => ({
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
});
