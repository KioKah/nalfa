import { prepareCurrency } from "../prepareItems/currency.js";
import { enrichHTML, prepareItem } from "../utils.js";

export default class NalfaCharacterSheet extends ActorSheet {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["nalfa", "sheet", "actor"],
			height: 882, // 820 + 2*16 padding + 30 fenêtre = 882
			width: 812, // 780 + 2*16 padding = 812
			tabs: [
				{
					navSelector: ".sheet-tabs",
					contentSelector: ".sheet-body",
					initial: "character", // NOTE Assujetti à des changements futurs
				},
			],
		});
	}

	get template() {
		return `systems/nalfa/templates/sheets/character-googlesheet.hbs`; // TEMP character-googlesheet instead of character-sheet
	}

	// this.actor.owner → this.actor.isOwner
	// ItemContextMenu = ...
	//! this.actor.getOwnedItems() → this.actor.items.get()
	//! this.actor.deleteOwnedItem(...) → this.actor.deleteEmbeddedDocument("Item", [element.data("item-id")]);
	//! this.actor.createOwnedItems(itemData) → this.actor.createEmbeddedDocuments("Item", [itemData]);
	async getData() {
		const baseData = super.getData();
		console.warn("🚀 ~ NalfaCharacterSheet ~ getData ~ baseData:\n", baseData);
		/* OUTPUT
			actor: Actor {name: "test character actor", type: 'character', img: 'icons/svg/mystery-man.svg', system: {…}, #validationFailures: {…}, …}
			cssClass: "editable"
			data : {_id: '47v5dPr8104doC4v', name: "test character actor", type: 'character', img: 'icons/svg/mystery-man.svg', system: {…}, …}
			document: Actor {name: "test character actor", type: 'character', img: 'icons/svg/mystery-man.svg', system: {…}, #validationFailures: {…}, …}
			editable: true
			effects: []
			items: [{...},{...},{...}]
			limited: false
			options: {baseApplication: 'ActorSheet', width: 736, height: 800, top: null, left: null, …}
			owner: true
			title: "test character actor"
		*/

		//* Redefine sheet :
		let sheetData = {
			isOwner: this.actor.isOwner,
			isEditable: this.isEditable,
			actor: baseData.actor,
			sysData: baseData.actor.system,
			config: CONFIG.nalfa,
		};

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
		baseData.items.forEach((item) => {
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
		sheetData.weapons = baseData.items.filter(function (item) {
			return item.type == "Weapon";
		});

		//* TRINKETS :
		sheetData.trinkets = baseData.items.filter(function (item) {
			return item.type == "Trinket";
		});

		//* TOOLS :
		sheetData.tools = baseData.items.filter(function (item) {
			return item.type == "Tool";
		});

		//* BACKPACKS :
		sheetData.backpacks = baseData.items.filter(function (item) {
			return item.type == "Backpack";
		});

		//* CONSUMABLES :
		sheetData.consumables = baseData.items.filter(function (item) {
			return item.type == "Consumable";
		});

		//* LOOTS :
		sheetData.loots = baseData.items.filter(function (item) {
			return item.type == "Loot";
		});

		//* BOOKS :
		sheetData.books = baseData.items.filter(function (item) {
			return item.type == "Book";
		});

		//* SPELLS :
		sheetData.spells = baseData.items.filter(function (item) {
			return item.type == "Spell";
		});

		//* CURRENCIES :
		sheetData.currencies = baseData.items.filter(function (item) {
			return item.type == "Currency" && item.system.done;
		});
		console.error(sheetData.currencies);

		// Remove unfinished currencies
		const unfinishedCurrencies = baseData.items.filter(function (item) {
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
		const races = baseData.items.filter((item) => item.type === "Race");

		// Only keep the first race
		if (races.length > 1) {
			const racesToRemove = races.slice(1).map((item) => item._id);
			await Item.deleteDocuments(racesToRemove, { parent: this.actor });
		}
		sheetData.race = races.length > 0 ? races[0] : null;

		//* CLASS :
		const classes = baseData.items.filter((item) => item.type === "Class");

		// Only keep the first class
		if (classes.length > 1) {
			const classesToRemove = classes.slice(1).map((item) => item._id);
			await Item.deleteDocuments(classesToRemove, { parent: this.actor });
		}
		sheetData.class = classes.length > 0 ? classes[0] : null;

		//* JOBS :
		sheetData.jobs = baseData.items.filter(function (item) {
			return item.type == "Job";
		});

		//* COMBAT_STYLE :
		const combatStyles = baseData.items.filter((item) => item.type === "CombatStyle");

		// Only keep the first combat style
		if (combatStyles.length > 1) {
			const combatStylesToRemove = combatStyles.slice(1).map((item) => item._id);
			await Item.deleteDocuments(combatStylesToRemove, { parent: this.actor });
		}
		sheetData.combat_style = combatStyles.length > 0 ? combatStyles[0] : null;

		//* STATUS :
		sheetData.status = baseData.items.filter(function (item) {
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

		// FIXME : Cannot open the sheet because of code below
		for (const skill in CONFIG.nalfa.skills) {
			if (Object.hasOwnProperty.call(sheetData.sysData.attributes.skills, skill)) {
				sheetData.sysData.attributes.skills[skill].value =
					sheetData.sysData.attributes.skills[skill].base +
					statMap[sheetData.sysData.attributes.skills[skill].stats];
				// TODO : add bonuses
			}
		}

		console.warn("🚀 ~ NalfaCharacterSheet ~ sheetData.sysData:\n", sheetData.sysData);

		return sheetData;
	}

	activateListeners(html) {
		// https://youtu.be/9CTgto_sBGA?t=98&si=y-WKvTHfe-g9xc67
		// html.find(cssSelector).event(this._someCallBack.bind(this));
		html.find(".item-create").click(this._onItemCreate.bind(this));
		html.find(".item-delete").click(this._onItemDelete.bind(this));
		html.find(".item-edit").click(this._onItemEdit.bind(this));

		// Owner only
		if (this.actor.isOwner) {
			html.find(".item-roll").click(this._onItemRoll.bind(this));
		}

		super.activateListeners(html);
	}

	_onItemCreate(event) {
		console.log("nalfa | nalfaCharacterSheet | _onItemCreate");
		event.preventDefault();
		let element = event.currentTarget;

		let itemData = {
			name: "New Item",
			type: element.dataset.type,
		};

		return Item.createDocuments([itemData], { parent: this.actor });
	}

	_onItemDelete(event) {
		console.log("nalfa | nalfaCharacterSheet | _onItemDelete");
		event.preventDefault();
		const element = event.currentTarget;
		const elementId = element.closest(".item").dataset.itemId;
		Item.deleteDocuments([elementId], { parent: this.actor });
	}

	_onItemEdit(event) {
		console.log("nalfa | nalfaCharacterSheet | _onItemEdit");
		event.preventDefault();
		let element = event.currentTarget;
		let elementId = element.closest(".item").dataset.itemId;
		let item = this.actor.items.get(elementId);
		item.sheet.render(true);
	}

	// Owner only
	_onItemRoll(event) {
		// NOTE : Unused
		const itemID = event.currentTarget.closest(".item").dataset.itemId;
		const item = this.actor.items.get(itemID);

		// NOTE : Pour les jets, cliquer lance directement le jet et les modificateurs "à la main" peuvent être ajoutés après. Pareil pour avantage / désavantage : laisser un bouton pour reroll en gardant le meilleur / pire.

		item.roll();
	}

	// NOTE : Copié sans test
	async _onTest(event) {
		console.log("nalfa | nalfaCharacterSheet | _onTest");
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
			callback: ([html]) => new FormDataExtended(html.querySelector("FORM")).object.mod,
		});
	}
}
