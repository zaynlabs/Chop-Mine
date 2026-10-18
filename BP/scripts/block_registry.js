/**
 * Chop & Mine - Block & Drop Registry
 * Contains definitions for mineable ores, harvestable logs, leaves, and loot calculation rules.
 */

export const ORE_FAMILIES = {
    // Coal (Wood tier+)
    "minecraft:coal_ore": { family: "coal", tier: 0, drop: "minecraft:coal", xp: [0, 2], fortune: true },
    "minecraft:deepslate_coal_ore": { family: "coal", tier: 0, drop: "minecraft:coal", xp: [0, 2], fortune: true },

    // Iron (Stone tier+, or Golden Pickaxe)
    "minecraft:iron_ore": { family: "iron", tier: 1, drop: "minecraft:raw_iron", xp: [0, 0], fortune: true },
    "minecraft:deepslate_iron_ore": { family: "iron", tier: 1, drop: "minecraft:raw_iron", xp: [0, 0], fortune: true },

    // Copper (Stone tier+, or Golden Pickaxe)
    "minecraft:copper_ore": { family: "copper", tier: 1, drop: "minecraft:raw_copper", minDrop: 2, maxDrop: 5, xp: [0, 0], fortune: true },
    "minecraft:deepslate_copper_ore": { family: "copper", tier: 1, drop: "minecraft:raw_copper", minDrop: 2, maxDrop: 5, xp: [0, 0], fortune: true },

    // Gold (Iron tier+, or Golden Pickaxe)
    "minecraft:gold_ore": { family: "gold", tier: 2, drop: "minecraft:raw_gold", xp: [0, 0], fortune: true },
    "minecraft:deepslate_gold_ore": { family: "gold", tier: 2, drop: "minecraft:raw_gold", xp: [0, 0], fortune: true },
    "minecraft:nether_gold_ore": { family: "nether_gold", tier: 0, drop: "minecraft:gold_nugget", minDrop: 2, maxDrop: 6, xp: [0, 1], fortune: true },

    // Redstone (Iron tier+)
    "minecraft:redstone_ore": { family: "redstone", tier: 2, drop: "minecraft:redstone", minDrop: 4, maxDrop: 5, xp: [1, 5], fortune: true },
    "minecraft:lit_redstone_ore": { family: "redstone", tier: 2, drop: "minecraft:redstone", minDrop: 4, maxDrop: 5, xp: [1, 5], fortune: true },
    "minecraft:deepslate_redstone_ore": { family: "redstone", tier: 2, drop: "minecraft:redstone", minDrop: 4, maxDrop: 5, xp: [1, 5], fortune: true },
    "minecraft:lit_deepslate_redstone_ore": { family: "redstone", tier: 2, drop: "minecraft:redstone", minDrop: 4, maxDrop: 5, xp: [1, 5], fortune: true },

    // Lapis (Stone tier+, or Golden Pickaxe)
    "minecraft:lapis_ore": { family: "lapis", tier: 1, drop: "minecraft:lapis_lazuli", minDrop: 4, maxDrop: 9, xp: [2, 5], fortune: true },
    "minecraft:deepslate_lapis_ore": { family: "lapis", tier: 1, drop: "minecraft:lapis_lazuli", minDrop: 4, maxDrop: 9, xp: [2, 5], fortune: true },

    // Diamond (Iron tier+)
    "minecraft:diamond_ore": { family: "diamond", tier: 2, drop: "minecraft:diamond", xp: [3, 7], fortune: true },
    "minecraft:deepslate_diamond_ore": { family: "diamond", tier: 2, drop: "minecraft:diamond", xp: [3, 7], fortune: true },

    // Emerald (Iron tier+)
    "minecraft:emerald_ore": { family: "emerald", tier: 2, drop: "minecraft:emerald", xp: [3, 7], fortune: true },
    "minecraft:deepslate_emerald_ore": { family: "emerald", tier: 2, drop: "minecraft:emerald", xp: [3, 7], fortune: true },

    // Quartz (Wood tier+)
    "minecraft:quartz_ore": { family: "quartz", tier: 0, drop: "minecraft:quartz", xp: [2, 5], fortune: true },
    "minecraft:nether_quartz_ore": { family: "quartz", tier: 0, drop: "minecraft:quartz", xp: [2, 5], fortune: true },

    // Ancient Debris (Diamond tier+)
    "minecraft:ancient_debris": { family: "ancient_debris", tier: 3, drop: "minecraft:ancient_debris", xp: [0, 0], fortune: false }
};

