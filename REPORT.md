# Repository Report

Generated on 2026-03-10 from direct repository inspection, using `AGENTS.md` only as a starting map.

Important note: this report is based on static inspection of the codebase and git state. I did not run Foundry itself here, so runtime claims still need manual in-app verification.

## 1. Executive Summary

The repository is in a solid prototype-to-pre-release state for a Foundry VTT V13 system.
It already contains much more functionality than the roadmap documents sometimes suggest:

- a V13-only bootstrap and manifest (`system.json`, `nalfa.mjs`),
- actor and item data models with substantial derived-data logic (`module/data/models.mjs`),
- a custom combat document for initiative (`module/documents/nalfaCombat.mjs`),
- a tabbed character sheet with direct roll actions (`module/sheets/nalfaCharacterSheet.mjs`),
- a rich typed-item system with equipment, identification, modifiers, and embedded actions (`module/sheets/nalfaItemSheet.mjs` and `module/sheets/item/*`),
- a roll/chat layer with chat cards, prompts, macros, and hotbar integration (`module/rolls/*`).

At the same time, the repo is not yet release-ready. The main reasons are not lack of gameplay code, but rather:

- roadmap drift between the `plan A.md` / `plan B.md` / `plan C.md` / `plan D.md` files and the actual implementation,
- no automated tests, no CI, and no scripted validation beyond local development helpers,
- incomplete localization and almost entirely hardcoded French UI labels,
- incomplete release metadata and documentation,
- a few large files that now carry too many responsibilities.

If I had to place the project on the written roadmap by capability rather than by documentation, it feels closer to "late vB / early vC" than to "just finished vA".

## 2. Current State Snapshot

### Git / workspace state

- Git working tree is clean.
- Current branch is `main`, tracking `origin/main`.
- Recent commits suggest the latest focus has been item/action UX and styling rather than validation or release hardening.

### Runtime maturity

What is clearly present in the code today:

- Foundry V13 compatibility is explicitly set in `system.json`.
- Actor types are declared as `Character` and `NPC` in `template.json` and registered in `nalfa.mjs`.
- Item support is already typed, not "single item only": `template.json` declares 13 item types and `nalfa.mjs` registers matching item data models.
- The character sheet is not minimal anymore: it already has tabs, derived displays, direct roll buttons, KO/death-state display, and value/base/alt modes.
- The item sheet is significantly beyond MVP: it has type-specific sections, rich text handling, equipment state, identification state, modifier editing, and embedded action workflows.
- Combat initiative is system-owned through `CONFIG.Combat.documentClass = NalfaCombat` and a custom initiative roll path.
- Roll coverage is already broad: skills, attacks, damage, save prompts, targeted saves, stat saves, concentration, and initiative are all implemented in `module/rolls/rolls.mjs`.
- Macros and hotbar drops are already first-class features through `module/rolls/macros.mjs` and `module/actionRefs.mjs`.

### Quality / delivery maturity

What is still missing or weak:

- No test suite is present.
- No CI workflow is present.
- No README or user-facing docs are present.
- `system.json` still carries a placeholder description and no packs.
- `system.json` version (`0.0.1`) and `package.json` version (`1.0.0`) are not aligned.
- Localization files are very small and runtime usage of `localize` is almost nonexistent.
- A large amount of validation is still expected to be manual, which matches the plan files but limits confidence.

## 3. What The Repo Already Does

### 3.1 Bootstrap and manifest

`system.json` is the manifest and currently:

- loads `nalfa.mjs` and `nalfa.css`,
- targets Foundry V13 only,
- registers `lang/en.json` and `lang/fr.json`,
- has no compendium packs,
- still has placeholder metadata.

`nalfa.mjs` is the runtime entrypoint and already handles:

- template preloading,
- data model registration,
- custom item and combat document registration,
- default V2 sheet registration,
- Handlebars helper registration,
- chat-card interaction wiring,
- Dice So Nice integration,
- exposing roll and macro APIs on `game.nalfa`.

This means the repo is not just a data-model prototype; it already has a real bootstrapped runtime surface.

### 3.2 Actor system

The actor side is centered on `module/data/models.mjs`.

The code already computes or models:

- stats and saves,
- skills and associated stats,
- defense, evasion, initiative, passive perception,
- HP max by profile and level,
- spell charge caps,
- action resource maxima,
- roll stats for physical and incantation use,
- damage die / damage type inferred from equipped weapons,
- weapon-state warnings for invalid equipment configurations,
- item-driven modifiers applied to actor base data.

This is an important finding: the repo already includes item-to-actor rule interaction, at least via derived-data overlays, so it has partially crossed into work that the roadmap still describes as future.

### 3.3 Item system

The item side is much richer than the older plan descriptions imply.

Current item types declared in `template.json` and registered in `nalfa.mjs`:

