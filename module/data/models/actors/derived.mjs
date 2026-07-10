import { roundNumber, toFiniteNumber } from "../base.mjs";

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
				valueMap.get(path) ?? toFiniteNumber(foundry.utils.getProperty(systemData, path));
			if (baseValue === null) continue;

			const nextValue = applyModifierToNumber(mode, baseValue, delta);
			if (nextValue === null || !Number.isFinite(nextValue)) continue;

			valueMap.set(path, nextValue);
		}
	}

	return valueMap;
};

const getWeaponDaBySlot = (weaponSystem = {}, slot = "") => {
	const da = weaponSystem.da ?? {};
	if (slot === "main_hand") return String(da.main_hand ?? "").trim();
	if (slot === "off_hand") return String(da.dual_wield ?? "").trim();
	if (slot === "two_handed") return String(da.two_handed ?? "").trim();
	return "";
};

const analyzeActorEquippedWeapons = (actor) => {
	const result = {
		mainWeapon: null,
		mainWeaponSlot: "",
		canUseDex: false,
		daValue: "",
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
		mainWeaponEntry = mainOccupants.find((entry) => entry.isMainHand && !entry.isTwoHanded);
		mainWeaponEntry ??= mainOccupants[0];
	} else if (offOccupants.length > 0) {
		mainWeaponEntry = offOccupants[0];
	}

	const mainWeaponSlot = mainWeaponEntry
		? mainWeaponEntry.isTwoHanded
			? "two_handed"
			: mainWeaponEntry.isMainHand
				? "main_hand"
				: "off_hand"
		: "";
	const mainWeapon = mainWeaponEntry?.item ?? null;
	const mainWeaponSystem = mainWeaponEntry?.system ?? {};
	const weaponAttributes = mainWeaponSystem.weapon_attributes ?? {};
	const canUseDex = weaponAttributes.can_use_dex === true;
	const daValue = getWeaponDaBySlot(mainWeaponSystem, mainWeaponSlot);
	const damageType = String(mainWeaponSystem.damage_type ?? "none").trim() || "none";

	const uniqueWarnings = [...new Set(warnings)];
	result.mainWeapon = mainWeapon;
	result.mainWeaponSlot = mainWeaponSlot;
	result.canUseDex = canUseDex;
	result.daValue = daValue;
	result.damageType = damageType;
	result.invalidConfiguration = uniqueWarnings.length > 0;
	result.warning = uniqueWarnings.join(" ");

	return result;
};

export const prepareActorDerivedData = (model) => {
	const sys = model;
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

	const statValues = {};
	for (const [stat, statObj] of Object.entries(sys.stats ?? {})) {
		const total = withBaseAlt(`stats.${stat}.base`, `stats.${stat}.alt`);
		statObj.value = total;
		statValues[stat] = total;
	}

	const equippedWeapons = analyzeActorEquippedWeapons(model.parent);
	const weaponState = sys.weapon_state ?? {};
	weaponState.main_weapon_name = equippedWeapons.mainWeapon?.name ?? "";
	weaponState.main_weapon_slot = equippedWeapons.mainWeaponSlot;
	weaponState.main_weapon_can_use_dex = equippedWeapons.canUseDex;
	weaponState.invalid_configuration = equippedWeapons.invalidConfiguration;
	weaponState.warning = equippedWeapons.warning;

	const actorDa = sys.da ?? {};
	actorDa.value = equippedWeapons.daValue || "d2+1";
	sys.damage_type = equippedWeapons.damageType || "none";

	const statBased = ({ path, stat = null, defaultStat = "none" } = {}) => {
		if (!path) return 0;
		const statKey = stat ?? foundry.utils.getProperty(sys, `${path}.stat`) ?? defaultStat;
		const statValue = statValues[statKey] ?? 0;
		const statCoef = getNumberAtPath(`${path}.stat_coef`, 1);
		return statValue * statCoef + withBaseAlt(`${path}.base`, `${path}.alt`);
	};

	for (const [stat, statObj] of Object.entries(sys.stats ?? {})) {
		const save = statObj?.save ?? {};
		save.value = statBased({ path: `stats.${stat}.save`, stat });
	}

	for (const [skill, skillObj] of Object.entries(sys.attributes?.skills ?? {})) {
		skillObj.value = statBased({ path: `attributes.skills.${skill}` });
	}

	const physicalRollStat = sys.roll_stats?.physical ?? {};
	const strTotal = statValues.str ?? 0;
	const dexTotal = statValues.dex ?? 0;
	const physicalStatTotal = equippedWeapons.canUseDex
		? Math.max(strTotal, dexTotal)
		: strTotal;
	physicalRollStat.default_stat =
		equippedWeapons.canUseDex && dexTotal >= strTotal ? "dex" : "str";
	physicalRollStat.value =
		physicalStatTotal +
		withBaseAlt("roll_stats.physical.base", "roll_stats.physical.alt");

	for (const [key, rollStat] of Object.entries(sys.roll_stats ?? {})) {
		if (key === "physical") continue;
		const statKey =
			foundry.utils.getProperty(sys, `roll_stats.${key}.stat`) ??
			foundry.utils.getProperty(sys, `roll_stats.${key}.default_stat`) ??
			"none";
		const statValue = statValues[statKey] ?? 0;
		rollStat.value =
			statValue + withBaseAlt(`roll_stats.${key}.base`, `roll_stats.${key}.alt`);
	}

	const defenseTable = {
		squishy: 8,
		soft: 9,
		sturdy: 10,
		tanky: 11,
	};
	const profile = sys.profile ?? "none";
	const defenseObj = sys.attributes?.defense ?? {};
	const defenseProfile = defenseTable[profile] ?? 0;
	defenseObj.value =
		defenseProfile + withBaseAlt("attributes.defense.base", "attributes.defense.alt");

	const evasionObj = sys.attributes?.evasion ?? {};
	evasionObj.value = withBaseAlt("attributes.evasion.base", "attributes.evasion.alt");

	const initiativeObj = sys.attributes?.initiative ?? {};
	initiativeObj.value = statBased({ path: "attributes.initiative" });

	const passivePerceptionObj = sys.attributes?.passive_percep ?? {};
	passivePerceptionObj.value = statBased({ path: "attributes.passive_percep" });

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

	const charLevel = Math.max(1, Math.trunc(getNumberAtPath("attributes.level", 1)));
	const maxHealthTable = {
		none: [1],
		squishy: [0, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52],
		soft: [0, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59],
		sturdy: [0, 10, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66],
		tanky: [0, 11, 18, 24, 29, 35, 40, 46, 51, 57, 62, 68, 73],
	};
	const healthObj = sys.attributes?.hp ?? {};
	const profileArray = maxHealthTable[profile] ?? maxHealthTable.none;
	const profileHealth = profileArray[charLevel] ?? 1;
	healthObj.profile = profileHealth;
	healthObj.max = profileHealth + withBaseAlt("attributes.hp.base", "attributes.hp.alt");

	for (const [key, actionObj] of Object.entries(sys.actions ?? {})) {
		if (key === "movement") {
			actionObj.max = withBaseAltMult(
				`actions.${key}.base`,
				`actions.${key}.alt_mult`,
				`actions.${key}.alt`,
			);
		} else {
			actionObj.max = withBaseAlt(`actions.${key}.base`, `actions.${key}.alt`);
		}
	}
};
