export const nalfa = {};

// Actor data
nalfa.stats = {
	str: "FOR",
	dex: "DEX",
	int: "INT",
	wis: "SAG",
	cha: "CHA",
	con: "CON",
};

nalfa.stats_optional = {
	...nalfa.stats,
	none: "",
};

// "Bonus pour [...]"
nalfa.stats_conditional = {
	str: "FOR uniquement",
	dex: "DEX uniquement",
	int: "INT uniquement",
	wis: "SAG uniquement",
	cha: "CHA uniquement",
	con: "CON uniquement",
	all: "Toutes les stats",
};

nalfa.skills = {
	athlet: "Athlétisme",
	robust: "Robustesse",
	adress: "Adresse",
	discre: "Discrétion",
	acroba: "Acrobaties",
	cultur: "Culture",
	magie: "Magie",
	nature: "Nature",
	medeci: "Médecine",
	percep: "Perception",
	sereni: "Sérénité",
	intuit: "Intuition",
	intimi: "Intimidation",
	trompe: "Tromperie",
	persua: "Persuasion",
	perfor: "Performance",
	sante: "Santé",
	endura: "Endurance",
};

nalfa.profiles = {
	squishy: "Squishy",
	soft: "Soft",
	sturdy: "Sturdy",
	tanky: "Tanky",
};

nalfa.actions = {
	main: "Action principale",
	bonus: "Action bonus",
	reaction: "Réaction",
	concentration: "Concentration",
	movement: "Déplacement",
};

// Item data
nalfa.rarity = {
	unknown: "Inconnu",
	common: "Commun",
	rare: "Rare",
	epic: "Épique",
	heroic: "Héroïque",
	mythic: "Mythique",
};

nalfa.roll_types = {
	no_roll: "Pas de jet",
	saving_throw: "Jet de sauvegarde",
	attack_roll: "Jet d'attaque",
	both: "Jet d'attaque & de sauvegarde",
};

nalfa.attack_stats = {
	default: "Défaut",
	for: "Force",
	dex: "Dextérité",
	int: "Intelligence",
	sag: "Sagesse",
	cha: "Charisme",
	con: "Constitution",
	none: "Aucune",
};

nalfa.trinket_types = {
	none: "",
	class: "Classe",
	worn: "Porté",
};

nalfa.consumable_types = {
	ammo: "Munition",
	food: "Nourriture",
	potion: "Potion",
	poison: "Poison",
	scroll: "Parchemin",
	other: "Autre",
};

nalfa.range_types = {
	melee: "Corps à corps",
	ranged: "Distance (Désavantage au corps à corps)",
	both: "Distance (Pas de désavantage au corps à corps)",
	pure_ranged: "Distance pur", //range doesn't allow attacks in melee range
};

nalfa.sizes = {
	small: "Petit",
	medium: "Moyen",
	large: "Grand",
};

nalfa.stat_advantages = {
	advantage: "Avantage",
	disadvantage: "Désavantage",
	choice: "Au choix",
};

nalfa.targets = {
	self: "Soi",
	ally: "Allié",
	enemy: "Ennemi",
	entity: "Entité",
	object: "Objet",
	visible_point: "Point visible",
	any_point: "Point quelconque",
};

// Types de dégâts

nalfa.physical_damage_types = {
	tran: "Tranchant",
	perf: "Perforant",
	cont: "Contondant",
	soni: "Sonique",
	sang: "Saignement",
};

nalfa.elementary_damage_types = {
	feu: "Feu",
	eau: "Eau",
	terr: "Terre",
	air: "Air",
	natu: "Nature",
	givr: "Givre",
	foud: "Foudre",
};

nalfa.magical_damage_types = {
	radt: "Radiant",
	obsc: "Obscur",
	arca: "Arcane",
	chao: "Chaos",
	necr: "Nécrotique",
	psyc: "Psychique",
};

nalfa.regeneration_damage_types = {
	soin: "Soin",
	abso: "Absorption",
};

nalfa.fusion_damage_types = {
	radc: "Feu + Radiant",
	hema: "Saignement + Obscur",
	obfl: "Obscur + Feu",
	cryo: "Givre + Foudre",
	gang: "Nécrotique + Givre",
	diss: "Sonique + Psychique",
	temp: "Air + Foudre",
};

nalfa.all_damage_types = {
	none: "",
	arme: "Arme", // ← hérite du type de dégât de l'arme
	...nalfa.physical_damage_types,
	...nalfa.elementary_damage_types,
	...nalfa.magical_damage_types,
	...nalfa.regeneration_damage_types,
	...nalfa.fusion_damage_types,
};
