# Inventaire de la fiche de personnage

Cet inventaire provient des schemas d'acteur et d'objet, ainsi que des workflows
de jets et d'actions. L'implementation actuelle de la fiche de personnage n'a pas
ete consultee.

## Personnage

- Identite : nom, image, race, classe, niveau, profil et description.
- Caracteristiques : FOR, DEX, CON, INT, SAG et CHA, avec leur valeur et jet de
  sauvegarde.
- Statistiques de jet : physique et incantation, avec leur caracteristique associee.
- PV : actuels, maximum et absorption/temporaire.
- Defense, evasion, initiative, perception passive, allonge, coefficient de portee
  et capacite de charge.
- Epuisement et jets de mort : DD, reussites et echecs.
- Reserve de Nalfa : actuel / maximum.
- Ressources de tour : action principale, bonus, reaction, concentration et
  mouvement.
- Competences, caracteristique associee et modificateur final.
- Resistances, avec multiplicateur et ajustement plat effectifs.
- Etat d'arme : de de degats, type de degats, arme principale et avertissements de
  configuration.

## Jets et actions

- Jets de competence, sauvegarde, initiative, attaque, degats et concentration.
- Execution des actions : ciblage, choix attaque/sauvegarde/degats, cout en Nalfa
  et surcharge.

## Objets attaches

- **Arme** : equipement, poids/quantite, rarete, niveau recommande, type de
  degats, mains utilisees, attributs d'arme et actions integrees.
- **Bijou** : equipement, type, modificateurs et actions integrees. Les
  modificateurs ne s'appliquent que s'il est equipe.
- **Outil** : equipement, rarete/niveau et actions integrees.
- **Sac a dos** : equipement, rarete/niveau et capacite.
- **Consommable** : equipement, type, destruction automatique et actions
  integrees.
- **Butin** : equipement, rarete/niveau.
- **Livre** : equipement et rarete.
- **Monnaie** : denominations, quantite, valeur totale, poids total, validite et
  bourse.
- **Action** : details complets et controles d'execution.
- **Race** : mensurations, taille, esperance de vie, classes jouables, traits
  raciaux et avantages de point-buy.
- **Classe** : modificateurs, choix de points de competence, ressources accordees
  et score d'armure.
- **Metier** et **Attribut d'arme** : description.

## Informations communes aux objets physiques

- Nom, image, description/lore, quantite, poids unitaire et total.
- Emplacements : main principale, main secondaire, deux mains, corps et bourse.
- Etat maudit et identification.
- Actions integrees, disponibles uniquement si l'objet source est effectivement
  equipe lorsque necessaire.
