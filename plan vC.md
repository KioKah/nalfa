# Plan de dev (Nalfa) - vC

Objectif : ajouter l'automatisation utile et preparer le contenu.

Ce plan suppose `plan vA.md` et `plan vB.md` termines.
Il ne revient pas sur les chantiers de stabilisation ni sur les systemes de base deja poses.

## Point de depart

- Le socle est stable.
- Les classes, resistances, inventaire/equipement et etats manuels existent deja.
- L'architecture cible des bonus / effets d'items est choisie.

## Definition de "fini" pour vC

- Les automatisations prioritaires existent.
- Les premiers packs de contenu peuvent etre prepares sans refaire les schemas.
- Le systeme commence a ressembler a une vraie distribution utilisable.

Audit statique 2026-05-22 : aucune case vC n'a ete cochee. Le repo contient deja quelques
briques utiles, comme les jets de concentration manuels et l'application de degats, mais pas
les automatisations vC decrites ici.

---

## vC.1 - Automatisation de la concentration

- [ ] Definir la representation finale de la concentration active.
- [ ] Stocker les infos utiles au moment du cast / de l'activation.
- [ ] Proposer automatiquement ou semi-automatiquement le JdF apres prise de degats.
- [ ] Retirer / desactiver l'effet de concentration en cas d'echec.

QA manuel

- [ ] Degats recus -> prompt de concentration -> echec retire bien l'etat.

---

## vC.2 - Menace / opportunites

- [ ] Valider les hooks / evenements Foundry V13 utiles avant implementation.
- [ ] Definir la source de la portee de menace.
- [ ] Detecter la sortie de menace.
- [ ] Gerer la reaction et la limite d'une reaction par round.
- [ ] Gerer le cas du desengagement.

QA manuel

- [ ] Sortie sans desengagement -> opportunite.
- [ ] Sortie avec desengagement -> rien.

---

## vC.3 - Progression et automatisation de classe

- [ ] Definir un format de progression (`level -> grants`).
- [ ] Detecter proprement la montee de niveau.
- [ ] Ajouter l'UI de choix si plusieurs gains sont possibles.
- [ ] Eviter les doublons d'acquisition.

QA manuel

- [ ] Monter de niveau propose les bons gains.
- [ ] Aucune duplication n'apparait apres rerender / re-ouverture.

---

## vC.4 - Compendiums et contenu

- [ ] Definir le decoupage des packs :
  - [ ] classes,
  - [ ] races,
  - [ ] actions / sorts,
  - [ ] armes,
  - [ ] accessoires / equipements de base.
- [ ] Verifier que le contenu cree repose bien sur les schemas finaux.
- [ ] Ajouter le minimum de contenu pour tester les vrais workflows du systeme.

QA manuel

- [ ] Importer / ouvrir / utiliser le contenu des packs ne casse aucune sheet.

---

## vC.5 - Documentation utilisateur et packaging

- [ ] Rediger une doc utilisateur minimale.
- [ ] Rediger une doc d'installation.
- [ ] Definir un workflow de packaging / release (zip ou equivalent).
- [ ] Documenter clairement les prerequis et modules optionnels.

QA manuel

- [ ] Une installation a partir de l'artefact de release fonctionne.

---

## Post-vC - Backlog long terme

### Recette manuelle a long terme

- [ ] Maintenir un monde / jeu de donnees de reference pour la validation manuelle.
- [ ] Garder des cas de recette representatifs :
  - [ ] actor de base,
  - [ ] actor avec equipement complexe,
  - [ ] action avec JdT / JdD / JdS,
  - [ ] combat avec initiative et concentration.
- [ ] Ajouter si utile des macros ou outils de debug pour accelerer la recette.

### Automatisations avancees

- [ ] Application automatique des degats / resistances si cela devient souhaitable.
- [ ] Effets passifs / triggers plus riches.
- [ ] Workflows cibles / zones plus intelligents.

### Localisation si le perimetre s'elargit

- [ ] N'ouvrir ce chantier que si plusieurs langues deviennent vraiment utiles.
- [ ] Sortir progressivement les labels runtime encore hardcodes.
- [ ] Completer proprement `lang/fr.json` et `lang/en.json`.

### Migrations et compatibilite monde

- [ ] N'ajouter ce chantier que si le systeme sort du cadre "dev seulement".
- [ ] Definir une vraie politique de migrations de schema.
- [ ] Outiller les changements de data models qui touchent des mondes existants.

### Outils GM / contenu avance

- [ ] Import / generation de contenu si utile.
- [ ] Outils de debug / inspection systeme.
- [ ] Eventuels packs d'exemple ou monde de demonstration.
