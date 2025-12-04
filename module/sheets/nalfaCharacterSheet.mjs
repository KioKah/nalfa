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
			template: "systems/nalfa/templates/partials/character/header.hbs",
			classes: ["nalfa-sheet", "character-sheet"],
		},
		sheet: {
			template: "systems/nalfa/templates/partials/character/sheet.hbs",
			classes: ["nalfa-sheet", "character-sheet", "sheet-body"],
		},
	};

        /** ─── PREPARE CONTEXT ──────────────────────────────────────── */
        async _prepareContext(options) {
                const baseData = await super._prepareContext(options);

                const statKeys = Object.keys(baseData.document.system.stats ?? {});
                const stats = statKeys.map((key) => {
                        const stat = baseData.document.system.stats[key] ?? {};
                        const base = Number(stat.base ?? 0);
                        const alt = Number(stat.alt ?? 0);

                        return {
                                key,
                                label: CONFIG.nalfa.stats?.[key] ?? key.toUpperCase(),
                                base,
                                alt,
                                total: base + alt,
                        };
                });

                const statTotals = Object.fromEntries(
                        stats.map((stat) => [stat.key, stat])
                );

                const withBaseAlt = (source = {}, modifier = 0) => {
                        const base = Number(source.base ?? 0);
                        const alt = Number(source.alt ?? 0);

                        return {
                                base,
                                alt,
                                total: base + alt + modifier,
                        };
                };

                const statBased = (source = {}, fallbackStat) => {
                        const statKey = source.stat ?? fallbackStat;
                        const statValue = statTotals[statKey]?.total ?? 0;

                        return {
                                stat: statKey,
                                ...withBaseAlt(source, statValue),
                        };
                };

                const derived = {
                        stats,
                        saves: statKeys.map((key) => {
                                const save =
                                        baseData.document.system.stats?.[key]?.save ?? {};
                                const base = Number(save.base ?? 0);
                                const alt = Number(save.alt ?? 0);

                                return {
                                        key,
                                        label:
                                                CONFIG.nalfa.stats?.[key] ??
                                                key.toUpperCase(),
                                        base,
                                        alt,
                                        total: base + alt,
                                };
                        }),
                        skills: Object.entries(
                                baseData.document.system.attributes.skills ?? {}
                        ).map(([key, skill]) => {
                                const statKey =
                                        skill?.stat ?? skill?.default_stat ?? "str";
                                const base = Number(skill?.base ?? 0);
                                const statLabel =
                                        CONFIG.nalfa.stats?.[statKey] ??
                                        statKey.toUpperCase();

                                return {
                                        key,
                                        label: CONFIG.nalfa.skills?.[key] ?? key,
                                        stat: statKey,
                                        statLabel,
                                        base,
                                        total: base + (statTotals[statKey]?.total ?? 0),
                                };
                        }),
                        defense: withBaseAlt(
                                baseData.document.system.attributes.armor_score
                        ),
                        evasion: withBaseAlt(baseData.document.system.attributes.evasion),
                        initiative: statBased(
                                baseData.document.system.attributes.initiative,
                                "dex"
                        ),
                        passivePerception: statBased(
                                baseData.document.system.attributes.passive_percep,
                                "wis"
                        ),
                        spellcasting: statBased(
                                baseData.document.system.attributes.spellcasting_stat,
                                "int"
                        ),
                        concentration: statBased(
                                baseData.document.system.attributes.concentration_stat,
                                "wis"
                        ),
                        weaponStat: statBased(
                                baseData.document.system.attributes.weapon_stat,
                                "str"
                        ),
                        spellCharges: Object.entries(
                                baseData.document.system.ester_slots ?? {}
                        ).map(([level, slot]) => ({
                                level: level.replace("lvl", ""),
                                value: Number(slot?.value ?? 0),
                                max: Number(slot?.max ?? 0),
                        })),
                };

                return {
                        isOwner: this.actor.isOwner,
                        isEditable: this.isEditable,
                        actor: baseData.document,
                        sysData: baseData.document.system,
                        config: CONFIG.nalfa,
                        derived,
                };
        }
}
