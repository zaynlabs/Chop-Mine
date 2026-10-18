# 🪓 Chop & Mine — Minecraft Bedrock Add-on

A modern, high-performance add-on for **Minecraft Bedrock Edition (Client 1.26.52+)** that lets you fell entire trees and mine entire ore veins quickly with zero lag, smooth audio-visual ripples, magnetic item collection, house protection, and full tool safety.

---

## ✨ Features at a Glance

- **⚡ Zero Lag Cascading Wave**: Breaks connected blocks in a smooth ripple (3 blocks per tick) using background jobs so your game never stutters or freezes.
- **🌲 All Tree & Bamboo Types Supported**: Chops down Oak, Birch, Spruce, Jungle, Acacia, Dark Oak, Mangrove, Cherry, Pale Oak, Bamboo, Crimson, and Warped trees in one cut.
- **🏡 Smart House Protection**: Natural trees have leaves attached to their canopy. When House Protection is on, breaking decorative logs or wooden walls inside your home will only break a single block — never your house!
- **🍂 Fast Leaf Decay**: Surrounding leaves gently decay when a tree is felled, dropping sticks, apples, and saplings automatically.
- **⛏️ Authentic Mining Tiers**: Respects vanilla pickaxe tiers (e.g. Iron Pickaxe required for Diamond/Gold/Emerald/Redstone, Diamond Pickaxe for Ancient Debris).
- **🛡️ Tool Safeguard**: Stops harvesting automatically when your tool reaches 1 durability remaining, so your favorite enchanted pickaxe or axe will never accidentally break.
- **✨ Enchantment & XP Support**: Fully compatible with **Fortune** (extra drops) and **Silk Touch** (raw blocks), plus spawns vanilla experience points.
- **🧲 Magnetic Suction & Auto-Pickup**: Harvested items and XP orbs glide smoothly toward you, or land straight in your inventory so loot never falls into deep ravines or lava.
- **⚙️ In-Game Settings Menu**: Open a menu anytime with `/chopmine:menu` or `/menu` or by using the Core.
- **🩺 Diagnostic & Health Tools**: Type `/status` or `/chopmine:status` in chat for an instant live report on active harvesting tasks and settings.

---

## 🚀 One-Click Install
1. Double-click the **`ChopAndMine.mcaddon`** file.
2. Minecraft Bedrock will open and import the packs automatically.
3. In your world settings:
   - Under **Behavior Packs**, activate **Chop & Mine (BP)**.
   - Under **Resource Packs**, activate **Chop & Mine (RP)**.
4. Enter your world and start mining!

---

## 🎮 How to Play

### 1. Flexible Activation Modes
You can customize how vein harvesting activates in the settings menu:

- **Crouch (Sneak) to Harvest** *(Default)*: Crouch and mine to trigger the chain reaction. Mine while standing to break only one block.
- **Stand to Harvest (Sneak to Disable)**: Mine normally while standing to veinmine whole clusters. Crouch whenever you want to mine just a single block carefully!
- **Always Active**: Every matching ore or tree block you mine triggers the chain.
- **Require Chop & Mine Core**: Vein harvesting only activates when holding the craftable Core item.

---

### 2. The Chop & Mine Core (Craftable Gadget)
You can craft the **Chop & Mine Core** on a crafting table using common early-game materials:

```
  [   ]  [Redstone]  [   ]
[Amethyst] [Iron]  [Amethyst]
  [   ]  [Redstone]  [   ]
```
- **Ingredients**: 1 Iron Ingot (center), 2 Amethyst Shards (left & right), 2 Redstone Dust (top & bottom).
- **In-Hand**: Right-click or hold the screen with the Core to open the in-game settings menu.

---

### 3. In-Game Settings Menu
You can customize the add-on at any time:
- Type **`/chopmine:menu`**, **`menu`**, or **`settings`** directly in chat.
- Or right-click / tap while holding the **Chop & Mine Core**.

