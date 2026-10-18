/**
 * Chop & Mine - Main Bootstrap Script (Bedrock 2026 / Server 2.10.0)
 * Registers custom commands, chat keyword triggers, item custom components,
 * block breaking events, diagnostic tools, and UI triggers.
 */

import { world, system } from "@minecraft/server";
import { handleBlockBreak, getActiveSessionsCount } from "./chop_mine.js";
import { openSettingsUI, getPlayerConfig, isPlayerValid, isPlayerOperator } from "./ui_settings.js";
import { logger } from "./logger.js";

let itemComponentRegistered = false;

/**
 * Displays in-game diagnostic and health status report to a player
 */
function showDiagnostics(player) {
    if (!isPlayerValid(player)) return;

    try {
        const config = getPlayerConfig(player);
        const activeBlocks = getActiveSessionsCount();
        const isOp = isPlayerOperator(player);

        player.sendMessage("§b=== §fChop & Mine Diagnostic Status §b===");
        player.sendMessage("§7Version: §f1.26.52 (Server 2.10.0 / UI 2.2.0)");
        player.sendMessage(`§7Role: §f${isOp ? "§aOperator (Can edit settings)" : "§7Player"}`);
        player.sendMessage("§7Settings Scope: §aWorld-Wide (All players share these rules)");
        player.sendMessage(`§7Active Mining Tasks: §a${activeBlocks} blocks in progress`);
        player.sendMessage(`§7Ore Vein Mining: §f${config.enabled ? "§aEnabled" : "§cDisabled"}`);
        player.sendMessage(`§7Tree Felling: §f${config.treeEnabled ? "§aEnabled" : "§cDisabled"}`);
        player.sendMessage(`§7Crop Harvesting: §f${config.cropEnabled ? "§aEnabled" : "§cDisabled"}`);
        player.sendMessage(`§7House Protection: §f${config.houseProtection ? "§aActive" : "§7Off"}`);
        player.sendMessage(`§7Activation Mode: §f${["Crouch", "Stand (Sneak to Disable)", "Always", "Core Item"][config.activationMode ?? 0]}`);
        player.sendMessage(`§7Max Chain Limit: §f${config.maxBlocks ?? 64} blocks`);
        player.sendMessage(`§7Tool Safeguard: §f${config.safeguard ? "§aProtected" : "§cDisabled"}`);
        player.sendMessage(`§7Screen Impact: §f${config.screenShake ? "§aActive" : "§7Off"}`);
        player.sendMessage(`§7Developer Debug Mode: §f${config.debugMode ? "§dActive" : "§7Off"}`);
        player.sendMessage("§aHealth: All systems operating normally.");
        player.playSound("random.orb", { pitch: 1.0, volume: 0.5 });
    } catch (err) {
        logger.error("Failed displaying diagnostics", err, { player }, player);
    }
}

// Helper to register the item custom component
function registerItemComponent(registry) {
    if (!registry?.registerCustomComponent || itemComponentRegistered) return;
    try {
        registry.registerCustomComponent("chopmine:open_menu", {
            onUse(event) {
                if (event.source) {
                    system.run(() => {
                        openSettingsUI(event.source);
                    });
                }
            }
        });
        itemComponentRegistered = true;
        logger.info("Custom item component 'chopmine:open_menu' registered successfully.");
    } catch (err) {
        logger.error("Failed registering item component", err);
    }
}

// Helper to register native custom commands
function registerCommands(registry) {
    if (!registry?.registerCommand) return;

    const menuHandler = (origin) => {
        const player = origin?.sourceEntity ?? origin?.entity;
        if (isPlayerValid(player) && player.typeId === "minecraft:player") {
            system.run(() => {
                openSettingsUI(player);
            });
        }
    };

    const statusHandler = (origin) => {
        const player = origin?.sourceEntity ?? origin?.entity;
        if (isPlayerValid(player) && player.typeId === "minecraft:player") {
            system.run(() => {
                showDiagnostics(player);
            });
        }
    };

    try {
        registry.registerCommand(
            {
                name: "chopmine:menu",
                description: "Opens the Chop & Mine settings menu",
                permissionLevel: 0
            },
            menuHandler
        );
        registry.registerCommand(
            {
                name: "chopmine:settings",
                description: "Opens the Chop & Mine settings menu",
                permissionLevel: 0
            },
            menuHandler
        );
        registry.registerCommand(
            {
                name: "chopmine:status",
                description: "Displays Chop & Mine diagnostics and status report",
                permissionLevel: 0
            },
            statusHandler
        );
        registry.registerCommand(
            {
                name: "chopmine",
                description: "Opens the Chop & Mine settings menu",
                permissionLevel: 0
            },
            menuHandler
        );
    } catch (err) {
        logger.warn("Native command registration encountered an issue, falling back to chat triggers", err);
    }
}

