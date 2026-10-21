# Roadmap d'implementation Foundry - Nalfa 0.2.1

Objectif : aligner le systeme Foundry sur les regles 0.2.1 sans automatiser les
chapitres explicitement encore en WIP.

## Bilan de l'ecart

La 0.2.1 n'est pas une evolution incrementale de la 0.1.2 : elle remplace le
socle de statistiques, formalise l'economie d'un tour et donne des effets
mecaniques precis a la fatigue et aux etats.

| Domaine | Etat actuel | Impact |
| --- | --- | --- |
| Statistiques et competences | Ancien socle FOR/DEX/INT/SAG/CHA/CON et 18 competences | Rupture de schema |
| Actions et tours | Donnees presentes, seul le Nalfa est reellement consomme | Eleve |
| Combat et reactions | Combat custom limite a l'initiative | Eleve |
| Etats et fatigue | Bonne base, effets et DD encore incompatibles par endroits | Moyen a eleve |
| Repos | Table 0.2.1 presente, calcul de recuperation et saisie de qualite a corriger | Moyen |
| Profils, Nalfa et armes | Tables et modele 0.2.1 absents ou incompatibles | Eleve |
| Exploration et combat WIP | Non implemente | A reporter |

Principes :

- Ne pas ajouter de migration ni de compatibilite de schema pour les donnees
  0.1.x. La refonte des statistiques rend les anciens acteurs, objets et packs
  a recreer ou a corriger explicitement.
- Faire d'abord le modele de donnees et les jets, puis les ressources de tour.
  Les actions generiques et les etats ne doivent pas contourner ce moteur.
- Conserver les briques deja conformes : surcharge Nalfa, JdD minimum,
  critiques de JdD/soins, repos et Active Effects.
- Ne pas deduire une automatisation depuis les sections marquees WIP ou les
  choix explicitement laisses au MJ.

## 1. Socle 0.2.1 : statistiques, profils et competences

But : remplacer les six statistiques heritees par deux statistiques de
progression (`Pui`, `Poly`) et trois statistiques de sauvegarde (`Vig`, `Agi`,
`Vol`).

Taches :

- [x] Retirer `str/dex/int/wis/cha/con` et structurer le schema acteur et
  `CONFIG.nalfa` autour de `pui`, `poly`, `vig`, `agi` et `vol`.
- [x] Calculer `Pui` et `Poly` par niveau : `Pui` =
  `2/2/3/3/4/4/5/5/6/6/7/7` et `Poly` = `1/1/2/2/2/2/3/3/3/3/4/4` aux niveaux
  1 a 12.
- [x] Definir `Pui` comme la statistique de toucher et de JdD par defaut.
- [x] Ajouter les profils de Sante : Fragile (`11` PV, `+5` par niveau),
  Standard (`12` PV, `+6`) et Robuste (`13` PV, `+7`).
- [x] Ajouter les profils de Defense : Expose (`9 + Poly`), Standard
  (`10 + Poly`), Protege (`11 + Poly`) et Bastion (`12 + Poly`).
- [x] Ajouter les profils de Sauvegarde Stoique, Endurant, Vif, Insaisissable,
  Resilient et Lucide, avec leurs repartitions Forte/Moyenne/Faible pour
  `Vig/Agi/Vol` et les compatibilites de classe.
- [x] Remplacer les sauvegardes actuelles par `Vigueur`, `Agilite` et `Volonte`
  dans les selecteurs de JdS/JdF.
- [x] Calculer le Nalfa maximum par niveau :
  `6/7/8/10/12/14/16/18/20/22/24/26` aux niveaux 1 a 12, et borner la ressource
  a ce maximum.
- [x] Remplacer les 18 competences actuelles par les 11 competences 0.2.1 :
  Atletisme, Acrobaties, Adresse, Discretion, Endurance, Perception, Analyse,
  Intuition, Persuasion, Intimidation et Tromperie.
- [x] Revoir toutes les listes de chemins de modificateurs et les templates de
  fiche pour les nouvelles cles.
- [x] Retirer `roll_stats.physical` et `roll_stats.incant`, ainsi que les
  notions de `StatArme` et `StatIncant`, devenues redondantes avec `Pui`.
