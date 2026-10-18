/**
 * Chop & Mine - Core Harvesting Engine
 * Implements BFS search, lag-free generator breaking with system.runJob,
 * durability safeguards, Fortune/Silk Touch handling, magnetic drop suction,
 * and fail-safe session cleanup with contextual error logging.
 */

import {
    system,
    ItemStack,
    BlockPermutation,
    EntityComponentTypes,
    ItemComponentTypes
} from "@minecraft/server";

import {
    ORE_FAMILIES,
    LOG_FAMILIES,
    CROP_FAMILIES,
    isOre,
    isLog,
    isLeaf,
    isCrop,
    isCropMature,
    isPickaxe,
    isAxe,
    isHoe,
    canHarvestOre,
    NEIGHBOR_OFFSETS_3D,
    TREE_OFFSETS_UPWARD,
    CROP_OFFSETS
} from "./block_registry.js";

import { getPlayerConfig, isPlayerValid } from "./ui_settings.js";
import { logger } from "./logger.js";

// Tracks active operations to avoid re-triggering on our own block breaks
const activeMiningSessions = new Set();

/**
 * Returns the current number of blocks actively being processed
 */
export function getActiveSessionsCount() {
    return activeMiningSessions.size;
}

/**
 * Main entry point called from playerBreakBlock event
 */
export function handleBlockBreak(event) {
    const { player, block, brokenBlockPermutation, itemStackBeforeBreak } = event;
    if (!isPlayerValid(player) || !block) return;

    // Boundary check: skip blocks outside valid world height
    if (block.y < -64 || block.y > 320) return;

    // Creative mode check: do not trigger vein harvesting in creative mode
    try {
        const gameMode = player.getGameMode?.();
        if (gameMode === "creative") return;
    } catch {}

    const blockPosKey = `${block.x},${block.y},${block.z}`;
    if (activeMiningSessions.has(blockPosKey)) return;

    let config;
    try {
        config = getPlayerConfig(player);
    } catch (err) {
        logger.error("Failed to load player config on block break", err, { player });
        return;
    }

    if (!config.enabled && !config.treeEnabled && !config.cropEnabled) return;

    // Check activation mode:
    // 0 = Crouch (Sneak) to Harvest
    // 1 = Stand to Harvest (Sneak to Disable)
    // 2 = Always Active
    // 3 = Require Chop & Mine Core
    if (config.activationMode === 0 && !player.isSneaking) return;
    if (config.activationMode === 1 && player.isSneaking) return;
    if (config.activationMode === 3 && !isHoldingCore(player)) return;

    const typeId = brokenBlockPermutation?.type?.id;
    if (!typeId) return;

    const isTargetOre = isOre(typeId) && config.enabled;
    const isTargetLog = isLog(typeId) && config.treeEnabled;
    const isTargetCrop = isCrop(typeId) && (config.cropEnabled ?? true);

    if (!isTargetOre && !isTargetLog && !isTargetCrop) return;

    // Tool validation & mining tier checks
    const toolId = itemStackBeforeBreak?.typeId;
    if (isTargetOre) {
        if (!isPickaxe(toolId)) return;
        if (!canHarvestOre(toolId, typeId)) {
            if (config.debugMode) {
                logger.debug(`Pickaxe tier too low for ${typeId}`, { tool: toolId, player }, player);
            }
            return;
        }
    }
    if (isTargetLog) {
        if (!isAxe(toolId)) return;
    }
    if (isTargetCrop) {
        if (!isHoe(toolId)) return;
        if (!isCropMature(brokenBlockPermutation, typeId)) return;

        // Replant the starting crop that the player just broke
        const cropData = CROP_FAMILIES[typeId];
        if (cropData) {
            const ground = block.dimension.getBlock({ x: block.x, y: block.y - 1, z: block.z });
            if (ground && ground.typeId === cropData.ground) {
                try {
                    const replantPerm = BlockPermutation.resolve(typeId, { [cropData.growthProp]: 0 });
                    block.setPermutation(replantPerm);
                } catch {}
            }
        }
    }

    // Scan connected blocks
    let targetFamily;
    if (isTargetOre) targetFamily = ORE_FAMILIES[typeId].family;
    else if (isTargetLog) targetFamily = LOG_FAMILIES[typeId];
    else targetFamily = typeId;

    let scanResult;
    try {
        scanResult = scanConnectedBlocks(
            block.dimension,
            block.location,
            typeId,
            targetFamily,
            isTargetOre,
            config.maxBlocks,
            config.houseProtection ?? true,
            isTargetCrop
        );
    } catch (err) {
        logger.error("Error during BFS scan of connected blocks", err, { location: block.location, target: typeId, player }, config.debugMode ? player : null);
        return;
    }

    const { blocksToBreak, leavesToDecay } = scanResult;
    if (blocksToBreak.length === 0) return;

    // Mark blocks as active so our breaks don't re-enter
    for (const b of blocksToBreak) {
        activeMiningSessions.add(`${b.x},${b.y},${b.z}`);
    }

    if (config.debugMode) {
        logger.debug(
            `Initiated harvest for ${typeId}: found ${blocksToBreak.length} blocks, ${leavesToDecay.length} leaves`,
            { location: block.location, tool: toolId, player },
            player
        );
    }

    // Launch non-blocking generator job with fail-safe error recovery
    system.runJob(
        veinBreakGenerator(
            player,
            block.dimension,
            blocksToBreak,
            leavesToDecay,
            isTargetOre,
            typeId,
            config,
            isTargetCrop
        )
    );
}

