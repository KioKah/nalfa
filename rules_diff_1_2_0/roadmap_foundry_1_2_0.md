# Roadmap d'implémentation Foundry - Nalfa 1.2.0

Objectif : appliquer les changements de règles validés dans le système Foundry, dans l'ordre le plus utile pour le développement.

Principes :

- Ne pas ajouter de migrations ni de compatibilité défensive pour les anciens schémas.
- Ne pas supprimer une mécanique juste parce qu'elle n'est plus explicitée dans les règles.
- Prioriser les systèmes incomplets ou nouveaux : Nalfa, armes, jets, exécution d'actions.
- Reporter les mécaniques larges non prioritaires : exploration, rencontres, inspiration, actions génériques avancées.

## 1. Ressource Nalfa et coûts de sorts

But : remplacer les charges de sorts par une ressource unique `Nalfa`, proche de points de magie.

Tâches :

- [ ] Ajouter une ressource acteur `Nalfa` avec `value` et `max`.
- [ ] Afficher `Nalfa` sur la fiche personnage.
- [ ] Remplacer les coûts d'action/sort basés sur `ester` ou charges par des coûts en `Nalfa`.
- [ ] Consommer réellement le Nalfa lors de l'exécution d'une action/sort.
- [ ] Empêcher ou signaler l'exécution si le Nalfa disponible est insuffisant.
- [ ] Ajouter la surcharge en Nalfa sur les sorts/actions compatibles.
- [ ] Permettre à la surcharge d'augmenter ou d'ajouter des effets, selon les données de l'action.
- [ ] Remplacer les catégories de coût `none/lvl1/lvl2/lvl3/special` par `Mineur`, `Intermédiaire`, `Avancé`, `Majeur`.
- [ ] Présenter ces catégories comme des alias des anciens niveaux de sort, mais avec paiement en Nalfa au lieu de charges par niveau.
- [ ] Retirer `spell_charges.lvl1/lvl2/lvl3/special` du modèle acteur et de l'UI.
- [ ] Retirer le tableau de maximum de charges par niveau.
- [ ] Retirer les coûts par `Charge de Sort de Niveau 1/2/3` et `Charge de Sort Spéciale`.
- [ ] Retirer les anciennes unités de coût `none/lvl1/lvl2/lvl3/special` une fois les nouvelles catégories en place.

État actuel connu :

- Le système utilise encore `ester` dans les coûts d'action.
- Le modèle acteur expose encore `spell_charges.lvl1/lvl2/lvl3/special`.
- Les catégories `Mineur`, `Intermédiaire`, `Avancé`, `Majeur` ne sont pas encore présentes.

## 2. Armes, mains, dégâts d'arme et attributs

But : stabiliser le modèle d'arme, car il impacte l'équipement, les formules de dégâts et les actions.

Tâches :

- [ ] Garder `dA` comme dégâts génériques d'arme.
- [ ] Ajouter `dAp` pour les dégâts de l'arme principale.
- [ ] Ajouter `dAs` pour les dégâts de l'arme secondaire.
- [ ] Permettre aux formules de dégâts d'utiliser `dA`, `dAp` et `dAs`.
- [ ] Clarifier dans le modèle l'usage actif d'une arme : une main, deux mains, combat à deux armes.
- [ ] Ajouter l'attribut d'arme `Lourde`.
- [ ] Ajouter l'attribut d'arme `Lancer`.
- [ ] Ajouter la règle de lancer d'arme : JdD divisé par 2 si l'arme n'a pas l'attribut `Lancer`.
- [ ] Ajouter des warnings visibles, non bloquants, pour les combinaisons invalides ou suspectes.
- [ ] Warning : `Lourde` + `Légère`.
- [ ] Warning : `Lourde` + `Finesse`.
- [ ] Warning : `Lancer` sans `Légère`.
- [ ] Laisser le MJ sauvegarder malgré les warnings.

État actuel connu :

- Les armes ont déjà `da.main_hand`, `da.two_handed`, `da.dual_wield`.
- `dA` est déjà substitué dans les formules.
- `dAp` et `dAs` n'existent pas encore.
- Les attributs d'armes sont actuellement du texte libre, sans validation ni warning.

