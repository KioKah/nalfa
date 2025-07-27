import { enrichHTML, prepareItem } from "../utils.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class NalfaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	/**
	 * ─── DEFAULT OPTIONS ──────────────────────────────────────────────────────────
	 * Merge in your CSS classes, initial width/height, and tabGroups exactly like V1.
	 */
	static get DEFAULT_OPTIONS() {
		return foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
			classes: ["nalfa", "sheet", "item"],
			width: 632,
			height: 462,
			tabGroups: [
				{
					navSelector: ".sheet-tabs",
					contentSelector: ".sheet-body",
					initial: "item-specific",
				},
			],
		});
	}

	/**
	 * ─── DYNAMIC TEMPLATE SELECTION ───────────────────────────────────────────────
	 * We keep the same mapping logic from V1. Foundry will call this getter to know
	 * which .hbs to use.
	 */
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
		const sheetName = conversionMap[this.document.type] || "test-item";
		return `systems/nalfa/templates/sheets/${sheetName}-sheet.hbs`;
	}

	/**
	 * ─── PREPARE CONTEXT (replaces getData in V1) ─────────────────────────────────
	 * Build the exact same sheetData that you did in V1’s getData().
	 */
	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);
		console.warn("🚀 ~ NalfaItemSheet ~ _prepareContext ~ baseData:\n", baseData);

		// Redefine sheet :
		const item = baseData.document;
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

	/**
	 * ─── ON RENDER (replaces activateListeners in V1) ─────────────────────────────
	 * Once the HTML is in the DOM, bind your `.effect‐control` click handlers with vanilla JS.
	 */
        _onRender(context, options) {
               // Always call super first
               super._onRender(context, options);
               if (this.tabGroups) {
                       for (const [group, active] of Object.entries(this.tabGroups)) {
                               if (active) this.changeTab(active, { group });
                       }
               }

		// If editable, attach click listeners to any `.effect-control` button
		if (this.isEditable) {
			this.element.querySelectorAll(".effect-control").forEach((button) => {
				button.addEventListener("click", this._onEffectControl.bind(this));
			});
		}
	}

	/**
	 * ─── EFFECT CONTROL HANDLER ───────────────────────────────────────────────────
	 * Same logic as V1’s _onEffectControl, but reference `this.document` (the Item) instead of `this.object`.
	 */
	_onEffectControl(event) {
		event.preventDefault();

		// The Item document
		const item = this.document;

		// Find which <tr> row and effect ID was clicked
		const a = event.currentTarget;
		const tr = a.closest("tr");
		const effectId = tr?.dataset.effectId;
		const effect = effectId ? item.effects.get(effectId) : null;

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