/**
 * Checks if player is holding the Chop & Mine Core in main hand or offhand
 */
function isHoldingCore(player) {
    try {
        const equippable = player.getComponent(EntityComponentTypes.Equippable);
        if (!equippable) return false;

        const mainHand = equippable.getEquipment("Mainhand");
        if (mainHand?.typeId === "chopmine:chop_core") return true;

        const offHand = equippable.getEquipment("Offhand");
        if (offHand?.typeId === "chopmine:chop_core") return true;
    } catch (err) {
        logger.warn("Could not inspect player equipment for core check", { player });
    }
    return false;
}

/**
 * BFS algorithm to discover connected matching blocks with House Protection
 */
function scanConnectedBlocks(dimension, startPos, startTypeId, targetFamily, isTargetOre, maxBlocks, houseProtection, isTargetCrop = false) {
    const blocksToBreak = [];
    const leavesToDecay = [];
    const visited = new Set();
    const queue = [startPos];

    const startKey = `${startPos.x},${startPos.y},${startPos.z}`;
    visited.add(startKey);

    // Ores spread 3D; trees branch upward/sideways; crops spread across farm soil
    let offsets;
    if (isTargetCrop) {
        offsets = CROP_OFFSETS;
    } else if (isTargetOre) {
        offsets = NEIGHBOR_OFFSETS_3D;
    } else {
        offsets = TREE_OFFSETS_UPWARD;
    }
    let connectedLeavesCount = 0;

    while (queue.length > 0 && blocksToBreak.length < maxBlocks) {
        const curr = queue.shift();

        // Safety distance limit from the starting point (max 24 blocks radius)
        const distSq = (curr.x - startPos.x) ** 2 + (curr.y - startPos.y) ** 2 + (curr.z - startPos.z) ** 2;
        if (distSq > 576) continue;

        for (const [dx, dy, dz] of offsets) {
            const nx = curr.x + dx;
            const ny = curr.y + dy;
            const nz = curr.z + dz;

            // Height boundary safeguard
            if (ny < -64 || ny > 320) continue;

            const key = `${nx},${ny},${nz}`;
            if (visited.has(key)) continue;
            visited.add(key);

            let nBlock;
            try {
                nBlock = dimension.getBlock({ x: nx, y: ny, z: nz });
            } catch {
                continue;
            }
            if (!nBlock) continue;

            const nTypeId = nBlock.typeId;

            if (isTargetCrop) {
                if (isCrop(nTypeId) && (nTypeId === startTypeId || nTypeId.startsWith(startTypeId.replace(/s$/, "")))) {
                    if (isCropMature(nBlock.permutation, nTypeId)) {
                        blocksToBreak.push({ x: nx, y: ny, z: nz, typeId: nTypeId });
                        queue.push({ x: nx, y: ny, z: nz });
                        if (blocksToBreak.length >= maxBlocks) break;
                    }
                }
            } else if (isTargetOre) {
                if (isOre(nTypeId) && ORE_FAMILIES[nTypeId]?.family === targetFamily) {
                    blocksToBreak.push({ x: nx, y: ny, z: nz, typeId: nTypeId });
                    queue.push({ x: nx, y: ny, z: nz });
                    if (blocksToBreak.length >= maxBlocks) break;
                }
            } else {
                if (isLog(nTypeId) && LOG_FAMILIES[nTypeId] === targetFamily) {
                    blocksToBreak.push({ x: nx, y: ny, z: nz, typeId: nTypeId });
                    queue.push({ x: nx, y: ny, z: nz });
                    if (blocksToBreak.length >= maxBlocks) break;
                } else if (isLeaf(nTypeId)) {
                    connectedLeavesCount++;
                    if (leavesToDecay.length < 120) {
                        leavesToDecay.push({ x: nx, y: ny, z: nz });
                    }
                }
            }
        }
    }

    // House Protection: Real trees have leaves attached to the trunk.
    // If houseProtection is enabled and zero leaves are found, protect the build (bamboo is exempt)
    if (!isTargetOre && !isTargetCrop && houseProtection && targetFamily !== "bamboo") {
        if (connectedLeavesCount === 0) {
            return { blocksToBreak: [], leavesToDecay: [] };
        }
    }

    // Sort blocks for fluid, visually satisfying break order:
    if (isTargetOre || isTargetCrop) {
        // Hypnotic concentric outward ripple wave from the break point
        blocksToBreak.sort((a, b) => {
            const distA = (a.x - startPos.x) ** 2 + (a.y - startPos.y) ** 2 + (a.z - startPos.z) ** 2;
            const distB = (b.x - startPos.x) ** 2 + (b.y - startPos.y) ** 2 + (b.z - startPos.z) ** 2;
            return distA - distB;
        });
    } else {
        // Trees: natural bottom-to-top felling from trunk up into the branches
        blocksToBreak.sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            const distA = (a.x - startPos.x) ** 2 + (a.z - startPos.z) ** 2;
            const distB = (b.x - startPos.x) ** 2 + (b.z - startPos.z) ** 2;
            return distA - distB;
        });
    }

    if (leavesToDecay.length > 0) {
        leavesToDecay.sort((a, b) => {
            const distA = (a.x - startPos.x) ** 2 + (a.y - startPos.y) ** 2 + (a.z - startPos.z) ** 2;
            const distB = (b.x - startPos.x) ** 2 + (b.y - startPos.y) ** 2 + (b.z - startPos.z) ** 2;
            return distA - distB;
        });
    }

    return { blocksToBreak, leavesToDecay };
}

