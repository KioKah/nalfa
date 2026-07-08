# Changements de règles Foundry - Nalfa 1.2.0 vs 1.1.0

Ce document ne garde que les changements ayant un impact de règle potentiellement implémentable dans le système Foundry.

Sont exclus volontairement : reformulations sans effet mécanique, titres purs, déplacements de sections sans changement de règle, lore, texte d'introduction, et placeholders sans règle exploitable.

Légende appliquée après audit du repo :

Ajoutées : `[x]` déjà ajouté, `[~]` concept présent mais pas fonctionnel, `[ ]` pas ajouté.

Retirées : `[x]` pas encore retiré, `[~]` encore présent mais pas vraiment comme dans la version précédente, `[ ]` aucune trace dans le présent.

Changées : `[x]` déjà modifié, `[~]` ne reflète aucune des versions, `[ ]` encore dans la version précédente.

## Jets et moteur de dés

### + :

- [~] `1 naturel` et `20 naturel` deviennent des règles explicites sur les jets au d20.
- [~] Un `20 naturel`, sans modificateur, est toujours un succès.
- [~] Un `1 naturel`, sans modificateur, est toujours un échec.
- [ ] Le MJ peut renforcer les effets ou créer une interaction unique selon la situation sur un `20` naturel.
- [~] L'avantage et le désavantage deviennent des règles explicites.
- [~] Avec avantage, l'entité lance deux fois le dé et garde le meilleur résultat.
- [~] Avec désavantage, l'entité lance deux fois le dé et garde le moins bon résultat.
- [ ] Les JdC peuvent utiliser une difficulté fixée de manière arbitraire ou selon une table des difficultés.
- [~] /!\ Crit/fumble sont détectés dans `module/rolls/core/shared.mjs`, mais les workflows de succès comparent encore surtout les totaux.
- [~] /!\ Avantage/désavantage existent comme concept UI/ciblage, mais les jets restent en `1d20 + @modifier`.

### - :

- [x] La section autonome `Jet d'Initiative` n'est plus présente.
- [x] La formule explicite `1d20 + Initiative` n'est plus présente dans la version 1.2.0.
- [ ] La nomenclature mécanique détaillée des sauvegardes n'est plus présente : `[Sauv X+StatIncantAttaquant] StatSauv = M`.
- [ ] La règle `En cas de réduction de dégâts, ceux-ci sont arrondis à l'entier supérieur` n'est plus présente.
- [ ] L'exemple de sauvegarde avec `1d10 + Int Feu`, étourdissement, `Sauv 9 Dex` et difficulté augmentée par StatIncant n'est plus présent.
- [x] La section autonome `Jet de Concentration` n'est plus présente.
- [~] La formule explicite `1d20 + StatConcentr` n'est plus présente.
- [~] La nomenclature `[Concentr X+StatIncantAttaquant] StatConcentr` n'est plus présente.
- [ ] L'exemple de concentration avec le sort de soin `1d10 + Sag` n'est plus présent.

### ~ :

- [ ] Le JdT des sorts passe de `1d20 + StatIncant` à `1d20 + Statistique Principale`.
- [ ] Le JdT d'armes `1d20 + StatArme` n'est plus explicitement défini dans la règle de JdT 1.2.0.
- [~] Le JdD passe d'une nomenclature `xdn + StatIncant/StatArme Type` à `xdn + Stat Type`.
- [~] La notion de `Stat` du JdD remplace les références explicites `StatIncant/StatArme`.
- [~] La sauvegarde passe d'une règle très formalisée avec `StatSauv`, difficulté de base, difficulté ajoutée par l'attaquant et modification `M`, à une règle générique `1d20 + Stat demandée`.
- [x] La difficulté de sauvegarde dépend maintenant de l'effet qui provoque la sauvegarde.
- [~] Pour résister à un sort, la difficulté est généralement déterminée par le sort et la Statistique Principale du lanceur.
- [~] Le Jet de Concentration passe d'un jet avec `StatConcentr` explicite à une sauvegarde similaire dont les détails sont indiqués sur le sort nécessitant la Concentration.
- [~] /!\ Le système utilise encore `incant`/`physical` dans les stats de roll, mais pas exactement sous les noms textuels `StatIncant`/`StatArme`.
- [~] /!\ La concentration applique encore une logique de stat attaquant en malus, donc ce n'est ni le modèle 1.1.0 strict ni le modèle 1.2.0 propre.

