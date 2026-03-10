import { nalfa } from "../config.mjs";
import {
	ActionData,
	BackpackData,
	BookData,
	CharacterData,
	ClassData,
	ConsumableData,
	CurrencyData,
	JobData,
	LootData,
	NPCData,
	RaceData,
	ToolData,
	TrinketData,
	WeaponAttributeData,
	WeaponData,
} from "../data/models.mjs";
import NalfaCombat from "../documents/nalfaCombat.mjs";
import { registerHalfMinimumDiceModifier } from "../rolls/diceModifiers.mjs";
import * as rollMacros from "../rolls/macros.mjs";
import * as rollHandlers from "../rolls/rolls.mjs";
import * as actionExecution from "../rolls/actionExecution.mjs";
import NalfaCharacterSheet from "../sheets/nalfaCharacterSheet.mjs";
import NalfaItem from "../sheets/nalfaItem.mjs";
import NalfaItemSheet from "../sheets/nalfaItemSheet.mjs";
import { registerHandlebarsHelpers } from "./handlebars.mjs";
import { preloadHandlebarsTemplates } from "./templates.mjs";

const registerDataModels = () => {
	Object.assign(CONFIG.Actor.dataModels, {
		Character: CharacterData,
		NPC: NPCData,
	});

	Object.assign(CONFIG.Item.dataModels, {
		Weapon: WeaponData,
		Trinket: TrinketData,
		Tool: ToolData,
		Backpack: BackpackData,
		Consumable: ConsumableData,
		Loot: LootData,
		Book: BookData,
		Action: ActionData,
		Currency: CurrencyData,
		Race: RaceData,
		Class: ClassData,
		Job: JobData,
		WeaponAttribute: WeaponAttributeData,
	});
};

const registerSheets = () => {
	foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
		foundry.documents.Actor,
		"core",
		foundry.applications.sheets.ActorSheetV2,
	);
	foundry.applications.apps.DocumentSheetConfig.registerSheet(
		foundry.documents.Actor,
		"nalfa",
		NalfaCharacterSheet,
		{ makeDefault: true },
	);

	foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
		foundry.documents.Item,
		"core",
		foundry.applications.sheets.ItemSheetV2,
	);
	foundry.applications.apps.DocumentSheetConfig.registerSheet(
		foundry.documents.Item,
		"nalfa",
		NalfaItemSheet,
		{ makeDefault: true },
	);
};

const registerGameApi = () => {
	game.nalfa = {
		...(game.nalfa ?? {}),
		rolls: {
			...rollHandlers,
			...actionExecution,
		},
		macros: rollMacros,
	};
};

const registerHotbarHook = () => {
	Hooks.on("hotbarDrop", async (hotbar, data, slot) => {
		void hotbar;
		if (!game.nalfa?.macros?.createHotbarMacro) return true;
		return game.nalfa.macros.createHotbarMacro(data, slot);
	});
};

export const registerInitHook = () => {
	Hooks.once("init", function () {
		console.log("nalfa | Initialising nalfa System");
		registerHalfMinimumDiceModifier();
		CONFIG.Combat.initiative.formula = "1d20+@attributes.initiative.value";
		CONFIG.Combat.documentClass = NalfaCombat;
		CONFIG.nalfa = nalfa;
		registerDataModels();
		CONFIG.Item.documentClass = NalfaItem;
		registerGameApi();
		registerHotbarHook();
		registerSheets();
		void preloadHandlebarsTemplates();
		registerHandlebarsHelpers(nalfa);
	});
};