/**
 * Plays rich, material-tailored vanilla sounds with musical pitch progression and completion chords
 */
function playHarvestSound(dimension, player, loc, typeId, isOreBlock, isCropBlock, index, total) {
    if (!isPlayerValid(player)) return;

    // Musical pitch progression: Climbing scale from 0.85 up to 1.85
    const progress = total > 1 ? index / (total - 1) : 1;
    const pitch = Math.min(2.0, 0.85 + (progress * 0.95));

    const soundLoc = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };

    if (isCropBlock) {
        // Crisp plant pluck + gentle soil pat
        player.playSound("block.sweet_berry_bush.pick", {
            location: soundLoc,
            pitch: pitch,
            volume: 0.7
        });
        player.playSound("step.grass", {
            location: soundLoc,
            pitch: 1.2,
            volume: 0.4
        });
    } else if (isOreBlock) {
        // Ore resonance: stone/deepslate crunch + magical amethyst chime
        if (typeId.includes("deepslate")) {
            player.playSound("dig.deepslate", {
                location: soundLoc,
                pitch: 1.1,
                volume: 0.8
            });
        } else {
            player.playSound("dig.stone", {
                location: soundLoc,
                pitch: 1.1,
                volume: 0.8
            });
        }

        // Shimmering crystal chime
        player.playSound("block.amethyst_block.chime", {
            location: soundLoc,
            pitch: pitch,
            volume: 0.6
        });

        // High tier gems (diamond, emerald, ancient debris) have extra resonance
        if (typeId.includes("diamond") || typeId.includes("emerald") || typeId.includes("ancient_debris")) {
            player.playSound("chime.amethyst_block", {
                location: soundLoc,
                pitch: Math.min(2.0, pitch + 0.2),
                volume: 0.8
            });
        }
    } else {
        // Trees: wood crack + bamboo wood snap
        player.playSound("dig.wood", {
            location: soundLoc,
            pitch: Math.min(1.6, 0.9 + (index * 0.03)),
            volume: 0.9
        });
        player.playSound("block.bamboo_wood.break", {
            location: soundLoc,
            pitch: Math.min(1.8, 1.0 + (index * 0.04)),
            volume: 0.5
        });
    }

    // Completion Chime: When the final block in the chain breaks!
    if (index === total - 1 && total > 2) {
        system.runTimeout(() => {
            if (!isPlayerValid(player)) return;

            if (isCropBlock) {
                player.playSound("random.orb", { pitch: 1.5, volume: 0.6 });
            } else if (isOreBlock) {
                // Celebratory chime: levelup chord + bell
                player.playSound("random.levelup", { pitch: 1.6, volume: 0.5 });
                if (typeId.includes("diamond") || typeId.includes("ancient_debris")) {
                    player.playSound("block.bell.resonate", { pitch: 1.6, volume: 0.7 });
                }
            } else {
                // Timber finish sound: deep wood creak / rustle
                player.playSound("block.azalea_leaves.break", { pitch: 0.9, volume: 0.8 });
                player.playSound("fall.big", { pitch: 1.8, volume: 0.3 });
            }
        }, 2);
    }
}