## Statistiques et ressources d'acteur

### + :

- [ ] `Nalfa` devient une ressource de personnage/acteur.
- [ ] Le Nalfa est utilisé pour lancer des sorts.
- [ ] Certains sorts peuvent être surchargés en Nalfa.
- [ ] La surcharge en Nalfa peut augmenter les effets d'un sort ou ajouter des effets.
- [~] Lorsqu'un personnage inconscient remonte au-dessus de `0 Pv`, il reprend conscience et gagne un niveau de Fatigue.
- [~] La perte de PV en inconscience est exprimée en `10% des Pv max` chaque `tour/round`.
- [ ] /!\ Le système utilise encore `ester` et `spell_charges`, pas une ressource `Nalfa`.

### - :

- [x] `Résistances & Vulnérabilités & Immunités` n'est plus listé comme statistique générale dans le document 1.2.0.
- [x] `Perception Passive` n'est plus listée comme statistique générale.
- [x] La formule `Percep.Passive = 8 + Sagesse` n'est plus présente.
- [~] `Capacité` n'est plus listée comme statistique générale.
- [~] `StatIncant/StatArme` n'est plus listé comme donnée/statistique générale.
- [~] `StatSauv/StatConcentr` n'est plus listé comme donnée/statistique générale.
- [x] `Charges de Sorts` n'est plus listé comme ressource.
- [x] `Charges de Sorts Spéciaux` n'est plus listé comme ressource.
- [x] Le tableau d'évolution des Charges de Sorts et Charges de Sorts Spéciaux par niveau n'est plus présent.
- [~] `Charge d'utilisations` pour certains sorts n'est plus listée comme règle générale.
- [x] /!\ Les résistances/vulnérabilités/immunités sont encore pleinement fonctionnelles dans le calcul de dégâts.
- [x] /!\ L'ancien modèle `spell_charges.lvl1/lvl2/lvl3/special` est encore central dans le modèle acteur et l'UI.

### ~ :

- [~] `Points de Vie` passe de `tombe K.O.` à une règle d'`Inconscience` à `0 Pv ou moins`.
- [~] La mort est maintenant explicitement liée au fait de descendre sous les PV max dans le négatif.
- [~] La reprise de conscience au-dessus de `0 Pv` ajoute maintenant un niveau de Fatigue.
- [~] `Défense` passe d'une détermination par `la classe et votre équipement` à `l'archétype de classe et l'équipement`.
- [~] `Évasion` reçoit l'abréviation `Eva` et reste utilisable uniquement sur les attaques d'opportunités.
- [~] /!\ Le système calcule encore un affichage KO/mort et possède `exhaustion`, mais pas l'automatisation complète inconscience/perte de PV/fatigue.

## Création et progression d'acteur

### + :

### - :

- [~] Les règles de création de personnage ne sont plus présentes dans le document 1.2.0.
- [ ] Les archétypes de classe de création ne sont plus listés comme règles : `Tank`, `Assassin`, `Mage`, `Combattant`, `Support`, `Tireur`, `Invocateur`.
- [ ] La liste complète des classes n'est plus présente comme règle du document.
- [ ] La liste complète des races n'est plus présente comme règle du document.
- [ ] Les compatibilités classe/race ne sont plus présentes.
- [ ] Les règles de description de personnage obligatoire ne sont plus présentes.
- [x] Les profils de résistance de départ ne sont plus présents : `Squishy`, `Soft`, `Sturdy`, `Tanky`.
- [x] Les PV et Défense de base par profil ne sont plus présents.
- [~] La règle d'attribution des importances de statistiques à la création n'est plus présente.
- [ ] La règle `une Majeure, une Puissante, deux Neutres et deux Faibles` n'est plus présente.
- [ ] La règle de valeur initiale `-2` pour chaque statistique n'est plus présente.
- [ ] Le tableau de coût d'amélioration des statistiques n'est plus présent.
- [~] Les règles de points de compétences à la création et par niveau ne sont plus présentes.
- [~] Le tableau `Bonus`, `Malus`, `Max de pts/comp` par niveau n'est plus présent.
- [~] La section de montée de niveaux n'est plus présente.
- [x] Le tableau d'évolution des PV par niveau et profil n'est plus présent.
- [~] Le déverrouillage automatique de sorts et passifs de classe à chaque niveau n'est plus présent.