## 3. Jets : 1/20 naturels et avantage/désavantage

But : fiabiliser les résultats automatiques des jets sans lancer tout de suite un système complet de sources d'avantage/désavantage.

Tâches prioritaires :

- [ ] Corriger le comportement de `1 naturel` et `20 naturel` dans les workflows de jets.
- [ ] Garantir qu'un `20 naturel` produit un succès effectif, pas seulement un affichage critique.
- [ ] Garantir qu'un `1 naturel` produit un échec effectif, pas seulement un affichage fumble.
- [ ] Harmoniser attaque, sauvegarde, concentration et compétence autour de cette règle.

Tâches reportées :

- [ ] Prévoir une structure capable d'agréger plusieurs sources d'avantage/désavantage.
- [ ] Ne pas prioriser l'automatisation des sources de (dés)avantage tant que les règles ne listent pas de sources concrètes.
- [ ] Ajouter plus tard le lancer effectif `2d20 garder meilleur/pire`.
- [ ] Étape minimale possible : ajouter un sélecteur manuel `normal / avantage / désavantage` dans les prompts de jet quand ces prompts seront travaillés.

État actuel connu :

- `module/rolls/core/shared.mjs` détecte déjà `isCrit` et `isFumble`.
- `module/rolls/workflows/attack.mjs` calcule encore `isSuccess` avec `roll.total >= targetDefense`.
- `module/rolls/workflows/save.mjs` et `module/rolls/workflows/concentration.mjs` comparent aussi le total à une difficulté.
- Le JdT tracke bien critique/fumble, mais l'auto-succès/auto-échec n'est pas garanti dans la logique de succès.

## 4. Exécution des actions : coûts, bonus et contraintes

But : faire en sorte que les données configurées sur une action aient un effet réel au moment de l'exécution.

Tâches :

- [ ] Brancher les coûts Nalfa dans l'exécution d'action.
- [ ] Brancher les coûts de mouvement si l'action en possède.
- [ ] Brancher les cooldowns si l'action en possède.
- [ ] Brancher les utilisations si l'action en possède.
- [ ] Vérifier les prérequis avant résolution.
- [ ] Corriger `jdt.bonus` pour qu'il soit appliqué au JdT si c'est bien son rôle.
- [ ] Garder `jdt.bonus` comme ajustement manuel pour bonus conditionnels difficiles à modéliser.
- [ ] Retirer les coûts en anciennes charges quand les coûts Nalfa sont en place.

État actuel connu :

- `jdt.bonus` apparaît dans `templates/partials/item/actionable/roll-jdt.hbs`.
- `jdt.bonus` apparaît dans le résumé/tooltip d'action via `module/sheets/item/context/actions.mjs`.
- `rollAttackFromAction` dans `module/rolls/workflows/attack.mjs` n'utilise pas `jdt.bonus` dans le calcul du modificateur.

## 5. Critiques de soin et labels de soins

But : simplifier les soins critiques et aligner les labels visibles.

Tâches :

- [ ] Retirer le rappel MJ `Soin : Faire lancer pour potentiel Soin Critique.`.
- [ ] Appliquer aux soins critiques la même logique de relance des dés que les dégâts critiques.
- [ ] Vérifier que le critique de soin relance les dés sans doubler la stat, comme les dégâts critiques actuels.
- [ ] Renommer les labels visibles de `Soin` vers `Soins` quand il n'y a pas de contrainte de clé.
- [ ] Garder la clé technique `soin`, car les clés de types de dégâts restent à 4 lettres.

À ne pas faire :

- [ ] Ne pas retirer le cumul d'absorption.
- [ ] Ne pas renommer la clé dictionnaire `soin`.
- [ ] Ne pas retirer les doubles types ; ils restent détaillés hors DOCX.

État actuel connu :

