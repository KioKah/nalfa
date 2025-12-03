import { nalfa } from "./module/config.mjs";
// import { applyMutationObserver } from "./module/utils.mjs";
import NalfaItemSheet from "./module/sheets/nalfaItemSheet.mjs";
import NalfaCharacterSheet from "./module/sheets/nalfaCharacterSheet.mjs";
import NalfaItem from "./module/sheets/nalfaItem.mjs";

import { DiceSystem } from "../../modules/dice-so-nice/api.js";

async function preloadHandlebarsTemplates() {
	console.log("nalfa | Preloading Handlebars Templates");

	const templatePaths = [
		"systems/nalfa/templates/partials/item-sheet-header.hbs",
		"systems/nalfa/templates/partials/weapon.hbs",

		"systems/nalfa/templates/partials/item-sheets/actionable.hbs",
		"systems/nalfa/templates/partials/item-sheets/effects.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-desc.hbs",
		"systems/nalfa/templates/partials/item-sheets/physical.hbs",
		"systems/nalfa/templates/partials/item-sheets/rarity.hbs",
		"systems/nalfa/templates/partials/item-sheets/recom-level.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/action.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/backpack.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/book.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/class.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/combat-style.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/consumable.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/currency.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/job.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/loot.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/race.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/status.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/tool.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/trinket.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/weapon-attribute.hbs",
		"systems/nalfa/templates/partials/item-sheets/item-specific/weapon.hbs",
		// "systems/nalfa/templates/partials/item-sheets/item-specific/test-item.hbs",

		"systems/nalfa/templates/partials/test-item/action.hbs",
		"systems/nalfa/templates/partials/test-item/activated-effect.hbs",
		"systems/nalfa/templates/partials/test-item/equippable.hbs",
		"systems/nalfa/templates/partials/test-item/identifiable-item.hbs",
		"systems/nalfa/templates/partials/test-item/info.hbs",
		"systems/nalfa/templates/partials/test-item/item-description.hbs",
		"systems/nalfa/templates/partials/test-item/physical-item.hbs",

		"systems/nalfa/templates/partials/character-googlesheet/inventory/currency.hbs",
		"systems/nalfa/templates/partials/character-googlesheet/character.hbs",
		"systems/nalfa/templates/partials/character-googlesheet/class.hbs",
		"systems/nalfa/templates/partials/character-googlesheet/esters.hbs",
		"systems/nalfa/templates/partials/character-googlesheet/header.hbs",
		"systems/nalfa/templates/partials/character-googlesheet/inventory.hbs",
		"systems/nalfa/templates/partials/character-googlesheet/tabs.hbs",
		"systems/nalfa/templates/partials/character-googlesheet/tracker.hbs",
	];

	return foundry.applications.handlebars.loadTemplates(templatePaths);
}

Hooks.once("init", function () {
	console.log("nalfa | Initialising nalfa System");
	// CONFIG.debug.hooks = true;

	CONFIG.nalfa = nalfa;
	CONFIG.Item.documentClass = NalfaItem;

	foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
		foundry.documents.Actor,
		"core",
		foundry.applications.sheets.ActorSheetV2
	);
	foundry.applications.apps.DocumentSheetConfig.registerSheet(
		foundry.documents.Actor,
		"nalfa",
		NalfaCharacterSheet,
		{
			makeDefault: true,
		}
	);

	foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
		foundry.documents.Item,
		"core",
		foundry.applications.sheets.ItemSheetV2
	);
	foundry.applications.apps.DocumentSheetConfig.registerSheet(
		foundry.documents.Item,
		"nalfa",
		NalfaItemSheet,
		{
			makeDefault: true,
		}
	);

	preloadHandlebarsTemplates();

	Handlebars.registerHelper("onoff", function (bool) {
		return bool ? "on" : "off";
	});

	Handlebars.registerHelper("plusOne", function (numberString) {
		return String(parseInt(numberString, 10) + 1);
	});

	Handlebars.registerHelper("repeat", function (n, content) {
		let result = "";
		for (let i = 0; i < n; ++i) {
			result += content.fn(i);
		}
		return result;
	});

	Handlebars.registerHelper("isEmptyArray", function (array) {
		return !array.length;
	});

	Handlebars.registerHelper("statName", function (stat) {
		return nalfa.stats[stat];
	});

	Handlebars.registerHelper("skillName", function (skill) {
		return nalfa.skills[skill];
	});

	Handlebars.registerHelper("actionName", function (action) {
		return nalfa.actions[action];
	});

	Handlebars.registerHelper("weightIcon", function () {
		return `<i class="fa-solid fa-weight-hanging fa-sm weight-unit"></i>`;
	});

	Handlebars.registerHelper("listTypedValues", function (listOfTypedValues) {
		return listOfTypedValues
			.map((elem) => `<span class="${elem.type}">${elem.value} ${elem.type}</span>`)
			.join(", ");
	});
});

