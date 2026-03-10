import {
	defaultEmbeddedActionArrayInitial,
	DEFAULT_ACTION_DESCRIPTION_LORETEXT,
	DEFAULT_ACTION_DESCRIPTION_TEXT,
	actionSchemaDefinition,
	embeddedActionSchema,
} from "./actions.mjs";
import {
	TypeDataModel,
	arrayField,
	booleanField,
	htmlField,
	numberField,
	numberValueField,
	roundNumber,
	schemaField,
	stringField,
} from "./base.mjs";

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
			shorthand: stringField(""),
			...itemDescriptionSchema(
				DEFAULT_ACTION_DESCRIPTION_TEXT,
				DEFAULT_ACTION_DESCRIPTION_LORETEXT,
			),
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