- `Weapon`
- `Trinket`
- `Tool`
- `Backpack`
- `Consumable`
- `Loot`
- `Book`
- `Action`
- `Currency`
- `Race`
- `Class`
- `Job`
- `WeaponAttribute`

The sheet/template stack already supports typed item rendering:

- `templates/partials/item/item-specific.hbs` routes by item type,
- `templates/partials/item/specific/*` contains a matching specific partial for each current type,
- `module/sheets/item/constants.mjs` decides which item types show specific tabs, modifier tabs, or physical panels.

Beyond typing, item behavior already includes:

- equipment slot selection and lock handling (`module/sheets/item/equipment.mjs`),
- cursed-item equip locking,
- identification / unidentified presentation (`module/sheets/item/identification.mjs`),
- modifier configuration (`templates/partials/item/modifiers.hbs`),
- embedded action storage and source-sync behavior (`module/embeddedActions.mjs` and `module/sheets/nalfaItemSheet.mjs`),
- currency-specific derived calculations in `CurrencyData`.

This is one of the strongest and most advanced parts of the repo.

### 3.4 Rolls, chat cards, and combat

The roll system is centered on `module/rolls/rolls.mjs` and already covers:

- skill rolls,
- attack rolls,
- damage rolls and multi-formula damage sets,
- save prompts and targeted saves,
- stat saves,
- concentration rolls,
- initiative rolls.

Notable details:

- half-minimum damage dice are implemented through `module/rolls/diceModifiers.mjs`,
- chat card templates exist in `templates/chat/roll/*`,
- `module/rolls/actionExecution.mjs` turns action data into executable roll choices,
- `module/documents/nalfaCombat.mjs` routes initiative through the same roll layer,
- `module/rolls/macros.mjs` supports both direct action-item macros and embedded-action macros.

So the repo is already past "roll API only" and into a coherent gameplay interaction layer.

### 3.5 UI and styling

UI structure is split between:

- `templates/sheets/character/*`,
- `templates/sheets/item/*`,
- `templates/partials/character/*`,
- `templates/partials/item/*`.

Styling is authored in `less/*` and compiled to `nalfa.css`.

The visual system is already more than a placeholder:

- character layout includes grouped stats, saves, resources, combat stats, and mode toggles,
- item layout includes dynamic tabs and relatively rich embedded-action presentation,
- chat cards have dedicated templates and styles.

### 3.6 Developer tooling

Developer tooling is lightweight but intentional:

- `tools/create-symlinks.mjs` links a local Foundry install into `foundry/` for editor support,
- `tools/foundry-config-example.yaml` documents the expected config input,
- `jsconfig.json` points editor tooling at local Foundry sources,
- `foundry-globals.d.ts` adds a small amount of global type support.

This is useful for local development, but it is not a substitute for automated validation.

## 4. Main Gaps, Risks, And Debt

### 4.1 Roadmap drift is now a real maintenance problem

The plan files are still useful as intent documents, but they are no longer reliable as status trackers.

Examples of drift:

- `plan B.md`, `plan C.md`, and `plan D.md` still describe the repo as if items were basically a single-type or minimal system, but the code already has 13 item types plus type-specific templates.
- The plans describe tabbed character-sheet UX and roll buttons as future work, but those are already present in `module/sheets/nalfaCharacterSheet.mjs` and `templates/sheets/character/body.hbs`.
- The plans place item-driven stat interaction mostly in later versions, but `module/data/models.mjs` already applies modifiers from active items during actor derived-data preparation.
- The plans still frame item automation around later phases, but embedded actions, macro refs, and action sync are already in production code.

This is probably the single highest-leverage documentation fix in the repo.

### 4.2 Validation gap

There is no automated validation layer:

- `package.json` has no real test script,
- there is no lint script,
- there is no format script,
- there is no CI workflow,
- there are no `tests/` or `test/` directories.

Given the amount of derived rules logic and UI state handling now present, this is the main technical-process risk.

### 4.3 Localization gap

Localization is currently minimal:

- `lang/en.json` and `lang/fr.json` are both very small,
- most visible UI strings are hardcoded in templates or config objects,
- `localize` usage is effectively absent from runtime templates and code.

The practical state today is: the system is written as a French-first prototype with placeholder language packs, not as a truly localized system.

### 4.4 Release-readiness gap

Several signals suggest the repo is not yet packaged for outside consumption:

- `system.json` description is still placeholder text,
- `system.json` version and `package.json` version are not aligned,
- `system.json` has no packs,
- there is no README,
- there is no documented zip/release workflow.

### 4.5 Dependency / deployment risk

`nalfa.mjs` directly imports Dice So Nice from `../../modules/dice-so-nice/api.js`.

That means:

- the system has a hard runtime dependency on an external module path,
- `system.json` does not visibly declare that dependency,
- a fresh install without Dice So Nice may break system loading rather than simply disabling optional visuals.

