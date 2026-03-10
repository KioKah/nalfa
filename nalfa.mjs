import { nalfa } from "./module/config.mjs";
// import { applyMutationObserver } from "./module/utils.mjs";
import NalfaItemSheet from "./module/sheets/nalfaItemSheet.mjs";
import NalfaCharacterSheet from "./module/sheets/nalfaCharacterSheet.mjs";
import NalfaItem from "./module/sheets/nalfaItem.mjs";
import NalfaCombat from "./module/documents/nalfaCombat.mjs";
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
} from "./module/data/models.mjs";
import { registerHalfMinimumDiceModifier } from "./module/rolls/diceModifiers.mjs";
import * as rollMacros from "./module/rolls/macros.mjs";
import * as rollHandlers from "./module/rolls/rolls.mjs";
import * as actionExecution from "./module/rolls/actionExecution.mjs";
import { round } from "./module/utils.mjs";

async function preloadHandlebarsTemplates() {
	console.log("nalfa | Preloading Handlebars Templates");

	const templatePaths = [
		"systems/nalfa/templates/sheets/character/header.hbs",
		"systems/nalfa/templates/sheets/character/tabs.hbs",
		"systems/nalfa/templates/sheets/character/body.hbs",

		"systems/nalfa/templates/partials/character/combat-overview.hbs",

		"systems/nalfa/templates/sheets/item/header.hbs",
		"systems/nalfa/templates/sheets/item/tabs.hbs",
		"systems/nalfa/templates/sheets/item/body.hbs",
		"systems/nalfa/templates/sheets/item/action-editor-header.hbs",
		"systems/nalfa/templates/sheets/item/action-editor-separator.hbs",
		"systems/nalfa/templates/sheets/item/action-editor.hbs",
		"systems/nalfa/templates/partials/item/item-specific.hbs",
		"systems/nalfa/templates/partials/item/embedded-actions.hbs",
		"systems/nalfa/templates/partials/item/actionable.hbs",
		"systems/nalfa/templates/partials/item/modifiers.hbs",
		"systems/nalfa/templates/partials/item/description.hbs",
		"systems/nalfa/templates/partials/item/physical.hbs",
		"systems/nalfa/templates/partials/item/specific/weapon.hbs",
		"systems/nalfa/templates/partials/item/specific/trinket.hbs",
		"systems/nalfa/templates/partials/item/specific/tool.hbs",
		"systems/nalfa/templates/partials/item/specific/backpack.hbs",
		"systems/nalfa/templates/partials/item/specific/consumable.hbs",
		"systems/nalfa/templates/partials/item/specific/loot.hbs",
		"systems/nalfa/templates/partials/item/specific/book.hbs",
		"systems/nalfa/templates/partials/item/specific/action.hbs",
		"systems/nalfa/templates/partials/item/specific/currency.hbs",
		"systems/nalfa/templates/partials/item/specific/race.hbs",
		"systems/nalfa/templates/partials/item/specific/class.hbs",
		"systems/nalfa/templates/partials/item/specific/job.hbs",
		"systems/nalfa/templates/partials/item/specific/weapon-attribute.hbs",

		"systems/nalfa/templates/chat/roll/skill.hbs",
		"systems/nalfa/templates/chat/roll/attack.hbs",
		"systems/nalfa/templates/chat/roll/damage.hbs",
		"systems/nalfa/templates/chat/roll/save.hbs",
		"systems/nalfa/templates/chat/roll/initiative.hbs",
		"systems/nalfa/templates/chat/roll/prompt-save.hbs",
	];

	return foundry.applications.handlebars.loadTemplates(templatePaths);
}

