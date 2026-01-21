# Plan de dev (Nalfa)

Ce fichier liste (de facon tres detaillee) les chantiers restants pour rendre le systeme Foundry `nalfa` "complet".
Il est decoupe en 3 etapes :

1. MVP / V0 (jouable, peu automatise)
2. V1 (fonctionnel + pertinent : automatisations minimales sur les taches repetitives)
3. V2 (systeme abouti : classes et objets complets, sheets specialisees, automatisations avancees)

Ce plan s'appuie sur `Nalfa Regles 1.1.0.docx` (source de verite) et sur l'etat actuel du repo.
Certaines regles (notamment le detail des classes) ne sont pas visibles dans le doc et seront donc notees comme "a clarifier".

## Contexte technique (Foundry V13)

- System manifest : `system.json`.
- ESModules : `nalfa.mjs` (bootstrap) + `module/**/*.mjs`.
- Sheets V2 : `ActorSheetV2` / `ItemSheetV2` via `HandlebarsApplicationMixin`.
- Templates HBS : `templates/**`.
- CSS : `nalfa.css` compile depuis `less/` (pas de pipeline automatise dans ce repo).
- Regle de doc : si une decision depend de l'API V13, ouvrir `https://foundryvtt.com/api/` et coller l'extrait (ou le lien exact + version) dans le ticket.

## Etat actuel (V0 en cours)

- Actor types : `Character`, `NPC` dans `template.json`.
- Une feuille perso V2 existe : `module/sheets/nalfaCharacterSheet.mjs`.
  - Calculs derives : stats totales, saves, competences, defense, hp max, charges de sorts, actions max.
  - UI "mode d'affichage" : `system.ui.valueMode` (values/base/alt).
