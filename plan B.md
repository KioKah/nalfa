# Plan de dev (Nalfa)

Objectif : lister (très en détail) tout ce qu’il reste à faire pour que le système Foundry `nalfa` soit « complet », en s’appuyant sur :

- Règles (source de vérité) : `Nalfa Règles 1.1.0.docx`
- État actuel du repo (nombreux prototypes dans `_old/`)

## Versions

Le projet est découpé en 4 versions : `vA`, `vB`, (omis : `vC`, `vD`).
Ce plan détaille le passage de la version A à B.
Il faudra commencer par une vérification de l'état censé être atteint à la fin de la version A (i.e. `vA`).

---

## Contexte technique (Foundry V13)

- Manifest : `system.json`
- Bootstrap : `nalfa.mjs`
- Code : `module/**/*.mjs`
- Templates : `templates/**`
- Styles : `nalfa.css` (compilé depuis `less/`)

Règle « docs » : quand un détail dépend de l’API Foundry, demander à l'utilisateur d'aller voir l'API: https://foundryvtt.com/api/ et de coller l’extrait (ou donner le lien exact + version) pour toi.

---

## Glossaire (règles → données)

### Stats

- For / Dex / Int / Sag / Cha / Con

### Profils (PV max + Défense)

- Squishy
- Soft
- Sturdy
- Tanky

### Compétences (par stat)

- For : Athlétisme, Robustesse
- Dex : Adresse, Discrétion, Acrobaties
- Int : Culture, Magie, Nature, Médecine
- Sag : Perception, Sérénité, Intuition
- Cha : Intimidation, Tromperie, Persuasion, Performance
- Con : Santé, Endurance

### Jets

- JdC : `1d20 + Compétence`
- JdT : `1d20 + StatArme` (armes) ou `1d20 + StatIncant` (sorts)
- JdD : formule de l’action, avec plancher sur les dés
  - Décision : utiliser la syntaxe Foundry `dXminY` (ex: `1d8min4`)
- Sauv : `1d20 + StatSauv` vs difficulté
  - Souvent : `DC = X + StatIncantAttaquant`
  - En cas de réduction : arrondi à l’entier supérieur
- Concentr : `1d20 + StatConcentr`
- Initiative : `1d20 + Initiative` avec `Initiative = Dex*2`

### Types de dégâts (codes)

- Physiques : tran, perf, cont, sang, soni
- Élémentaires : feu, eau, air, terr, foud, natu, givr
- Magiques : radt, obsc, arca, chao, necr, psyc
- Spéciaux : arme, soin, abso

---

## État actuel (résumé)

- Actor types : `Character`, `NPC` (schéma dans `module/data/models.mjs`)
- Item : un seul type « Item » (schéma dans `module/data/models.mjs`)
- Feuille personnage V2 : `module/sheets/nalfaCharacterSheet.mjs`
  - lit les valeurs dérivées (calculées par `TypeDataModel#prepareDerivedData`)
  - gère `system.ui.valueMode` (values/base/alt)
- Feuille item V2 : `module/sheets/nalfaItemSheet.mjs` (minimal)
- Dictionnaires FR : `module/config.mjs`

---

# vA — MVP jouable, peu automatisé

## Objectifs vA (définition de « fini »)

- Feuille perso lisible et éditable (sans UX avancée).
- Jets principaux disponibles et affichés proprement dans le chat (au moins via boutons ou macros).
- Inventaire basique : lister/créer/éditer des objets, sans qu’ils modifient les stats.
- Pas de weapon-like via items : le combat passe par des champs « arme » sur l’acteur ou par saisie manuelle.
- Les data models sont la base de vérité (les évolutions de schéma passent dans la version suivante).

## Périmètre vA (ce qui reste manuel)

- Localisation : vC
- États/CdF : vC
- Menace / opportunités : vD
- Automatisation avancée (concentration auto, etc.) : vD

---

## vA.1 — Hygiène repo & fondations

### vA.1.1 — Compatibilité Foundry

- [ ] Vérifier/ajuster `system.json.compatibility` pour V13 (minimum/verified/maximum cohérents).
- [ ] Vérifier `system.json.initiative` (déjà présent) et sa cohérence avec `initiative.value`.

QA manuel

- [ ] Lancer Foundry, vérifier que le système charge sans warning de compat.

### vA.1.2 — Templates "copy" (décision : conserver)

Décision : conserver les templates `* copy.hbs` car ils servent de documentation (et utilisent correctement l’API Foundry).