Even if this is acceptable for local development, it should be addressed before release.

### 4.6 Repo hygiene debt

There are several repository-shape issues worth noting:

- `_old/` contains 64 historical files, which is fine as reference but adds noise,
- `templates/sheets/character/body copy.hbs` is intentionally kept as reference, which is documented but still adds cognitive load,
- `node_modules/` is tracked in git even though `.gitignore` lists it,
- `package.json` looks like a local tooling manifest more than a curated distributable package.

None of these block development, but together they make the repo feel less settled than the runtime code actually is.

## 5. Structure Overview

Top-level structure, with approximate role and current weight:

| Path | Role | Notes |
| --- | --- | --- |
| `system.json` | Foundry manifest | V13-only, loads `nalfa.mjs` / `nalfa.css`, no packs |
| `nalfa.mjs` | Runtime bootstrap | Registers models, sheets, helpers, chat listeners, Dice So Nice |
| `template.json` | Declared document types | 2 actor types, 13 item types |
| `module/` | Runtime code | 20 files; core gameplay and UI logic |
| `templates/` | Handlebars templates | 37 files; character, item, chat |
| `less/` | Style sources | 9 files; source of truth for CSS |
| `nalfa.css` | Compiled style output | Committed artifact |
| `lang/` | Localization packs | Present but very small |
| `tools/` | Local development helpers | Foundry symlink tooling |
| `_old/` | Historical reference | 64 files, non-runtime |

### Runtime layout in more detail

- `module/config.mjs`
  - central dictionary/config object,
  - mostly French labels and option lists,
  - still doubles as both gameplay config and UI text source.

- `module/data/models.mjs`
  - the main rules/data center of gravity,
  - defines actor and item schemas,
  - performs derived calculations,
  - applies item modifiers,
  - resolves weapon state and currency calculations.

- `module/documents/`
  - currently small and focused,
  - only custom combat handling lives here.

- `module/rolls/`
  - the functional roll engine of the system,
  - includes dice modifiers, roll workflows, action execution, and macro handling.

- `module/sheets/`
  - V2 sheet logic for actors and items,
  - item sheet behavior is heavily decomposed into `module/sheets/item/*`, but orchestration is still centralized.

- `templates/chat/roll/`
  - roll-card rendering layer,
  - already broad enough to be considered a stable UI surface.

- `templates/partials/item/`
  - largest template cluster,
  - strongly reflects the complexity and maturity of the item system.

## 6. Overwhelmed Files

These are the files that currently feel "overwhelmed" - not because they are bad, but because they now carry enough responsibility that future changes will become harder, riskier, or slower.

### Primary refactor targets

#### `module/data/models.mjs` (~1219 lines)

Why it is overwhelmed:

- field factory helpers live here,
- actor schema definitions live here,
- item schema definitions live here,
- actor derived-data logic lives here,
- item-derived behavior lives here,
- modifier application logic lives here,
- equipped-weapon analysis lives here,
- currency calculations live here.

Why this matters:

- it is the main rules hub, so every new feature tends to pull more code into it,
- it mixes schema declaration and rule execution,
- it increases the chance of subtle regressions in unrelated areas.

Good split candidates:

- actor schema definitions,
- item schema definitions,
- actor derived calculations,
- item modifier application,
- currency-specific item logic,
- weapon/equipment analysis helpers.

#### `module/sheets/nalfaItemSheet.mjs` (~730 lines)

Why it is overwhelmed:

- owns item-sheet render lifecycle,
- restores tabs,
- binds DOM events,
- handles drag/drop,
- opens dialogs,
- manages array editing,
- manages embedded-action CRUD,
- executes embedded actions,
- syncs embedded actions from source items,
- handles equip-state changes,
- handles identification toggles,
- handles modifier category changes.

Why this matters:

- the item sheet is already the richest interactive UI in the repo,
- every new item-side feature is likely to land here unless it is split proactively.

Good split candidates:

- embedded action controller,
- equipment and identification handlers,
- event-binding utilities,
- drag/drop handling,
- modifier editing controller.

#### `module/sheets/item/context.mjs` (~704 lines)

Why it is overwhelmed:

- assembles sheet context,
- decides visible tabs,
- resolves modifier rows,
- converts HTML to text,
- builds action cost/resource summaries,
- builds range/damage/concentration summaries,
- enriches rich text,
- mixes data shaping and presentation formatting.

Why this matters:

- it is effectively both a presenter layer and a formatting utility layer,
- the code is hard to scan because unrelated concerns live next to each other,
- it will keep growing with every new item-side display feature.

Good split candidates:

- base context builder,
- description/rich-text helpers,
- modifier UI helpers,
- embedded-action summary formatters,
- tab-selection helpers.

