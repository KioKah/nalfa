const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class NalfaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	static TABS = {
		primary: {
			tabs: [
				{ id: "specific", label: "Spécifique" },
				{ id: "actionable", label: "Action" },
				{ id: "description", label: "Description" },
			],
			initial: "specific",
		},
	};

	static DEFAULT_OPTIONS = {
		classes: ["nalfa", "sheet", "item-sheet"],
		position: {
			width: 760,
			height: 720,
		},
		form: {
			submitOnChange: true,
		},
	};

	get title() {
		return `Feuille de ${this.document.type} - ${this.item.name}`;
	}

	static PARTS = {
		header: {
			template: `systems/nalfa/templates/sheets/item/header.hbs`,
			classes: ["nalfa-sheet"],
		},
		tabs: {
			template: `systems/nalfa/templates/sheets/item/tabs.hbs`,
			classes: ["nalfa-sheet"],
		},
		sheet: {
			template: `systems/nalfa/templates/sheets/item/body.hbs`,
			classes: ["nalfa-sheet", "sheet-body"],
		},
	};

	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);
		const { TextEditor } = foundry.applications.ux;
		const item = baseData.document;
		const rawTabs = this._prepareTabs("primary");
		const specificTypes = new Set([
			"Weapon",
			"Trinket",
			"Backpack",
			"Consumable",
			"Action",
			"Currency",
			"Race",
			"Class",
		]);
		const physicalTypes = new Set([
			"Weapon",
			"Trinket",
			"Tool",
			"Backpack",
			"Consumable",
			"Loot",
			"Book",
		]);
		const hasSpecific = specificTypes.has(item.type);
		const hasActionable = item.system?.action !== undefined;
		const hasPhysical = physicalTypes.has(item.type);
		const tabIds = [];
		if (hasSpecific) tabIds.push("specific");
		if (hasActionable) tabIds.push("actionable");
		tabIds.push("description");

		let activeTab = this.tabGroups.primary;
		if (!tabIds.includes(activeTab)) {
			activeTab = tabIds[0];
			this.tabGroups.primary = activeTab;
		}

		const tabs = {};
		for (const tabId of tabIds) {
			const tab = rawTabs[tabId] ?? { id: tabId };
			tabs[tabId] = {
				...tab,
				label: tabId === "specific" ? item.type : tab.label,
				cssClass: tabId === activeTab ? "active" : "",
			};
		}

		const descriptionData = item.system?.description ?? {};
		const descriptionValue =
			typeof descriptionData === "string" ? descriptionData : (descriptionData.value ?? "");
		const descriptionSource =
			typeof descriptionData === "string" ? "" : (descriptionData.source ?? "");
		const unidentifiedDescription =
			item.system?.identification?.unidentified?.description ?? "";
		const castingCooldown = item.system?.casting?.cooldown ?? "";

		if (item.img === "icons/svg/item-bag.svg") {
			const typeIconMap = {
				Action: "Spell",
				Book: "Loot",
			};
			const iconName = typeIconMap[item.type] ?? item.type;
			item.img = `systems/nalfa/icons/base_icons/${iconName}.svg`;
		}

		const sheetData = {
			isOwner: this.item.isOwner,
			isEditable: this.isEditable,
			item,
			sysData: item.system,
			tabs,
			hasActionable,
			hasSpecific,
			hasPhysical,
			hasRarity: item.system?.rarity !== undefined,
			hasIdentification: item.system?.identification !== undefined,
			hasRecommendedLevel: item.system?.recommended_level !== undefined,
			descriptionValue,
			descriptionSource,
			config: CONFIG.nalfa,
			enrichedHTML: {
				description: {
					value: await TextEditor.enrichHTML(descriptionValue, {
						async: true,
					}),
					source: await TextEditor.enrichHTML(descriptionSource, {
						async: true,
					}),
				},
				identification: {
					unidentified: {
						description: await TextEditor.enrichHTML(unidentifiedDescription, {
							async: true,
						}),
					},
				},
				casting: {
					cooldown: await TextEditor.enrichHTML(castingCooldown, {
						async: true,
					}),
				},
			},
		};

		return sheetData;
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		if (this.tabGroups) {
			for (const [group, active] of Object.entries(this.tabGroups)) {
				if (active) this.changeTab(active, group);
			}
		}

		if (this.isEditable) {
			this.element
				?.querySelectorAll("[data-action='add-array-entry']")
				.forEach((button) => {
					button.addEventListener("click", this._onAddArrayEntry.bind(this));
				});

			this.element
				?.querySelectorAll("[data-action='remove-array-entry']")
				.forEach((button) => {
					button.addEventListener("click", this._onRemoveArrayEntry.bind(this));
				});
		}
	}

	async _onAddArrayEntry(event) {
		event.preventDefault();
		const button = event.currentTarget;
		const path = button.dataset.path;
		if (!path) return;

		const entryType = button.dataset.entryType ?? "string";
		const array = foundry.utils.deepClone(
			foundry.utils.getProperty(this.item.system, path) ?? [],
		);
		array.push(this._buildDefaultArrayEntry(entryType));

		await this.item.update({ [`system.${path}`]: array });
	}

	async _onRemoveArrayEntry(event) {
		event.preventDefault();
		const button = event.currentTarget;
		const path = button.dataset.path;
		const index = Number(button.dataset.index ?? -1);
		const minimum = Number(button.dataset.minimum ?? 0);

		if (!path || !Number.isInteger(index) || index < 0) return;

		const array = foundry.utils.deepClone(
			foundry.utils.getProperty(this.item.system, path) ?? [],
		);
		if (array.length <= minimum) return;

		array.splice(index, 1);
		await this.item.update({ [`system.${path}`]: array });
	}

	_buildDefaultArrayEntry(entryType) {
		switch (entryType) {
			case "damage-formula":
				return {
					formula: "",
					type: "none",
				};
			case "denomination":
				return {
					amount: 0,
					short_name: "",
					monetary_value: 1,
					weight_coefficient: 1,
					valid: false,
					value: null,
					weight: null,
				};
			default:
				return "";
		}
	}
}