export const LOG_FAMILIES = {
    // Oak
    "minecraft:oak_log": "oak",
    "minecraft:stripped_oak_log": "oak",
    "minecraft:oak_wood": "oak",
    "minecraft:stripped_oak_wood": "oak",

    // Birch
    "minecraft:birch_log": "birch",
    "minecraft:stripped_birch_log": "birch",
    "minecraft:birch_wood": "birch",
    "minecraft:stripped_birch_wood": "birch",

    // Spruce
    "minecraft:spruce_log": "spruce",
    "minecraft:stripped_spruce_log": "spruce",
    "minecraft:spruce_wood": "spruce",
    "minecraft:stripped_spruce_wood": "spruce",

    // Jungle
    "minecraft:jungle_log": "jungle",
    "minecraft:stripped_jungle_log": "jungle",
    "minecraft:jungle_wood": "jungle",
    "minecraft:stripped_jungle_wood": "jungle",

    // Acacia
    "minecraft:acacia_log": "acacia",
    "minecraft:stripped_acacia_log": "acacia",
    "minecraft:acacia_wood": "acacia",
    "minecraft:stripped_acacia_wood": "acacia",

    // Dark Oak
    "minecraft:dark_oak_log": "dark_oak",
    "minecraft:stripped_dark_oak_log": "dark_oak",
    "minecraft:dark_oak_wood": "dark_oak",
    "minecraft:stripped_dark_oak_wood": "dark_oak",

    // Mangrove
    "minecraft:mangrove_log": "mangrove",
    "minecraft:stripped_mangrove_log": "mangrove",
    "minecraft:mangrove_wood": "mangrove",
    "minecraft:stripped_mangrove_wood": "mangrove",

    // Cherry
    "minecraft:cherry_log": "cherry",
    "minecraft:stripped_cherry_log": "cherry",
    "minecraft:cherry_wood": "cherry",
    "minecraft:stripped_cherry_wood": "cherry",

    // Pale Oak
    "minecraft:pale_oak_log": "pale_oak",
    "minecraft:stripped_pale_oak_log": "pale_oak",
    "minecraft:pale_oak_wood": "pale_oak",
    "minecraft:stripped_pale_oak_wood": "pale_oak",

    // Bamboo
    "minecraft:bamboo_block": "bamboo",
    "minecraft:stripped_bamboo_block": "bamboo",

    // Crimson Stem
    "minecraft:crimson_stem": "crimson",
    "minecraft:stripped_crimson_stem": "crimson",
    "minecraft:crimson_hyphae": "crimson",
    "minecraft:stripped_crimson_hyphae": "crimson",

    // Warped Stem
    "minecraft:warped_stem": "warped",
    "minecraft:stripped_warped_stem": "warped",
    "minecraft:warped_hyphae": "warped",
    "minecraft:stripped_warped_hyphae": "warped"
};

export const LEAF_TYPES = new Set([
    "minecraft:oak_leaves",
    "minecraft:birch_leaves",
    "minecraft:spruce_leaves",
    "minecraft:jungle_leaves",
    "minecraft:acacia_leaves",
    "minecraft:dark_oak_leaves",
    "minecraft:mangrove_leaves",
    "minecraft:cherry_leaves",
    "minecraft:pale_oak_leaves",
    "minecraft:azalea_leaves",
    "minecraft:azalea_leaves_flowered",
    "minecraft:leaves",
    "minecraft:leaves2",
    "minecraft:nether_wart_block",
    "minecraft:warped_wart_block",
    "minecraft:shroomlight"
]);

// Precomputed 3D neighbor offsets for spherical/radial crawling
export const NEIGHBOR_OFFSETS_3D = [];
for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            NEIGHBOR_OFFSETS_3D.push([dx, dy, dz]);
        }
    }
}

// Tree propagation offsets: primarily upward and sideways to avoid eating floorboards
export const TREE_OFFSETS_UPWARD = [];
for (let dx = -1; dx <= 1; dx++) {
    for (let dy = 0; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            TREE_OFFSETS_UPWARD.push([dx, dy, dz]);
        }
    }
}

const PICKAXE_TIERS = {
    "minecraft:wooden_pickaxe": 0,
    "minecraft:stone_pickaxe": 1,
    "minecraft:golden_pickaxe": 1,
    "minecraft:iron_pickaxe": 2,
    "minecraft:diamond_pickaxe": 3,
    "minecraft:netherite_pickaxe": 3
};

/**
 * Checks pickaxe harvesting tier (0: wood, 1: stone/gold, 2: iron, 3: diamond/netherite)
 */
export function getPickaxeTier(toolId) {
    if (!toolId) return -1;
    if (toolId in PICKAXE_TIERS) return PICKAXE_TIERS[toolId];
    if (toolId.includes("netherite") || toolId.includes("diamond")) return 3;
    if (toolId.includes("iron")) return 2;
    if (toolId.includes("gold") || toolId.includes("stone")) return 1;
    if (toolId.includes("wood")) return 0;
    return 1;
}

// Ores that a Golden Pickaxe can harvest (includes copper, iron, and gold ore)
const GOLD_PICKAXE_ALLOWED_FAMILIES = new Set([
    "coal",
    "quartz",
    "nether_gold",
    "iron",
    "copper",
    "lapis",
    "gold"
]);

