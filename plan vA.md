# Plan de dev (Nalfa) - vA

Objectif : repartir de l'etat reel du repo apres la completion de l'ancien `plan A.md`.

Ce nouveau cycle remplace les anciens plans et devient la reference de suivi courant.

Ce plan ne reliste pas ce qui est deja acquis. Il couvre uniquement :

- la stabilisation du socle actuel,
- la fermeture des points partiellement termines,
- l'alignement de la doc et du workflow avec l'etat reel du repo,
- les refactors necessaires avant d'ouvrir de nouveaux gros systemes.

## Point de depart

- Ancien `plan A.md` considere termine.
- Etat courant de reference : `REPORT.md`.
- Sources de verite :
  - `AGENTS.md`
  - `Nalfa Regles 1.1.0.docx`
  - `system.json`
  - `nalfa.mjs`
  - `module/**/*.mjs`
  - `templates/**`
- Deja presents au debut de ce plan :
  - systeme Foundry V13 chargeable,
  - actor sheet V2 a onglets,
  - item sheet V2 typee,
  - couche de rolls + chat cards,
  - macros / hotbar,
  - embedded actions,
  - data models riches pour actors et items.

## Definition de "fini" pour vA

- Le socle actuel est valide manuellement sur les workflows principaux.
- Les fonctions "presque faites" sont fermees proprement.
- La doc minimale et les infos de projet utiles sont coherentes avec l'etat du projet.
- Les integrations optionnelles ne cassent pas le chargement.
- Les fichiers les plus charges ont au moins commence a etre decomposes.

---

## vA.1 - Re-aligner la doc et les infos de projet

- [ ] Remplacer la description placeholder de `system.json`.
- [ ] Ajouter un `README` minimal :
  - scope actuel du systeme,
  - version Foundry ciblee,
  - workflow LESS,
  - dependances optionnelles / attendues,
  - setup de dev local.
- [ ] Documenter clairement le role des nouveaux `plan v*.md`.
- [ ] Documenter l'etat reel des modules optionnels (notamment Dice So Nice).

QA manuel

- [ ] Un nouveau dev peut comprendre comment lancer / modifier le systeme sans lire tout le repo.
- [ ] Les infos de base du projet sont suffisantes pour eviter les ambiguities de setup.

---

## vA.2 - Valider le socle deja construit

- [ ] Faire une passe manuelle actor sheet :
  - [ ] changement d'onglet,
  - [ ] changement de `valueMode`,
  - [ ] edition stats / saves / ressources,
  - [ ] boutons de rolls.
- [ ] Faire une passe manuelle item sheet sur des types representatifs :
  - [ ] `Weapon`,
  - [ ] `Trinket`,
  - [ ] `Action`,
  - [ ] `Currency`,
  - [ ] `Class`.
- [ ] Valider les embedded actions :
  - [ ] ajout manuel,
  - [ ] edition,
  - [ ] suppression,
  - [ ] drag & drop depuis un item `Action`,
  - [ ] synchronisation depuis la source,
  - [ ] execution depuis item et hotbar.
- [ ] Valider l'equipement / desequipement et les warnings de configuration d'arme.
- [ ] Valider l'initiative custom via `NalfaCombat`.

QA manuel

- [ ] Aucun workflow principal ne produit d'erreur console bloquante.
- [ ] Aucun rerender ne casse les listeners ou l'etat d'onglet.

---

## vA.3 - Fermer les points partiellement termines

### vA.3.1 - Critiques et degats

- [ ] Completer la regle de critique sur JdT : doubler uniquement les des de degats,
      pas les bonus de stat.
- [ ] Verifier l'affichage chat en cas de critique pour que le comportement soit lisible.

QA manuel

- [ ] Cas normal vs crit : seule la partie des change.

### vA.3.2 - Sauvegardes standardisees

- [ ] Garder le workflow actuel base sur les actions, mais ajouter un mode standard
      quand il n'y a pas de source d'action complete.
- [ ] Ajouter la saisie de `X` et de `StatSauv` quand la sauvegarde est lancee hors item /
      hors action structuree.
- [ ] Afficher dans la chat card la decomposition utile :
  - [ ] X,
  - [ ] stat de l'attaquant si pertinente,
  - [ ] DD finale,
  - [ ] stat de sauvegarde cible.
- [ ] Ajouter un emplacement clair pour le texte "effet en cas de reussite" si cette info
      doit rester manuelle.

QA manuel

- [ ] Une sauvegarde depuis une action et une sauvegarde "manuelle" donnent des cartes lisibles.

### vA.3.3 - Integrations optionnelles robustes

- [ ] Rendre l'integration Dice So Nice fail-soft si le module / chemin n'est pas present.
- [ ] Decider si cette integration est une option documentee ou une dependance obligatoire.

QA manuel

- [ ] Le systeme charge sans crash avec et sans Dice So Nice.

### vA.3.4 - Clarifier l'UI existante

- [ ] Clarifier dans l'UI ce que signifient `Lecture`, `Modification`, `Alteration`.
- [ ] Revoir les labels / aides rapides autour de `valueMode`.
- [ ] S'assurer que les ecrans deja riches restent lisibles sur desktop et mobile.

QA manuel

- [ ] Un utilisateur comprend ce qui est editable dans chaque mode sans lire le code.

---

## vA.4 - Routine de recette manuelle et hygiene repo

- [ ] Ecrire une checklist manuelle officielle pour les verifications Foundry principales.
- [ ] Definir un petit jeu de donnees de reference pour la recette manuelle :
      actors, items, actions, equipements, combat.
- [ ] Reprendre cette checklist avant les gros refactors et les ajouts de regles.
- [ ] Decider explicitement du sort de `node_modules/` versionne dans git.
- [ ] Clarifier la politique de fichiers generes / de reference (`nalfa.css`, `* copy.hbs`,
      `_old/`).

QA manuel

- [ ] La recette manuelle est rapide a relancer et couvre les workflows les plus sensibles.

---

## vA.5 - Refactors cibles avant nouveaux gros ajouts

### vA.5.1 - Bootstrap

- [ ] Sortir de `nalfa.mjs` ce qui n'a pas besoin de vivre dans l'entrypoint :
  - [ ] preload templates,
  - [ ] registration des helpers,
  - [ ] hooks chat,
  - [ ] integration Dice So Nice.

### vA.5.2 - Rolls

- [ ] Decouper `module/rolls/rolls.mjs` en sous-domaines :
  - [ ] utilitaires communs,
  - [ ] attaques / degats,
  - [ ] saves / concentration,
  - [ ] initiative.

### vA.5.3 - Item sheet

- [ ] Continuer l'extraction de `module/sheets/nalfaItemSheet.mjs`.
- [ ] Sortir de `module/sheets/item/context.mjs` les helpers purement presentation / formatage.
- [ ] Isoler la logique embedded actions dans un bloc plus autonome.

### vA.5.4 - Data models

- [ ] Commencer a decomposer `module/data/models.mjs` sans changer le schema public.
- [ ] Separer au minimum :
  - [ ] schemas actor,
  - [ ] schemas item,
  - [ ] derivees actor,
  - [ ] helpers equipement / modificateurs / currency.

QA manuel

- [ ] Les refactors n'introduisent pas de regression visible sur les workflows valides en vA.2.