- [x] Ajouter une note en tête de chaque template `* copy.hbs` : « non utilisé à runtime, sert de référence ».
- [ ] Vérifier que `nalfa.mjs` ne précharge pas les `* copy.hbs`.

QA manuel

- [ ] Rendu sheet OK, pas d’erreur de template manquant.

### vA.1.3 — Import cassé `prepareItems` (décision)

Décision : mettre le code historique en `_old/` et supprimer toute référence dans le code principal.

- [x] Dans `module/utils.mjs` :
  - [x] supprimer l’import `./prepareItems/currency.mjs`
  - [x] supprimer la route `Currency: prepareCurrency`
  - [x] garder `prepareItem` comme routeur « futur » (ou le simplifier)

QA manuel

- [ ] Ouvrir une sheet qui importe `module/utils.mjs` : aucune erreur console.

### vA.1.4 — Build CSS

Décision : la compilation LESS → CSS est gérée automatiquement par un plugin IDE.

- [ ] Ne pas ajouter de script npm.

QA manuel

- [ ] Modifier un fichier `less/`, vérifier que `nalfa.css` est bien régénéré par ton workflow.

---

## vA.2 — Données (décision : data models = vérité)

Décision : `module/data/models.mjs` est la base de vérité. `template.json` ne fait que
déclarer les types. On ajuste le code/sheets pour matcher le schéma des data models.

### vA.2.1 — Audit « sheet ↔ data models »

- [ ] Passer en revue : tous les `name="system..."` des templates actor/item doivent correspondre à des chemins existants.
- [ ] Toute donnée manquante → ticket pour vB.

Méthode recommandée

- [ ] Lister tous les bindings `name="system..."` dans :
  - `templates/sheets/character/*.hbs`
  - `templates/partials/character/*.hbs`
  - `templates/sheets/item/*.hbs`
- [ ] Vérifier chaque chemin dans `module/data/models.mjs`.
- [ ] Vérifier aussi les chemins utilisés côté code (`sysData...`) dans :
  - `module/sheets/nalfaCharacterSheet.mjs`
  - `module/sheets/nalfaItemSheet.mjs`

Décisions de triage

- Si le champ est « pure UI » : le déplacer dans la version suivante et décider du modèle.
- Si le champ est « core règles » mais absent : vB obligatoire (et ajouter une migration si des acteurs existent déjà).

QA manuel

- [ ] Créer un Actor neuf : aucun champ ne casse (pas de `undefined` bloquant).

---

## vA.3 — Feuille personnage : affichage + édition fiable

### vA.3.1 — Affichage minimum jouable

- [x] PV / PV max / Absorption
- [x] Défense / Évasion
- [x] Initiative (Dex\*2) + affichage de la valeur
- [x] Perception passive (8 + Sag)
- [x] Stats (valeur, base, alt selon `valueMode`)
- [x] Compétences (valeur + stat associée)
- [x] Charges de sorts (lvl1/lvl2/lvl3/special)
- [x] Actions (main/bonus/réaction/concentration/déplacement)

Détails règles à refléter (même si gestion MJ)

- [x] Initiative : `Dex*2 + base + alt` (si le modèle prévoit base/alt)
- [x] Perception passive : `8 + Sag (+ base/alt si le modèle prévoit)`
- [x] Défense : table profil + base + alt (dans `TypeDataModel#prepareDerivedData`)
- [x] PV max : table profil/niveau + base + alt (dans `TypeDataModel#prepareDerivedData`)

Templates concernés

- `templates/sheets/character/header.hbs`
- `templates/sheets/character/body.hbs`
- `templates/partials/character/health.hbs`

QA manuel

- [ ] Valeurs à 0 : s’affichent (pas de “falsy hidden”).
- [ ] Changer niveau : PV max se met à jour.
- [ ] Changer profil : Défense + PV max se mettent à jour.

### vA.3.2 — Mode d’affichage (values/base/alt)

- [ ] Clarifier dans l’UI ce que change chaque mode.
- [ ] Corriger les helpers qui cachent des champs quand la valeur est 0.

Endroits à vérifier

- Helper `valueBaseAlt` dans `nalfa.mjs` (il teste `if (obj.value)` / `if (obj.base)` / `if (obj.alt)` → 0 est traité comme “vide”).
- Templates HBS qui utilisent `{{#if ...}}` sur des nombres.

QA manuel

- [ ] Passer values → base → alt : les champs attendus apparaissent et sauvegardent.