| Setting | Description | Default |
|---|---|---|
| **Enable Ore Vein Harvesting** | Turns ore vein mining on or off | `ON` |
| **Enable Tree Felling** | Turns tree chopping on or off | `ON` |
| **House Protection (Require Leaves)** | Requires leaves attached to logs so player-built houses are never destroyed | `ON` |
| **Fast Leaf Decay** | Causes leaves on felled trees to decay automatically | `ON` |
| **Magnetic Item Collection** | Pulls dropped items and XP directly to your feet | `ON` |
| **Auto-Pickup to Inventory** | Places harvested blocks and XP directly into your inventory | `OFF` |
| **Activation Mode** | Choose between **Crouch to Harvest**, **Stand to Harvest (Sneak to Disable)**, **Always Active**, or **Require Core Item** | `Crouch` |
| **Maximum Blocks per Chain** | Limits how many blocks can break in one chain (16 to 128) | `64` |
| **Tool Durability Safeguard** | Stops mining if tool durability reaches 1 HP to prevent breakage | `ON` |
| **Developer Debug Mode** | Displays real-time harvest traces on-screen and in console | `OFF` |

---

### 4. Diagnostics & Status Check
Need to see if everything is running smoothly? Type **`status`** or **`/scriptevent chopmine:status`** in chat to view live diagnostic metrics:
- Active mining queue size
- Active settings summary
- Overall add-on health status

---

## 📂 Project Structure

```
Chop and Mine/
├── README.md                            <-- This beginner-friendly guide
├── AGENTS.md                            <-- Technical maintainer & agent instructions
├── ChopAndMine.mcaddon                  <-- Installable package
├── install_addon.py                     <-- Sync script to Bedrock dev folders
├── BP/                                  <-- Behavior Pack
│   ├── manifest.json                    <-- Pack info, server 2.10.0 & ui 2.2.0 dependencies
│   ├── items/chop_core.json             <-- 3D Core item definition
│   ├── recipes/chop_core.json           <-- Crafting table recipe
│   └── scripts/
│       ├── main.js                      <-- Event listeners, commands & diagnostic handlers
│       ├── logger.js                    <-- Centralized logging & error boundaries
│       ├── chop_mine.js                 <-- BFS crawler, generator job, safety cleanup & drops
│       ├── block_registry.js            <-- Ore, tree, leaf & tool registries
│       └── ui_settings.js               <-- In-game settings modal dialog & self-healing config
└── RP/                                  <-- Resource Pack
    ├── manifest.json
    ├── pack_icon.png                    <-- High-definition pack icon
    ├── attachables/chop_core.json       <-- Handheld display setup
    ├── models/entity/chop_core.geo.json <-- Blockbench 3D model
    ├── animations/chop_core.animation.json <-- Idle floating & rotation animation
    ├── particles/harvest_spark.json     <-- Snowstorm particle effect
    ├── texts/en_US.lang                 <-- Multi-language translation strings
    └── textures/
        ├── item_texture.json            <-- Item texture atlas
        ├── items/chop_core.png          <-- Inventory sprite
        └── entity/chop_core.png         <-- 3D model skin
```

---

## ❓ Frequently Asked Questions (FAQ)

**Q: I broke an ore while crouching, but only one block broke. Why?**  
A: Check your tool! You must use the correct tool tier (e.g. at least an Iron pickaxe for diamonds, redstone, or gold). Also ensure Vein Mining is enabled in the `/menu`.

**Q: I broke a wooden block in my house and it didn't chain-break. Why?**  
A: That's **House Protection** in action! Because your house doesn't have living tree leaves connected to it, the add-on knows it's a building and leaves it completely safe (no pun intended).

**Q: Why didn't the tree chop down completely?**  
A: If your tool had low durability, the **Tool Safeguard** stopped harvesting to protect your tool from breaking! Repair your tool with an anvil, mending, or grindstone to continue.

**Q: How do I check if the add-on is healthy?**  
A: Simply type **`/status`** in chat to see a live diagnostic health report.
