# Lore Creature To Nalfa NPC Mapping

Goal: convert extracted Amsel Lore creature pages into Foundry `Actor` documents of type `NPC` for the Nalfa system.

The extractor output is `output.json`. Each entry is one Lore page with readable `attributes`.

## Target Document

Create one Foundry actor per extracted creature page:

```json
{
	"name": "Grand Ver des Sables",
	"type": "NPC",
	"img": "img/3103dca5-7bd4-...png",
	"system": {}
}
```

Nalfa NPC schema is defined in `module/data/models/actors/schema.mjs` as `npcActorSchema()`.

## Direct Field Mapping

| Lore attribute | Nalfa actor path | Transform |
|---|---|---|
| Page `name` | `name` | string |
| `type: "image"` | `img` | use `value.path` |
| `Force` | `system.stats.str.base` | number |
| `Dextérité` | `system.stats.dex.base` | number |
| `Intelligence` | `system.stats.int.base` | number |
| `Sagesse` | `system.stats.wis.base` | number |
| `Charisme` | `system.stats.cha.base` | number |
| `Constitution` | `system.stats.con.base` | number |
| `Difficulté` | `system.difficulty` | number |
| `Défense` | `system.attributes.defense.base` | number |
| `Pv max` | `system.attributes.hp.base` | number |
| `Déplacement/tour` | `system.actions.movement.base` | number |
| `Statistique d'Attaque` | `system.roll_stats.incant.stat` | map stat label to key |

Stat label mapping:

| Lore value | Nalfa key |
|---|---|
| `Force` | `str` |
| `Dextérité` | `dex` |
| `Intelligence` | `int` |
| `Sagesse` | `wis` |
| `Charisme` | `cha` |
| `Constitution` | `con` |

## Description Mapping

These Lore attributes do not currently have dedicated Nalfa NPC schema fields. Preserve them in `system.description` as readable HTML/text sections:

| Lore attribute/section | Destination |
|---|---|
| `Actions` text | `system.description` |
| `Ressources récoltables` text | `system.description` |
| `Type` | `system.description` |
| `Habitat` | `system.description` |
| `Plan d'Origine` | `system.description` |
| `Mode de vie (ou nombre)` | `system.description` |
| `Hostilité` | `system.description` |
| `Taille` | `system.description` |
| `Poids` | `system.description` |
| `Archétype 1` | `system.description` |
| `Archétype 2` | `system.description` |

Rationale: Nalfa NPC schema has `description`, but no explicit creature taxonomy, size, weight, habitat, origin, archetype, or hostility fields.

## Create The System Compendium With The CLI

From the system root (`Data/systems/nalfa`):

```bash
npm run validate:lore
npm run import:lore
```

Close Foundry before packing. The LevelDB directory is locked while Foundry has the compendium loaded.

This builds the system pack declared in `system.json`:

```text
packs/creatures
```

The pack label is:

```text
Créatures
```

## Create A World Compendium In Foundry

Run this from the Foundry browser console as a GM while the Nalfa system is active:

```js
const importer = await import("/systems/nalfa/lore_extract/import-creature-compendium.mjs");
await importer.importLoreCreatureCompendium();
```

This creates or updates a world Actor compendium:

```text
world.creatures
```

The importer is idempotent by actor name: running it again updates existing documents with the same name/type and creates missing ones.

## Actions

First pass: keep Lore `Actions` as text in `system.description`.

Do not automatically create Nalfa `Action` items yet. The Lore action text is semi-structured prose and may contain several actions in one text block, for example:

```text
Morsure (Allonge) : -2 JdT / 1d8 perforant
Charge : 1d6 contondant ...
```

Later importer phase can parse these into embedded/action items if needed.

## Profile / HP / Defense Caveat

Nalfa derived data computes:

- `system.attributes.defense.value` from `system.profile` plus `system.attributes.defense.base`.
- `system.attributes.hp.max` from `system.profile` plus `system.attributes.hp.base`.

For exact Lore values in first pass, set:

```json
"system.profile": "none"
```

Then write Lore values directly to:

```json
"system.attributes.defense.base"
"system.attributes.hp.base"
```

## Importable Creature Filter

Import only entries where `template === "Créature"`.

Current extracted creature pages:

- `Grand Ver des Sables`
- `Araignée Sableuse`
- `Scorip`
- `Squelette`

Non-creature pages like `Jej mob` should not become Nalfa NPCs unless explicitly requested.

## Unmapped / Ignored For Actor Creation

These are ignored by the actor importer unless later requested:

- Empty Lore pages.
- Lore layout/template structure.
- Internal Lore IDs.
- Theme images without direct extracted image files.
- `Jej mob` because its template is unresolved and it is not a `Créature` page.
