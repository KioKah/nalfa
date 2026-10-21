import { getFatigueEffects } from "./fatigue.mjs";

const STATE_STATUS_PREFIX = "nalfa-state-";
export const KO_DEATH_STATUS_ID = "nalfa-dead";

const allSaveChanges = (value) =>
  Object.keys(CONFIG.nalfa.save_stats).map((stat) => ({
    key: `system.stats.${stat}.save.alt`,
    type: "add",
    value,
    phase: "initial",
    priority: 20,
  }));

const saveChanges = (stats, value) =>
  stats.map((stat) => ({
    key: `system.stats.${stat}.save.alt`,
    type: "add",
    value,
    phase: "initial",
    priority: 20,
  }));

const change = (key, value, type = "add") => ({
  key,
  type,
  value,
  phase: "initial",
  priority: type === "multiply" ? 10 : 20,
});

const state = (definition) =>
  Object.freeze({
    intensity: false,
    icon: "icons/svg/aura.svg",
    description: "",
    behavior: {},
    changes: () => [],
    ...definition,
  });

export const NALFA_STATE_DEFINITIONS = Object.freeze({
  hebetement: state({
    name: "Hébétement",
    category: "Conscience",
    icon: "icons/svg/daze.svg",
    description: "-2 Sauv, -2 JdT, ne peut réagir ni se concentrer.",
    behavior: { blocksReaction: true, blocksConcentration: true },
    changes: () => [...allSaveChanges(-2), change("system.stats.pui.alt", -2)],
  }),
  etourdissement: state({
    name: "Étourdissement",
    category: "Conscience",
    icon: "icons/svg/daze.svg",
    description:
      "-2 Défense, -4 JdT, -6 Sauv, ne peut réagir ni se concentrer.",
    behavior: { blocksReaction: true, blocksConcentration: true },
    changes: () => [
      ...allSaveChanges(-6),
      change("system.attributes.defense.alt", -2),
      change("system.stats.pui.alt", -4),
    ],
  }),
  endormissement: state({
    name: "Endormissement",
    category: "Conscience",
    icon: "icons/svg/sleep.svg",
    description:
      "-6 Défense, Rate Sauv, ne peut agir. Subir des dégâts annule l'effet.",
    behavior: {
      blocksAction: true,
      autoFailSaves: ["all"],
      wakesOnDamage: true,
    },
    changes: () => [change("system.attributes.defense.alt", -6)],
  }),
  inconscience: state({
    name: "Inconscience",
    category: "Conscience",
    icon: "icons/svg/unconscious.svg",
    description: "-6 Défense, Rate Sauv, ne peut agir.",
    behavior: { blocksAction: true, autoFailSaves: ["all"] },
    changes: () => [change("system.attributes.defense.alt", -6)],
  }),
  ralentissement: state({
    name: "Ralentissement",
    category: "Déplacement",
    icon: "icons/svg/net.svg",
    intensity: true,
    description: (intensity) => `-${intensity}m de déplacement.`,
    changes: (intensity) => [change("system.actions.movement.alt", -intensity)],
  }),
  immobilisation: state({
    name: "Immobilisation",
    category: "Déplacement",
    icon: "icons/svg/net.svg",
    description: "-6 Sauv (Agi), ne peut se déplacer.",
    behavior: { blocksMovement: true },
    changes: () => [...saveChanges(["agi"], -6)],
  }),
  paralysie: state({
    name: "Paralysie",
    category: "Déplacement",
    icon: "icons/svg/lightning.svg",
    description:
      "-6 Défense, Rate Sauv (Vig, Agi), ne peut agir mais peut se concentrer.",
    behavior: {
      blocksAction: true,
      blocksMovement: true,
      autoFailSaves: ["vig", "agi"],
    },
    changes: () => [change("system.attributes.defense.alt", -6)],
  }),
  mise_a_terre: state({
    name: "Mise à Terre",
    category: "Déplacement",
    icon: "icons/svg/falling.svg",
    description:
      "-2 Défense (Allonge), -6 Sauv (Vig, Agi), ne peut Attaquer et se déplacer. Doit utiliser la moitié du déplacement et une Action principale ou secondaire à son tour pour se relever.",
    behavior: {
      blocksAttack: true,
      blocksMovement: true,
      canStand: true,
      recoveryNote: "Utiliser la moitié du déplacement et une action pour se relever.",
    },
    changes: () => [
      change("system.attributes.defense.alt", -2),
      ...saveChanges(["vig", "agi"], -6),
    ],
  }),
  repoussement: state({
    name: "Repoussement",
    category: "Déplacement",
    icon: "icons/svg/falling.svg",
    description:
      "Repousse de quelques mètres. La distance varie en fonction du poids, de la taille et de la puissance de l'Attaque. Repousser contre un mur peut provoquer d'autres CdF. Cela est à déterminer au cas par cas.",
  }),
  effroi: state({
    name: "Effroi",
    category: "Contrôles",
    icon: "icons/svg/terror.svg",
    description:
      "-6 Sauv (Vol), -2 JdT. Doit réussir une Sauv 11 (Vol) au début de son tour afin de pouvoir agir.",
    behavior: { turnSave: { stat: "vol", dc: 11, blocksOnFailure: true } },
    changes: () => [
      ...saveChanges(["vol"], -6),
      change("system.stats.pui.alt", -2),
    ],
  }),
  charme: state({
    name: "Charme",
    category: "Contrôles",
    icon: "icons/svg/aura.svg",
    description: "-6 Sauv (Vol), ne peut attaquer son charmeur.",
    behavior: { targetsSource: "forbidden" },
    changes: () => [...saveChanges(["vol"], -6)],
  }),
  controle: state({
    name: "Contrôle",
    category: "Contrôles",
    icon: "icons/svg/aura.svg",
    description:
      "Ne peut rien faire car une autre entité a le Contrôle. A voir au cas par cas.",
    behavior: {
      blocksAction: true,
      targetingNote: "Contrôle à résoudre au cas par cas.",
    },
  }),
  affolement: state({
    name: "Affolement",
    category: "Contrôles",
    icon: "icons/svg/daze.svg",
    description:
      "Le personnage attaque la cible la plus proche si possible. Doit réussir une Sauv 11 (Vol) au début du tour afin de reprendre le contrôle et choisir son Action.",
    behavior: {
      targetingNote: "Attaque la cible la plus proche si possible.",
      turnSave: { stat: "vol", dc: 11, blocksOnFailure: true, removeOnSuccess: true },
    },
  }),
  provocation: state({
    name: "Provocation",
    category: "Contrôles",
    icon: "icons/svg/target.svg",
    description:
      "Ne peut effectuer d'Action d'Attaque sur une autre cible que le provocateur. Doit réussir une Sauv 11 (Vol) au début du tour afin de reprendre le contrôle et choisir son Action.",
    behavior: {
      targetsSource: "required",
      turnSave: { stat: "vol", dc: 11, blocksOnFailure: true, removeOnSuccess: true },
    },
  }),
  eblouissement: state({
    name: "Éblouissement",
    category: "Sens",
    icon: "icons/svg/sun.svg",
    description: "-2 Défense, -2 Sauv (Agi), -2 JdT, portée /2.",
    changes: () => [
      change("system.attributes.defense.alt", -2),
      ...saveChanges(["agi"], -2),
      change("system.stats.pui.alt", -2),
      change("system.attributes.range_coef.alt_mult", 0.5, "multiply"),
    ],
  }),
  aveuglement: state({
    name: "Aveuglement",
    category: "Sens",
    icon: "icons/svg/blind.svg",
    description:
      "-6 Défense, -6 Sauv (Agi), -4 JdT, portée /2, ne peut réagir (visuel).",
    behavior: { blocksReaction: true },
    changes: () => [
      change("system.attributes.defense.alt", -6),
      ...saveChanges(["agi"], -6),
      change("system.stats.pui.alt", -4),
      change("system.attributes.range_coef.alt_mult", 0.5, "multiply"),
    ],
  }),
  assourdissement: state({
    name: "Assourdissement",
    category: "Sens",
    icon: "icons/svg/deaf.svg",
    description: "Ne peut réagir (auditif).",
    behavior: {
      blocksReaction: true,
      reactionNote: "Réactions auditives impossibles.",
    },
  }),
  silence: state({
    name: "Réduction au Silence",
    category: "Sens",
    icon: "icons/svg/aura.svg",
    description: "Ne peut parler, ni réaliser d'Actions nécessitant la parole.",
    behavior: { blocksSpeech: true },
  }),
  gel: state({
    name: "Gel",
    category: "États",
    icon: "icons/svg/ice-shield.svg",
    description:
      "-2 Défense, -6 Sauv (Vig), Rate Sauv (Agi), ne peut se déplacer. Subir des dégâts de feu peut supprimer l'effet et vous devenez humide.",
    behavior: {
      blocksMovement: true,
      autoFailSaves: ["agi"],
      meltOnFire: true,
    },
    changes: () => [
      change("system.attributes.defense.alt", -2),
      ...saveChanges(["vig"], -6),
    ],
  }),
  humidite: state({
    name: "Humidité",
    category: "États",
    icon: "icons/svg/aura.svg",
    description:
      "Vulnérable aux dégâts de type foudre et givre, le montant est calculé cas par cas.",
    behavior: { mjNote: "Vulnérabilité foudre/givre à déterminer par le MJ." },
  }),
  encombrement: state({
    name: "Encombrement",
    category: "États",
    icon: "icons/svg/aura.svg",
    intensity: true,
    description:
      "Debuff attribués par le MJ en fonction du degré d’encombrement.",
    behavior: { mjNote: "Malus déterminés par le MJ selon l'encombrement." },
  }),
  ivresse: state({
    name: "Ivresse",
    category: "États",
    icon: "icons/svg/aura.svg",
    intensity: true,
    description:
      "Debuff attribués par le MJ en fonction du degré d’alcoolémie vision altérée. Les Malus diffèrent selon la quantité d'alcool dans le sang.",
    behavior: { mjNote: "Malus déterminés par le MJ selon l'alcoolémie." },
  }),
  menace: state({
    name: "Menace",
    category: "États",
    icon: "icons/svg/target.svg",
    description: "Dans le rayon de menace d'une entité.",
    behavior: { mjNote: "Les attaques d'opportunité sont traitées par les actions de combat." },
  }),
  cache: state({
    name: "Caché",
    category: "États",
    icon: "icons/svg/invisible.svg",
    description: "État caché. Son bonus n'est pas encore défini par les règles.",
    behavior: { mjNote: "Bonus de Caché à déterminer par le MJ." },
  }),
});