#### `module/rolls/rolls.mjs` (~571 lines)

Why it is overwhelmed:

- common roll utilities,
- dialog prompting,
- damage formula normalization,
- skill attack damage save concentration initiative workflows,
- chat-card posting,
- display-text generation.

Why this matters:

- roll logic is a core gameplay surface,
- the file already spans multiple gameplay domains,
- adding crit rules, resistance previews, or automation will make it denser quickly.

Good split candidates:

- shared roll/chat utilities,
- attacks and damage,
- saves and concentration,
- initiative,
- prompt dialogs.

#### `nalfa.mjs` (~358 lines)

Why it is overwhelmed:

- bootstrap logic,
- template preload list,
- sheet registration,
- Handlebars helper registration,
- chat-message listeners,
- Dice So Nice integration.

Why this matters:

- entrypoints should stay thin when possible,
- optional integrations and UI helpers are better isolated,
- it currently acts as both boot script and utility registry.

Good split candidates:

- bootstrap registration,
- Handlebars helper registration,
- template registry,
- chat UI hooks,
- Dice So Nice integration.

### Secondary dense files

- `module/rolls/macros.mjs` (~345 lines): macro creation, drop parsing, embedded-action refresh, action execution routing.
- `templates/sheets/character/body.hbs` (~350 lines): character stats, skills, resources, combat presentation, mode-specific edit controls.

These are not yet as urgent as the primary refactor targets, but they are already large enough to watch.

## 7. Next Steps By Plan

The most important framing here is: the plan files should not be followed literally without first being realigned to the current codebase.

### Cross-plan step zero

Before deeper feature work, rewrite `plan A.md`, `plan B.md`, `plan C.md`, and `plan D.md` around the repo as it exists now.

Without that step, the plans will continue to understate implemented work and blur what is actually missing.

### vA closeout / baseline stabilization

From the code alone, vA looks implemented and in some areas exceeded.
The remaining vA-style work is mainly validation and cleanup.

Suggested next steps:

1. Run a Foundry smoke test pass for the actual current feature set:
   - character sheet tabs and roll buttons,
   - item-sheet tab visibility,
   - weapon equip state and warning behavior,
   - embedded action create/edit/use/sync flows,
   - macro creation from action items and embedded actions,
   - custom initiative in combat.
2. Clean release metadata:
   - replace the placeholder description in `system.json`,
   - align versioning between `system.json` and `package.json`,
   - decide how package metadata should be maintained.
3. Add a minimal `README` covering setup, Foundry version, local tooling, and current feature scope.
4. Decide whether tracked `node_modules/` stays in repo or is removed in a dedicated cleanup.

### vB adjusted next steps

Some original vB goals are already partially present, so the remaining meaningful vB work is narrower than the plan files imply.

Suggested next steps:

1. Finish the roll system's missing rule polish:
   - critical damage behavior,
   - save UX consistency,
   - resistance-aware damage presentation.
2. Complete resistance editing/display on actor UI.
3. Add class selection/locking flow and any needed compendium lookup support.
4. Refactor `module/rolls/rolls.mjs` and `module/data/models.mjs` before adding more rules complexity.
5. Introduce at least a smoke-level validation routine, even if it is manual-script based rather than full testing.

### vC adjusted next steps

The repo has already started parts of what the roadmap puts in vC, especially on typed items and item-driven effects.

Suggested next steps:

1. Decide the long-term item-effect architecture:
   - keep current direct derived-data overlay behavior,
   - or formalize item effects through `ActiveEffect` generation,
   - or use a hybrid with clear boundaries.
2. Complete the localization pass:
   - move UI labels out of templates and config where appropriate,
   - expand `lang/fr.json` and `lang/en.json`,
   - standardize translation key usage.
3. Implement statuses / CdF as a real modeled subsystem.
4. Review typed item coverage and identify any remaining type-specific gaps.
5. If older world compatibility ever becomes important, explicitly document or implement the migration approach.

### vD next steps

vD still looks mostly future-facing.

Suggested next steps:

1. Add concentration automation.
2. Add threat / opportunity logic only after validating the right Foundry V13 hooks.
3. Build compendiums and packaging flow.
4. Add user documentation and release notes.
5. Add CI or at least scripted packaging checks before publishing.

## 8. Overall Assessment

The repo's current state is stronger than its written roadmap suggests.
The gameplay/data/UI core is already substantial, especially around typed items, embedded actions, and roll workflows.

The biggest risks are now organizational rather than purely functional:

- the roadmap no longer matches reality,
- several core files are becoming too central,
- release and validation scaffolding has not caught up with the amount of implemented logic.

In short:

- as a development system, the repo is in good shape,
- as a documented and validated product, it still needs structure,
- the best next move is to realign plans, refactor the most overloaded files, and add a minimal release/validation spine before pushing much further.