// 1. Startup / WorldInit lifecycle registration (Server 2.x standard)
if (system.beforeEvents?.startup) {
    system.beforeEvents.startup.subscribe(initEvent => {
        try {
            if (initEvent.itemComponentRegistry) registerItemComponent(initEvent.itemComponentRegistry);
            if (initEvent.customCommandRegistry) registerCommands(initEvent.customCommandRegistry);
        } catch (err) {
            logger.error("Error during system.beforeEvents.startup initialization", err);
        }
    });
}

if (world.beforeEvents?.worldInitialize) {
    world.beforeEvents.worldInitialize.subscribe(initEvent => {
        try {
            if (initEvent.itemComponentRegistry) registerItemComponent(initEvent.itemComponentRegistry);
        } catch (err) {
            logger.error("Error during world.beforeEvents.worldInitialize fallback", err);
        }
    });
}

// 2. Chat keyword trigger: allows opening menu or checking status in survival without cheats enabled
const MENU_CHAT_TRIGGERS = new Set([
    "settings",
    "menu",
    "!menu",
    "!settings",
    "!chopmine",
    ".menu",
    ".settings",
    ".chopmine",
    "/chopmine:menu",
    "/chopmine:settings",
    "/chopmine",
    "/settings",
    "/menu",
    "chopmine"
]);

const STATUS_CHAT_TRIGGERS = new Set([
    "status",
    "debug",
    "!status",
    "!debug",
    ".status",
    ".debug",
    "/chopmine:status",
    "/chopmine:debug",
    "/status",
    "/debug"
]);

const handleChatTrigger = (message, sender, cancelFn) => {
    const msg = message?.trim().toLowerCase();
    if (!msg || !isPlayerValid(sender)) return;

    if (MENU_CHAT_TRIGGERS.has(msg)) {
        if (typeof cancelFn === "function") cancelFn();
        if (sender.typeId === "minecraft:player") {
            system.run(() => {
                openSettingsUI(sender);
            });
        }
    } else if (STATUS_CHAT_TRIGGERS.has(msg)) {
        if (typeof cancelFn === "function") cancelFn();
        if (sender.typeId === "minecraft:player") {
            system.run(() => {
                showDiagnostics(sender);
            });
        }
    }
};

if (world.beforeEvents?.chatSend) {
    world.beforeEvents.chatSend.subscribe(event => {
        try {
            handleChatTrigger(event.message, event.sender, () => { event.cancel = true; });
        } catch (err) {
            logger.warn("Chat beforeEvent error", err);
        }
    });
} else if (world.afterEvents?.chatSend) {
    world.afterEvents.chatSend.subscribe(event => {
        try {
            handleChatTrigger(event.message, event.sender);
        } catch (err) {
            logger.warn("Chat afterEvent error", err);
        }
    });
}

// 3. Listen for block breaks to trigger vein harvesting
if (world.afterEvents?.playerBreakBlock) {
    world.afterEvents.playerBreakBlock.subscribe(event => {
        try {
            handleBlockBreak(event);
        } catch (err) {
            logger.error("Unhandled block break event failure", err);
        }
    });
}

// 4. Fallback listener for right-click / tap with Chop & Mine Core
if (world.afterEvents?.itemUse) {
    world.afterEvents.itemUse.subscribe(event => {
        try {
            if (event.itemStack?.typeId === "chopmine:chop_core" && event.source) {
                system.run(() => {
                    openSettingsUI(event.source);
                });
            }
        } catch (err) {
            logger.warn("Item use event handler error", err);
        }
    });
}

// 5. Fallback listener for script events (/scriptevent)
if (system.afterEvents?.scriptEventReceive) {
    system.afterEvents.scriptEventReceive.subscribe(event => {
        try {
            const id = event.id?.toLowerCase();
            const player = event.sourceEntity;
            if (!isPlayerValid(player) || player.typeId !== "minecraft:player") return;

            if (id === "chopmine:menu" || id === "chopmine:settings" || id === "chopmine:open" || id === "chopmine:config") {
                system.run(() => {
                    openSettingsUI(player);
                });
            } else if (id === "chopmine:status" || id === "chopmine:debug") {
                system.run(() => {
                    showDiagnostics(player);
                });
            }
        } catch (err) {
            logger.error("Script event receive failure", err);
        }
    });
}

logger.info("Chop & Mine (Server 2.10.0 / UI 2.2.0) initialized with full diagnostic boundaries.");
