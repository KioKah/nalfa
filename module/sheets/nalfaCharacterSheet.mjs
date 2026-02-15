import {
	rollAttack,
	rollDamageSet,
	rollConcentration,
	rollSavePrompt,
	rollSkill,
	rollStatSave,
} from "../rolls/rolls.mjs";

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
				{ id: "resources", label: "Ressources" },
				{ id: "combat", label: "Combat" },
			],
			initial: "character",
		},
	};

	/** ─── PREPARE CONTEXT ──────────────────────────────────────── */
	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);
		const sysData = baseData.document.system;
		const tabs = this._prepareTabs("primary");
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

		return {
			isOwner: this.actor.isOwner,
			isEditable: this.isEditable,
			actor: baseData.document,
			sysData: sysData,
			config: CONFIG.nalfa,
			tabs,
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
		return rollAttack(this.actor, "weapon");
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
