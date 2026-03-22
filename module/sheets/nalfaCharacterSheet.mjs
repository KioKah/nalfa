import {
	rollAttack,
	rollDamageSet,
	rollConcentration,
	rollSavePrompt,
	rollSkill,
	rollStatSave,
} from "../rolls/index.mjs";
import { openRichTextEditorDialog } from "./item/dialogs/richTextDialog.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class NalfaCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
	/** ─── DEFAULT OPTIONS ───────────────────────────────────────────────────────── */
	static DEFAULT_OPTIONS = {
		classes: ["nalfa", "sheet", "actor-sheet"],
		position: {
			width: 812,
		},
		form: {
			submitOnChange: true,
		},
	};

	get title() {
		return `Feuille de personnage - ${this.actor?.name || "Inconnu"}`;
	}

	/** ─── TEMPLATE ───────────────────────────────────────────────────────────────── */
	static PARTS = {
		header: {
			template: "systems/nalfa/templates/sheets/character/header.hbs",
			classes: ["nalfa-sheet", "character-sheet"],
		},
		tabs: {
			template: "systems/nalfa/templates/sheets/character/tabs.hbs",
			classes: ["nalfa-sheet", "character-sheet"],
		},
		sheet: {
			template: "systems/nalfa/templates/sheets/character/body.hbs",
			classes: ["nalfa-sheet", "character-sheet", "sheet-body"],
		},
	};

	static TABS = {
		primary: {
			tabs: [
				{ id: "character", label: "Personnage" },
				{ id: "bio", label: "Bio" },
				{ id: "resources", label: "Ressources" },
				{ id: "combat", label: "Combat" },
			],
			initial: "character",
		},
	};

	/** ─── PREPARE CONTEXT ──────────────────────────────────────── */
	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);
		const { TextEditor } = foundry.applications.ux;
		const sysData = baseData.document.system;
		const tabs = this._prepareTabs("primary");
		const bioValue = String(sysData.description ?? "");
		const bioEnriched = await TextEditor.enrichHTML(bioValue, { async: true });
		const hpValue = Number(sysData.attributes?.hp?.value ?? 0);
		const hpMax = Math.max(1, Number(sysData.attributes?.hp?.max ?? 0));
		const isKO = hpValue <= 0;
		let deathTick = null;

		if (isKO) {
			const hpLossPerTurn = Math.max(1, Math.ceil(hpMax * 0.1));
			const isDead = hpValue <= -hpMax;
			const turnsToDeath = isDead
				? 0
				: Math.max(0, Math.ceil((hpValue + hpMax) / hpLossPerTurn));

			deathTick = {
				isDead,
				turnsToDeath,
				lossPerTurn: String(hpLossPerTurn),
			};
		}

		const bioResistances = Object.entries(CONFIG.nalfa.base_standard_damage_types)
			.filter(([key]) => key !== "none")
			.map(([key, label]) => {
				const resistance = sysData.attributes?.resistances?.[key] ?? {};
				const defaultCoef = key === "soin" || key === "abso" ? -1 : 1;
				const baseCoef = Number.isFinite(Number(resistance.coef))
					? Number(resistance.coef)
					: defaultCoef;
				const altMult = Number.isFinite(Number(resistance.alt_mult))
					? Number(resistance.alt_mult)
					: 1;
				const baseValue = Number.isFinite(Number(resistance.value))
					? Number(resistance.value)
					: 0;
				const altValue = Number.isFinite(Number(resistance.alt)) ? Number(resistance.alt) : 0;
				const usedCoef = Number.isFinite(Number(resistance.used_coef))
					? Number(resistance.used_coef)
					: baseCoef * altMult;
				const usedValue = Number.isFinite(Number(resistance.used_value))
					? Number(resistance.used_value)
					: baseValue + altValue;
				return {
					key,
					label,
					coef: baseCoef,
					alt_mult: altMult,
					value: baseValue,
					alt: altValue,
					usedCoef,
					usedValue,
					isDefault: usedCoef === 1 && usedValue === 0,
				};
			});

		return {
			isOwner: this.actor.isOwner,
			isEditable: this.isEditable,
			readonly: !this.isEditable,
			rollable: this.actor.isOwner,
			actor: baseData.document,
			sysData: sysData,
			config: CONFIG.nalfa,
			tabs,
			bioEnriched,
			hasBioContent: bioValue.trim().length > 0,
			bioResistances,
			isKO,
			deathTick,
		};
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		if (this.tabGroups) {
			for (const [group, active] of Object.entries(this.tabGroups)) {
				if (active) this.changeTab(active, group);
			}
		}
		this.element
			?.querySelector("[data-action='open-richtext-editor']")
			?.addEventListener("click", this._onOpenRichTextEditor.bind(this));
		this.element
			?.querySelector("[data-action='roll-basic-attack']")
			?.addEventListener("click", this._onRollBasicAttack.bind(this));
		this.element
			?.querySelector("[data-action='roll-basic-damage']")
			?.addEventListener("click", this._onRollBasicDamage.bind(this));
		this.element
			?.querySelector("[data-action='roll-basic-save']")
			?.addEventListener("click", this._onRollBasicSave.bind(this));
		this.element
			?.querySelector("[data-action='roll-concentration']")
			?.addEventListener("click", this._onRollConcentration.bind(this));
		this.element
			?.querySelectorAll("[data-action='roll-stat-save']")
			.forEach((element) =>
				element.addEventListener("click", this._onRollStatSave.bind(this))
			);
		this.element
			?.querySelectorAll("[data-action='roll-skill']")
			.forEach((element) =>
				element.addEventListener("click", this._onRollSkill.bind(this))
			);
	}

	async _onRollBasicAttack(event) {
		event.preventDefault();
		return rollAttack(this.actor, "physical");
	}

	_onOpenRichTextEditor(event) {
		event.preventDefault();
		event.stopPropagation();
		if (!this.isEditable) return;

		const button = event.currentTarget;
		const path = button?.dataset?.path;
		if (!path) return;

		const title = button.dataset.title || "Éditeur";
		openRichTextEditorDialog(this.actor, path, title);
	}

	async _onRollBasicDamage(event) {
		event.preventDefault();
		return rollDamageSet(this.actor);
	}
	async _onRollBasicSave(event) {
		event.preventDefault();
		return rollSavePrompt(this.actor);
	}

	async _onRollConcentration(event) {
		event.preventDefault();
		return rollConcentration(this.actor);
	}

	async _onRollStatSave(event) {
		event.preventDefault();
		const statKey = event.currentTarget?.dataset?.stat;
		if (!statKey) return null;
		return rollStatSave(this.actor, statKey);
	}

	async _onRollSkill(event) {
		event.preventDefault();
		const skillKey = event.currentTarget?.dataset?.skill;
		if (!skillKey) return null;
		return rollSkill(this.actor, skillKey);
	}

	// activateListeners(html) {
	// 	super.activateListeners(html);
	// }
}
