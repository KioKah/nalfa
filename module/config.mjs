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
	none: "",
	physical: "Phys.",
	incant: "Incant.",
};

nalfa.weapon_usages = {
	normal: "Arme normale",
	thrown: "Arme lancée",
};

nalfa.stats_optional = {
	none: "",
	...nalfa.stats,
};

nalfa.stats_optional_physical = {
	physical: "Phys.",
	...nalfa.stats_optional,
};

nalfa.stats_optional_incant = {
	incant: "Incant.",
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
	invest: "Investigation",
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

nalfa.nalfa_cost_categories = {
	minor: "Mineur",
	intermediate: "Intermédiaire",
	advanced: "Avancé",
	major: "Majeur",
};

nalfa.nalfa_cost_categories_short = {
	minor: "Min.",
	intermediate: "Inter.",
	advanced: "Av.",
	major: "Maj.",
};

nalfa.uses_units = {
	none: "Illimité",
	lr: "Repos long",
	sr: "Repos court",
	consumable: "(Consommable !)",
};

nalfa.cooldown_units = {
	none: "Aucun",
	turns: "Tours",
	rounds: "Rounds",
};

// Item data
nalfa.item_types = {
	Weapon: "Arme",
	Trinket: "Bibelot",
	Tool: "Outil",
	Backpack: "Sac",
	Consumable: "Consommable",
	Loot: "Butin",
	Book: "Livre",
	Currency: "Monnaie",
	Action: "Action",
	Race: "Race",
	Class: "Classe",
	Job: "Métier",
	WeaponAttribute: "Attribut d'arme",
};

nalfa.rarity = {
	unknown: "Inconnu",
	common: "Commun",
	rare: "Rare",
	epic: "Épique",
	heroic: "Héroïque",
	mythic: "Mythique",
};

nalfa.weapon_attack_usages = {
	main_hand: "Mp",
	secondary_hand: "Ms",
	two_hands: "2M",
};

nalfa.weapon_attributes = {
	"Légère": "Légère",
	Finesse: "Finesse",
	Lourde: "Lourde",
	Lancer: "Lancer",
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

nalfa.action_cost_hover_labels = {
	main: "Action Principale",
	bonus: "Action Bonus",
	reaction: "Action de Réaction",
	concentration: "Action de Concentration",
	movement: "Action de Déplacement",
	nalfa: "Nalfa",
};

nalfa.action_movement_cost_modes = {
	none: "Aucun",
	fixed: "Fixe",
	variable: "Variable",
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

nalfa.modifier_operations = {
	add: "Ajouter",
	multiply: "Multiplier",
	override: "Remplacer",
	upgrade: "Maximum",
	downgrade: "Minimum",
};

nalfa.modifier_path_categories = {
	attributes: "Attributs",
	stats: "Stats",
	saving_throws: "Sauvegardes",
	skills: "Compétences",
	roll_stats: "Jets",
	actions: "Actions",
};

nalfa.modifier_base_paths_by_category = {
	stats: {
		"stats.str.base": "FOR",
		"stats.dex.base": "DEX",
		"stats.int.base": "INT",
		"stats.wis.base": "SAG",
		"stats.cha.base": "CHA",
		"stats.con.base": "CON",
	},
	saving_throws: {
		"stats.str.save.base": "FOR",
		"stats.dex.save.base": "DEX",
		"stats.int.save.base": "INT",
		"stats.wis.save.base": "SAG",
		"stats.cha.save.base": "CHA",
		"stats.con.save.base": "CON",
	},
	skills: {
		"attributes.skills.athlet.base": "Athlétisme",
		"attributes.skills.robust.base": "Robustesse",
		"attributes.skills.adress.base": "Adresse",
		"attributes.skills.discre.base": "Discrétion",
		"attributes.skills.acroba.base": "Acrobaties",
		"attributes.skills.cultur.base": "Culture",
		"attributes.skills.magie.base": "Magie",
		"attributes.skills.nature.base": "Nature",
		"attributes.skills.invest.base": "Investigation",
		"attributes.skills.percep.base": "Perception",
		"attributes.skills.sereni.base": "Sérénité",
		"attributes.skills.intuit.base": "Intuition",
		"attributes.skills.intimi.base": "Intimidation",
		"attributes.skills.trompe.base": "Tromperie",
		"attributes.skills.persua.base": "Persuasion",
		"attributes.skills.perfor.base": "Performance",
		"attributes.skills.sante.base": "Santé",
		"attributes.skills.endura.base": "Endurance",
	},
	roll_stats: {
		"roll_stats.physical.base": "Physique",
		"roll_stats.incant.base": "Incantation",
	},
	attributes: {
		"attributes.hp.base": "PV max",
		"attributes.defense.base": "Défense",
		"attributes.evasion.base": "Évasion",
		"attributes.initiative.base": "Initiative",
		"attributes.passive_percep.base": "Percep. passive",
		"attributes.reach.base": "Allonge",
		"attributes.range_coef.base": "Coef. portée",
		"attributes.death.passing_throw.base": "DD JdMort",
	},
	actions: {
		"actions.main.base": "Principales",
		"actions.bonus.base": "Bonus",
		"actions.concentration.base": "Concentration",
		"actions.reaction.base": "Réaction",
		"actions.movement.base": "Déplacement",
	},
};

nalfa.modifier_base_paths = Object.values(
	nalfa.modifier_base_paths_by_category,
).reduce((allPaths, groupPaths) => ({ ...allPaths, ...groupPaths }), {});

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

nalfa.damage_effect_prefixes = {
	damage: "Dégâts",
	healing: "Soin",
	abso: "Absorption",
	piercing: "Perçant",
};

nalfa.fusion_damage_types = {
	volcani: "Volcanique",
	givrefe: "Givrefeu",
	gangfla: "Gangreflamme",
	radianc: "Radiance",
	ombrfla: "Ombreflamme",
	abyssal: "Abyssal",
	tempete: "Tempête",
	cryoele: "Cryoélectrique",
	dissona: "Dissonance",
	gangivr: "Gangregivre",
	ombrpha: "Ombrophage",
	hemasom: "Hématique Sombre",
	hemarad: "Hématique Radiant",
	astral: "Astral",
	vide: "Vide",
	fibrvie: "Fibre-Vie",
};

nalfa.fusion_damage_type_components = {
	volcani: ["feu", "terr"],
	givrefe: ["feu", "givr"],
	gangfla: ["feu", "necr"],
	radianc: ["feu", "radt"],
	ombrfla: ["feu", "obsc"],
	abyssal: ["eau", "obsc"],
	tempete: ["air", "foud"],
	cryoele: ["givr", "foud"],
	dissona: ["soni", "psyc"],
	gangivr: ["necr", "givr"],
	ombrpha: ["necr", "obsc"],
	hemasom: ["sang", "obsc"],
	hemarad: ["sang", "radt"],
	astral: ["radt", "arca"],
	vide: ["obsc", "chao"],
	fibrvie: ["arca", "natu"],
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

nalfa.standard_damage_types = {
	none: "",
	...nalfa.physical_damage_types,
	...nalfa.elementary_damage_types,
	...nalfa.magical_damage_types,
	...nalfa.regeneration_damage_types,
	...nalfa.fusion_damage_types,
};

nalfa.base_damage_types = {
	none: "",
	arme: "Arme", // <- herite du type de degat de l'arme
	...nalfa.physical_damage_types,
	...nalfa.elementary_damage_types,
	...nalfa.magical_damage_types,
	...nalfa.regeneration_damage_types,
};

nalfa.base_standard_damage_types = {
	none: "",
	...nalfa.physical_damage_types,
	...nalfa.elementary_damage_types,
	...nalfa.magical_damage_types,
	...nalfa.regeneration_damage_types,
};

// Other

nalfa.valueMode = {
	values: "Lecture",
	base: "Modification",
	alt: "Altération",
};
