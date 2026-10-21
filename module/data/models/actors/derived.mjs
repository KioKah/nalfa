import { roundNumber, toFiniteNumber } from "../base.mjs";
import { getFatigueEffects, getFatigueHealthMax } from "../../../rules/fatigue.mjs";

const ITEM_TYPES_WITH_MODIFIERS = new Set(["Class", "Trinket"]);

const MODIFIER_MODES_BY_NUMBER = {
	1: "multiply",
	2: "add",
	3: "downgrade",
	4: "upgrade",
	5: "override",
};

const HAND_SLOT_LABELS = Object.freeze({
	main_hand: "main principale",
	off_hand: "main secondaire",
	two_handed: "deux mains",
});

const normalizeModifierMode = (mode) => {
	if (typeof mode === "number") {
		return MODIFIER_MODES_BY_NUMBER[mode] ?? null;
	}

	const modeString = String(mode ?? "")
		.trim()
		.toLowerCase();
	if (!modeString) return null;
	if (Object.hasOwn(MODIFIER_MODES_BY_NUMBER, modeString)) {
		return MODIFIER_MODES_BY_NUMBER[modeString] ?? null;
	}
	if (["add", "multiply", "override", "upgrade", "downgrade"].includes(modeString)) {
		return modeString;
	}
	return null;
};

const isTrinketEquipped = (item) =>
	Object.values(item.system?.equipped ?? {}).some((equipped) => equipped === true);

const isModifierSourceItemActive = (item) => {
	if (!ITEM_TYPES_WITH_MODIFIERS.has(item.type)) return false;
	if (item.type === "Trinket") return isTrinketEquipped(item);
	return true;
};

const applyModifierToNumber = (mode, current, delta) => {
	switch (mode) {
		case "add":
			return current + delta;
		case "multiply":
			return current * delta;
		case "override":
			return delta;
		case "upgrade":
			return Math.max(current, delta);
		case "downgrade":
			return Math.min(current, delta);
		default:
			return null;
	}
};

const collectActorItemModifiers = (actor, systemData) => {
	const valueMap = new Map();
	if (!actor?.items) return valueMap;

	for (const item of actor.items) {
		if (!isModifierSourceItemActive(item)) continue;

		for (const modifier of item.system?.modifiers ?? []) {
			const path = String(modifier?.path ?? "").trim();
			if (!path || !path.endsWith(".base")) continue;

			const mode = normalizeModifierMode(modifier?.mode);
			if (!mode) continue;

			const delta = toFiniteNumber(modifier?.value);
			if (delta === null) continue;

			const baseValue =
				valueMap.get(path) ??
				toFiniteNumber(foundry.utils.getProperty(systemData, path));
			if (baseValue === null) continue;

			const nextValue = applyModifierToNumber(mode, baseValue, delta);
			if (nextValue === null || !Number.isFinite(nextValue)) continue;

			valueMap.set(path, nextValue);
		}
	}

	return valueMap;
};

const getWeaponAttackByUsage = (weaponSystem = {}, usage = "") => {
	const attack = weaponSystem.attack ?? {};
	if (usage === "main_hand") return String(attack.main_hand ?? "").trim();
	if (usage === "secondary_hand") return String(attack.secondary_hand ?? "").trim();
	if (usage === "two_hands") return String(attack.two_hands ?? "").trim();
	return "";
};