- [x] Retirer la formule d'initiative actuelle. L'initiative est WIP et ne doit
  pas etre automatisee tant que sa regle n'est pas definie.
- [ ] Mettre a jour tous les acteurs, actions, classes, races, bibelots et
  compendiums apres stabilisation du schema, avec leurs profils.

Dependances : aucune. Cette phase bloque toutes les suivantes qui manipulent
statistiques, sauvegardes, modificateurs ou compendiums.

## 2. Fiches, editeurs et retours de jeu

But : faire correspondre les ecrans aux donnees et mecanismes 0.2.1, sans
conserver dans l'interface des controles de l'ancien systeme.

### Fiche personnage

- [x] Recomposer le panneau statistiques : `Pui` et `Poly` doivent etre
  identifies comme valeurs de progression, tandis que `Vig`, `Agi` et `Vol`
  sont presentees comme sauvegardes.
- [x] Remplacer la liste des 18 competences par les 11 competences 0.2.1,
  avec leurs nouveaux groupes Physiques, Mentales et Sociales.
- [x] Afficher la formule de Defense `profil + Poly` et retirer les
  explications de profil et de statistiques heritees.
- [x] Afficher le profil de Sante, de Defense et de Sauvegarde, ainsi que les
  valeurs de `Pui`, `Poly` et Nalfa calculees par niveau.
- [x] Retirer ou masquer l'initiative tant que sa regle reste WIP.
- [x] Retirer les panneaux et boutons `Physique`/`Incantation` issus de
  `roll_stats`; les jets directs doivent exposer `Pui` et les trois Sauv.
- [x] Renommer `Action bonus` en `Action secondaire` partout sur la fiche,
  l'explorateur d'actions et les infobulles.
- [ ] Afficher l'effet concentre actif et une action pour l'interrompre.
- [ ] Afficher lisiblement le cout, l'etat disponible/consomme et la remise a
  zero au prochain tour pour Principale, Secondaire, Reaction, Deplacement et
  Interaction Simple.
- [ ] Ajouter aux panneaux d'etats `Menace` et `Cache`, la source de Charme ou
  Provocation, les sauvegardes de debut de tour et les restrictions actives.
- [ ] Afficher l'etat KO/inconscience, le seuil de mort et la perte de PV de
  fin de tour comme des effets appliques, pas comme de simples rappels.
- [ ] Conserver le dialogue de repos, mais remplacer son champ de qualite par
  les facteurs de repos et previsualiser PV, Nalfa et Fatigue recuperes.

### Fiches d'objet et editeur d'action

- [x] Retirer les modes et selecteurs `Physique`/`Incantation` devenus lies a
  l'ancien modele de statistiques; distinguer explicitement sort, arme et
  action generique lorsque cela est necessaire a l'affichage.
- [x] Remplacer tous les selecteurs de statistique par `Pui` ou `Vig/Agi/Vol`
  selon le jet configure; supprimer les choix d'anciennes statistiques.
- [x] Mettre a jour l'editeur de couts : Principale, Secondaire, Reaction,
  Deplacement, Interaction Simple, Nalfa, utilisations et cooldowns.
- [x] Distinguer dans l'editeur de concentration le maintien d'un effet, son
  JdF et son unicite.
- [ ] Ajouter dans l'editeur les champs necessaires aux actions generiques :
  duree jusqu'au prochain tour, cible source d'un etat, Charge et sort
  greffable.
- [ ] Refaire la fiche d'arme autour de `dA` et des attributs Finesse,
  Brutalite, Deux mains, Legerete, Maniabilite, Allonge et Lancer.
- [ ] Afficher la variante a une ou deux mains uniquement pour une arme
  Maniable, et l'usage du lancer improvise lorsqu'elle n'a pas `Lancer`.
- [ ] Revoir les apercus d'arme et d'action pour qu'ils affichent JdT/JdD avec
  `Pui`, les Sauv avec leur statistique et les nouveaux couts de tour.
- [x] Mettre a jour les filtres, regroupements et resumes de l'explorateur
  d'actions apres renommage de `bonus` et retrait de `incant`.

