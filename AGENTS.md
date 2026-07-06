# Nalfa: A Foundry VTT System

This repository is a V14 Foundry Virtual Tabletop game system named `nalfa`.

## Scope

- Prefer current APIs (V14) and schemas in runtime code.
- Development/testing project (no production compatibility requirements).
- Do not add backward-compatibility migrations unless explicitly requested.
- If Foundry behavior is uncertain, ask to verify against `https://foundryvtt.com/api/`.

## Runtime Entry Points

- `system.json`: manifest; loads `nalfa.mjs` and `nalfa.css`.
- `nalfa.mjs`: thin entrypoint; wires bootstrap hooks from `module/bootstrap/*`.
- `module/bootstrap/init.mjs`: main `Hooks.once("init")` registration.
  - Registers `CONFIG.nalfa` (`module/config.mjs`).
  - Registers Actor/Item data models (`module/data/models.mjs`).
  - Sets custom document classes:
    - `CONFIG.Item.documentClass = module/sheets/nalfaItem.mjs`
    - `CONFIG.Combat.documentClass = module/documents/nalfaCombat.mjs`
  - Registers default V2 sheets:
    - `module/sheets/nalfaCharacterSheet.mjs`
    - `module/sheets/nalfaItemSheet.mjs`
  - Exposes roll APIs on `game.nalfa.rolls` and `game.nalfa.macros`.
- `module/bootstrap/templates.mjs`: template preload list.
- `module/bootstrap/handlebars.mjs`: Handlebars helpers.
- `module/bootstrap/chat.mjs`: chat-card listeners.
- `module/bootstrap/diceSoNice.mjs`: Dice So Nice integration.

## Main Code Areas

- `module/data/models.mjs`: barrel export for data models.
- `module/data/models/actors/*`: actor schemas and derived data logic.
- `module/data/models/items/*`: item schemas and derived data logic.
- `module/actions/*`: action defaults and embedded-action source/sync helpers.
- `module/sheets/nalfaCharacterSheet.mjs`: character sheet (ActorSheetV2).
- `module/sheets/nalfaItemSheet.mjs` and `module/sheets/item/*`: item sheet shell, context builders, handlers, dialogs, and embedded-action UI.
- `module/rolls/index.mjs`: barrel export for roll workflows.
- `module/rolls/core/*`: shared roll helpers and dice modifiers.
- `module/rolls/workflows/*`: skill / attack / damage / save / concentration / initiative rolls.
- `module/rolls/actions/*`: action execution prompt and hotbar/macro handling.
- `templates/`: sheet parts and chat templates.
- `lang/en.json`, `lang/fr.json`: localization files.

## Glossary

- `e-action` is discussion shorthand only for `embedded action` / action intégrée.
- Use explicit names like `embeddedAction` in code, templates, and persisted data.

## Styling

- Edit `less/*.less` files only; `nalfa.css` is auto-generated output.
- When editing LESS files for the first time, remind user to run `npm run less:watch`.
- Never compile CSS or run the above command yourself.

## Legacy / Non-runtime

- `_old/` is historical reference only (not loaded at runtime); what remains there is intentionally kept reference material.
- `modules.txt` is local world tooling info, not system runtime config.

## Formatting

- Use Prettier formatting rules.
- Max line width: 92.
- Tabs:
  - JS/MJS: tab width 4
  - HBS/JSON/HTML/CSS/LESS: tab width 2

## V2 Sheet Pitfalls And Patterns

**PREFER V2 Objects over V1 ones.**

- **Template root rule (per PART)**: each template referenced by a single `PARTS` entry
  should render exactly one top-level element. If that one part template has sibling root
  nodes, the sheet can fail to render with errors that look unrelated.
- **Multiple PARTS are expected**: it is valid (and often preferred) to split layout into
  separate parts like `header`/`tabs`/`sheet`/`footer` that render top-to-bottom. Do not add
  an extra wrapper only to satisfy the root rule across different parts.
- **Context vs form path**: values read from context (`{{sysData...}}`) are not automatically tied to where forms write. Persistence depends on the input `name="system..."` path targeting the real document data path.
- **Rerender-safe listeners**: partial rerenders replace DOM nodes, so listeners attached to old nodes are lost. Bind non-action listeners in `_onRender` each time, not only once at construction.
- **Prefer sheet actions for clicks**: use `DEFAULT_OPTIONS.actions` + `data-action` for click handlers where possible. It keeps wiring consistent and reduces brittle selector/event boilerplate.
- **Tab state restoration**: rerenders can reset visible tab state if you do nothing. Keep tab state in `this.tabGroups`, then re-apply with `changeTab(active, group)` in `_onRender`.
- **Tab markup contract**: tab panes must include both `data-group` and `data-tab`, and templates should output `{{tab.cssClass}}` for active-state classes. If one of these is missing, tabs appear to "work" but fail after rerender.
- **Submit behavior surprises**: with `form.submitOnChange: true`, most edits persist immediately, but buttons still default to submit. Add `type="button"` on action buttons to avoid accidental form submits/page refresh behavior.
- **Derived data discipline**: compute derived values in `TypeDataModel#prepareDerivedData()` and keep it deterministic. Avoid side effects (notifications, document updates, external calls) there to prevent loops and hard-to-reason state.
- **Text enrichment timing**: enrich HTML asynchronously before template render (e.g. via `TextEditor.enrichHTML`). Render enriched output with triple-stash (`{{{...}}}`), while editable content should use `<prose-mirror name="system...">`.
- **Editability guardrails**: only bind mutating controls when `this.isEditable` is true. This prevents confusing no-op interactions for read-only users and avoids accidental update attempts.
- **DOM API default**: V2 code should rely on standard DOM APIs (`querySelector`, `addEventListener`) rather than jQuery assumptions. This avoids subtle mismatches between legacy snippets and V2 app behavior.
- **Template preload hygiene**: preload all sheet/chat templates during `Hooks.once("init")` with `foundry.applications.handlebars.loadTemplates`. Missing preload entries commonly show up as runtime template-not-found errors when opening a specific sheet path.