const getStateId = (effect) =>
  String(effect.flags?.nalfa?.state?.id ?? "").trim();

const isActiveNalfaState = (effect) =>
  effect?.active && getStateId(effect) in NALFA_STATE_DEFINITIONS;

export const getActorStateEffects = (actor) =>
  [...(actor?.effects ?? [])].filter(isActiveNalfaState);

export const getActorStateProfile = (actor) => {
  const profile = {
    blocksAction: false,
    blocksAttack: false,
    blocksMovement: false,
    blocksReaction: false,
    blocksConcentration: false,
    blocksSpeech: false,
    blocksTurn: false,
    autoFailSaves: new Set(),
    targetRestrictions: [],
    notes: [],
  };

  for (const effect of getActorStateEffects(actor)) {
    const state = effect.flags?.nalfa?.state ?? {};
    const behavior = effect.flags?.nalfa?.state?.behavior ?? {};
    for (const key of [
      "blocksAction",
      "blocksAttack",
      "blocksMovement",
      "blocksReaction",
      "blocksConcentration",
      "blocksSpeech",
    ]) {
      profile[key] ||= behavior[key] === true;
    }
    if (state.turnBlocked === true) profile.blocksTurn = true;
    if (behavior.targetsSource) {
      profile.targetRestrictions.push({
        mode: behavior.targetsSource,
        sourceUuid: String(state.sourceUuid ?? "").trim(),
        sourceName: String(state.sourceName ?? "").trim(),
      });
    }
    for (const stat of behavior.autoFailSaves ?? []) {
      profile.autoFailSaves.add(stat);
    }
    for (const key of ["targetingNote", "recoveryNote", "mjNote"]) {
      if (behavior[key]) profile.notes.push(behavior[key]);
    }
    if (behavior.turnSave) {
      const { stat, dc } = behavior.turnSave;
      profile.notes.push(`Sauv ${dc} (${String(stat ?? "").toUpperCase()}) au début du tour.`);
    }
  }

  if (getFatigueEffects(actor?.system?.attributes?.exhaustion).isUnconscious) {
    profile.blocksAction = true;
    profile.blocksAttack = true;
    profile.blocksMovement = true;
    profile.blocksReaction = true;
    profile.blocksConcentration = true;
    profile.autoFailSaves.add("all");
    profile.notes.push("Inconscient à cause de la fatigue.");
  }
  if (actor?.statuses?.has(KO_DEATH_STATUS_ID)) {
    profile.blocksAction = true;
    profile.blocksAttack = true;
    profile.blocksMovement = true;
    profile.blocksReaction = true;
    profile.blocksConcentration = true;
    profile.notes.push("Mort.");
  }

  return profile;
};