---

## vA.4 — Jets + chat cards (sans dépendre des items)

### vA.4.1 — Couche « rolls » (API interne)

Créer un module `module/rolls/*.mjs` qui expose :

- [x] `rollSkill(actor, skillKey)`
- [x] `rollAttack(actor, mode)`
  - `mode = weapon|casting` (utilise `system.attributes.bonuses.weapon` ou `system.attributes.bonuses.casting`)
- [x] `rollDamage(actor, config)`
  - formule saisie côté acteur (voir vA.4.3)
- [x] `rollDamageSet(actor)`
- [x] `rollSavePrompt(actor)`
- [x] `rollSaveTarget(actor, stat, dd, titleName)`
- [x] `rollStatSave(actor, stat)` (sans DD)
- [x] `rollConcentration(actor, stat, dd)`
- [x] `rollInitiative(actor)`

Format de retour (recommandé)

- [ ] Chat cards ultra compactes (titre + formule)
- [ ] Chaque fonction retourne un objet normalisé :
  - `type` (skill/attack/damage/save/concentration/initiative)
  - `roll` (instance de Roll + résultat)
  - `titleLabel` / `titleName` / `titleValue`
  - `formulaText` (ex: `d20 [14] + DEX (2)` / `d10m [5] + STR (5)`)

QA manuel

- [ ] Import du module dans une macro : pas d’erreur.
- [ ] Un jet de chaque type : pas d’erreur console.

### vA.4.2 — Plancher des dés de dégâts (décision : `dXminY`)

- [ ] Définir une convention de formules de dégâts « Nalfa » :
  - `1d4min2`, `1d6min3`, `1d8min4`, `1d10min5`, `1d12min6`
- [x] Normaliser la formule de dégâts via une fonction utilitaire.

Implémentation (recommandée)

- [x] Écrire `normalizeDamageFormula(formula)` qui remplace :
  - `d4` → `d4min2`
  - `d6` → `d6min3`
  - `d8` → `d8min4`
  - `d10` → `d10min5`
  - `d12` → `d12min6`
- [x] Ne pas toucher aux dés qui contiennent déjà `min`.

QA manuel

- [x] `1d8min4` lancé 30 fois : jamais < 4.

### vA.4.3 — Sources de dégâts (pas d’items)

Décision : pas de weapon-like dans les items.

- [x] Utiliser la structure `system.attack` sur l’acteur :
  - [x] `system.attack.name`
  - [x] `system.attack.jdt` (stat + bonus)
  - [x] `system.attack.jds` (DD + stat)
  - [x] `system.attack.jdd` (formule 1/2 + stat + type)
  - [x] `system.attack.concentration` (DD + stat)
- [x] Ajouter sur la feuille perso un bloc « Combat » :
  - [x] nom d’attaque
  - [x] toggles JdT/JdS/JdD (mode base)
  - [x] colonnes JdT/JdS/JdD + Concentration

Logique

- JdT : `1d20 + Stat + Bonus`
- JdS : `1d20 + Stat` vs DD
- JdD : `(<dA>min<half>) + <Stat>` (1 à 2 formules)
- Concentr : `1d20 + Stat` vs DD

QA manuel

- [ ] Configurer une arme basique sur l’acteur, lancer JdT et JdD, vérifier affichage.

### vA.4.4 — Templates chat (unifiés)

- [x] Templates :
  - [x] `templates/chat/roll/skill.hbs`
  - [x] `templates/chat/roll/attack.hbs`
  - [x] `templates/chat/roll/damage.hbs`
  - [x] `templates/chat/roll/save.hbs`
  - [x] `templates/chat/roll/initiative.hbs`
- [ ] Styles minimaux dans `nalfa.css`.

Contenu minimum par chat card

- Skill : compétence, stat associée, total, résultat d20, critique/échec critique
- Attack : mode (arme/sort), stat utilisée, total, résultat d20
- Damage : formule affichée, type dégâts, résultat final
- Save : DC, stat cible, résultat, réussite/échec
- Initiative : résultat

QA manuel

- [ ] 1 jet de chaque type : rendu lisible + pas d’erreur console.

### vA.4.5 — Points d’entrée (UI)

- [x] Macros d’exemple :
  - [x] JdC sur compétence choisie
  - [x] Initiative
  - [x] Attaque basique (JdT/JdD)

QA manuel

- [ ] Macro sur actor sélectionné : fonctionne.

---

## vA.5 — Combat (minimum)

