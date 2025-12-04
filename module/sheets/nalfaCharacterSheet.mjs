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
                        const value = Number(stat.value ?? base + alt);

                        return {
                                key,
                                label: CONFIG.nalfa.stats?.[key] ?? key.toUpperCase(),
                                base,
                                alt,
                                total: value,
                        };
                });

                const statTotals = Object.fromEntries(stats.map((stat) => [stat.key, stat]));

                const withBaseAlt = (source = {}, modifier = 0) => {
                        const base = Number(source.base ?? 0);
                        const alt = Number(source.alt ?? 0);
                        const total = Number(source.value ?? base + alt + modifier);

                        return {
                                base,
                                alt,
                                total,
                        };
                };

                const statBased = (source = {}, fallbackStat) => {
                        const statKey = source.stat ?? fallbackStat;
                        const coefficient = Number(source.coef ?? 1);
                        const statValue = (statTotals[statKey]?.total ?? 0) * coefficient;

                        return {
                                stat: statKey,
                                coef: coefficient,
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
                                const total = Number(save.value ?? base + alt);

                                return {
                                        key,
                                        label:
                                                CONFIG.nalfa.stats?.[key] ??
                                                key.toUpperCase(),
                                        base,
                                        alt,
                                        total,
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
                                        canChooseStat: Boolean(skill?.ui?.dropdown),
                                        base,
                                        total: Number(
                                                skill?.value ??
                                                        base + (statTotals[statKey]?.total ?? 0)
                                        ),
                                };
                        }),
                        defense: withBaseAlt(
                                baseData.document.system.attributes.defense
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
                                baseData.document.system.attributes.bonuses?.casting,
                                "int"
                        ),
                        concentration: statBased(
                                baseData.document.system.attributes.bonuses
                                        ?.concentration,
                                "wis"
                        ),
                        weaponStat: statBased(
                                baseData.document.system.attributes.bonuses?.weapon,
                                "str"
                        ),
                        spellCharges: Object.entries(
                                baseData.document.system.spell_charges ?? {}
                        ).map(([key, slot]) => ({
                                key,
                                label: key.replace("lvl", ""),
                                value: Number(slot?.value ?? 0),
                                max: Number(slot?.max ?? 0),
                                alt: Number(slot?.alt ?? 0),
                                hasAlt: Object.prototype.hasOwnProperty.call(slot ?? {}, "alt"),
                        })),
                        resistances: Object.entries(
                                baseData.document.system.attributes.resistances ?? {}
                        ).map(([key, resistance]) => ({
                                key,
                                label: CONFIG.nalfa.all_damage_types?.[key] ?? key,
                                value: Number(resistance?.value ?? 0),
                                immune: Boolean(resistance?.immune),
                        })),
                        bonuses: Object.entries(
                                baseData.document.system.attributes.bonuses ?? {}
                        ).map(([key, bonus]) => {
                                const labels = {
                                        weapon: "Arme",
                                        casting: "Incantation",
                                        concentration: "Concentration",
                                };

                                return {
                                        key,
                                        label: labels[key] ?? key,
                                        ...statBased(bonus, bonus?.stat ?? "str"),
                                };
                        }),
                        rangeModifier: {
                                flat: Number(
                                        baseData.document.system.attributes.range_modifier?.flat ??
                                                0
                                ),
                                mult: Number(
                                        baseData.document.system.attributes.range_modifier?.mult ??
                                                1
                                ),
                        },
                        carryingCapacity: Number(
                                baseData.document.system.attributes.carrying_capacity ?? 0
                        ),
                        actions: Object.entries(baseData.document.system.actions ?? {}).map(
                                ([key, action]) => {
                                        const base = Number(action?.value ?? 0);
                                        const alt = Number(action?.alt ?? 0);
                                        const altMult = Number(action?.alt_mult ?? 1);

                                        return {
                                                key,
                                                label:
                                                        CONFIG.nalfa.actions?.[key] ??
                                                        key.toUpperCase(),
                                                base,
                                                max: Number(action?.max ?? 0),
                                                alt,
                                                altMult,
                                                total: base + alt * altMult,
                                                hasAltMult: Object.prototype.hasOwnProperty.call(
                                                        action ?? {},
                                                        "alt_mult"
                                                ),
                                        };
                                }
                        ),
                        hp: {
                                value: Number(baseData.document.system.attributes.hp?.value ?? 0),
                                max: Number(baseData.document.system.attributes.hp?.max ?? 0),
                                base: Number(baseData.document.system.attributes.hp?.base ?? 0),
                                temp: Number(baseData.document.system.attributes.hp?.temp ?? 0),
                        },
                        progression: {
                                level: Number(baseData.document.system.attributes.level ?? 1),
                                exhaustion: Number(
                                        baseData.document.system.attributes.exhaustion ?? 0
                                ),
                        },
                        death: {
                                save: statBased(
                                        baseData.document.system.attributes.death?.passing_throw,
                                        "none"
                                ),
                                successes: Number(
                                        baseData.document.system.attributes.death?.successes ?? 0
                                ),
                                failures: Number(
                                        baseData.document.system.attributes.death?.failures ?? 0
                                ),
                        },
                        weapon: {
                                dA: baseData.document.system.weapon?.dA ?? "",
                                stat: baseData.document.system.weapon?.stat ?? "",
                                damageType: baseData.document.system.weapon?.damage_type ?? "",
                        },
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
