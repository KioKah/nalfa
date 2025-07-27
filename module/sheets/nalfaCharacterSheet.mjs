import { prepareCurrency } from "../prepareItems/currency.mjs";
import { enrichHTML, prepareItem } from "../utils.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class NalfaCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
	/** ─── DEFAULT OPTIONS ───────────────────────────────────────────────────────── */
	static DEFAULT_OPTIONS = {
		classes: ["nalfa", "sheet", "actor"],
		position: {
			width: 812,
			height: 882,
		},
		window: {
			title: "Character Sheet",
		},
		dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
		form: {
			submitOnChange: true,
		},
	};

	/** ─── TEMPLATE ───────────────────────────────────────────────────────────────── */
	static PARTS = {
		header: {
			template: `systems/nalfa/templates/parts/character-v2/header.hbs`,
		},
		tabs: {
			template: `systems/nalfa/templates/parts/character-v2/tabs.hbs`,
		},
		character: {
			template: `systems/nalfa/templates/parts/character-v2/character.hbs`,
		},
		tracker: {
			template: `systems/nalfa/templates/parts/character-v2/tracker.hbs`,
		},
		class: {
			template: `systems/nalfa/templates/parts/character-v2/class.hbs`,
		},
		inventory: {
			template: `systems/nalfa/templates/parts/character-v2/inventory.hbs`,
		},
		esters: {
			template: `systems/nalfa/templates/parts/character-v2/esters.hbs`,
		},
	};

	static TABS = {
		primary: {
			initial: "character",
			tabs: [
				{
					id: "character",
					label: "nalfa.sheet.tabs.character",
					icon: "fa-solid fa-user",
				},
				{
					id: "tracker",
					label: "nalfa.sheet.tabs.tracker",
					icon: "fa-solid fa-list-check",
				},
				{
					id: "class",
					label: "nalfa.sheet.tabs.class",
					icon: "fa-solid fa-boxes-stacked",
				},
				{
					id: "inventory",
					label: "nalfa.sheet.tabs.inventory",
					icon: "fa-solid fa-boxes-stacked",
				},
				{
					id: "esters",
					label: "nalfa.sheet.tabs.esters",
					icon: "fa-solid fa-coins",
				},
			],
		},
	};

	// TODO
	_getTabs(parts) {
		// If you have sub-tabs this is necessary to change
		const tabGroup = "primary";
		// Default tab for first time it's rendered this session
		if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = "biography";
		return parts.reduce((tabs, partId) => {
			const tab = {
				cssClass: "",
				group: tabGroup,
				// Matches tab property to
				id: "",
				// FontAwesome Icon, if you so choose
				icon: "",
				// Run through localization
				label: "BOILERPLATE.Actor.Tabs.",
			};
			switch (partId) {
				case "header":
				case "tabs":
					return tabs;
				case "biography":
					tab.id = "biography";
					tab.label += "Biography";
					break;
				case "features":
					tab.id = "features";
					tab.label += "Features";
					break;
				case "gear":
					tab.id = "gear";
					tab.label += "Gear";
					break;
				case "spells":
					tab.id = "spells";
					tab.label += "Spells";
					break;
				case "effects":
					tab.id = "effects";
					tab.label += "Effects";
					break;
			}
			if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
			tabs[partId] = tab;
			return tabs;
		}, {});
	}
	// get template() {
	// 	   TEMP: using "character-googlesheet" instead of "character-sheet"
	// 	return `systems/nalfa/templates/sheets/character-googlesheet.hbs`;
	// }

	/** ─── PREPARE CONTEXT ──────────────────────────────────────── */
	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);
		console.warn("🚀 ~ _prepareContext ~ baseData:\n", baseData);

		const items = baseData.items || [];

		const sheetData = {
			isOwner: this.actor.isOwner,
			isEditable: this.isEditable,
			actor: baseData.document,
			sysData: baseData.document.system,
			config: CONFIG.nalfa,
		};
		sheetData.tabs = this._prepareTabs("primary");

		//* Enrich HTML :
		sheetData.enrichedHTML = {};
		sheetData.enrichedHTML.description = {};

		sheetData.enrichedHTML.description.physical = await enrichHTML(
			sheetData.sysData.description.physical,
			sheetData.isOwner
		);
		sheetData.enrichedHTML.description.psychic = await enrichHTML(
			sheetData.sysData.description.psychic,
			sheetData.isOwner
		);
		sheetData.enrichedHTML.description.story = await enrichHTML(
			sheetData.sysData.description.story,
			sheetData.isOwner
		);

		if (sheetData.actor.type === "npc") {
			sheetData.enrichedHTML.description.source = await enrichHTML(
				sheetData.sysData.description.source,
				sheetData.isOwner
			);
		}

		//* Prepare all items
		items.forEach((item) => {
			prepareItem(item.system, item.type);
		});

		//* vvvvvvvvvv Item filtering vvvvvvvvvv *//

		// Items :
		/* All item types :
		[   "Weapon",
			"Trinket",
			"Tool",
			"Backpack",
			"Consumable",
			"Loot",
			"Book",
			"Spell",
			"Currency",
			"Race",
			"Class",
			"Job",
			"CombatStyle",
			"Status",
			("WeaponAttribute")
		] */

		//* WEAPONS :
		sheetData.weapons = items.filter(function (item) {
			return item.type == "Weapon";
		});

		//* TRINKETS :
		sheetData.trinkets = items.filter(function (item) {
			return item.type == "Trinket";
		});

		//* TOOLS :
		sheetData.tools = items.filter(function (item) {
			return item.type == "Tool";
		});

		//* BACKPACKS :
		sheetData.backpacks = items.filter(function (item) {
			return item.type == "Backpack";
		});

		//* CONSUMABLES :
		sheetData.consumables = items.filter(function (item) {
			return item.type == "Consumable";
		});

		//* LOOTS :
		sheetData.loots = items.filter(function (item) {
			return item.type == "Loot";
		});

		//* BOOKS :
		sheetData.books = items.filter(function (item) {
			return item.type == "Book";
		});

		//* SPELLS :
		sheetData.spells = items.filter(function (item) {
			return item.type == "Spell";
		});

		//* CURRENCIES :
		sheetData.currencies = items.filter(function (item) {
			return item.type == "Currency" && item.system.done;
		});

		// Remove unfinished currencies
		const unfinishedCurrencies = items.filter(function (item) {
			return item.type == "Currency" && !item.system.done;
		});
		const currenciesToRemove = Object.values(unfinishedCurrencies).map(
			(currency) => currency._id
		);
		await Item.deleteDocuments(currenciesToRemove, { parent: this.actor });

		// Attempt to fuse similar currencies
		if (sheetData.currencies.length > 1) {
			// groupedCurrencies is an object containing a lists of currencies.
			// Each element of the object corresponds to one unique currency.
			// Two currencies are considered the same if every attribute except those related to their number is the same in each denomination.
			const groupedCurrencies = {};

			sheetData.currencies.forEach((currency) => {
				const noValueCurrencyCopy = JSON.parse(JSON.stringify(currency.system));
				noValueCurrencyCopy.total_value = 0;
				noValueCurrencyCopy.total_weight = 0;
				Object.values(noValueCurrencyCopy.denominations).forEach((denomination) => {
					denomination.value = 0;
					denomination.amount = 0;
					denomination.weight = 0;
				});

				// Create a key based on the noValueCurrencyCopy
				const key = `${currency.name}_${JSON.stringify(noValueCurrencyCopy)}`;

				groupedCurrencies[key] = groupedCurrencies[key] || [];
				groupedCurrencies[key].push(currency);
			});

			// nonUniqueGroupedCurrency is groupedCurrencies without all arrays of length == 1
			const nonUniqueGroupedCurrency = Object.fromEntries(
				Object.entries(groupedCurrencies).filter(
					([key, currenciesList]) => currenciesList.length > 1
				)
			);

			if (Object.keys(nonUniqueGroupedCurrency).length > 0) {
				// create mergedGroupedCurrency, the array of all currencies in nonUniqueCurrencies but merged into one so each unique currency appears once with its value being the sum of all the values of that currency
				// Let '€' be a currency with 2 denominations
				// Let "€1" be a '€'-currency, with value 1 in the first denomination and 0 in the second
				// Let "€2" be a '€'-currency, with value 0 in the first denomination and 2 in the second
				// Merging "€1" and "€2" will result in a '€'-currency with value 1 in the first denomination and 2 in the second
				const mergedGroupedCurrency = Object.values(nonUniqueGroupedCurrency).map(
					(groupedCurrency) => {
						groupedCurrency[0].system.denominations = Object.keys(
							groupedCurrency[0].system.denominations
						).reduce((result, key) => {
							result[key] = {
								...groupedCurrency[0].system.denominations[key],
								amount: groupedCurrency.reduce(
									(sum, currency) => sum + currency.system.denominations[key].amount,
									0
								),
							};
							return result;
						}, {});

						prepareCurrency(groupedCurrency[0].system);

						return groupedCurrency[0];
					}
				);

				const currenciesToRemove = Object.values(nonUniqueGroupedCurrency).flatMap(
					(groupedCurrency) => {
						return groupedCurrency.slice(1).map((currency) => currency._id);
					}
				);

				// DOCUMENTATION : https://foundryvtt.com/api/classes/foundry.abstract.Document.html#updateDocuments
				// const actor = game.actors.getName("Timothy");
				// const updates = [{_id: sword.id, name: "Magic Sword"}, {_id: shield.id, name: "Magic Shield"}];
				// const updated = await Item.updateDocuments(updates, {parent: actor});
				await Item.updateDocuments(mergedGroupedCurrency, { parent: this.actor });

				// DOCUMENTATION : https://foundryvtt.com/api/classes/foundry.abstract.Document.html#deleteDocuments
				// const tim = game.actors.getName("Tim");
				// const sword = tim.items.getName("Sword");
				// const shield = tim.items.getName("Shield");
				// const deleted = await Item.deleteDocuments([sword.id, shield.id], parent: actor});
				await Item.deleteDocuments(currenciesToRemove, { parent: this.actor });
				sheetData.currencies = sheetData.currencies.filter(
					(currency) => !currenciesToRemove.includes(currency._id)
				);
			}
		}

		//* RACE :
		const races = items.filter((item) => item.type === "Race");

		// Only keep the first race
		if (races.length > 1) {
			const racesToRemove = races.slice(1).map((item) => item._id);
			await Item.deleteDocuments(racesToRemove, { parent: this.actor });
		}
		sheetData.race = races.length > 0 ? races[0] : null;

		//* CLASS :
		const classes = items.filter((item) => item.type === "Class");

		// Only keep the first class
		if (classes.length > 1) {
			const classesToRemove = classes.slice(1).map((item) => item._id);
			await Item.deleteDocuments(classesToRemove, { parent: this.actor });
		}
		sheetData.class = classes.length > 0 ? classes[0] : null;

		//* JOBS :
		sheetData.jobs = items.filter(function (item) {
			return item.type == "Job";
		});

		//* COMBAT_STYLE :
		const combatStyles = items.filter((item) => item.type === "CombatStyle");

		// Only keep the first combat style
		if (combatStyles.length > 1) {
			const combatStylesToRemove = combatStyles.slice(1).map((item) => item._id);
			await Item.deleteDocuments(combatStylesToRemove, { parent: this.actor });
		}
		sheetData.combat_style = combatStyles.length > 0 ? combatStyles[0] : null;

		//* STATUS :
		sheetData.status = items.filter(function (item) {
			return item.type == "Status";
		});

		//* ^^^^^^^^^^ Item filtering ^^^^^^^^^^ *//

		// Stats :
		for (const stat in CONFIG.nalfa.stats) {
			if (Object.hasOwnProperty.call(sheetData.sysData.stats, stat)) {
				sheetData.sysData.stats[stat].value = sheetData.sysData.stats[stat].base;
				// TODO : add bonuses
			}
		}

		// Prepare functions and maps :
		const statMap = {
			str: sheetData.sysData.stats.str.value,
			dex: sheetData.sysData.stats.dex.value,
			int: sheetData.sysData.stats.int.value,
			cha: sheetData.sysData.stats.cha.value,
			wis: sheetData.sysData.stats.wis.value,
			con: sheetData.sysData.stats.con.value,
			none: 0,
		};

		// Compute the necessary variables :
		sheetData.sysData.attributes.initiative.value =
			sheetData.sysData.attributes.initiative.base +
			2 * statMap[sheetData.sysData.attributes.initiative.stat];
		// TODO : add bonuses

		sheetData.sysData.attributes.passive_percep.value =
			sheetData.sysData.attributes.passive_percep.base +
			statMap[sheetData.sysData.attributes.passive_percep.stat];
		// TODO : add bonuses

		for (const skill in CONFIG.nalfa.skills) {
			if (Object.hasOwnProperty.call(sheetData.sysData.attributes.skills, skill)) {
				sheetData.sysData.attributes.skills[skill].value =
					sheetData.sysData.attributes.skills[skill].base +
					statMap[sheetData.sysData.attributes.skills[skill].stat];
				// TODO : add bonuses
			}
		}

		sheetData.sysData.attributes.armor_score.value = sheetData.class
			? sheetData.sysData.attributes.armor_score.base +
			  sheetData.class.sysData.attributes.armor_score.base +
			  statMap[sheetData.class.sysData.attributes.armor_score.stat]
			: sheetData.sysData.attributes.armor_score.base;

		console.warn("🚀 ~ NalfaCharacterSheet ~ sheetData.sysData:\n", sheetData.sysData);

		return sheetData;
	}

	async _preparePartContext(partId, context) {
		switch (partId) {
			case "character":
			case "tracker":
			case "class":
			case "inventory":
			case "esters":
				context.tab = context.tabs[partId];
				break;
			default:
		}
		return context;
	}

	/** ─── ON RENDER (replaces activateListeners) ───────────────────────────────── */
	_onRender(context, options) {
		super._onRender(context, options);
		if (this.tabGroups) {
			for (const [group, active] of Object.entries(this.tabGroups)) {
				if (active) this.changeTab(active, { group });
			}
		}

		// ITEM CREATE
		this.element
			.querySelectorAll(".item-create")
			.forEach((btn) => btn.addEventListener("click", this._onItemCreate.bind(this)));

		// ITEM DELETE
		this.element
			.querySelectorAll(".item-delete")
			.forEach((btn) => btn.addEventListener("click", this._onItemDelete.bind(this)));

		// ITEM EDIT
		this.element
			.querySelectorAll(".item-edit")
			.forEach((btn) => btn.addEventListener("click", this._onItemEdit.bind(this)));

		// ITEM ROLL (owner only)
		if (this.actor.isOwner) {
			this.element
				.querySelectorAll(".item-roll")
				.forEach((btn) => btn.addEventListener("click", this._onItemRoll.bind(this)));
		}
	}

	/** ─── ITEM CREATE HANDLER ───────────────────────────────────────────────────── */
	_onItemCreate(event) {
		event.preventDefault();
		const type = event.currentTarget.dataset.type;
		const itemData = {
			name: "New Item",
			type: type,
		};
		return Item.createDocuments([itemData], { parent: this.actor });
	}

	/** ─── ITEM DELETE HANDLER ───────────────────────────────────────────────────── */
	_onItemDelete(event) {
		event.preventDefault();
		const element = event.currentTarget.closest(".item");
		const itemId = element.dataset.itemId;
		return Item.deleteDocuments([itemId], { parent: this.actor });
	}

	/** ─── ITEM EDIT HANDLER ─────────────────────────────────────────────────────── */
	_onItemEdit(event) {
		event.preventDefault();
		const element = event.currentTarget.closest(".item");
		const itemId = element.dataset.itemId;
		const item = this.actor.items.get(itemId);
		return item.sheet.render(true);
	}

	/** ─── ITEM ROLL HANDLER (OWNER ONLY) ─────────────────────────────────────────── */
	_onItemRoll(event) {
		event.preventDefault();
		const element = event.currentTarget.closest(".item");
		const itemId = element.dataset.itemId;
		const item = this.actor.items.get(itemId);
		return item.roll();
	}

	/** ─── OPTIONAL DIALOG PROMPT (UNTESTED) ─────────────────────────────────────── */
	async _onTest(event) {
		event.preventDefault();
		return await Dialog.prompt({
			content: `
        <form>
          <div class="form-group">
            <label>Modifier</label>
            <div class="form-fields">
              <input type="text" name="mod" autofocus>
            </div>
          </div>
        </form>`,
			label: "OK",
			title: "Get Modifier",
			callback: ([html]) => new FormDataExtended(html.querySelector("form")).object.mod,
		});
	}
}
