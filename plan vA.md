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

## vA.1 - Valider le socle deja construit

- [x] Faire une passe manuelle actor sheet :
  - [x] changement d'onglet,
  - [x] changement de `valueMode`,
  - [x] edition stats / saves / ressources,
  - [x] boutons de rolls.
- [x] Faire une passe manuelle item sheet sur des types representatifs :
  - [x] `Weapon`,
  - [x] `Trinket`,
  - [x] `Action`,
  - [x] `Currency`,
  - [x] `Class`.
- [x] Valider les embedded actions :
  - [x] ajout manuel,
  - [x] edition,
  - [x] suppression,
  - [x] drag & drop depuis un item `Action`,
  - [x] synchronisation depuis la source,
  - [x] execution depuis item et hotbar.
- [x] Valider l'equipement / desequipement et les warnings de configuration d'arme.
- [x] Valider l'initiative custom via `NalfaCombat`.

QA manuel

- [x] Aucun workflow principal ne produit d'erreur console bloquante.
- [x] Aucun rerender ne casse les listeners ou l'etat d'onglet.

---

## vA.2 - Fermer les points partiellement termines

### vA.2.1 - Critiques et degats

- [ ] Completer la regle de critique sur JdT : doubler uniquement les des de degats, pas les bonus de stat.
- [ ] Verifier l'affichage chat en cas de critique pour que le comportement soit lisible.

QA manuel

- [ ] Cas normal vs crit : seule la partie des change.

### vA.2.2 - Sauvegardes standardisees

- [ ] Garder le workflow actuel base sur les actions, mais ajouter un mode standard quand il n'y a pas de source d'action complete.
- [ ] Ajouter la saisie de `X` et de `StatSauv` quand la sauvegarde est lancee hors item / hors action structuree.
- [ ] Afficher dans la chat card la decomposition utile :
  - [ ] X,
  - [ ] stat de l'attaquant si pertinente,
  - [ ] DD finale,
  - [ ] stat de sauvegarde cible.
- [ ] Ajouter un emplacement clair pour le texte "effet en cas de reussite" si cette info doit rester manuelle.

QA manuel

- [ ] Une sauvegarde depuis une action et une sauvegarde "manuelle" donnent des cartes lisibles.

### vA.2.3 - Integrations optionnelles robustes

- [x] Rendre l'integration Dice So Nice fail-soft si le module / chemin n'est pas present.
- [x] Decider si cette integration est une option documentee ou une dependance obligatoire.

QA manuel

- [ ] Le systeme charge sans crash avec et sans Dice So Nice.

### vA.2.4 - Clarifier l'UI existante

- [x] Clarifier dans l'UI ce que signifient `Lecture`, `Modification`, `Alteration`.
- [x] Revoir les labels / aides rapides autour de `valueMode`.

QA manuel

- [x] Un utilisateur comprend ce qui est editable dans chaque mode sans lire le code.

---

## vA.3 - Routine de recette manuelle et hygiene repo

- [.] Ecrire une checklist manuelle officielle pour les verifications Foundry principales.
- [.] Definir un petit jeu de donnees de reference pour la recette manuelle : actors, items, actions, equipements, combat.
- [x] Reprendre cette checklist avant les gros refactors et les ajouts de regles.
- [x] Decider explicitement du sort de `node_modules/` versionne dans git.
- [x] Clarifier la politique de fichiers generes / de reference (`nalfa.css`, `* copy.hbs`,
      `_old/`).

QA manuel

- [.] La recette manuelle est rapide a relancer et couvre les workflows les plus sensibles.

---

## vA.4 - Refactors cibles avant nouveaux gros ajouts

### vA.4.1 - Bootstrap

- [x] Sortir de `nalfa.mjs` ce qui n'a pas besoin de vivre dans l'entrypoint :
  - [x] preload templates,
  - [x] registration des helpers,
  - [x] hooks chat,
  - [x] integration Dice So Nice.

### vA.4.2 - Rolls

- [x] Decouper `module/rolls/rolls.mjs` en sous-domaines :
  - [x] utilitaires communs,
  - [x] attaques / degats,
  - [x] saves / concentration,
  - [x] initiative.

### vA.4.3 - Item sheet

- [x] Continuer l'extraction de `module/sheets/nalfaItemSheet.mjs`.
- [x] Sortir de `module/sheets/item/context.mjs` les helpers purement presentation / formatage.
- [x] Isoler la logique embedded actions dans un bloc plus autonome.

### vA.4.4 - Data models

- [x] Commencer a decomposer `module/data/models.mjs` sans changer le schema public.
- [x] Separer au minimum :
  - [x] schemas actor,
  - [x] schemas item,
  - [x] derivees actor,
  - [x] helpers equipement / modificateurs / currency.

QA manuel

- [x] Les refactors n'introduisent pas de regression visible sur les workflows valides en vA.1.
