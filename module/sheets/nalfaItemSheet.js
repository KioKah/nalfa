import { enrichHTML, prepareItem } from "../utils.js";

export default class NalfaItemSheet extends ItemSheet {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["nalfa", "sheet", "item"],
			height: 462, // 400 + 2*16 padding + 30 fenêtre = 462
			width: 632, // 600 + 16*2 (padding) = 632
			tabs: [
				{
					navSelector: ".sheet-tabs",
					contentSelector: ".sheet-body",
					initial: "item-specific", // NOTE Assujetti à des changements futurs
				},
			],
		});
	}

	get template() {
		const conversionMap = {
			Weapon: "weapon",
			Trinket: "trinket",
			Tool: "tool",
			Backpack: "backpack",
			Consumable: "consumable",
			Loot: "loot",
			Book: "book",
			Action: "action",
			Currency: "currency",
			Race: "race",
			Class: "class",
			Job: "job",
			CombatStyle: "combat-style",
			Status: "status",
			WeaponAttribute: "weapon-attribute",
		};
		const sheetName = conversionMap[this.item.type] || "test-item";
		return `systems/nalfa/templates/sheets/${sheetName}-sheet.hbs`;
	}

	async getData() {
		const baseData = await super.getData();
		console.warn("🚀 ~ NalfaItemSheet ~ getData ~ baseData:\n", baseData);
		/* OUTPUT
			cssClass: "editable"
			data: {_id: 'eBvwSrON4cOQxZho', name: 'test money', type: 'currency', img: 'systems/nalfa/icons/base_icons/currency.svg', system: {…}, …}
			document: NalfaItem {name: 'test money', type: 'currency', img: 'systems/nalfa/icons/base_icons/currency.svg', system: {…}, #validationFailures: {…}, …}
			editable: true
			item: NalfaItem {name: 'test money', type: 'currency', img: 'systems/nalfa/icons/base_icons/currency.svg', system: {…}, #validationFailures: {…}, …}
			limited: false
			options: {baseApplication: 'ItemSheet', width: 616, height: null, top: null, left: null, …}
			owner: true
			title: "test money"
		*/

		// Redefine sheet :
		const item = baseData.item;
		let sheetData = {
			isOwner: this.item.isOwner,
			isEditable: this.isEditable,
			item: item,
			sysData: item.system,
			effects: item.getEmbeddedCollection("ActiveEffect").contents,
			config: CONFIG.nalfa,
		};

		// Change image if default :
		if (sheetData.item.img == "icons/svg/item-bag.svg") {
			sheetData.item.img = `systems/nalfa/icons/base_icons/${sheetData.item.type}.svg`;
		}

		// Enrich HTML :
		sheetData.enrichedHTML = {};
		if (sheetData.sysData.description) {
			sheetData.enrichedHTML.description = {
				value: await enrichHTML(sheetData.sysData.description.value, sheetData.isOwner),
				source: await enrichHTML(sheetData.sysData.description.source, sheetData.isOwner),
			};
			if (sheetData.sysData.casting) {
				sheetData.enrichedHTML.casting = {
					cooldown: await enrichHTML(sheetData.sysData.casting.cooldown, sheetData.isOwner),
				};
			}
		}
		if (sheetData.sysData.identification) {
			sheetData.enrichedHTML.identification = {
				unidentified: {
					description: await enrichHTML(
						sheetData.sysData.identification.unidentified.description,
						sheetData.isOwner
					),
				},
			};
		}
		// if (sheetData.sysData.identification) {
		// 	if (!sheetData.enrichedHTML) sheetData.enrichedHTML = {};
		// 	sheetData.enrichedHTML.identification = {
		// 		unidentified: {
		// 			description: await enrichHTML(
		// 				sheetData.sysData.identification.public,
		// 				sheetData.isOwner
		// 			),
		// 		},
		// 	};
		// }

		// Prepare item
		prepareItem(sheetData.sysData, sheetData.item.type);

		console.warn("🚀 ~ NalfaItemSheet ~ getData ~ sheetData:\n", sheetData);

		return sheetData;
	}

	activateListeners(html) {
		if (this.isEditable) {
			html.find(".effect-control").click(this._onEffectControl.bind(this));
		}
	}

	_onEffectControl(event) {
		event.preventDefault();
		const item = this.object;
		console.warn("🚀 ~ NalfaItemSheet ~ _onEffectControl ~ this:\n", this);
		const a = event.currentTarget;
		const tr = a.closest("tr");
		const effect = tr.dataset.effectId ? item.effects.get(tr.dataset.effectId) : null;
		console.warn("🚀 ~ NalfaItemSheet ~ _onEffectControl ~ effect:\n", effect);

		switch (a.dataset.action) {
			case "create":
				return item.createEmbeddedDocuments("ActiveEffect", [
					{
						name: "New Effect",
						icon: "icons/svg/aura.svg",
						origin: item.uuid,
						disabled: true,
					},
				]);
			case "toggle":
				return effect.update({ disabled: !effect.disabled });
			case "edit":
				return effect.sheet.render(true);
			case "delete":
				return effect.delete();
		}
	}
}