/**
 * Generator job to break blocks over time without lag, with fail-safe cleanup
 */
function* veinBreakGenerator(player, dimension, blocksToBreak, leavesToDecay, isTargetOre, originTypeId, config, isTargetCrop = false) {
    const airPerm = BlockPermutation.resolve("minecraft:air");
    let brokenCount = 0;

    try {
        for (let i = 0; i < blocksToBreak.length; i++) {
            // Terminate if player leaves the world
            if (!isPlayerValid(player)) break;

            const target = blocksToBreak[i];
            let block;
            try {
                block = dimension.getBlock(target);
            } catch {
                continue;
            }

            if (block && block.typeId === target.typeId) {
                // Check tool durability & safeguard
                const durabilityResult = handleToolDurability(player, config.safeguard);
                if (durabilityResult === "safeguard") {
                    player.sendMessage({ rawtext: [{ translate: "chopmine.msg.safeguard" }] });
                    player.playSound("note.bass", { pitch: 0.8, volume: 0.8 });
                    break;
                } else if (durabilityResult === "broken") {
                    player.playSound("random.break", { pitch: 1.0, volume: 1.0 });
                    break;
                }

                // Spawn drops or deliver directly into inventory
                spawnCustomLoot(player, dimension, target, target.typeId, isTargetOre, config.autoPickup, isTargetCrop);

                // Replant crop or turn block to air
                if (isTargetCrop) {
                    const cropData = CROP_FAMILIES[target.typeId];
                    const ground = dimension.getBlock({ x: target.x, y: target.y - 1, z: target.z });
                    if (cropData && ground && ground.typeId === cropData.ground) {
                        try {
                            const replantPerm = BlockPermutation.resolve(target.typeId, { [cropData.growthProp]: 0 });
                            block.setPermutation(replantPerm);
                        } catch {
                            block.setPermutation(airPerm);
                        }
                    } else {
                        block.setPermutation(airPerm);
                    }
                } else {
                    block.setPermutation(airPerm);
                }
                brokenCount++;

                // Visual particle feedback
                dimension.spawnParticle("chopmine:harvest_spark", {
                    x: target.x + 0.5,
                    y: target.y + 0.5,
                    z: target.z + 0.5
                });

                // Extra sparkly particles for precious ores
                if (isTargetOre && (target.typeId.includes("diamond") || target.typeId.includes("emerald") || target.typeId.includes("ancient_debris"))) {
                    try {
                        dimension.spawnParticle("minecraft:critical_hit_emitter", {
                            x: target.x + 0.5,
                            y: target.y + 0.5,
                            z: target.z + 0.5
                        });
                    } catch {}
                }

                // Advanced sound design: material-tailored sounds, rising pitch, 3D spatial audio, & finish chimes
                playHarvestSound(
                    dimension,
                    player,
                    target,
                    target.typeId,
                    isTargetOre,
                    isTargetCrop,
                    i,
                    blocksToBreak.length
                );

                // Screen impact feel (haptic camera rumble on heavy breaks)
                if (config.screenShake && brokenCount === 3) {
                    try {
                        player.runCommand("camerashake add @s 0.025 0.2 positional");
                    } catch {}
                }

                // Magnetic item attraction to player if not using direct auto-pickup
                if (config.magnet && !config.autoPickup) {
                    attractItems(dimension, target, player);
                }
            }

            // Yield every block: 1 block per tick lets the player visibly see and enjoy the ripple wave!
            yield;
        }

        // Process leaf decay for felled trees (smooth cascading decay at 2 leaves per tick)
        if (!isTargetOre && !isTargetCrop && config.leafDecay && leavesToDecay.length > 0 && isPlayerValid(player)) {
            for (let j = 0; j < leavesToDecay.length; j++) {
                const leafPos = leavesToDecay[j];
                let leafBlock;
                try {
                    leafBlock = dimension.getBlock(leafPos);
                } catch {
                    continue;
                }

                if (leafBlock && isLeaf(leafBlock.typeId)) {
                    try {
                        dimension.runCommand(`setblock ${leafPos.x} ${leafPos.y} ${leafPos.z} air destroy`);
                        if (config.magnet && !config.autoPickup) {
                            attractItems(dimension, leafPos, player);
                        }
                    } catch {}
                }
                if (j % 2 === 0) yield;
            }
        }

        // Display actionbar summary to player using multi-language rawtext
        if (isPlayerValid(player)) {
            const displayName = formatName(originTypeId);
            const totalCount = String(brokenCount + 1);
            player.onScreenDisplay.setActionBar({
                rawtext: [
                    {
                        translate: "chopmine.msg.harvested",
                        with: [displayName, totalCount]
                    }
                ]
            });
        }
    } catch (err) {
        logger.error("Vein mining job encountered a runtime failure", err, { player }, config.debugMode ? player : null);
    } finally {
        // FAIL-SAFE CLEANUP: Guarantee all coordinates are purged from active sessions
        for (const b of blocksToBreak) {
            activeMiningSessions.delete(`${b.x},${b.y},${b.z}`);
        }
    }
}

