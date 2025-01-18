import { nalfa } from "./module/config.js";
import { getHbsFiles, applyMutationObserver } from "./module/utils.js";
import NalfaItemSheet from "./module/sheets/nalfaItemSheet.js";
import NalfaCharacterSheet from "./module/sheets/nalfaCharacterSheet.js";
import NalfaItem from "./module/sheets/nalfaItem.js";

import { DiceSystem } from "../../modules/dice-so-nice/api.js";

async function preloadHandlebarsTemplates() {
	const templatePaths = await getHbsFiles("systems/nalfa/templates/partials");
	console.log("nalfa | Preloading Handlebars Templates", templatePaths);
	return loadTemplates(templatePaths);
}

Hooks.once("init", function () {
	console.log("nalfa | Initialising nalfa System");
	// CONFIG.debug.hooks = true;

	CONFIG.nalfa = nalfa;
	CONFIG.Item.documentClass = NalfaItem;

	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("nalfa", NalfaItemSheet, { makeDefault: true });

	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("nalfa", NalfaCharacterSheet, { makeDefault: true });

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

Hooks.on("renderActorSheet", (app, html, data) => {
	console.warn("🚀 ~ Hooks.on ~ renderActorSheet:\n", html);
	applyMutationObserver(html[0]);
});

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