- Les dégâts critiques relancent déjà les dés via `rollDamageEntries(..., { includeStat: false, diceOnly: true })` dans `module/rolls/actions/damage/resolution.mjs`.
- Les soins déclenchent encore le rappel MJ dans `module/rolls/actions/damage/resolution.mjs`.
- Les labels visibles utilisent encore `Soin` dans `module/rolls/workflows/damage.mjs` et `module/config.mjs`.

## 6. Repos et fatigue

But : ajouter un outil simple de repos et afficher la fatigue, sans automatiser les effets complexes.

Tâches :

- [ ] Ajouter un champ ou affichage clair des points de fatigue/exhaustion sur la fiche personnage.
- [ ] Ajouter un bouton de repos.
- [ ] Au clic sur repos, ouvrir un prompt demandant un pourcentage de récupération.
- [ ] Le repos rend des PV égaux à ce pourcentage des PV max, arrondis à l'inférieur.
- [ ] Le repos rend du Nalfa égal à ce pourcentage du Nalfa max, arrondi à l'inférieur.
- [ ] Les PV ne dépassent pas leur max.
- [ ] Le Nalfa ne dépasse pas son max.
- [ ] Le prompt demande aussi une réduction de fatigue.
- [ ] La réduction de fatigue retire des points d'exhaustion.
- [ ] L'exhaustion ne peut pas passer sous `0`.
- [ ] Retirer l'ancien système de repos basé sur récupération de charges de sorts quand Nalfa remplace les charges.

À ne pas faire :

- [ ] Ne pas automatiser les DoT maintenant.
- [ ] Ne pas automatiser les effets néfastes de fatigue maintenant.
- [ ] Ne pas automatiser l'inconscience ou la perte de PV par round maintenant.

État actuel connu :

- `attributes.exhaustion` existe déjà dans le modèle acteur.
- L'affichage principal de fiche ne semble pas exposer clairement `exhaustion` actuellement.

## 7. Charge et Courir

But : documenter les changements validés, mais reporter l'implémentation tant que les bases actions/coûts ne sont pas stabilisées.

Tâches reportées :

- [ ] Créer plus tard une action générique `Charge`.
- [ ] Créer plus tard une action générique `Courir`.
- [ ] Pour `Charge`, utiliser la nouvelle portée : cible entre `4m` et le maximum de Déplacement.
- [ ] Pour `Charge`, conserver le bonus `+2 JdT`.
- [ ] Pour `Charge`, conserver le coût en déplacement égal à la distance parcourue.
- [ ] Pour la variante bouclier de `Charge`, utiliser `Sauv 4 + distance parcourue For/Dex = Hébété`.
- [ ] Pour `Courir`, utiliser `1d(Déplacement)min`.
- [ ] Retirer l'ancien cooldown de Charge `5 - Con tours`, minimum `1`, quand Charge sera implémentée.
- [ ] Retirer l'ancienne règle générique `certains sorts peuvent être lancés en Charge, à demander au MJ`, au profit d'une compatibilité déclarée par l'action/sort.

À ne pas faire maintenant :

- [ ] Ne pas créer tout de suite un système complet d'actions génériques si ce n'est pas nécessaire au reste de la refonte.

## 8. Hors périmètre pour cette roadmap

Ces points ne doivent pas générer de chantier maintenant.

- [ ] Ne pas faire de refonte des jets de sort/sauvegarde/concentration uniquement parce que les anciennes notions ne sont plus écrites dans les règles.
- [ ] Ne pas retirer `StatIncant`, `StatArme`, `StatSauv` ou `StatConcentr` seulement parce qu'elles ne sont plus détaillées dans les règles.
- [ ] Ne rien changer aux compétences : la modification est déjà faite et aucun utilisateur ne sera impacté.
- [ ] Ne rien faire sur les accessoires/trinkets/armures : la version actuelle est OK.
- [ ] Ne pas traiter l'exploration, les torches, la faim/soif, les chutes, les rencontres errantes ou l'inspiration dans cette roadmap.
- [ ] Ne pas supprimer les résistances/vulnérabilités/immunités simplement parce qu'elles ne sont plus listées dans les règles.
- [ ] Ne pas supprimer les profils, tables ou données de progression sans validation explicite ultérieure.
