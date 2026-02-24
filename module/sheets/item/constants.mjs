export const PRIMARY_TAB_GROUP = "primary";

export const ITEM_TYPES_WITH_SPECIFIC = new Set([
	"Weapon",
	"Trinket",
	"Backpack",
	"Consumable",
	"Action",
	"Currency",
	"Race",
	"Class",
]);

export const ITEM_TYPES_WITH_MODIFIERS = new Set(["Trinket", "Class"]);

export const ITEM_TYPES_WITH_PHYSICAL = new Set([
	"Weapon",
	"Trinket",
	"Tool",
	"Backpack",
	"Consumable",
	"Loot",
	"Book",
	"Currency",
]);

export const EQUIP_SLOT_NONE = "none";
export const EQUIP_SLOT_COIN_POUCH = "coin_pouch";
export const EQUIP_SLOT_OPTIONS = Object.freeze([
	{ key: "main_hand", label: "Main principale" },
	{ key: "off_hand", label: "Main secondaire" },
	{ key: "two_handed", label: "Deux mains" },
	{ key: "body", label: "Corps" },
	{ key: EQUIP_SLOT_COIN_POUCH, label: "Bourse" },
]);

export const EQUIP_SLOT_KEYS = new Set(EQUIP_SLOT_OPTIONS.map(({ key }) => key));
