/**
 * Chop & Mine - In-Game Settings Interface
 * Powered by @minecraft/server-ui ModalFormData with persistent Dynamic Properties.
 */

import { world, system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { logger } from "./logger.js";

export const DEFAULT_CONFIG = {
    enabled: true,
    treeEnabled: true,
    cropEnabled: true,
    houseProtection: true,
    leafDecay: true,
    magnet: true,
    autoPickup: false,
    activationMode: 0, // 0: Crouch, 1: Stand (Sneak to Disable), 2: Always, 3: Core Item
    maxBlocks: 64,
    safeguard: true,
    screenShake: true,
    debugMode: false
};

/**
 * Checks if a player entity reference is currently valid in the world
 */
export function isPlayerValid(p) {
    if (!p) return false;
    try {
        if (typeof p.isValid === "function") return p.isValid();
        if (typeof p.isValid === "boolean") return p.isValid;
    } catch {}
    return true;
}

/**
 * Checks if a player has operator permissions in the world.
 * Works seamlessly in survival worlds with cheats disabled.
 */
export function isPlayerOperator(p) {
    if (!isPlayerValid(p)) return false;
    try {
        if (typeof p.isOp === "function" && p.isOp()) return true;
    } catch {}
    try {
        if (p.hasTag("op") || p.hasTag("operator") || p.hasTag("admin")) return true;
    } catch {}
    // Solo survival fallback: if there is only 1 player in the world, that player is the host/operator
    try {
        const players = world.getAllPlayers();
        if (players.length === 1 && players[0]?.id === p.id) {
            return true;
        }
    } catch {}
    return false;
}

/**
 * Validates and self-heals a configuration object against DEFAULT_CONFIG schema
 */
function sanitizeConfig(parsed) {
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_CONFIG };

    return {
        enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_CONFIG.enabled,
        treeEnabled: typeof parsed.treeEnabled === "boolean" ? parsed.treeEnabled : DEFAULT_CONFIG.treeEnabled,
        cropEnabled: typeof parsed.cropEnabled === "boolean" ? parsed.cropEnabled : DEFAULT_CONFIG.cropEnabled,
        houseProtection: typeof parsed.houseProtection === "boolean" ? parsed.houseProtection : DEFAULT_CONFIG.houseProtection,
        leafDecay: typeof parsed.leafDecay === "boolean" ? parsed.leafDecay : DEFAULT_CONFIG.leafDecay,
        magnet: typeof parsed.magnet === "boolean" ? parsed.magnet : DEFAULT_CONFIG.magnet,
        autoPickup: typeof parsed.autoPickup === "boolean" ? parsed.autoPickup : DEFAULT_CONFIG.autoPickup,
        activationMode: (typeof parsed.activationMode === "number" && parsed.activationMode >= 0 && parsed.activationMode <= 3)
            ? parsed.activationMode
            : DEFAULT_CONFIG.activationMode,
        maxBlocks: (typeof parsed.maxBlocks === "number" && parsed.maxBlocks >= 16 && parsed.maxBlocks <= 128)
            ? parsed.maxBlocks
            : DEFAULT_CONFIG.maxBlocks,
        safeguard: typeof parsed.safeguard === "boolean" ? parsed.safeguard : DEFAULT_CONFIG.safeguard,
        screenShake: typeof parsed.screenShake === "boolean" ? parsed.screenShake : DEFAULT_CONFIG.screenShake,
        debugMode: typeof parsed.debugMode === "boolean" ? parsed.debugMode : DEFAULT_CONFIG.debugMode
    };
}

/**
 * Loads the shared world settings with schema validation and self-healing.
 * Settings apply globally to all players in the world.
 */
export function getWorldConfig() {
    try {
        const raw = world.getDynamicProperty("chopmine:config");
        if (typeof raw === "string" && raw.length > 0) {
            const parsed = JSON.parse(raw);
            return sanitizeConfig(parsed);
        }
    } catch (err) {
        logger.warn("Corrupted world configuration detected. Self-healing to default settings.");
        setWorldConfig(DEFAULT_CONFIG);
    }
    return { ...DEFAULT_CONFIG };
}

/**
 * Saves shared world settings to persistent world dynamic properties.
 */
export function setWorldConfig(config) {
    try {
        const validated = sanitizeConfig(config);
        world.setDynamicProperty("chopmine:config", JSON.stringify(validated));
    } catch (err) {
        logger.error("Failed to save world dynamic properties", err);
    }
}

