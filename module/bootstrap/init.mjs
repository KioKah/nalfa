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
import { registerHalfMinimumDiceModifier } from "../rolls/core/diceModifiers.mjs";
import * as rollMacros from "../rolls/actions/macros.mjs";
import * as rollHandlers from "../rolls/index.mjs";
import * as actionExecution from "../rolls/actions/execution.mjs";
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
	const refreshHotbar = () => {
		if (ui.hotbar?.rendered) void ui.hotbar.render();
	};

	Hooks.on("hotbarDrop", (hotbar, data, slot) => {
		void hotbar;
		const macros = game.nalfa?.macros;
		if (!macros?.createHotbarMacro || !macros.isNalfaHotbarDrop?.(data)) return true;

		void macros.createHotbarMacro(data, slot);
		return false;
	});

	Hooks.on("renderHotbar", (hotbar, html) => {
		game.nalfa?.macros?.renderHotbarActionShorthand?.(hotbar, html);
	});

	Hooks.on("getMacroContextOptions", (hotbar, menuItems) => {
		game.nalfa?.macros?.configureActionMacroContextMenu?.(hotbar, menuItems);
	});

	Hooks.on("controlToken", refreshHotbar);
	Hooks.on("updateActor", (actor) => {
		const activeActor =
			game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
		if (actor === activeActor) refreshHotbar();
	});
	Hooks.on("updateItem", (item) => {
		const activeActor =
			game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
		if (item.parent === activeActor) refreshHotbar();
	});
	Hooks.on("createItem", (item) => {
		const activeActor =
			game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
		if (item.parent === activeActor) refreshHotbar();
	});
	Hooks.on("deleteItem", (item) => {
		const activeActor =
			game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
		if (item.parent === activeActor) refreshHotbar();
	});
	Hooks.on("updateUser", (user, changes) => {
		if (user === game.user && Object.hasOwn(changes ?? {}, "character")) {
			refreshHotbar();
		}
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