### ~ :

## Compétences

### + :

- [x] Nouvelle compétence : `Investigation`.
- [~] `Investigation` couvre notamment l'origine d'une blessure et l'emplacement d'un objet caché.

### - :

- [ ] La compétence `Médecine` n'existe plus comme compétence séparée dans le document 1.2.0.

### ~ :

- [ ] Les compétences ne sont plus décrites comme déterminées par la classe, mais par la race ou le personnage lui-même.
- [~] Le contenu mécanique de `Médecine` lié aux maladies/poisons est absorbé par `Nature`.
- [~] `Nature` couvre maintenant `faune, flore, climat, maladies, poisons, magie naturelle`.
- [~] `Culture` devient formulée comme une compétence de connaissance, sans changement mécanique évident au-delà du libellé.
- [~] `Intuition` précise maintenant les intentions `d'une créature`.
- [~] /!\ Les compétences existent surtout comme clés/labels et modificateurs, pas comme descriptions mécaniques détaillées.
- [ ] /!\ Les modificateurs de compétences viennent encore des `Class`/`Trinket`, pas des `Race`.

## Sorts et magie

### + :

- [ ] Les sorts ont maintenant des catégories de puissance potentielles.
- [ ] Nouvelle catégorie : `Sorts Mineurs`, ne consommant pas de Nalfa.
- [ ] Nouvelle catégorie : `Sorts Intermédiaires`, consommant peu de Nalfa et pouvant être surchargés.
- [ ] Nouvelle catégorie : `Sorts Avancés`, très puissants et consommant davantage de Nalfa.
- [ ] Nouvelle catégorie : `Sorts Majeurs`, ultimes et ayant souvent un nombre limité d'utilisations par période.
- [~] Les sorts ont maintenant des sources explicites.
- [ ] `Sort Racial` reste une source relative à la race du personnage.
- [ ] `Sort Héroïque` reste une source liée directement au personnage et à son histoire.
- [~] Si aucune source n'est mentionnée, le sort provient de la classe.
- [ ] /!\ Aucune catégorie `Mineur/Intermédiaire/Avancé/Majeur` n'a été trouvée, le système utilise encore les unités `none/lvl1/lvl2/lvl3/special`.

### - :

- [x] Les anciennes catégories par niveau/charge ne sont plus présentes : `Sort Basique`, `Sort de Niveau 1`, `Sort de Niveau 2`, `Sort de Niveau 3`, `Sort Spécial`.
- [x] La consommation par `Charge de Sort de Niveau 1`, `Charge de Sort de Niveau 2`, `Charge de Sort de Niveau 3` ou `Charge de Sort Spéciale` n'est plus présente.

### ~ :

- [~] `Sort Racial` passe de `lié à la race du Personnage` à `relatif à la race du Personnage`, sans changement mécanique évident autre que le libellé de source.
- [~] La source par défaut d'un sort est maintenant la classe si aucune mention n'est indiquée.

## Dégâts, soins et absorption

### + :

- [~] Les soins critiques ont une règle mécanique explicite : les dés du Jet de Soins sont lancés deux fois.
- [~] /!\ Les dés bonus de critique existent côté dégâts, mais les soins affichent encore un rappel MJ de potentiel soin critique.

### - :

- [x] L'absorption n'est plus dans le titre des règles spéciales de dégâts/soins.
- [x] La règle de cumul d'absorption n'est plus présente.
- [ ] L'exemple de cumul d'absorption avec limite à la valeur maximale de la dernière absorption reçue n'est plus présent.
- [x] L'ancienne règle de soins critiques par jet du MJ avec effets supplémentaires possibles n'est plus présente.
- [x] /!\ Le cumul d'absorption est encore implémenté avec addition et cap par le dernier jet max, avec un comportement de cap à revoir.

### ~ :

