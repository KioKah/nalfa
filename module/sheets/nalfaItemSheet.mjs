const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class NalfaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	/** ─── DEFAULT OPTIONS ───────────────────────────────────────────────────────── */
	static DEFAULT_OPTIONS = {
		classes: ["nalfa", "sheet", "item-sheet"],
		position: {
			width: 632,
			height: 462,
		},
		form: {
			submitOnChange: true,
		},
	};

	get title() {
		console.warn("🚀 ~ NalfaItemSheet ~ get title ~ this.document:\n", this.document);
		return `Feuille de ${this.document.type} - ${this.item.name}`;
	}

	static PARTS = {
		header: {
			template: `systems/nalfa/templates/sheets/item/header.hbs`,
			classes: ["nalfa-sheet"],
		},
		sheet: {
			template: `systems/nalfa/templates/sheets/item/body.hbs`,
			classes: ["nalfa-sheet", "sheet-body"],
		},
	};

	/** ─── PREPARE CONTEXT ──────────────────────────────────────── */

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
			sheetData.item.img = `systems/nalfa/icons/base_icons/loot.svg`;
			// sheetData.item.img = `systems/nalfa/icons/base_icons/${sheetData.item.type}.svg`;
		}

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
				if (active) this.changeTab(active, group);
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
	// _onEffectControl(event) {
	// 	event.preventDefault();

	// 	// The Item document
	// 	const item = this.document;

	// 	// Find which <tr> row and effect ID was clicked
	// 	const a = event.currentTarget;
	// 	const tr = a.closest("tr");
	// 	const effectId = tr?.dataset.effectId;
	// 	const effect = effectId ? item.effects.get(effectId) : null;

	// 	switch (a.dataset.action) {
	// 		case "create":
	// 			return item.createEmbeddedDocuments("ActiveEffect", [
	// 				{
	// 					name: "New Effect",
	// 					icon: "icons/svg/aura.svg",
	// 					origin: item.uuid,
	// 					disabled: true,
	// 				},
	// 			]);

	// 		case "toggle":
	// 			return effect.update({ disabled: !effect.disabled });

	// 		case "edit":
	// 			return effect.sheet.render(true);

	// 		case "delete":
	// 			return effect.delete();
	// 	}
	// }
}