/**
 * Returns world configuration (applies to all players)
 */
export function getPlayerConfig(player) {
    return getWorldConfig();
}

/**
 * Saves world configuration
 */
export function setPlayerConfig(player, config) {
    setWorldConfig(config);
}

/**
 * Opens the graphical settings dialog with automatic UserBusy retry loop.
 * Only world operators are permitted to open and change settings.
 */
export async function openSettingsUI(player) {
    if (!isPlayerValid(player)) return;

    // Operator check: only world operators can open and adjust settings
    if (!isPlayerOperator(player)) {
        player.sendMessage({ rawtext: [{ translate: "chopmine.msg.op_only" }] });
        player.playSound("note.bass", { pitch: 0.8, volume: 0.8 });
        return;
    }

    let config;
    try {
        config = getWorldConfig();
    } catch (err) {
        logger.error("Failed reading world config for UI", err, { player }, player);
        config = { ...DEFAULT_CONFIG };
    }

    const form = new ModalFormData()
        .title({ rawtext: [{ translate: "chopmine.menu.title" }] })
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.enabled" }] },
            { defaultValue: Boolean(config.enabled) }
        )
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.tree_enabled" }] },
            { defaultValue: Boolean(config.treeEnabled) }
        )
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.crop_enabled" }] },
            { defaultValue: Boolean(config.cropEnabled ?? true) }
        )
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.house_protection" }] },
            { defaultValue: Boolean(config.houseProtection ?? true) }
        )
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.leaf_decay" }] },
            { defaultValue: Boolean(config.leafDecay) }
        )
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.magnet" }] },
            { defaultValue: Boolean(config.magnet) }
        )
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.auto_pickup" }] },
            { defaultValue: Boolean(config.autoPickup ?? false) }
        )
        .dropdown(
            { rawtext: [{ translate: "chopmine.menu.mode" }] },
            [
                { rawtext: [{ translate: "chopmine.menu.mode.crouch" }] },
                { rawtext: [{ translate: "chopmine.menu.mode.stand" }] },
                { rawtext: [{ translate: "chopmine.menu.mode.always" }] },
                { rawtext: [{ translate: "chopmine.menu.mode.core" }] }
            ],
            { defaultValueIndex: Math.min(3, Math.max(0, Number(config.activationMode ?? 0))) }
        )
        .slider(
            { rawtext: [{ translate: "chopmine.menu.max_blocks" }] },
            16,
            128,
            {
                valueStep: 8,
                defaultValue: Number(config.maxBlocks ?? 64)
            }
        )
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.safeguard" }] },
            { defaultValue: Boolean(config.safeguard) }
        )
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.screen_shake" }] },
            { defaultValue: Boolean(config.screenShake ?? true) }
        )
        .toggle(
            { rawtext: [{ translate: "chopmine.menu.debug_mode" }] },
            { defaultValue: Boolean(config.debugMode ?? false) }
        );

    // Bedrock retry loop: When chat is open, Bedrock returns cancelationReason 'UserBusy'.
    // We retry every 4 ticks (up to 25 attempts / 5 seconds) until chat closes and the menu can display.
    for (let attempt = 0; attempt < 25; attempt++) {
        if (!isPlayerValid(player)) return;

        try {
            const response = await form.show(player);

            if (response.canceled) {
                // If user was busy (chat screen still closing), wait and retry
                if (response.cancelationReason === "UserBusy") {
                    await system.waitTicks(4);
                    continue;
                }
                // If user pressed Escape / 'X', cleanly exit
                return;
            }

            if (!response.formValues) return;

            const [
                enabled,
                treeEnabled,
                cropEnabled,
                houseProtection,
                leafDecay,
                magnet,
                autoPickup,
                activationMode,
                maxBlocks,
                safeguard,
                screenShake,
                debugMode
            ] = response.formValues;

            const newConfig = {
                enabled,
                treeEnabled,
                cropEnabled,
                houseProtection,
                leafDecay,
                magnet,
                autoPickup,
                activationMode,
                maxBlocks,
                safeguard,
                screenShake,
                debugMode
            };

            setWorldConfig(newConfig);
            player.sendMessage({ rawtext: [{ translate: "chopmine.msg.settings_saved" }] });
            player.playSound("random.orb", { pitch: 1.2, volume: 0.6 });
            return;
        } catch (err) {
            logger.error("Settings dialog encountered an unexpected error", err, { player }, player);
            break;
        }
    }
}
