**Variables éditables des types d'objet**

Document pensé pour être collé dans Discord.

Ordre : du type d'objet le plus détaillé au plus simple, selon les champs vraiment modifiables dans l'interface.

**Blocs communs**

**Commun à tous les objets**

- `name` : nom de l'objet
- `img` : image de l'objet
- `system.description.text` : description principale
- `system.description.loretext` : loretext

**Bloc physique**
Présent sur `Weapon`, `Trinket`, `Tool`, `Backpack`, `Consumable`, `Loot`, `Book`, `Currency`.

- `system.quantity` : quantité (`Currency` exclu)
- `system.weight` : poids unitaire (lecture seule sur `Currency`)
- `system.equipped.*` : emplacement équipé via le sélecteur
- `system.equippable.main_hand`
- `system.equippable.off_hand`
- `system.equippable.two_handed`
- `system.equippable.body`
- `system.cursed`

**Bloc identification**
Présent sur tous les objets physiques sauf `Currency`.

- `system.identification.needs_identification`
- `system.identification.identified`
- `system.identification.true_name`
- `system.identification.unidentified.name`
- `system.identification.unidentified.description`
- `system.identification.unidentified.loretext`

Note : si l'objet doit être identifié et ne l'est pas encore, `Description` et `Loretext` modifient `system.identification.unidentified.*` au lieu de `system.description.*`.

**Bloc modificateurs**
Présent sur `Trinket` et `Class`.
Chaque entrée `system.modifiers[n]` contient :

- `system.modifiers[n].category`
- `system.modifiers[n].path`
- `system.modifiers[n].mode`
- `system.modifiers[n].value`

**Bloc action**
Le type `Action` édite ces champs directement dans `system.*`.
Les objets à actions intégrées (`Weapon`, `Trinket`, `Tool`, `Consumable`) éditent les mêmes champs dans `system.actions[n].*`.

En-tête :

- `name` ou `system.actions[n].name`
- `system.shorthand` ou `system.actions[n].shorthand`

Principal :

- `mode`
- `range_type`
- `requires`
- `effect.text`

Activation des jets :

- `jdt.enabled`
- `jds.enabled`
- `jdd.enabled`
- `concentration.enabled`

Ciblage :

- `selection.target.amount`
- `selection.target.unit`
- `selection.target.visibility`
- `selection.target.include_self`
- `selection.zone.shape`
- `selection.zone.range_secondary`
- `selection.zone.range`
- `selection.zone.min_range`
- `selection.zone.long_range`
- `selection.zone.has_long_range`

Coûts :

- `cost.actions.note`
- `cost.actions.options[n].main`
- `cost.actions.options[n].bonus`
- `cost.actions.options[n].reaction`
- `cost.actions.options[n].condition`
- `cost.movement.mode`
- `cost.movement.amount`
- `cost.movement.variable`
- `cost.nalfa.amount`
- `cost.nalfa.category`
- `cost.nalfa.overload.enabled`
- `cost.nalfa.overload.amount`
- `cost.nalfa.overload.effect`
- `cost.uses.value`
- `cost.uses.max`
- `cost.uses.unit`
- `cost.cooldown.amount`
- `cost.cooldown.unit`

JdT :

- `jdt.stat`
- `jdt.bonus`

JdS :

- `jds.dd`
- `jds.stat`
- `jds.text`
- `jds.fails_on_save`

JdD :
Chaque entrée `jdd.damage_formulas[n]` contient :

- `formula`
- `stat`
- `type`
- `effect`

JdD sauvegardé :

- `jdd_saved.enabled`
- `jdd_saved.mode`
- `jdd_saved.damage_formulas[n].formula`
- `jdd_saved.damage_formulas[n].stat`
- `jdd_saved.damage_formulas[n].type`
- `jdd_saved.damage_formulas[n].effect`

Concentration :

- `concentration.stat`
- `concentration.dd`
- `concentration.enemy_attack_bonus`

- Métadonnées techniques des actions intégrées liées à une source :
- `system.actions[n].source_uuid`
- `system.actions[n].source_version`
- `system.actions[n].source_hash`
- `system.actions[n].always_refresh`