export const getStateTargetRestriction = (actor, targetActor) => {
  const targetUuid = String(targetActor?.uuid ?? "").trim();
  const restrictions = getActorStateProfile(actor).targetRestrictions;
  for (const restriction of restrictions) {
    if (!restriction.sourceUuid) continue;
    const sourceName = restriction.sourceName || "la source de l'état";
    if (restriction.mode === "forbidden" && targetUuid === restriction.sourceUuid) {
      return `Le Charme empêche d'attaquer ${sourceName}.`;
    }
    if (restriction.mode === "required" && targetUuid !== restriction.sourceUuid) {
      return `La Provocation impose d'attaquer ${sourceName}.`;
    }
  }
  return "";
};

export const doesStateAutoFailSave = (actor, statKey) => {
  const autoFailSaves = getActorStateProfile(actor).autoFailSaves;
  return autoFailSaves.has("all") || autoFailSaves.has(statKey);
};

const getStateStatusId = (id) => `${STATE_STATUS_PREFIX}${id}`;

const getStateDescription = (definition, intensity) => {
  const description =
    typeof definition.description === "function"
      ? definition.description(intensity)
      : definition.description;
  return String(description ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${foundry.utils.escapeHTML(line)}</p>`)
    .join("");
};

export const registerNalfaStateStatuses = () => {
  for (const [id, definition] of Object.entries(NALFA_STATE_DEFINITIONS)) {
    const statusId = getStateStatusId(id);
    CONFIG.statusEffects[statusId] = {
      id: statusId,
      name: definition.name,
      img: definition.icon,
      type: "base",
      disabled: false,
      transfer: false,
      origin: null,
      changes: definition.changes(1),
      description: getStateDescription(definition, 1),
      statuses: [statusId],
      showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
      flags: {
        nalfa: {
          state: {
            id,
            intensity: 1,
            note: "",
            behavior: definition.behavior,
          },
        },
      },
      hud: true,
    };
  }
  CONFIG.statusEffects[KO_DEATH_STATUS_ID] = {
    id: KO_DEATH_STATUS_ID,
    name: "Mort",
    img: "icons/svg/skull.svg",
    type: "base",
    disabled: false,
    transfer: false,
    origin: null,
    statuses: [KO_DEATH_STATUS_ID],
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    hud: false,
  };
};

export const buildNalfaStateEffect = ({
  stateId,
  intensity = 1,
  duration = null,
  units = "rounds",
  note = "",
  sourceUuid = "",
  sourceName = "",
} = {}) => {
  const definition = NALFA_STATE_DEFINITIONS[stateId];
  if (!definition) return null;
  const normalizedIntensity = definition.intensity
    ? Math.max(1, Math.trunc(Number(intensity) || 1))
    : 1;
  const numericDuration = Number(duration);
  const hasDuration = Number.isInteger(numericDuration) && numericDuration >= 0;
  const behavior = definition.behavior;
  return {
    name: definition.intensity
      ? `${definition.name} ${normalizedIntensity}`
      : definition.name,
    img: definition.icon,
    type: "base",
    disabled: false,
    transfer: false,
    statuses: [getStateStatusId(stateId)],
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    description: getStateDescription(definition, normalizedIntensity),
    duration: {
      value: hasDuration ? numericDuration : null,
      units: hasDuration ? units : "seconds",
      expiry: hasDuration ? "turnStart" : null,
    },
    system: { changes: definition.changes(normalizedIntensity) },
    flags: {
      nalfa: {
        state: {
          id: stateId,
          intensity: normalizedIntensity,
            note: String(note ?? "").trim(),
            sourceUuid: String(sourceUuid ?? "").trim(),
            sourceName: sourceUuid ? String(sourceName ?? "").trim() : "",
            turnBlocked: false,
          behavior,
        },
      },
    },
  };
};

export const buildActorStateRows = (actor) =>
  getActorStateEffects(actor).map((effect) => {
    const state = effect.flags?.nalfa?.state ?? {};
    const behavior = state.behavior ?? {};
    const restrictions = [
      ["blocksAction", "Actions indisponibles"],
      ["blocksAttack", "Attaques indisponibles"],
      ["blocksReaction", "Réactions indisponibles"],
      ["blocksConcentration", "Concentration indisponible"],
      ["blocksMovement", "Déplacement indisponible"],
      ["blocksSpeech", "Parole indisponible"],
    ]
      .filter(([key]) => behavior[key])
      .map(([, label]) => label);
		if (state.turnBlocked) restrictions.push("Actions indisponibles ce tour");
    return {
      id: effect.id,
      name: effect.name,
      img: effect.img,
      intensity: state.intensity ?? 1,
      note: state.note ?? "",
      duration: effect.duration?.remaining ?? effect.duration?.value ?? null,
      units: effect.duration?.units ?? "",
      sourceName: state.sourceName ?? "",
      canStand: behavior.canStand === true,
      behaviorNotes: [
        ...restrictions,
        ...Object.values(behavior).filter((value) => typeof value === "string"),
        behavior.turnSave
          ? `Sauv ${behavior.turnSave.dc} (${String(behavior.turnSave.stat).toUpperCase()}) au début du tour.`
          : "",
      ].filter(Boolean),
    };
  });

export const getNalfaStateOptions = () =>
  Object.entries(NALFA_STATE_DEFINITIONS).map(([id, definition]) => ({
    id,
    name: definition.name,
    category: definition.category,
    intensity: definition.intensity,
  }));

export const standUpFromState = async (actor, effectId) => {
  if (!(actor instanceof Actor)) return false;
  const effect = actor.effects?.get(effectId);
  if (getStateId(effect) !== "mise_a_terre") return false;
  const movement = actor.system?.actions?.movement ?? {};
  const movementCost = Math.max(0, Number(movement.max ?? 0) / 2);
  const movementValue = Math.max(0, Number(movement.value ?? 0));
  const actions = actor.system?.actions ?? {};
  const actionKey = Number(actions.secondary?.value ?? 0) > 0 ? "secondary" : "main";
  if (movementValue < movementCost || Number(actions[actionKey]?.value ?? 0) < 1) {
    ui.notifications.warn("Il faut la moitié du déplacement et une action pour se relever.");
    return false;
  }
  await actor.update({
    "system.actions.movement.value": movementValue - movementCost,
    [`system.actions.${actionKey}.value`]: Number(actions[actionKey].value) - 1,
  });
  await effect.delete();
  return true;
};

export const removeStatesAfterDamage = async (
  actor,
  damageTypes = [],
  { sufferedDamage = false } = {},
) => {
	if (!actor?.deleteEmbeddedDocuments) return;
	const types = new Set(damageTypes);
	const effects = getActorStateEffects(actor);
	const meltedGel = effects.some(
		(effect) => effect.flags?.nalfa?.state?.behavior?.meltOnFire && types.has("feu"),
	);
	const ids = effects
    .filter((effect) => {
      const behavior = effect.flags?.nalfa?.state?.behavior ?? {};
      return (
        (behavior.wakesOnDamage && sufferedDamage) || (behavior.meltOnFire && types.has("feu"))
      );
    })
    .map((effect) => effect.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
	if (meltedGel) {
    const hasHumidity = getActorStateEffects(actor).some(
      (effect) => getStateId(effect) === "humidite",
    );
    if (!hasHumidity) {
      await actor.createEmbeddedDocuments("ActiveEffect", [
        buildNalfaStateEffect({ stateId: "humidite" }),
      ]);
    }
  }
};