- [x] Vérifier que `initiative.value` est correctement calculée et que Foundry l’utilise.
- [ ] Afficher un indicateur KO si PV ≤ 0 et afficher les éléments de death save.

QA manuel

- [x] Démarrer un combat, lancer initiative, vérifier l’ordre.

---

## vA.6 — Items : feuille unique minimale (pas de weapon-like)

- [ ] Feuille item : nom, image, description (rich text si possible), rareté si déjà modélisée.

QA manuel

- [ ] Créer un item, éditer description, sauvegarde OK.

---

# vB — Fonctionnel, UX meilleure, automatisations minimales

## Objectifs vB

- Evoluer le modèle de données (si nécessaire) au-delà du schéma actuel.
- Améliorer l’UX de la feuille personnage (onglets, boutons de jets).
- Rolls plus pratiques (notamment sauvegardes) sans passer par les vrais items Spell.
- Classes : structure + verrou (pas de changement).

---

## vB.1 — Modèle de données : évolutions

- [ ] Faire évoluer `module/data/models.mjs` pour refléter ce dont la sheet/les rolls ont besoin.
- [ ] Ajouter/clarifier les champs manquants plutôt que d’avoir des “undefined”.

QA manuel

- [ ] Créer un perso neuf : aucune console error liée au data model.
- [ ] Ouvrir un perso existant : pas de régression.

---

## vB.2 — UX feuille perso

- [ ] Onglets AppV2 (stats/combat/magie/inventaire/notes).
- [ ] Boutons de jets « 1 clic » (JdC / init / attaque basique).

Détails implémentation (sheet)

- [ ] Définir `static TABS` et utiliser `this._prepareTabs("primary")`.
- [ ] Découper en `PARTS` : header, tabs, 1 part par onglet.
- [ ] `_preparePartContext(partId, context)` : injecter `context.tab`.
- [ ] `_onRender` : restaurer l’onglet actif via `this.tabGroups`.

Détails implémentation (actions)

- [ ] Utiliser `DEFAULT_OPTIONS.actions` + `data-action`.
- [ ] `type="button"` sur les boutons.
- [ ] Standardiser `data-*` : `data-skill`, `data-roll`, etc.

QA manuel

- [ ] Changer d’onglet après modification : onglet actif conservé.
- [ ] Rerender : les boutons continuent de fonctionner.

---

## vB.3 — Rolls « pertinents »

### vB.3.1 — Sauvegardes standardisées

Option choisie : `X` et la stat de sauvegarde (`StatSauv`) sont saisis via un dialog au moment du jet.

- [ ] Créer une fonction `promptSave()` (ou équivalent) qui demande :
  - [ ] `X` (DC de base)
  - [ ] `StatSauv` (for/dex/int/sag/cha/con)
  - [ ] (Option) un texte « effet en cas de réussite » (ex: /2, pas de CdF)
- [ ] Calculer `DC = X + StatIncantAttaquant`.
- [ ] Appliquer la règle d’arrondi : en cas de réduction de dégâts, arrondi supérieur.

Chat card

- [ ] Afficher X, StatIncant attaquant, DC finale, stat de sauvegarde, résultat, réussite/échec.

QA manuel

- [ ] Lancer 3 sauvegardes : vérifier la DC et l’affichage.

### vB.3.2 — Dégâts critiques (décision : double dés uniquement)

- [ ] Sur crit (20 naturel sur JdT) : doubler uniquement les dés de dégâts (pas les bonus stats).

QA manuel

- [ ] Cas normal vs crit : la partie dés double, la stat reste simple.

---

## vB.4 — Résistances (début)

Décision : `system.attributes.resistances.<type>.value` peut être négatif.

- [ ] Afficher et éditer les résistances (valeur + immune).
- [ ] Option : dans la chat card de dégâts, afficher « brut → après résistances » sans appliquer automatiquement aux PV.

QA manuel

- [ ] Résistance négative : affichage OK.
- [ ] Immune : affichage OK.

---

## vB.5 — Classes (structure + verrou)

- [ ] Stocker `system.classId` / `system.className`.
- [ ] Sélection depuis un compendium.

Règle : impossibilité de changer de classe, et les classes ne sont pas cumulables.

- [ ] Si `system.classId` est déjà défini :
  - [ ] UI de sélection désactivée
  - [ ] (GM) bouton « override » pour réinitialiser

QA manuel

- [ ] Choisir une classe, fermer/réouvrir : impossible de re-choisir sans override.