/**
 * Handles tool durability reduction and checks safeguard
 * Returns "safeguard", "broken", or "continue"
 */
function handleToolDurability(player, safeguard) {
    try {
        const equippable = player.getComponent(EntityComponentTypes.Equippable);
        if (!equippable) return "continue";

        const mainHand = equippable.getEquipment("Mainhand");
        if (!mainHand) return "broken";

        const durability = mainHand.getComponent(ItemComponentTypes.Durability);
        if (!durability) return "continue";

        // Safeguard: stop at 1 remaining durability
        const remainingDurability = durability.maxDurability - durability.damage;
        if (safeguard && remainingDurability <= 1) {
            return "safeguard";
        }

        // Calculate unbreaking
        const enchantable = mainHand.getComponent(ItemComponentTypes.Enchantable);
        const unbreakingLevel = enchantable?.getEnchantment("unbreaking")?.level ?? 0;
        const shouldDamage = Math.random() < 1 / (unbreakingLevel + 1);

        if (shouldDamage) {
            if (durability.damage + 1 >= durability.maxDurability) {
                // Tool broke! Clear mainhand item cleanly
                equippable.setEquipment("Mainhand", undefined);
                return "broken";
            } else {
                durability.damage += 1;
                equippable.setEquipment("Mainhand", mainHand);
            }
        }
    } catch (err) {
        logger.warn("Durability calculation encountered an issue, defaulting to safe continuation", { player });
    }

    return "continue";
}

/**
 * Spawns loot taking Silk Touch and Fortune enchantments into account,
 * or routes directly to player inventory if autoPickup is enabled.
 */