### Chat, tokens et suivi de combat

- [ ] Mettre a jour les cartes de JdC, JdT, JdD, JdS et JdF avec les nouvelles
  statistiques, DD et regles de critique.
- [ ] Ajouter aux cartes d'action un recapitulatif des ressources effectivement
  consommees, de l'effet de concentration cree ou interrompu et des etats
  appliques.
- [ ] Exposer sur token et dans le suivi de combat les etats bloquants, les
  ressources de tour et l'inconscience, sans ajouter d'initiative automatisee.
- [ ] Verifier les styles LESS de tous les panneaux ajoutes ou renommes sur
  bureau et mobile.

Dependances : phase 1 pour la structure. Les affichages de disponibilite et le
suivi de combat dependent aussi de la phase 3.

## 3. Moteur de jets commun

But : rendre tous les workflows coherents avec les nouvelles statistiques et
les regles globales de des.

Taches :

- [ ] Centraliser l'application de 1 naturel et 20 naturel pour JdC, JdT et
  JdS, sans confondre resultat naturel et total modifie.
- [ ] Conserver l'avantage/desavantage existant et verifier qu'il est
  disponible sur JdC, JdT et JdS.
- [ ] Basculer JdT et JdD sur `Pui`; conserver un champ de bonus explicite
  d'action pour les bonus conditionnels.
- [ ] Appliquer effectivement `jdt.bonus`, deja edite mais ignore par le
  workflow d'attaque.
- [ ] Refaire le workflow JdS sur `Vig/Agi/Vol` et sur la DD de l'effet.
- [ ] Simplifier le JdF comme une JdS configuree par l'effet de concentration,
  sans malus manuel de l'attaquant herite de l'ancien modele.
- [ ] Conserver les critiques de degats et soins : second lancer des des, sans
  doubler la statistique.
- [ ] Verifier que les JdD partages entre plusieurs cibles le restent.

Dependances : phases 1 et 2.

## 4. Ressources de tour et cycle de combat

But : rendre effective l'economie annoncee par la fiche : une Action
Principale, une Action Secondaire, du Deplacement, une Interaction Simple et
une Reaction par tour.

Taches :

- [ ] Renommer la ressource `bonus` en `secondary` dans le schema, les actions
  et les interfaces.
- [ ] Faire consommer atomiquement les couts `main`, `secondary`, `reaction`
  et `movement`, avec verification avant execution.
- [ ] Faire consommer les utilisations et demarrer les cooldowns deja decrits
  dans les actions.
- [ ] Ajouter le rechargement au debut du tour : actions, reaction,
  deplacement et cooldowns en rounds/tours.
- [ ] Definir une representation explicite de l'Interaction Simple : compteur
  par tour ou categorie d'action gratuite limitee a une.
- [ ] Ajouter une concentration active unique par acteur, son arret volontaire
  et son remplacement lors du lancement d'un nouvel effet.
- [ ] Declencher le JdF lorsqu'un acteur concentre subit des degats.
- [ ] Rendre les ecritures de ressource robustes quand une action est lancee
  depuis hotbar, chat ou fiche.

Dependances : phases 1 a 3. Cette phase est le prerequis des actions
principales, secondaires et reactions.

## 5. Etats, KO et fatigue

But : terminer les effets deja modelises et les integrer au cycle de tour.

Taches :

- [ ] Adapter tous les etats aux nouvelles cles `Pui/Poly/Vig/Agi/Vol`.
- [ ] Corriger les DD de liberation `10` en `11` pour Effroi, Affolement et
  Provocation.
- [ ] Ajouter les etats `Menace` et `Cache` avec seulement les comportements
  qui ont ete definis par les regles.
- [ ] Ajouter la cible source aux effets Charme et Provocation afin de pouvoir
  interdire les cibles illegales.
- [ ] Executer les sauvegardes de debut de tour des etats qui le demandent.
- [ ] Implementer l'inconscience automatique a 0 PV, la perte de 10 % des PV
  max par tour/round et la mort sous `-PV max`.