// Hooks.on("renderActorSheet", (app, html, data) => {
// 	console.warn("🚀 ~ Hooks.on ~ renderActorSheet:\n", html);
// 	applyMutationObserver(html[0]);
// });

Hooks.on("renderItemSheet", (app, html, data) => {
	console.warn("🚀 ~ Hooks.on ~ renderItemSheet:\n", html);
	applyMutationObserver(html[0]);
});

/* NOTE Unused:
Hooks.on("createItem", (sysData) => {
	console.log("nalfa | nalfa (main script) | createItem");
}); */

// [.] "Weapon", https://game-icons.net/1x1/lorc/broad-dagger.html
// [.] "Trinket", https://game-icons.net/1x1/lorc/gem-pendant.html
// [.] "Tool", https://game-icons.net/1x1/lorc/tinker.html
// [~] "Backpack", https://game-icons.net/1x1/lorc/knapsack.html
// [.] "Consumable", https://game-icons.net/1x1/lorc/standing-potion.html
// [.] "Loot", https://game-icons.net/1x1/lorc/swap-bag.html
// [~] "Book", https://game-icons.net/1x1/willdabeast/black-book.html
// [.] "Spell", https://game-icons.net/1x1/lorc/lightning-helix.html
// [x] "Currency", https://game-icons.net/1x1/delapouite/two-coins.html
// [.] "Race", https://game-icons.net/1x1/lorc/dark-squad.html
// [.] "Class", https://game-icons.net/1x1/lorc/embrassed-energy.html
// [.] "Job", https://game-icons.net/1x1/lorc/journey.html
// [.] "CombatStyle", https://game-icons.net/1x1/delapouite/fencer.html
// [.] "Status", https://game-icons.net/1x1/lorc/despair.html
// [.] "WeaponAttribute" https://game-icons.net/1x1/sbed/flamer.html

// DELETED : "Armor", https://game-icons.net/1x1/delapouite/abdominal-armor.html

Hooks.once("diceSoNiceReady", (dice3d) => {
	/**
	 * Register a new system
	 * The id is to be used with the addDicePreset method
	 * The name can be a localized string
	 * The group is a string that is only used to group multiple systems in the system list. Could be the name of the brand, or of a collection
	 * The mode, "preferred" or "default". "preferred" will enable this system by default until a user changes it to anything else. Default will add the system as a choice left to each user.
	 * @param {DiceSystem} mySystem
	 */
	const mySystem = new DiceSystem("nalfa", "Nalfa", "preferred");
	dice3d.addSystem(mySystem);
	dice3d.addDicePreset({
		type: "d4",
		labels: ["2", "2", "3", "4"],
		system: "nalfa",
	});
	dice3d.addDicePreset({
		type: "d6",
		labels: ["3", "3", "3", "4", "5", "6"],
		system: "nalfa",
	});
	dice3d.addDicePreset({
		type: "d8",
		labels: ["4", "4", "4", "4", "5", "6", "7", "8"],
		system: "nalfa",
	});
	dice3d.addDicePreset({
		type: "d10",
		labels: ["5", "5", "5", "5", "5", "6", "7", "8", "9", "10"],
		system: "nalfa",
	});
	dice3d.addDicePreset({
		type: "d12",
		labels: ["6", "6", "6", "6", "6", "6", "7", "8", "9", "10", "11", "12"],
		system: "nalfa",
	});
});