const analyzeActorEquippedWeapons = (actor) => {
	const result = {
		mainWeapon: null,
		mainWeaponSlot: "",
		canUseDex: false,
		attributes: [],
		daValue: "",
		daPrimary: "",
		daSecondary: "",
		damageType: "none",
		invalidConfiguration: false,
		warning: "",
	};
	if (!actor?.items) return result;

	const equippedWeapons = [];
	const warnings = [];

	for (const item of actor.items) {
		if (item.type !== "Weapon") continue;

		const system = item.system ?? {};
		const equippable = system.equippable ?? {};
		const equipped = system.equipped ?? {};
		const isMainHand = equipped.main_hand === true;
		const isOffHand = equipped.off_hand === true;
		const isTwoHanded = equipped.two_handed === true;

		if (!isMainHand && !isOffHand && !isTwoHanded) continue;

		const activeSlots = [];
		if (isMainHand) activeSlots.push("main_hand");
		if (isOffHand) activeSlots.push("off_hand");
		if (isTwoHanded) activeSlots.push("two_handed");

		if (activeSlots.length > 1) {
			warnings.push(`L'arme "${item.name}" est equipee sur plusieurs emplacements.`);
		}

		for (const slot of activeSlots) {
			if (equippable[slot] === true) continue;
			const slotLabel = HAND_SLOT_LABELS[slot] ?? slot;
			warnings.push(
				`L'arme "${item.name}" est equipee en ${slotLabel} sans y etre equipable.`,
			);
		}

		const attributeList = system.weapon_attributes?.list ?? [];
		if (attributeList.includes("Lourde") && attributeList.includes("Légère")) {
			warnings.push(`L'arme "${item.name}" a les attributs Lourde et Légère.`);
		}
		if (attributeList.includes("Lourde") && attributeList.includes("Finesse")) {
			warnings.push(`L'arme "${item.name}" a les attributs Lourde et Finesse.`);
		}
		if (attributeList.includes("Lancer") && !attributeList.includes("Légère")) {
			warnings.push(`L'arme "${item.name}" a Lancer sans Légère.`);
		}

		equippedWeapons.push({
			item,
			system,
			isMainHand,
			isOffHand,
			isTwoHanded,
		});
	}

	const mainOccupants = equippedWeapons.filter(
		(entry) => entry.isMainHand || entry.isTwoHanded,
	);
	const offOccupants = equippedWeapons.filter(
		(entry) => entry.isOffHand || entry.isTwoHanded,
	);
	const twoHandedOccupants = equippedWeapons.filter((entry) => entry.isTwoHanded);

	if (mainOccupants.length > 1) {
		warnings.push(
			"Configuration d'armes invalide : plusieurs armes occupent la main principale.",
		);
	}
	if (offOccupants.length > 1) {
		warnings.push(
			"Configuration d'armes invalide : plusieurs armes occupent la main secondaire.",
		);
	}
	if (twoHandedOccupants.length > 1) {
		warnings.push(
			"Configuration d'armes invalide : plusieurs armes sont equipees en deux mains.",
		);
	}
	if (
		twoHandedOccupants.length > 0 &&
		equippedWeapons.some(
			(entry) => !entry.isTwoHanded && (entry.isMainHand || entry.isOffHand),
		)
	) {
		warnings.push(
			"Configuration d'armes invalide : une arme a deux mains occupe deja les deux mains.",
		);
	}

	let mainWeaponEntry = null;
	if (mainOccupants.length > 0) {
		mainWeaponEntry = mainOccupants.find(
			(entry) => entry.isMainHand && !entry.isTwoHanded,
		);
		mainWeaponEntry ??= mainOccupants[0];
	} else if (offOccupants.length > 0) {
		mainWeaponEntry = offOccupants[0];
	}

	const mainWeaponSlot = mainWeaponEntry
		? mainWeaponEntry.isTwoHanded
			? "two_hands"
			: mainWeaponEntry.isMainHand
				? "main_hand"
				: "secondary_hand"
		: "";
	const mainWeapon = mainWeaponEntry?.item ?? null;
	const mainWeaponSystem = mainWeaponEntry?.system ?? {};
	const weaponAttributes = mainWeaponSystem.weapon_attributes ?? {};
	const attributes = Array.isArray(weaponAttributes.list) ? weaponAttributes.list : [];
	const canUseDex = attributes.includes("Finesse");
	const mainHandEntry = equippedWeapons.find(
		(entry) => entry.isMainHand && !entry.isTwoHanded,
	);
	const secondaryHandEntry = equippedWeapons.find(
		(entry) => entry.isOffHand && !entry.isTwoHanded,
	);
	const twoHandsEntry = equippedWeapons.find((entry) => entry.isTwoHanded);
	const daPrimary = twoHandsEntry
		? getWeaponAttackByUsage(twoHandsEntry.system, "two_hands")
		: mainHandEntry
			? getWeaponAttackByUsage(mainHandEntry.system, "main_hand")
			: "";
	const daSecondary = twoHandsEntry
		? ""
		: secondaryHandEntry
			? getWeaponAttackByUsage(secondaryHandEntry.system, "secondary_hand")
			: "";
	const daValue = twoHandsEntry
		? daPrimary
		: [daPrimary, daSecondary].filter(Boolean).join("+");
	const damageType = String(mainWeaponSystem.damage_type ?? "none").trim() || "none";

	const uniqueWarnings = [...new Set(warnings)];
	result.mainWeapon = mainWeapon;
	result.mainWeaponSlot = mainWeaponSlot;
	result.canUseDex = canUseDex;
	result.attributes = attributes;
	result.daValue = daValue;
	result.daPrimary = daPrimary;
	result.daSecondary = daSecondary;
	result.damageType = damageType;
	result.invalidConfiguration = uniqueWarnings.length > 0;
	result.warning = uniqueWarnings.join(" ");

	return result;
};