- [ ] Ajouter un niveau de Fatigue lors du reveil au-dessus de 0 PV.
- [ ] Completer les comportements explicites : mise a terre (releve), gel,
  endormissement annule par degats, et desactivation de la concentration ou
  reaction lorsque l'etat le demande.
- [ ] Garder les comportements laisses au MJ sous forme de note : repoussement,
  humidite, encombrement, ivresse et controles sur grandes entites.

Dependances : phases 1 a 4.

## 6. Actions generiques de combat

But : fournir les actions dont les effets sont entierement definis par la
0.2.1, au-dessus du moteur de ressources de tour.

Taches :

- [ ] Implementer Courir : double le deplacement restant pour le tour.
- [ ] Implementer Charge : 4 m minimum, trajet majoritairement droit, attaque
  de melee a `+1 JdT`, `-1 Defense` jusqu'au prochain tour et aucun autre
  deplacement entre charge et attaque.
- [ ] Implementer Coup de bouclier : `Sauv DD 11 Vig`, Hebetement 1 ou recul
  de 2 m.
- [ ] Permettre le greffage declaratif d'un sort a une Charge.
- [ ] Implementer Desengagement et l'absence d'attaque d'opportunite jusqu'a
  la fin du tour.
- [ ] Implementer Se mettre en garde : `+2 Defense`, ou `+3` avec bouclier,
  jusqu'au prochain tour.
- [ ] Implementer Provoquer, Bousculer, Saisir, Se liberer et Se cacher.
- [ ] Ajouter les actions secondaires Consommable et Changement d'arme.
- [ ] Ajouter Preparer, Aider et l'Attaque d'opportunite comme reactions une
  fois Menace et le cycle de tour disponibles.

Dependances : phases 3 a 5. Les comportements de grille, de ligne droite et
de recul doivent s'appuyer sur les tokens Foundry sans reimplementer un moteur
de carte.

## 7. Repos, armes et regressions ciblees

But : finaliser les mecanismes deja proches des regles sans etendre le scope.

Taches :

- [ ] Remplacer l'arrondi au plus proche de recuperation du repos par un
  arrondi inferieur.
- [ ] Remplacer la saisie libre de qualite de repos par les facteurs Eau,
  Nourriture, Securite, Materiel, Climat et Blessures, puis calculer le score.
- [ ] Verifier que les plafonds de PV de fatigue s'appliquent apres tous les
  soins et repos.
- [ ] Remplacer dAp/dAs et les usages de main actuels par `dA`, avec une valeur
  a une main et une a deux mains seulement pour l'attribut Maniabilite.
- [ ] Remplacer les attributs actuels par Finesse, Brutalite, Deux mains,
  Legerete, Maniabilite, Allonge et Lancer.
- [ ] Faire des attributs Finesse et Brutalite des compatibilites de capacite,
  sans les lier aux anciennes statistiques ni modifier `Pui`.
- [ ] Appliquer `Allonge` au rayon de menace configure de l'arme.
- [ ] Implementer le lancer improvise : courte portee, de de degats reduit et
  desavantage de JdT uniquement lorsque la forme de l'arme le demande.
- [ ] Ne pas penaliser une arme possedant `Lancer`.
- [ ] Renommer les labels visibles `Soin` en `Soins` sans changer la cle
  technique `soin` ni casser les types de degats existants.
- [ ] Ecrire des tests ou scenarii de verification pour les jets, ressources,
  cycle de tour, fatigue, repos, charge et etats.

Dependances : phases 1 a 6 selon la tache.

## Hors perimetre 0.2.1

Ces sujets ne doivent pas declencher d'implementation avant une specification
jouable, car les regles les laissent vides, WIP ou au jugement du MJ :

- Sequences de round, surprise, distance de rencontre, fuite, moral et taille
  des monstres.
- Couverture, lignes de vue, attaques a distance en melee, portees moyennes et
  regles de menace supplementaires non precisees.
- Exploration automatisee : temps, faim/soif, torches, rencontres errantes et
  chutes. Un outil MJ pourra etre etudie separement.
- Invention/evolution de sorts et calculs de puissance theorique.
- Consequences contextuelles de repoussement, humidite, encombrement, ivresse
  et effets de controle sur de grandes entites.
