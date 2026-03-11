# Plan de dev (Nalfa) - vB

Objectif : construire les systemes de jeu qui manquent encore autour du socle stabilise.

Ce plan suppose `plan vA.md` termine.
Il ne repete pas les taches de stabilisation du socle ; il se concentre sur les chantiers
metier encore absents ou seulement amorces.

## Point de depart

- `plan vA.md` est considere termine.
- Le socle actor/item/rolls/chat est stable.
- Les metadonnees, la doc minimale et les integrations optionnelles sont clarifiees.

## Definition de "fini" pour vB

- Les acteurs disposent des systemes de jeu manquants les plus importants.
- Les items influencent les personnages selon une architecture decidee et documentee.
- Les classes, resistances et etats ne sont plus de simples structures dormantes.
- La sheet actor devient un vrai point d'entree de jeu pour l'inventaire / l'equipement.

---

## vB.1 - Classes sur acteur

- [ ] Choisir la representation canonique du lien acteur -> classe :
  - [ ] `system.classId` / `system.className`,
  - [ ] ou autre forme si plus adaptee.
- [ ] Clarifier la relation entre ce lien canonique et le champ texte actuel `system.class`.
- [ ] Ajouter une selection depuis un compendium ou une source equivalente.
- [ ] Verrouiller le changement de classe une fois choisie.
- [ ] Ajouter un override GM explicite pour reinitialiser / corriger.

QA manuel

- [ ] Choix de classe initial OK.
- [ ] Re-ouverture actor : impossible de re-choisir sans override.

---

## vB.2 - Resistances vraiment jouables

- [ ] Exposer `system.attributes.resistances.*` dans l'UI actor.
- [ ] Permettre l'edition de `value` et `immune`.
- [ ] Garder les valeurs negatives si c'est bien la regle retenue.
- [ ] Dans les chat cards de degats, afficher au minimum `brut -> apres resistance`
      sans imposer tout de suite une auto-application aux PV.
- [ ] Verrouiller la convention de calcul avant toute automatisation plus loin.

QA manuel

- [ ] Resistance positive, negative et immune : affichage coherent.
- [ ] Les cartes de degats restent lisibles.

---

## vB.3 - Inventaire et equipement cote actor

- [ ] Definir le niveau d'UX attendu sur la sheet actor pour les items possedes.
- [ ] Ajouter une vue inventaire / equipement si la surface actuelle est insuffisante.
- [ ] Rendre visibles depuis l'acteur :
  - [ ] les items equipes,
  - [ ] les warnings d'equipement invalide,
  - [ ] les actions utiles sur l'equipement principal.
- [ ] Clarifier comment les items `Action` et les embedded actions doivent apparaitre
      cote actor.

QA manuel

- [ ] Un joueur peut retrouver, equiper et utiliser ses objets sans sortir du workflow actor.

---

## vB.4 - Formaliser l'architecture des bonus d'items

Etat de depart : le repo applique deja certains bonus d'items en derivees actor,
notamment pour `Class` et `Trinket`.

- [ ] Choisir l'architecture cible :
  - [ ] garder le systeme actuel de derivees / overlays,
  - [ ] migrer vers des `ActiveEffect`,
  - [ ] ou adopter un hybride clairement borne.
- [ ] Documenter les regles de cumul / priorite.
- [ ] Documenter les chemins supportes pour les modificateurs.
- [ ] Etendre les sources de bonus si les regles le demandent vraiment.
- [ ] Si l'architecture change, definir explicitement la migration des donnees existantes.

QA manuel

- [ ] Deux sources compatibles se cumulent comme prevu.
- [ ] Desactivation / retrait d'une source retire bien uniquement son effet.

---

## vB.5 - Etats / CdF (manuel mais reel)

- [ ] Definir le referentiel des etats / CdF a partir des regles.
- [ ] Choisir leur representation runtime :
  - [ ] config / data,
  - [ ] `ActiveEffect`,
  - [ ] flags,
  - [ ] ou combinaison.
- [ ] Definir le modele minimal :
  - [ ] id,
  - [ ] label,
  - [ ] icone,
  - [ ] modifs,
  - [ ] restrictions.
- [ ] Ajouter une UI actor pour appliquer / retirer manuellement.
- [ ] Stocker l'information de facon assez propre pour supporter l'automatisation plus tard.

QA manuel

- [ ] Ajouter un etat change bien le personnage.
- [ ] Retirer l'etat revient a l'etat normal.

---

## vB.6 - Audit final des types d'items runtime

Etat de depart : le repo a deja des types runtime nombreux, mais pas forcement alignes
avec le vocabulaire final des regles.

- [ ] Auditer l'ecart entre les types existants et les entites de regles souhaites.
- [ ] Decider si `Action` reste le vehicule principal des sorts / techniques, ou si un vrai
      type `Spell` devient utile.
- [ ] Decider si `CombatStyle` et `Status` doivent devenir de vrais types runtime.
- [ ] Ne creer de nouveaux types que s'ils apportent une vraie valeur de jeu / UX.
- [ ] Verifier que chaque type runtime conserve une sheet et un schema justifies.

QA manuel

- [ ] La liste des types runtime est stable, assumee et documentee.