function spawnCustomLoot(player, dimension, pos, typeId, isTargetOre, autoPickup, isTargetCrop = false) {
    try {
        const equippable = player.getComponent(EntityComponentTypes.Equippable);
        const mainHand = equippable?.getEquipment("Mainhand");
        const enchantable = mainHand?.getComponent(ItemComponentTypes.Enchantable);

        const silkTouch = enchantable?.getEnchantment("silk_touch") !== undefined;
        const fortuneLevel = enchantable?.getEnchantment("fortune")?.level ?? 0;

        const loc = { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 };
        const container = autoPickup ? player.getComponent(EntityComponentTypes.Inventory)?.container : null;

        const deliverItem = (itemStack) => {
            if (container && container.emptySlotsCount > 0) {
                const leftover = container.addItem(itemStack);
                if (leftover) dimension.spawnItem(leftover, loc);
                player.playSound("random.pop", { pitch: 1.4, volume: 0.3 });
            } else {
                dimension.spawnItem(itemStack, loc);
            }
        };

        if (isTargetCrop) {
            const cropData = CROP_FAMILIES[typeId];
            if (cropData) {
                let cropDropCount = cropData.minDrop;
                if (cropData.maxDrop > cropData.minDrop) {
                    cropDropCount = Math.floor(Math.random() * (cropData.maxDrop - cropData.minDrop + 1)) + cropData.minDrop;
                }
                if (fortuneLevel > 0 && cropData.fortuneBonus) {
                    cropDropCount += Math.floor(Math.random() * (fortuneLevel + 1));
                }

                // If the crop itself serves as its seed, reserve 1 unit for the replanted crop
                if (!cropData.seedDrop) {
                    cropDropCount = Math.max(1, cropDropCount - 1);
                }

                deliverItem(new ItemStack(cropData.drop, cropDropCount));

                // Extra seed drops for wheat and beetroot
                if (cropData.seedDrop) {
                    let seedCount = Math.floor(Math.random() * (cropData.maxSeed - cropData.minSeed + 1)) + cropData.minSeed;
                    if (fortuneLevel > 0) {
                        seedCount += Math.floor(Math.random() * (fortuneLevel + 1));
                    }
                    seedCount = Math.max(0, seedCount - 1);
                    if (seedCount > 0) {
                        deliverItem(new ItemStack(cropData.seedDrop, seedCount));
                    }
                }

                // Poisonous potato rare drop (2% chance)
                if (typeId.includes("potato") && Math.random() < 0.02) {
                    deliverItem(new ItemStack("minecraft:poisonous_potato", 1));
                }
            }
            return;
        }

        if (!isTargetOre) {
            // Logs drop themselves
            deliverItem(new ItemStack(typeId, 1));
            return;
        }

        const oreData = ORE_FAMILIES[typeId];
        if (!oreData) {
            deliverItem(new ItemStack(typeId, 1));
            return;
        }

        if (silkTouch) {
            // Drop the actual ore block
            deliverItem(new ItemStack(typeId, 1));
        } else {
            // Calculate fortune bonus
            let dropAmount = 1;
            if (oreData.minDrop && oreData.maxDrop) {
                dropAmount = Math.floor(Math.random() * (oreData.maxDrop - oreData.minDrop + 1)) + oreData.minDrop;
            }

            if (oreData.fortune && fortuneLevel > 0) {
                const multiplier = Math.floor(Math.random() * (fortuneLevel + 2));
                dropAmount = dropAmount * (multiplier > 0 ? multiplier : 1);
            }

            deliverItem(new ItemStack(oreData.drop, Math.max(1, dropAmount)));

            // Experience handling
            if (oreData.xp[1] > 0) {
                const xp = Math.floor(Math.random() * (oreData.xp[1] - oreData.xp[0] + 1)) + oreData.xp[0];
                if (xp > 0) {
                    if (autoPickup && typeof player.addExperience === "function") {
                        player.addExperience(xp);
                        player.playSound("random.orb", { pitch: 1.5, volume: 0.2 });
                    } else {
                        try {
                            dimension.runCommand(`summon xp_orb ${loc.x} ${loc.y} ${loc.z}`);
                        } catch {}
                    }
                }
            }
        }
    } catch (err) {
        logger.error("Failed to spawn loot item, attempting emergency item drop", err, { location: pos, target: typeId, player });
        try {
            dimension.spawnItem(new ItemStack(typeId, 1), { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 });
        } catch {}
    }
}

/**
 * Magnetically pulls spawned items and experience orbs toward the player.
 * Strictly excludes player entities so players are never teleported.
 */
function attractItems(dimension, fromPos, player) {
    if (!isPlayerValid(player)) return;
    const playerPos = player.location;
    if (!playerPos) return;

    try {
        // 1. Attract items
        const items = dimension.getEntities({
            location: fromPos,
            maxDistance: 5.0,
            type: "minecraft:item"
        });

        for (const item of items) {
            if (item.typeId === "minecraft:player" || item.id === player.id) continue;
            item.teleport({
                x: playerPos.x,
                y: playerPos.y + 0.1,
                z: playerPos.z
            });
        }

        // 2. Attract XP orbs
        const xpOrbs = dimension.getEntities({
            location: fromPos,
            maxDistance: 5.0,
            type: "minecraft:xp_orb"
        });

        for (const orb of xpOrbs) {
            if (orb.typeId === "minecraft:player" || orb.id === player.id) continue;
            orb.teleport({
                x: playerPos.x,
                y: playerPos.y + 0.1,
                z: playerPos.z
            });
        }
    } catch {}
}

/**
 * Formats a block identifier into a clean, human-readable name
 */
function formatName(typeId) {
    return typeId
        .replace("minecraft:", "")
        .replace("deepslate_", "Deepslate ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}