- [~] `Soins Critiques` passe d'une règle narrative contrôlée par le MJ à un doublement mécanique des dés de soin.

## Actions et combat

### + :

- [ ] Certains sorts peuvent être greffés à une attaque sous forme de Charge si la description du sort l'indique.
- [~] Le rayon de menace est désormais explicitement lié à la portée d'Allonge.

### - :

- [ ] Le temps de recharge de `Charge` n'est plus présent.
- [ ] L'ancien temps de recharge `5 - Con tours`, minimum `1`, n'est plus présent.
- [ ] L'ancienne règle générique `certains sorts peuvent être lancés en Charge, à demander au MJ` n'est plus présente.

### ~ :

- [~] `Courir` passe de `1d(Déplacement)` à `1d(Déplacement)min`.
- [~] `Charge` passe d'une cible située entre `5m et 10m` à une cible située entre `4m et votre maximum de Déplacement`.
- [~] `Charge` conserve le bonus `+2 JdT`.
- [~] `Charge` conserve le coût en déplacement égal à la distance parcourue.
- [~] La version bouclier de `Charge` passe de `Sauv 6 + distance parcourue For/Dex = Hébété` à `Sauv 4 + distance parcourue For/Dex = Hébété`.
- [~] La compatibilité des sorts avec `Charge` devient déclarative par description du sort, au lieu d'être une validation manuelle générique par le MJ.
- [~] Le rayon de menace passe de la portée d'`Attaque Basique` à la portée d'`Allonge`.
- [~] /!\ `Charge` n'existe pas comme action/règle dédiée ; seuls des champs génériques coût/cooldown/mouvement/JdS existent.
- [~] /!\ Le bonus `jdt.bonus` est éditable mais ne semble pas inclus dans la formule d'attaque actuelle.
- [~] /!\ L'Allonge existe comme attribut acteur, mais la menace/attaque d'opportunité n'est pas automatisée.

## Équipement, armes et objets

### + :

- [~] Les armes doivent pouvoir différencier leurs effets selon la manière dont elles sont équipées.
- [~] Une fiche d'arme doit préciser explicitement ses dégâts et propriétés selon ses usages possibles.
- [~] Les usages explicitement mentionnés sont : une main, deux mains, combat à deux armes, autre.
- [~] Les effets peuvent interagir différemment selon la main qui porte l'arme.
- [x] Nouvelle notation `dA` : dégâts infligés par l'arme.
- [ ] Nouvelle notation `dAp` : dégâts infligés par l'arme principale.
- [ ] Nouvelle notation `dAs` : dégâts infligés par l'arme secondaire.
- [ ] Nouvelle règle de lancer d'arme : lorsqu'une arme est lancée, son JdD est divisé par 2.
- [ ] Nouvel attribut d'arme : `Lourde`.
- [ ] Une arme `Lourde` se manie à 1M.
- [ ] Une arme `Lourde` peut être tenue à 2M.
- [ ] Une arme `Lourde` ne peut pas être `Légère`.
- [ ] Une arme `Lourde` ne peut pas être `Finesse`.
- [ ] Nouvel attribut d'arme : `Lancer`.
- [ ] Une arme avec `Lancer` peut être lancée sans malus de dégâts.
- [ ] `Lancer` est compatible seulement avec `Légère`.
- [~] Les accessoires peuvent conférer des bonus comme des malus.
- [~] Les accessoires peuvent conférer des effets passifs comme actifs.
- [~] /!\ Les armes ont bien des `da.main_hand/two_handed/dual_wield`, mais pas de support `dAp/dAs` ni de règles de main principale/secondaire complètes.
- [~] /!\ Les attributs d'armes sont du texte libre, sans validation `Lourde`/`Lancer`/compatibilités.

### - :