/**
 * Returns true if the held tool tier can mine the target ore in vanilla rules
 */
export function canHarvestOre(toolId, oreTypeId) {
    const oreData = ORE_FAMILIES[oreTypeId];
    if (!oreData) return false;

    // Golden Pickaxe special capability: can mine Coal, Quartz, Nether Gold, Iron, Copper, Lapis, and Gold Ore
    if (toolId === "minecraft:golden_pickaxe" || toolId?.includes("golden_pickaxe") || toolId?.includes("gold_pickaxe")) {
        return GOLD_PICKAXE_ALLOWED_FAMILIES.has(oreData.family);
    }

    const toolTier = getPickaxeTier(toolId);
    return toolTier >= (oreData.tier ?? 0);
}

/**
 * Checks if a block is an ore
 */
export function isOre(typeId) {
    return typeId in ORE_FAMILIES;
}

/**
 * Checks if a block is a log/stem
 */
export function isLog(typeId) {
    return typeId in LOG_FAMILIES;
}

/**
 * Checks if a block is leaves
 */
export function isLeaf(typeId) {
    return LEAF_TYPES.has(typeId);
}

/**
 * Checks if item is a pickaxe
 */
export function isPickaxe(typeId) {
    if (!typeId) return false;
    return typeId.endsWith("_pickaxe");
}

/**
 * Checks if item is an axe
 */
export function isAxe(typeId) {
    if (!typeId) return false;
    return typeId.endsWith("_axe");
}

/**
 * Checks if item is a hoe
 */
export function isHoe(typeId) {
    if (!typeId) return false;
    return typeId.endsWith("_hoe");
}

export const CROP_FAMILIES = {
    "minecraft:wheat": {
        growthProp: "growth",
        matureStage: 7,
        drop: "minecraft:wheat",
        seedDrop: "minecraft:wheat_seeds",
        minDrop: 1,
        maxDrop: 1,
        minSeed: 1,
        maxSeed: 4,
        ground: "minecraft:farmland",
        fortuneBonus: false
    },
    "minecraft:carrots": {
        growthProp: "growth",
        matureStage: 7,
        drop: "minecraft:carrot",
        seedDrop: null,
        minDrop: 2,
        maxDrop: 5,
        ground: "minecraft:farmland",
        fortuneBonus: true
    },
    "minecraft:carrot": {
        growthProp: "growth",
        matureStage: 7,
        drop: "minecraft:carrot",
        seedDrop: null,
        minDrop: 2,
        maxDrop: 5,
        ground: "minecraft:farmland",
        fortuneBonus: true
    },
    "minecraft:potatoes": {
        growthProp: "growth",
        matureStage: 7,
        drop: "minecraft:potato",
        seedDrop: null,
        minDrop: 2,
        maxDrop: 5,
        ground: "minecraft:farmland",
        fortuneBonus: true
    },
    "minecraft:potato": {
        growthProp: "growth",
        matureStage: 7,
        drop: "minecraft:potato",
        seedDrop: null,
        minDrop: 2,
        maxDrop: 5,
        ground: "minecraft:farmland",
        fortuneBonus: true
    },
    "minecraft:beetroot": {
        growthProp: "growth",
        matureStage: 7,
        drop: "minecraft:beetroot",
        seedDrop: "minecraft:beetroot_seeds",
        minDrop: 1,
        maxDrop: 1,
        minSeed: 1,
        maxSeed: 4,
        ground: "minecraft:farmland",
        fortuneBonus: false
    },
    "minecraft:beetroots": {
        growthProp: "growth",
        matureStage: 7,
        drop: "minecraft:beetroot",
        seedDrop: "minecraft:beetroot_seeds",
        minDrop: 1,
        maxDrop: 1,
        minSeed: 1,
        maxSeed: 4,
        ground: "minecraft:farmland",
        fortuneBonus: false
    },
    "minecraft:nether_wart": {
        growthProp: "age",
        matureStage: 3,
        drop: "minecraft:nether_wart",
        seedDrop: null,
        minDrop: 2,
        maxDrop: 4,
        ground: "minecraft:soul_sand",
        fortuneBonus: true
    }
};

// Neighbor offsets for crop crawling: 3D horizontal and slight elevation changes
export const CROP_OFFSETS = [];
for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            CROP_OFFSETS.push([dx, dy, dz]);
        }
    }
}

/**
 * Checks if a block is a farm crop
 */
export function isCrop(typeId) {
    return Boolean(typeId && typeId in CROP_FAMILIES);
}

/**
 * Checks if a crop block is fully mature and ready to harvest
 */
export function isCropMature(permutation, typeId) {
    const cropData = CROP_FAMILIES[typeId];
    if (!cropData || !permutation) return false;
    try {
        const stage = permutation.getState(cropData.growthProp);
        return typeof stage === "number" && stage >= cropData.matureStage;
    } catch {
        return false;
    }
}

