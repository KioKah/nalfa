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

nalfa.attack_mode = {
	arme: "Arme",
	incant: "Incant",
};

nalfa.stats_optional = {
	none: "",
	...nalfa.stats,
};

nalfa.stats_optional_arme = {
	arme: "Arme",
	...nalfa.stats_optional,
};

nalfa.stats_optional_incant = {
	incant: "Incant",
	...nalfa.stats_optional,
};

// "Bonus pour [...]"
nalfa.stats_conditional = {
	str: "FOR uniq",
	dex: "DEX uniq",
	int: "INT uniq",
	wis: "SAG uniq",
	cha: "CHA uniq",
	con: "CON uniq",
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
	none: "Sans Profil",
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

nalfa.ester_levels = {
	none: "Gratuit",
	lvl1: "Niv. 1",
	lvl2: "Niv. 2",
	lvl3: "Niv. 3",
	special: "Spécial",
};

nalfa.uses_units = {
	none: "Illimité",
	lr: "Repos long",
	sr: "Repos court",
};

nalfa.cooldown_units = {
	none: "Aucun",
	turns: "Tours",
	rounds: "Rounds",
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
	...nalfa.stats_optional,
	none: "Aucune",
};

nalfa.action_units = {
	none: "Gratuit",
	...nalfa.actions,
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
	melee: "Au CàC",
	ranged: "À Distance",
	ranged_including_melee: "À Dist dont CàC",
	pure_ranged: "À Distance Pure", //range doesn't allow attacks in melee range
};

nalfa.target_units = {
	entity: "Entité",
	ally: "Allié",
	enemy: "Ennemi",
	object: "Objet",
	self: "Soi",
	visible_point: "Point visible",
	any_point: "Point quelconque",
};

nalfa.selection_target_units = {
	ally: "Allié",
	enemy: "Ennemi",
	entity: "Entité",
	point: "Point",
	self: "Soi",
};

nalfa.target_visibility = {
	visible: "Visible",
	any: "Quelconque",
};

nalfa.duration_units = {
	instant: "Instantané",
	round: "Round",
	minute: "Minute",
	hour: "Heure",
	day: "Jour",
	sr: "Repos court",
	lr: "Repos long",
};

nalfa.area_shapes = {
	circle: "Cercle",
	line: "Ligne",
	cone: "Cône",
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

// Other

nalfa.valueMode = {
	values: "Lecture",
	base: "Modification",
	alt: "Altération",
};
