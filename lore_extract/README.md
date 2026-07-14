# Amsel Lore Attribute Extraction

This folder is a self-contained workflow for extracting only page-written data from an Amsel Lore export.

## Files

- `../Nalfa.lore`: source Amsel Lore archive in the repository root.
- `data.json`: input file extracted from the `.lore` archive.
- `img/`: images extracted from the `.lore` archive.
- `import-lore-archive.mjs`: extracts `data.json` and `img/` from `../Nalfa.lore`.
- `extract-lore-page-attributes.mjs`: extractor script.
- `build-compendium-source.mjs`: converts `output.json` into Foundry Actor source JSON files.
- `output.json`: extracted readable page attributes.

## Run

From this folder, starting from `../Nalfa.lore`:

```bash
node import-lore-archive.mjs
node extract-lore-page-attributes.mjs
node build-compendium-source.mjs
```

From the repository root, the same validation/import flow is available as npm scripts:

```bash
npm run validate:lore
npm run import:lore
```

If `Nalfa.lore` has another path:

```bash
node import-lore-archive.mjs ../Nalfa.lore
```

To only regenerate `output.json` from an already extracted `data.json`:

```bash
node extract-lore-page-attributes.mjs
```

Equivalent explicit command:

```bash
node extract-lore-page-attributes.mjs data.json output.json
```

## Create A Foundry Compendium

Preferred CLI workflow from the system root (`Data/systems/nalfa`):

```bash
npm run validate:lore
npm run import:lore
```

Close Foundry before running the `fvtt package pack` command. Foundry keeps loaded system packs locked, and the CLI cannot rewrite `packs/creatures` while it is open.

This writes the system compendium pack declared in `system.json`:

```text
packs/creatures
```

Foundry should show it as:

```text
Créatures
```

The intermediate actor JSON files are written to:

```text
lore_extract/pack-src/creatures
```

Alternative browser-console workflow:

After `output.json` exists, open Foundry as a GM with the Nalfa system active and run this in the browser console:

```js
const importer = await import("/systems/nalfa/lore_extract/import-creature-compendium.mjs");
await importer.importLoreCreatureCompendium();
```

This creates or updates the world Actor compendium `world.creatures`. This is useful for quick manual imports, but the CLI workflow above is preferred for creating the system pack.

See `MAPPING.md` for the field mapping used by the importer.

## What It Keeps

- Page name.
- Template name when resolvable.
- Written rune values with readable attribute labels.
- Choice values decoded from their IDs.
- Text bodies converted from HTML to plain text.

## What It Discards

- Layout reconstruction data.
- Internal IDs.
- Template/module/rune definitions except as lookup dictionaries.
- Image metadata.
- Empty pages and empty fields.

## Data Model Notes

The useful page-written values are in `pages[].pageContent[]`.

- `pageContent[].body` contains rich text HTML written on the page.
- `pageContent[].runesContent[]` contains field values written on the page.
- `relatedRuneId` points to `runeGroups[].runes[]`, which gives the readable attribute label.
- `choice` values point to `rune.choiceConfig.values[]`, which gives the readable selected choice.
- `relatedModuleId` points to `templates[].usedModules[]`, which gives the readable section name.

The script uses templates and rune groups only as dictionaries. It does not try to rebuild the original Lore page layout.