- Items : un seul type Foundry ("Item" dans `template.json`).
  - Custom document : `module/sheets/nalfaItem.mjs` avec `roll()` -> chat card.
  - Sheet item : `module/sheets/nalfaItemSheet.mjs` (pour l'instant surtout un playground FA).
- Config : `module/config.mjs` contient beaucoup de labels FR (stats, skills, types de degats, raretes, etc.).
- Point a corriger (technique) : `module/utils.mjs` importe `./prepareItems/currency.mjs` mais
  `module/prepareItems/` n'existe pas (probable reliquat `_old/`).

---

# 1) MVP / V0

## Objectifs

- Pouvoir creer et jouer un personnage (stats, competences, PV, defense, initiative).
- Pouvoir faire les jets principaux (JdC, JdT, JdD, Sauv, Concentr, Initiative) et afficher un resultat lisible dans le chat.
- Pouvoir utiliser un inventaire basique (une liste d'objets), sans typage avance d'objets.
- Rester simple : 1 type d'Item + 1 sheet d'Item.

## Objets Foundry a utiliser

- Documents : `Actor` (Character/NPC), `Item` (unique), `ChatMessage`.
- Des : `Roll` (ou `foundry.dice.Roll` selon API), + eventuellement integration Dice So Nice.
- Combat (minimum) : `Combat`, `Combatant` (initiative).
- Effets : (optionnel V0) `ActiveEffect` uniquement si besoin pour des bonus simples.

## V0.1 - Hygiene repo / fondations

- [ ] Corriger la compatibilite Foundry dans `system.json` (min/verified coherents pour V13).
- [ ] Mettre a plat la structure des templates utilises (supprimer/ignorer les doubles "copy" si confusion, ou les deplacer dans `_old/`).
- [ ] Fix technique : soit creer `module/prepareItems/currency.mjs`, soit retirer l'import et le routage "Currency" de `module/utils.mjs` tant que non implemente.
- [ ] Ajouter une doc "comment compiler less -> nalfa.css" (meme si manuel) ou un script npm.
- [ ] Ajouter une convention de nommage pour les cles systeme (FR/EN, snake_case, etc.).

## V0.2 - Donnees systeme minimales

### Donnees Actor (template.json)

- [ ] Verifier que tous les champs utilises dans la sheet existent dans `template.json`.
- [ ] Ajouter les champs manquants indispensables aux regles V0 :
  - [ ] `attributes.carrying_capacity` (Capacite) : formule/valeur.
  - [ ] `weapon.stat` / `attributes.bonuses.weapon.stat` : ref a la StatArme.
  - [ ] `attributes.bonuses.casting.stat` : ref a la StatIncant.
  - [ ] `attributes.death` : deja present, verifier le mapping regle KO/mort.
- [ ] Ajouter une section `resources` si on veut suivre : inspirations, fatigue, etc. (sinon, V1).

### Tables "creation" / "progression" (depuis le docx)

Ces tables existent dans le docx et servent de reference pour l'UX (meme si une partie reste MJ).

- [ ] Statistiques (cout / points / valeurs par importance)
  - Table docx : "Valeur Statistique" (Majeure/Puissante/Neutre/Faible) + "Points de Statistique".
- [ ] Competences (points par niveau)
  - Table docx : Niveau -> Bonus (pts), Malus (pts), Max de pts/comp.
  - Valeurs lisibles extraites :
    - Max pts/comp : 4 (niv 1-5), 6 (niv 6-9), 8 (niv 10-12).
    - Points "Bonus" : 8 (niv1), +2 (niv2-5), +4 (niv6), +2 (niv7-9), +4 (niv10), +2 (niv11-12).
- [ ] Charges de sorts (par niveau)
  - Table docx : lvl -> charges (1/2/3) et table a part pour charges "special".
  - Note : deja code dans `module/sheets/nalfaCharacterSheet.mjs` (a verifier contre docx).

### Donnees Item (V0 : type unique)

- [ ] Definir un schema minimal unique pour les items (dans `template.json` / `Item.Item`):
  - [ ] `system.rarity` (Commun/Rare/Epique/Heroique/Mythique)
  - [ ] `system.description` (rich text)
  - [ ] Champs "weapon-like" optionnels (pour permettre un objet "arme" sans changer de type):
    - [ ] `system.damage.formula` (ex: `1d8 + @weapon.value` ou `1d8 + @str.value`)
    - [ ] `system.damage.type` (tran/perf/cont/...)
    - [ ] `system.attack.stat` (stat utilisee pour JdT)
    - [ ] `system.range.type` + `system.range.value` (m)
    - [ ] `system.properties` (finesse, deux_mains, legere, allongee)

## V0.3 - Feuille de personnage "jouable"

### UI / affichage

- [ ] Completer la sheet Character pour afficher (au minimum) :
  - [ ] Stats principales (valeur/base/alt selon mode)
  - [ ] Competences (avec la stat associee et le total)
  - [ ] PV + PV max + absorption
  - [ ] Defense, Evasion, Initiative, Perception passive
  - [ ] Resistances / immunites
  - [ ] Actions (main/bonus/reaction/concentration/movement)
  - [ ] Charges de sorts (lvl1/lvl2/lvl3/special)
  - [ ] Profil (squishy/soft/sturdy/tanky)
- [ ] Ajouter un onglet ou une section "Inventaire" (liste des items possedes).
- [ ] Ajouter une section "Notes / description" (texte enrichi) si utile en V0.

### Edition des valeurs

- [ ] Clarifier la regle du "mode d'affichage" :
  - `values` : edition de la valeur finale (ex: PV courants)
  - `base` : edition des valeurs "base" (progression)
  - `alt` : edition des bonus/malus temporaires (equipement, effets)
- [ ] Verifier la coherence : aujourd'hui plusieurs helpers n'affichent que si `obj.value` existe (probleme si `0`).

## V0.4 - Jets (chat + macros minimum)

### Objectif

Permettre au joueur de lancer les jets regles, sans automatisation de targeting complexe.

### Implementations (Foundry)

- [ ] Implementer une couche "roller" systeme (ex: `module/rolls/*.mjs`) :
  - [ ] `rollSkill(actor, skillKey)` -> 1d20 + competence
  - [ ] `rollAttack(actor, itemOrStat)` -> 1d20 + StatArme/StatIncant
  - [ ] `rollDamage(actor, formula, type)` -> xdn + stat + regle "min = moitie max"
  - [ ] `rollSave(actor, saveStat, dc)` -> 1d20 + StatSauv
  - [ ] `rollConcentration(actor, stat, dc)` -> 1d20 + StatConcentr
  - [ ] `rollInitiative(actor)` -> 1d20 + initiative
- [ ] Afficher une carte de chat standardisee (template HBS) par type de jet.
- [ ] Option V0 : fournir des macros sample (dans la doc) pour lancer un jet sur l'acteur selectionne.

### Regles a respecter (depuis le doc)

- [ ] Critiques : 20 = reussite critique, 1 = echec critique (au minimum sur d20).
- [ ] Degats : les des de degats ont un plancher (min = moitie du max possible du de).
  - Exemple : 1d8 => min 4.
- [ ] Arrondis : par defaut a l'entier inferieur, sauf mention contraire.

## V0.5 - Combat (minimum)

- [ ] Verifier l'integration a l'initiative Foundry : `system.json.initiative` est deja defini.
- [ ] Confirmer le champ `primaryTokenAttribute` (PV) : `attributes.hp`.
- [ ] Ajouter une gestion "KO" minimale dans la sheet (affichage si PV <= 0).
- [ ] Ajouter une note (pas d'automatisation) sur la regle KO/mort (perte 10% PV max / tour).

## V0.6 - Inventaire minimal

- [ ] Afficher les items de l'acteur.
- [ ] Supporter : creer/supprimer items, drag & drop depuis sidebar.
- [ ] Ajouter champs minimum : quantite + poids (optionnel V0).
- [ ] Afficher la rarete et le type de degats si l'item est utilise comme arme.

## V0.7 - Localisation minimale

- [ ] Decide : labels dans `module/config.mjs` vs `lang/fr.json`.
- [ ] V0 : garder `module/config.mjs` mais au moins sortir les libelles UI majeurs dans `lang/fr.json`.
- [ ] Remplacer les textes "hardcodes" dans HBS par `{{localize ...}}` quand stable.

## Definition de fin (V0)

- Creation personnage jouable (stats/skills/pv/def/init).
- Jets executables depuis la sheet ou via macros (au moins skill/attack/damage/save/init).
- Inventaire fonctionnel (liste + edition basique).
- Pas de classes automatisees, pas de typage d'items.

---

# 2) V1

## Objectifs

- Passer du "fonctionne" au "pertinent" : moins de saisie manuelle, plus de confort.
- Automatiser les jets repetitifs : sauvegardes standard, attaques standard, degats standard.
- Debuter l'implementation des classes (structure + affichage + quelques effets simples).
- Ameliorer l'UX sheet (navigation, inventaire, boutons de roll).

## Objets Foundry a utiliser

- Documents : `ActiveEffect` (pour bonus/malus), `Folder` (organisation), `Compendium` (packs).
- UI : Actions AppV2 (`DEFAULT_OPTIONS.actions`), onglets (`TABS`), `TextEditor` enrich.
- Combat : `Combatant` flags et/ou effets pour menace / opportunity (au debut seulement affichage).

## V1.1 - UX sheet personnage

- [ ] Refactor sheet en onglets (AppV2 tabs) :
  - [ ] "Caracteristiques" (stats/skills/def/pv)
  - [ ] "Combat" (actions, resistances, arme, initiative)
  - [ ] "Magie" (charges + liste de sorts)
  - [ ] "Inventaire" (liste + equipement)
  - [ ] "Notes" (description)
- [ ] Ajouter des boutons "roll" sur :
  - [ ] chaque competence (JdC)
  - [ ] JdT (arme / sort)
  - [ ] Initiative
  - [ ] Concentration
- [ ] Ajouter une gestion de "profil" plus claire (select) + rappel HP/Def derives.

## V1.2 - Systemes de roll plus robustes

- [ ] Normaliser les cartes de chat : titre, sous-titre, tags (type de degats, critique, etc.).
- [ ] Supporter la notion de "difficulte" (DC) dans les macros / boutons.
- [ ] Implementer la notation de sauvegarde du doc :
  - `( [Sauv X+StatIncantAttaquant] StatSauv = M)`
  - (V1) on peut afficher la DC calculee (X + stat incant attaquant).
- [ ] Implementer les degats critiques (double roll des des) pour JdD.
- [ ] Implementer "degats multi-cibles" (un jet de degats unique, plusieurs jets de toucher).

## V1.3 - Inventaire pertinent (equipement)

Sans changer le type d'Item (toujours 1 sheet), ajouter une structure "sous-type".

- [ ] Ajouter `system.category` (weapon/trinket/consumable/loot/spell/...) sur l'Item unique.
- [ ] Ajouter `system.equipped` / `system.attuned` (si necessaire) et filtrer l'inventaire.
- [ ] Ajouter "accessoires" : effets passifs/actifs (au moins placeholders).
- [ ] Poids / capacite : commencer par affichage + calcul simple.

## V1.4 - Resistances / immunites / vulnerabilites

- [ ] Formaliser la data :
  - resistances : valeur additive par type
  - immunite : bool
  - vulnerabilite : valeur negative ou flag + regle
- [ ] Ajouter une fonction de calcul de degats (applique resist/vuln/immun) pour les rolls.
- [ ] Clarifier la regle "si immunite partielle a un type combine => degats /2" (a definir).

## V1.5 - Etats / CdF (structure)

- [ ] Definir une liste "systeme" d'etats (Hebe, Etourdi, Endormi, etc.) dans `module/config.mjs`.
- [ ] Choisir representation :
  - (V1) `ActiveEffect` + flags + icon, avec modifications de stats (Def, JdT, Sauv).
  - ou (V1) uniquement affichage + tracking manuel.
- [ ] Ajouter une UI minimale pour appliquer/retirer un etat sur l'acteur.

## V1.6 - Debut classes (structure)

Le doc liste les classes mais pas leurs details. On met en place la structure et des placeholders.

- [ ] Ajouter `system.classId` (cle technique) + `system.className` (affichage).
- [ ] Ajouter un champ "archetypes" si utile.
- [ ] Ajouter un "compendium" `nalfa.classes` (Documents Item ou JournalEntry) contenant :
  - id, nom, profil (squishy/soft/sturdy/tanky)
  - stat incantation, stat arme, eventuels modificateurs
  - liste de sorts/passifs (placeholders)
- [ ] Ajouter une UI dans la sheet pour selectionner une classe depuis le compendium.
- [ ] Lors du choix : appliquer profil + stats de base (a definir / MJ / doc complet).

## Definition de fin (V1)

- Rolls "1 clic" sur la sheet (competences/attaque/degats/sauv/concentr/init).
- Inventaire plus clair (categories, equipement).
- Debut de gestion des etats (au moins structure + UI).
- Structure classes en place (compendium + selection + application basique).

---

# 3) V2

## Objectifs

- Finaliser l'implementation des classes (automatisation des sorts et passifs).
- Overhaul des sheets (perso et objets) : UI par type d'objet, ergonomie complete.
- Typage des items (Weapon/Trinket/Armor/Spell/...) et modeles de donnees plus stricts.
- Automatisations avancees : degats, resistances, etats, menaces, opportunites, etc.

## Objets Foundry a utiliser

- DataModels (si migration V13+) : schemas plus stricts et migrations.
- Compendiums : classes, races, sorts, items.
- `ActiveEffect` + (eventuel) rule-elements maison si besoin (inspire PF2e) :
  - une couche de "modifiers" standardisee.
- `Combat` hooks : automatiser certains declenchements (CdF sur degats, opportunites, etc.).

## V2.1 - Refactor data model

- [ ] Creer de vrais types d'Item Foundry : `Weapon`, `Trinket`, `Consumable`, `Spell`, etc.
  - (Migration) convertir les anciens items "category" vers le bon type.
- [ ] Completer `template.json` pour chaque type.
- [ ] Ajouter des migrations de donnees (scripts) lors d'un bump de version systeme.

## V2.2 - Sheets par type d'objet

- [ ] `Weapon` sheet : degats, type, attributs (finesse, allongee, etc.), effets (penetration...).
- [ ] `Trinket` sheet : effets passifs/actifs, charges d'utilisation.
- [ ] `Spell` sheet : cout (basique/lvl1/2/3/special), DC, stat sauv, concentration, duree, tags.
- [ ] `Consumable` sheet : type (potion, ammo...), quantite, effet.
- [ ] UX : drag & drop, boutons "roll", preview chat.

## V2.3 - Magie / sorts (systeme)

- [ ] Ajouter une liste de sorts possedes (Items `Spell`) sur l'acteur.
- [ ] Consommation automatique des charges de sorts (lvl1/2/3/special) lors du lancement.
- [ ] Gestion concentration :
  - applique un etat "Concentration" + jet auto si degats recus.
  - stockage de la DC (X + StatIncantAttaquant) et de la stat de concentration.
- [ ] Gestion "charges d'utilisation" par sort (raciaux/heroique).

## V2.4 - Classes (automatisation complete)

- [ ] Modeliser les classes (compendium) :
  - profil
  - progression (niveaux)
  - liste de sorts/passifs par niveau
  - choix (talents, specialisations) si applicable
- [ ] UI de progression :
  - selection des nouveaux sorts/passifs a chaque niveau
  - application automatique sur l'acteur (ajout d'Items `Spell`, `ActiveEffect`, flags)
- [ ] Automatiser les "sorts de classe" et "passifs".

## V2.5 - Etats / CdF / menace

- [ ] Implementer proprement les CdF sous forme d'effets :
  - modifs de Def/JdT/Sauv
  - incapacites (pas d'action / pas de reaction / pas de concentration)
  - durees (1 tour, jusqu'a save, etc.)
- [ ] Menace + attaques d'opportunite :
  - zone menace (portee arme)
  - declenchement (quitter la zone sans desengagement)
  - restriction (attaque basique, echangeable selon classes)

## V2.6 - Polishing / ecosysteme

- [ ] Localisation FR complete (et eventuellement EN) : toutes les UI strings.
- [ ] Pack(s) de contenu :
  - classes
  - races
  - armes de base + attributs
  - sorts de base
- [ ] Documentation utilisateur (wiki / README) : creer perso, jets, inventaire, magie.

## Trous / a clarifier

- Detail de chaque classe : sorts/passifs, progression, mecanique speciale.
- Regles fatigue, inspiration, repos (precis, valeurs, cadence).
- Details "capacite" (poids, encombrement), formule exacte et UI.
- Regles des armures : la defense change "au jugement MJ" => comment l'encoder dans Foundry.
- Gestion des types combines / immunites partielles (doc mentionne un cas).
- Tables du docx (points de stats, points de competences, limites par niveau) :
  - definir exactement ce qui est automatise vs gere par MJ.
