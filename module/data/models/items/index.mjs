import { TypeDataModel } from "../base.mjs";
import {
	actionItemSchema,
	backpackItemSchema,
	bookItemSchema,
	classItemSchema,
	consumableItemSchema,
	currencyItemSchema,
	itemDescriptionSchema,
	lootItemSchema,
	raceItemSchema,
	toolItemSchema,
	trinketItemSchema,
	weaponItemSchema,
} from "./schema.mjs";
import {
	prepareBaseItemDerivedData,
	prepareClassDerivedData,
	prepareCurrencyDerivedData,
} from "./derived.mjs";

export class BaseItemData extends TypeDataModel {
	prepareDerivedData() {
		super.prepareDerivedData();
		prepareBaseItemDerivedData(this);
	}

	static defineSchema() {
		return {
			...itemDescriptionSchema(),
		};
	}
}

export class WeaponData extends BaseItemData {
	static defineSchema() {
		return weaponItemSchema(super.defineSchema());
	}
}

export class TrinketData extends BaseItemData {
	static defineSchema() {
		return trinketItemSchema(super.defineSchema());
	}
}

export class ToolData extends BaseItemData {
	static defineSchema() {
		return toolItemSchema(super.defineSchema());
	}
}

export class BackpackData extends BaseItemData {
	static defineSchema() {
		return backpackItemSchema(super.defineSchema());
	}
}

export class ConsumableData extends BaseItemData {
	static defineSchema() {
		return consumableItemSchema(super.defineSchema());
	}
}

export class LootData extends BaseItemData {
	static defineSchema() {
		return lootItemSchema(super.defineSchema());
	}
}

export class BookData extends BaseItemData {
	static defineSchema() {
		return bookItemSchema(super.defineSchema());
	}
}

export class ActionData extends BaseItemData {
	static defineSchema() {
		return actionItemSchema(super.defineSchema());
	}
}

export class CurrencyData extends BaseItemData {
	prepareDerivedData() {
		super.prepareDerivedData();
		prepareCurrencyDerivedData(this);
	}

	static defineSchema() {
		return currencyItemSchema(super.defineSchema());
	}
}

export class RaceData extends BaseItemData {
	static defineSchema() {
		return raceItemSchema(super.defineSchema());
	}
}

export class ClassData extends BaseItemData {
	prepareDerivedData() {
		super.prepareDerivedData();
		prepareClassDerivedData(this);
	}

	static defineSchema() {
		return classItemSchema(super.defineSchema());
	}
}

export class JobData extends BaseItemData {}

export class WeaponAttributeData extends BaseItemData {}