- [ ] Le tableau d'exemples d'armes et de dégâts par catégorie n'est plus présent.
- [ ] L'attribut d'arme `Allongée` n'est plus présent.
- [ ] Les effets d'armes WIP ne sont plus présents : `Pénétration T`, `Coup de Grâce`, `Fracasse Armure`, `Vol de vie`, `Impact T`, `Anti-Magie`, `Pénétration d'Absorption`.

### ~ :

- [~] `Deux Mains` devient `Deux mains` et précise que le JdD est souvent très élevé.
- [~] `Légère` passe de `arme à une main pouvant être utilisée dans chaque main` à `arme à 1M pouvant être utilisée dans chaque main ou tenue à 2M`.
- [~] `Légère` ne peut maintenant pas être `Lourde`.
- [~] `Finesse` reste inchangé sur son effet : utiliser Dex sur les JdT et dégâts au lieu de For.
- [~] Les armures conférant un effet deviennent des Accessoires seulement si elles confèrent un effet spécifique.

## Exploration, temps et ressources de scène

### + :

- [ ] Le MJ doit suivre le temps qui s'écoule dans le monde du jeu.
- [ ] Le temps de jeu est distinct du temps réel.
- [ ] Le MJ décide ce qu'il est possible d'accomplir pendant une durée donnée.
- [ ] Le MJ doit suivre les ressources consommées par le groupe.
- [ ] Les ressources explicitement listées sont : nourriture, eau, sources de lumière, durée des sorts, durée des effets magiques.
- [~] Nouvelle unité de temps : `Round`.
- [ ] Un round représente `10s à 20s` dans l'univers du jeu.
- [~] Les rounds servent pendant les rencontres, notamment les combats.
- [ ] Nouvelle unité de temps : `Tour` d'exploration.
- [ ] Un tour d'exploration représente environ `10min`.
- [ ] Les tours servent pendant l'exploration de donjons.
- [ ] Un jour complet sans manger ni boire peut imposer des malus.
- [ ] Un jour complet sans manger ni boire peut imposer des niveaux de fatigue.
- [ ] Un jour complet sans manger ni boire peut faire perdre des points de vie.
- [ ] Les torches durent généralement `1 heure`, soit `6 tours`.
- [ ] Une torche s'éteint au bout de `6 tours`, sauf mention contraire.
- [ ] Un sort utilisé pour éclairer coûte `1 Nalfa` pour `1 heure`.
- [ ] Tomber d'une hauteur sur une surface dure inflige des dégâts.
- [ ] Les dégâts de chute sont calculés au cas par cas.

### - :

### ~ :

## Rencontres et exploration dangereuse

### + :

- [ ] Les monstres errants deviennent une règle explicite.
- [ ] Le MJ peut lancer un dé à intervalles réguliers pour déterminer une rencontre de monstres errants.
- [ ] La fréquence des jets dépend du type de zone explorée.
- [ ] Fréquence générale en donjon : une fois tous les `2 tours`.
- [ ] Fréquence générale en contrée sauvage : une fois par jour.
- [ ] Probabilité générale d'une rencontre aléatoire : `1 sur 6`, soit `1 sur 1d6`.
- [ ] La probabilité peut varier selon la dangerosité de la zone.
- [ ] Le bruit du groupe peut augmenter les chances de rencontre.
- [ ] De puissantes sources d'éclairage peuvent augmenter les chances de rencontre.
- [ ] Un repos silencieux dans un lieu sans trop de passage peut réduire les chances de rencontre.

### - :

### ~ :

## Repos et fatigue

### + :

### - :

- [ ] L'ancienne règle générale de repos récupérant des PV, Charges de Sorts, Utilisations de Sorts et réduisant la fatigue n'est plus présente.

### ~ :

- [x] Le repos n'a plus de règle générale détaillée de récupération dans la 1.2.0.
- [~] La fatigue gagne au moins deux points d'entrée mécaniques : reprise de conscience après inconscience, et faim/soif prolongée.
- [~] /!\ `exhaustion` existe dans le modèle acteur, mais pas comme mécanique active affichée dans la fiche principale.

## Types de dégâts

### + :

### - :

- [ ] La section `Double Types` n'est plus présente.

### ~ :

- [ ] Le type spécial `Soin (soin)` devient `Soins (soins)`.

## Inspiration

### + :

### - :

- [ ] La règle d'`Inspiration` n'est plus présente.
- [ ] L'attribution d'Inspiration par le MJ pour idée originale, roleplay cohérent ou moment marquant n'est plus présente.
- [ ] La règle indiquant que le MJ choisit comment et quand utiliser l'Inspiration n'est plus présente.

### ~ :