Ces 4 variables sont pilotées par les boutons de liaison/synchronisation, pas par des champs texte classiques.

**Types d'objets**

**1. `Action`**

- inclut : bloc commun + bloc action complet
- champ propre : `system.shorthand`

**2. `Weapon`**

- inclut : bloc commun + bloc physique + bloc identification + actions intégrées + rareté + niveau recommandé
- champs spécifiques : `system.rarity`, `system.recommended_level.min`, `system.recommended_level.max`, `system.da.main_hand`, `system.da.two_handed`, `system.da.dual_wield`, `system.damage_type`, `system.weapon_attributes.can_use_dex`, `system.weapon_attributes.list[n]`

**3. `Trinket`**

- inclut : bloc commun + bloc physique + bloc identification + bloc modificateurs + actions intégrées + rareté + niveau recommandé
- champ spécifique : `system.trinket_type`

**4. `Class`**

- inclut : bloc commun + bloc modificateurs
- champs spécifiques : `system.stat_ester`, `system.choices.bonus_skill_points.value`, `system.choices.bonus_skill_points.max`, `system.choices.malus_skill_points.value`, `system.choices.malus_skill_points.max`, `system.attributes.actions.main`, `system.attributes.actions.bonus`, `system.attributes.actions.reaction`, `system.attributes.actions.concentration`, `system.attributes.actions.movement`, `system.attributes.armor_score.base`, `system.attributes.armor_score.stat`
- affiché mais non éditable directement : `system.attributes.armor_score.value`

**5. `Race`**

- inclut : bloc commun
- champs spécifiques : `system.height.min`, `system.height.max`, `system.weight.min`, `system.weight.max`, `system.life_expectancy`, `system.size`, `system.playable_classes[n]`, `system.racial_traits[n]`, `system.point_buy.stat_advantage.str`, `system.point_buy.stat_advantage.dex`, `system.point_buy.stat_advantage.int`, `system.point_buy.stat_advantage.wis`, `system.point_buy.stat_advantage.cha`, `system.point_buy.stat_advantage.con`

**6. `Currency`**

- inclut : bloc commun + bloc physique adapté monnaie
- champs spécifiques : `system.denominations[n].amount`, `system.denominations[n].short_name`, `system.denominations[n].monetary_value`, `system.denominations[n].weight_coefficient`, `system.base_coin_weight`
- affichés mais non éditables directement : `system.denominations[n].valid`, `system.denominations[n].value`, `system.denominations[n].weight`, `system.total_value`, `system.currency_base`, `system.total_weight`, `system.all_valid`

**7. `Consumable`**

- inclut : bloc commun + bloc physique + bloc identification + actions intégrées + rareté + niveau recommandé
- champs spécifiques : `system.rarity`, `system.recommended_level.min`, `system.recommended_level.max`, `system.consumable_type`, `system.auto_destroy`

**8. `Tool`**

- inclut : bloc commun + bloc physique + bloc identification + actions intégrées + rareté + niveau recommandé
- champs spécifiques : `system.rarity`, `system.recommended_level.min`, `system.recommended_level.max`
- pas de champs `specific` supplémentaires pour le moment

**9. `Backpack`**

- inclut : bloc commun + bloc physique + bloc identification + rareté + niveau recommandé
- champs spécifiques : `system.capacity`, `system.rarity`, `system.recommended_level.min`, `system.recommended_level.max`

**10. `Loot`**

- inclut : bloc commun + bloc physique + bloc identification + rareté + niveau recommandé
- champs spécifiques : `system.rarity`, `system.recommended_level.min`, `system.recommended_level.max`
- pas de champs `specific` supplémentaires pour le moment

**11. `Book`**

- inclut : bloc commun + bloc physique + bloc identification + rareté
- champ spécifique : `system.rarity`
- pas de champs `specific` supplémentaires pour le moment

**12. `Job`**

- inclut : bloc commun uniquement
- pas de champs spécifiques actuellement

**13. `WeaponAttribute`**

- inclut : bloc commun uniquement
- pas de champs spécifiques actuellement
