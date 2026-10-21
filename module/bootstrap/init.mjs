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
import { registerHalfMinimumDiceModifier } from "../rolls/core/diceModifiers.mjs";
import * as rollMacros from "../rolls/actions/macros.mjs";
import * as rollHandlers from "../rolls/index.mjs";
import * as actionExecution from "../rolls/actions/execution.mjs";
import NalfaCharacterSheet from "../sheets/nalfaCharacterSheet.mjs";
import NalfaItem from "../sheets/nalfaItem.mjs";
import NalfaItemSheet from "../sheets/nalfaItemSheet.mjs";
import { registerFatigueStatus, syncActorFatigueState } from "../rules/fatigue.mjs";
import { registerNalfaStateStatuses } from "../rules/states.mjs";
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

const registerStatusEffects = () => {
	CONFIG.statusEffects = {};
	registerFatigueStatus();
	registerNalfaStateStatuses();
};

const registerHotbarHook = () => {
	const refreshHotbar = () => {
		if (ui.hotbar?.rendered) void ui.hotbar.render();
	};
	const refreshCombatSheets = (combat) => {
		const actors = new Set(
			[...(combat?.combatants ?? [])]
				.map((combatant) => combatant.actor)
				.filter((actor) => actor instanceof Actor),
		);
		for (const actor of actors) {
			if (actor.sheet?.rendered) void actor.sheet.render({ force: true });
		}
	};
	const refreshHotbarGrids = () => {
		const actors = new Set([
			...(game.actors ?? []),
			...(canvas?.tokens?.placeables ?? [])
				.map((token) => token.actor)
				.filter((actor) => actor instanceof Actor),
		]);
		for (const actor of actors) {
			if (actor.sheet?.rendered) void actor.sheet.render({ force: true });
		}
	};

	Hooks.on("hotbarDrop", (hotbar, data, slot) => {
		const macros = game.nalfa?.macros;
		if (!macros?.createHotbarMacro || !macros.isNalfaHotbarDrop?.(data)) return true;
		if (hotbar.locked) return true;

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
	Hooks.on("createMacro", refreshHotbarGrids);
	Hooks.on("updateMacro", refreshHotbarGrids);
	Hooks.on("deleteMacro", refreshHotbarGrids);
	Hooks.on("updateCombat", refreshCombatSheets);
	Hooks.on("deleteCombat", refreshCombatSheets);
	Hooks.on("createCombatant", (combatant) => {
		refreshCombatSheets(combatant.parent);
	});
	Hooks.on("updateCombatant", (combatant) => {
		refreshCombatSheets(combatant.parent);
	});
	Hooks.on("deleteCombatant", (combatant) => {
		refreshCombatSheets(combatant.parent);
		if (combatant.actor?.sheet?.rendered) {
			void combatant.actor.sheet.render({ force: true });
		}
	});
	Hooks.once("ready", () => {
		for (const actor of game.actors ?? []) {
			if (actor.isOwner) {
				void syncActorFatigueState(actor, { userId: game.user?.id });
			}
		}
	});
	Hooks.on("createActor", (actor, options, userId) => {
		void syncActorFatigueState(actor, { options, userId });
	});
	Hooks.on("updateActor", (actor, _changes, options, userId) => {
		const activeActor =
			game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
		if (actor === activeActor) refreshHotbar();
		void syncActorFatigueState(actor, { options, userId });
	});
	Hooks.on("updateItem", (item, _changes, options, userId) => {
		const activeActor =
			game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
		if (item.parent === activeActor) refreshHotbar();
		void syncActorFatigueState(item.parent, { options, userId });
	});
	Hooks.on("createItem", (item, options, userId) => {
		const activeActor =
			game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
		if (item.parent === activeActor) refreshHotbar();
		void syncActorFatigueState(item.parent, { options, userId });
	});
	Hooks.on("deleteItem", (item, options, userId) => {
		const activeActor =
			game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
		if (item.parent === activeActor) refreshHotbar();
		void syncActorFatigueState(item.parent, { options, userId });
	});
	const syncActiveEffectParent = (effect, options, userId) => {
		const actor = effect.parent?.documentName === "Actor" ? effect.parent : null;
		const activeActor =
			game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
		if (actor === activeActor) refreshHotbar();
		void syncActorFatigueState(actor, { options, userId });
	};
	Hooks.on("createActiveEffect", syncActiveEffectParent);
	Hooks.on("updateActiveEffect", (effect, _changes, options, userId) => {
		syncActiveEffectParent(effect, options, userId);
	});
	Hooks.on("deleteActiveEffect", syncActiveEffectParent);
	Hooks.on("updateUser", (user, changes) => {
		if (user !== game.user) return;
		if (Object.hasOwn(changes ?? {}, "character")) refreshHotbar();
		if (Object.hasOwn(changes ?? {}, "hotbar")) refreshHotbarGrids();
	});
};

export const registerInitHook = () => {
	Hooks.once("init", function () {
		console.log("nalfa | Initialising nalfa System");
		CONFIG.nalfa = nalfa;
		registerStatusEffects();
		registerHalfMinimumDiceModifier();
		registerDataModels();
		CONFIG.Item.documentClass = NalfaItem;
		registerGameApi();
		registerHotbarHook();
		registerSheets();
		void preloadHandlebarsTemplates();
		registerHandlebarsHelpers(nalfa);
	});
};