Hooks.once("init", function () {
	console.log("nalfa | Initialising nalfa System");
	// CONFIG.debug.hooks = true;
	registerHalfMinimumDiceModifier();
	CONFIG.Combat.initiative.formula = "1d20+@attributes.initiative.value";
	CONFIG.Combat.documentClass = NalfaCombat;
	CONFIG.nalfa = nalfa;

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

	// Currently no custom CONFIG.Actor.documentClass
	CONFIG.Item.documentClass = NalfaItem;
	game.nalfa = {
		...(game.nalfa ?? {}),
		rolls: {
			...rollHandlers,
			...actionExecution,
		},
		macros: rollMacros,
	};

	Hooks.on("hotbarDrop", async (hotbar, data, slot) => {
		void hotbar;
		if (!game.nalfa?.macros?.createHotbarMacro) return true;
		return game.nalfa.macros.createHotbarMacro(data, slot);
	});

	foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
		foundry.documents.Actor,
		"core",
		foundry.applications.sheets.ActorSheetV2,
	);
	foundry.applications.apps.DocumentSheetConfig.registerSheet(
		foundry.documents.Actor,
		"nalfa",
		NalfaCharacterSheet,
		{
			makeDefault: true,
		},
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
		{
			makeDefault: true,
		},
	);

	preloadHandlebarsTemplates();

	Handlebars.registerHelper("onoff", function (bool) {
		return bool ? "on" : "off";
	});

	Handlebars.registerHelper("plusOne", function (numberString) {
		return String(parseInt(numberString, 10) + 1);
	});

	Handlebars.registerHelper("formulaSignedNumber", function (value) {
		const number = Number(value);
		if (!Number.isFinite(number)) return "";
		if (number == 0) return "";
		return number >= 0 ? `+${number}` : `${number}`;
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

	Handlebars.registerHelper("valueBaseAlt", function (mode, systemPath, obj) {
		const hasValue = (value) => value !== null && value !== undefined;
		if (mode == "values" && hasValue(obj.value)) {
			return `<span class="value">${obj.value}</span>`;
		}
		if (mode == "base" && hasValue(obj.base)) {
			return `<input
						class="base"
						name="${systemPath}.base"
						type="number"
						value="${obj.base}"
						data-dtype="Number"
					/>`;
		}
		if (mode == "alt" && hasValue(obj.alt)) {
			return `<input
						class="alt"
						name="${systemPath}.alt"
						type="number"
						value="${obj.alt}"
						data-dtype="Number"
					/>`;
		}
		return "";
	});

	Handlebars.registerHelper("weightIcon", function () {
		return `<i class="fa-solid fa-weight-hanging fa-sm weight-unit"></i>`;
	});

	Handlebars.registerHelper("compactNumber", function (value, maxDigits = 4) {
		const number = Number(value);
		if (!Number.isFinite(number)) return "";

		const digits = Math.max(1, Number(maxDigits) || 4);
		const minMagnitude = 10 ** (1 - digits);
		const clampedNumber =
			number !== 0 && Math.abs(number) < minMagnitude
				? Math.sign(number) * minMagnitude
				: number;
		return new Intl.NumberFormat("fr-FR", {
			maximumSignificantDigits: digits,
			useGrouping: false,
		}).format(clampedNumber);
	});

	Handlebars.registerHelper("roundNumber", function (value, decimals = 2) {
		const number = Number(value);
		if (!Number.isFinite(number)) return "";

		const precision = Math.max(0, Math.trunc(Number(decimals) || 0));
		return round(number, precision);
	});

	Handlebars.registerHelper("pluralTargetLabel", function (label, count) {
		const amount = Number(count ?? 0);
		return amount >= 2 ? `${label}s` : `${label}`;
	});

	Handlebars.registerHelper("listTypedValues", function (listOfTypedValues) {
		return listOfTypedValues
			.map((elem) => `<span class="${elem.type}">${elem.value} ${elem.type}</span>`)
			.join(", ");
	});
});

Hooks.on("renderChatMessageHTML", (message, html) => {
	const root = html?.querySelector ? html : null;
	if (!root) return;
	root.querySelectorAll(".nalfa-chat-card").forEach((card) => {
		if (card.classList.contains("nalfa-chat-card--prompt")) return;
		if (card.dataset.nalfaToggle) return;
		card.dataset.nalfaToggle = "true";
		card.addEventListener("click", () => {
			card.classList.toggle("is-open");
		});
	});
	root.querySelectorAll(".nalfa-roll-prompt").forEach((button) => {
		if (button.dataset.nalfaPrompt) return;
		button.dataset.nalfaPrompt = "true";
		button.addEventListener("click", (event) => {
			event.preventDefault();
			const target = event.currentTarget;
			const statKey = target?.dataset?.stat ?? "";
			const dc = Number(target?.dataset?.dc ?? 0);
			const titleName = target?.dataset?.name ?? "";
			const actor = canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
			if (!actor) {
				ui.notifications.warn("Veuillez sélectionner une cible.");
				return;
			}
			game.nalfa?.rolls?.rollSaveTarget?.(actor, statKey, dc, titleName);
		});
	});
});

// Hooks.on("renderActorSheet", (app, html, data) => {
// 	console.warn("🚀 ~ Hooks.on ~ renderActorSheet:\n", html);
// 	applyMutationObserver(html[0]);
// });

// Hooks.on("renderItemSheet", (app, html, data) => {
// 	console.warn("🚀 ~ Hooks.on ~ renderItemSheet:\n", html);
// 	applyMutationObserver(html[0]);
// });

/* NOTE Unused:
Hooks.on("createItem", (sysData) => {
	console.log("nalfa | nalfa (main script) | createItem");
}); */

// [.] "Weapon", https://game-icons.net/1x1/lorc/broad-dagger.html
// [.] "Trinket", https://game-icons.net/1x1/lorc/gem-pendant.html
// [.] "Tool", https://game-icons.net/1x1/lorc/dig-dug.html
// [~] "Backpack", https://game-icons.net/1x1/lorc/knapsack.html
// [.] "Consumable", https://game-icons.net/1x1/lorc/standing-potion.html
// [.] "Loot", https://game-icons.net/1x1/lorc/swap-bag.html
// [~] "Book", https://game-icons.net/1x1/willdabeast/black-book.html
// [.] "Spell", https://game-icons.net/1x1/lorc/lightning-helix.html
// [x] "Currency", https://game-icons.net/1x1/delapouite/two-coins.html
// [.] "Race", https://game-icons.net/1x1/lorc/dark-squad.html
// [.] "Class", https://game-icons.net/1x1/delapouite/skills.html
// [.] "Job", https://game-icons.net/1x1/lorc/journey.html
// [.] "CombatStyle", https://game-icons.net/1x1/delapouite/fencer.html
// [.] "Status", https://game-icons.net/1x1/lorc/despair.html
// [.] "WeaponAttribute" https://game-icons.net/1x1/sbed/flamer.html

// DELETED : "Armor", https://game-icons.net/1x1/delapouite/abdominal-armor.html

Hooks.once("diceSoNiceReady", async (dice3d) => {
	let DiceSystem;
	try {
		({ DiceSystem } = await import("/modules/dice-so-nice/api.js"));
	} catch (error) {
		console.warn("nalfa | Dice So Nice API unavailable, skipping integration.", error);
		return;
	}

	/**
	 * Register a new system
	 * The id is to be used with the addDicePreset method
	 * The name can be a localized string
	 * The group is a string that is only used to group multiple systems in the system list. Could be the name of the brand, or of a collection
	 * The mode, "preferred" or "default". "preferred" will enable this system by default until a user changes it to anything else. Default will add the system as a choice left to each user.
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