export const prepareActorDerivedData = (model) => {
	const sys = model;
	const fatigue = getFatigueEffects(
		model.parent?.type === "Character" ? sys.attributes?.exhaustion : 0,
	);
	const modifierMap = collectActorItemModifiers(model.parent, sys);
	const getNumberAtPath = (path, fallback = 0) => {
		const modifiedValue = modifierMap.get(path);
		if (modifiedValue !== undefined) return modifiedValue;

		const baseValue = toFiniteNumber(foundry.utils.getProperty(sys, path));
		return baseValue === null ? fallback : baseValue;
	};
	const withBaseAlt = (basePath, altPath) =>
		getNumberAtPath(basePath, 0) + getNumberAtPath(altPath, 0);
	const withBaseAltMult = (basePath, altMultPath, altPath) =>
		getNumberAtPath(basePath, 0) * getNumberAtPath(altMultPath, 1) +
		getNumberAtPath(altPath, 0);

	const charLevel = Math.max(1, Math.trunc(getNumberAtPath("attributes.level", 1)));
	const progression = {
		pui: [0, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7],
		poly: [0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
	};
	const statValues = {};
	for (const [stat, statObj] of Object.entries(sys.stats ?? {})) {
		const progressionValue = progression[stat]?.[charLevel] ?? 0;
		const total =
			progressionValue + withBaseAlt(`stats.${stat}.base`, `stats.${stat}.alt`);
		statObj.value = total;
		statValues[stat] = total;
	}

	const equippedWeapons = analyzeActorEquippedWeapons(model.parent);
	const weaponState = sys.weapon_state ?? {};
	weaponState.main_weapon_name = equippedWeapons.mainWeapon?.name ?? "";
	weaponState.main_weapon_slot = equippedWeapons.mainWeaponSlot;
	weaponState.main_weapon_can_use_dex = false;
	weaponState.main_weapon_attributes = equippedWeapons.attributes;
	weaponState.invalid_configuration = equippedWeapons.invalidConfiguration;
	weaponState.warning = equippedWeapons.warning;

	const actorDa = sys.da ?? {};
	actorDa.value = equippedWeapons.daValue || "d2+1";
	actorDa.primary = equippedWeapons.daPrimary;
	actorDa.secondary = equippedWeapons.daSecondary;
	sys.damage_type = equippedWeapons.damageType || "none";

	const statBased = ({ path, stat = null, defaultStat = "none" } = {}) => {
		if (!path) return 0;
		const statKey =
			stat ?? foundry.utils.getProperty(sys, `${path}.stat`) ?? defaultStat;
		const statValue = statValues[statKey] ?? 0;
		const statCoef = getNumberAtPath(`${path}.stat_coef`, 1);
		return statValue * statCoef + withBaseAlt(`${path}.base`, `${path}.alt`);
	};

	const classSaveProfiles = [...(model.parent?.items ?? [])]
		.filter((item) => item.type === "Class")
		.flatMap((item) => item.system?.save_profiles ?? [])
		.filter((profile) => CONFIG.nalfa?.save_profiles?.[profile]);
	const saveProfile = classSaveProfiles.includes(sys.save_profile)
		? sys.save_profile
		: (classSaveProfiles[0] ?? sys.save_profile);
	const saveProfileTiers = CONFIG.nalfa?.save_profile_tiers?.[saveProfile] ?? {};
	for (const stat of ["vig", "agi", "vol"]) {
		const statObj = sys.stats?.[stat] ?? {};
		const save = statObj?.save ?? {};
		save.profile = saveProfileTiers[stat] ?? "low";
		save.value = withBaseAlt(`stats.${stat}.save.base`, `stats.${stat}.save.alt`);
	}

	for (const [skill, skillObj] of Object.entries(sys.attributes?.skills ?? {})) {
		skillObj.value =
			statBased({ path: `attributes.skills.${skill}` }) + fatigue.skillPenalty;
	}

	const defenseTable = {
		exposed: 9,
		standard: 10,
		protected: 11,
		bastion: 12,
	};
	const defenseObj = sys.attributes?.defense ?? {};
	const defenseProfile = defenseTable[sys.defense_profile] ?? 10;
	const defenseBase = getNumberAtPath("attributes.defense.base", 0);
	defenseObj.profile = defenseProfile;
	defenseObj.used_base = defenseBase;
	defenseObj.value =
		defenseProfile +
		(statValues.poly ?? 0) +
		defenseBase +
		getNumberAtPath("attributes.defense.alt", 0) +
		fatigue.defensePenalty;

	const evasionObj = sys.attributes?.evasion ?? {};
	const evasionBase = getNumberAtPath("attributes.evasion.base", 0);
	evasionObj.used_base = evasionBase;
	evasionObj.value = evasionBase + getNumberAtPath("attributes.evasion.alt", 0);

	const reachObj = sys.attributes?.reach ?? {};
	reachObj.value = withBaseAltMult(
		"attributes.reach.base",
		"attributes.reach.alt_mult",
		"attributes.reach.alt",
	);

	const rangeCoefObj = sys.attributes?.range_coef ?? {};
	rangeCoefObj.value =
		getNumberAtPath("attributes.range_coef.base", 1) *
		getNumberAtPath("attributes.range_coef.alt_mult", 1);

	const bonusesObj = sys.attributes?.bonuses ?? {};
	for (const [key, bonusObj] of Object.entries(bonusesObj)) {
		bonusObj.value = statBased({ path: `attributes.bonuses.${key}` });
	}

	for (const [key, resistanceObj] of Object.entries(sys.attributes?.resistances ?? {})) {
		const usedCoef =
			getNumberAtPath(`attributes.resistances.${key}.coef`, 1) *
			getNumberAtPath(`attributes.resistances.${key}.alt_mult`, 1);
		const usedValue =
			getNumberAtPath(`attributes.resistances.${key}.value`, 0) +
			getNumberAtPath(`attributes.resistances.${key}.alt`, 0);
		resistanceObj.used_coef = roundNumber(usedCoef, 6);
		resistanceObj.used_value = roundNumber(usedValue, 6);
	}

	const deathObj = sys.attributes?.death?.passing_throw ?? {};
	deathObj.value = statBased({ path: "attributes.death.passing_throw" });

	const healthProfiles = {
		fragile: { initial: 11, perLevel: 5 },
		standard: { initial: 12, perLevel: 6 },
		robust: { initial: 13, perLevel: 7 },
	};
	const healthObj = sys.attributes?.hp ?? {};
	const healthProfile = healthProfiles[sys.health_profile] ?? healthProfiles.standard;
	const profileHealth = healthProfile.initial + healthProfile.perLevel * (charLevel - 1);
	const healthBase = getNumberAtPath("attributes.hp.base", 0);
	healthObj.profile = profileHealth;
	healthObj.used_base = healthBase;
	healthObj.uncapped_max = Math.max(
		1,
		profileHealth + healthBase + getNumberAtPath("attributes.hp.alt", 0),
	);
	healthObj.max = getFatigueHealthMax(healthObj.uncapped_max, fatigue.level);

	const nalfaMaxTable = [0, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26];
	const nalfa = sys.nalfa ?? {};
	nalfa.max = nalfaMaxTable[charLevel] ?? nalfaMaxTable.at(-1);
	nalfa.value = Math.min(Math.max(0, Number(nalfa.value ?? 0)), nalfa.max);

	for (const [key, actionObj] of Object.entries(sys.actions ?? {})) {
		if (key === "movement") {
			actionObj.max = Math.max(
				0,
				withBaseAltMult(
					`actions.${key}.base`,
					`actions.${key}.alt_mult`,
					`actions.${key}.alt`,
				) + fatigue.movementPenalty,
			);
		} else {
			actionObj.max = withBaseAlt(`actions.${key}.base`, `actions.${key}.alt`);
		}
	}
};
