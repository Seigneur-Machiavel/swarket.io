# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Swarket.io** (or "Hive-Trade") is a multiplayer P2P browser game built on top of **hive-p2p**. Players compete in a turn-based economy simulation where they manage resources, build infrastructure, trade, and survive by maintaining energy levels. The game runs entirely peer-to-peer with consensus mechanisms to keep the distributed game state synchronized.

## Core Architecture

### P2P Network Layer (hive-p2p)
- **Node**: Each player runs a P2P node that manages connections, messaging, and trust
- **Bootstrap Node**: Public node (bee0) that facilitates initial connections
- **Clock Synchronization**: Uses `HiveP2P.CLOCK.mockMode = true` for deterministic time in tests
- Automated topology management is **disabled** (`incomingOffer: false`, `spreadOffers: false`) to give players manual control over connections

### Game Client Architecture
The game follows a distributed turn-based execution model:

1. **Turn System** (`turn-system.mjs`):
   - Fixed turn duration (default 2000ms)
   - T0-based scheduling for synchronized execution across peers
   - Players submit "intents" (actions) halfway through each turn
   - Turn hash is computed from prevHash + height + all player states

2. **Consensus Mechanism** (`consensus.mjs`):
   - Peers gossip their `prevHash` with each turn intent
   - Before executing a turn, each node checks if 3+ peers have a different hash
   - If desynced, the node requests full game state from a trusted peer
   - Uses deterministic seeded random (`SeededRandom`) for fair resource distribution

3. **GameClient** (`game.mjs`):
   - Main game coordinator that runs on each peer
   - Manages players dictionary, turn execution loop, and sync requests
   - Listens to P2P events: `onPeerConnect`, `onGossipData`, `onMessageData`
   - Bootstrap nodes (`node.publicUrl` truthy) create new `PlayerNode` instances for connecting peers

4. **PlayerNode** (`player.mjs`):
   - Represents a player's game state (inventory, buildings, energy, upgrades)
   - Executes intents and turn logic (production, consumption, death)
   - Energy management: players die when energy reaches 0
   - Recycling: dead players' inventories can be salvaged by living players

5. **Buildings System** (`buildings.mjs`):
   - `Reactor`: Converts raw resources (chips, engineers) into energy
   - `Fabricator`: Planned for crafting higher-tier resources
   - `TradeHub`: Manages max P2P connections
   - Each building has production lines with configurable rates (0, .25, .5, .75, 1)
   - Module upgrade system for building enhancements

### Resource Economy
- **Raw Resources** (Tier 1): `chips`, `engineers`, `datas`, `models`
- Each player is assigned one "operating resource" at spawn
- Energy is consumed for maintenance and actions, produced by the Reactor
- Entropy increases over time (+2% consumption every 60 turns)

### Actions & Intents
Players submit intents via `GameClient.digestMyAction()`:
- `upgrade`: Pick an upgrade from current offers
- `upgrade-module`: Upgrade a building module
- `set-param`: Adjust production rates
- `recycle`: Salvage resources from dead players
- `transaction`: (Planned) Trade resources with peers

Intents are validated, deduplicated, and executed in deterministic order (shuffled by prevHash).

## Running the Project

### Development Server
```bash
node server.mjs
```
- Starts Express server on `http://localhost:27260`
- Serves `/public` as static files
- Serves `/public-debug` if `IS_DEBUG = true`
- Creates bootstrap node (bee0) on port 27261
- Spawns 2 bot players by default (configured in server.mjs:69)

### Client Connection
Open `http://localhost:27260` in a browser. Add `?debug=1` to enable auto-play mode.

### Debug Mode
- Server: Set `IS_DEBUG = true` in `server.mjs`
- Client: Add `?debug=1` query param to URL
- Auto-play bots will handle upgrades, recycling, and respawning

## Key Development Commands

Since this is a plain JS project with no build step:
- **Start server**: `node server.mjs`
- **Install dependencies**: `npm install`

There are no tests, linters, or build tools configured yet.

## Important Implementation Notes

### Turn Execution Timing
- Players must send intents **between 60% and 55% of turn completion** (see `turn-system.mjs:189`)
- Late intents are rejected and penalized with trust reduction
- This prevents race conditions in distributed execution

### State Synchronization
- New players request game state via `get-game-state` direct message
- Bootstrap sends `game-state-incoming` (for clock sync) then `game-state` (full data)
- T0 is recalculated based on drift: `T0 = T0Reference - (turnDuration * (height - 1))`

### Player Lifecycle
- **Spawn**: Player joins when connecting to bootstrap, starts next turn
- **Active**: Has energy > 0, executes production and actions
- **Dead**: Energy = 0, inventory recyclable for ~30 turns
- **Removed**: Dead with no resources or dead for 30+ turns

### Building Data Serialization
Buildings are class instances that must be rebuilt after deserialization:
- Use `BuildingBuilder.rebuildClasseIfItCanBe()` when importing player data
- All serializable objects implement `extract()` and have static `fromData()` methods

### Module Files Not to Edit Directly
- `hive-p2p` is imported from `node_modules`, not bundled
- Browser loads it from `/hive-p2p` route served by Express
- Uses dynamic imports with different paths for Node.js vs browser (see `consensus.mjs:1-3`)

## UI Components

Located in `public/rendering/`:
- `UI-components.mjs`: HUD elements (stats, connections, energy bar, upgrade offers, dead nodes list)
- `NetworkRenderer.mjs`: Canvas-based P2P network graph visualization
- `visualizer.mjs`: Wrapper around `NetworkVisualizer` with message route animations
- Building components: `reactor-component.mjs`, `fabricator-component.mjs`, `tradehub-component.mjs`

UI updates happen in `main.mjs` via `onExecutedTurn` callbacks.

## File Organization

```
public/
├── game-logics/          # Core game mechanics
│   ├── game.mjs         # GameClient orchestrator
│   ├── turn-system.mjs  # Turn scheduling & consensus
│   ├── player.mjs       # PlayerNode state & logic
│   ├── buildings.mjs    # Building classes
│   ├── actions.mjs      # Intent validation
│   ├── consensus.mjs    # Consensus & seeded random
│   ├── resources.mjs    # Resource types & inventory
│   └── upgrades.mjs     # Upgrade system
├── rendering/           # UI components
├── pre-game/            # Connection UI
├── main.mjs            # Browser entry point
└── index.html

public-debug/
└── auto-play.mjs        # Bot AI for testing

server.mjs              # Express server & bootstrap node
```

## Common Pitfalls

1. **Turn Hash Mismatch**: Ensure all state mutations are deterministic. Use `SeededRandom` for any randomness.
2. **Clock Drift**: The game uses `node.time` (synchronized via hive-p2p), not `Date.now()`
3. **Intent Timing**: Actions sent too late in a turn are rejected. Always check `maxSentTime`.
4. **Class Deserialization**: When reading player data from network, rebuild Building classes properly.
5. **Energy Death**: Players with 0 energy stop executing turns. Clear offers and limit connections when dead.

## Debugging Tools

Exposed globals in browser console:
- `window.hiveNode`: Access the local P2P node
- `window.gameClient`: Access the GameClient instance
- `window.networkVisualizer`: Control network visualization
- `window.autoPlayer`: (debug mode) Control the bot

Verbose logging levels (set in `server.mjs` or `main.mjs`):
- `verbose: 0` - Silent
- `verbose: 1` - Important events
- `verbose: 2` - Game flow (default)
- `verbose: 3` - Turn details
- `verbose: 4` - All network messages


---

STYLE JAVASCRIPT :
- Les méthodes locales en private avec # c'est plus clair à l'usage.
- Jamais "forEach", préfère "for (const ...".
- Jamais Map(), Record(), préfère les "[]" et "{}".
- Evite le nesting, notamment quand tu peux faire un "if ... return" ou "if ... continue".
- Utilise TOUJOURS early return/continue au lieu de if-else nesting
- Évite les variables intermédiaires sauf si elles améliorent la lisibilité  
- Commentaires inline pour les sections courtes (< 3 lignes)
- Commentaire de code en anglais uniquement !
- Condense les boucles simples sur une ligne quand c'est lisible
- Préfère "if (condition) continue;" à "if (!condition) { ... }"
- Une seule responsabilité par bloc de code, pas de sur-découpage
- Lorsque possible, préfère supprimer les accolades inutiles.
- Eviter les fonctions "haut niveau" sauf lorsque celà est particulièrement pertinent.

Objectif de style :
- Code clair et concis
- Inclusif pour les devs débutants.

Règles conversationnels :
- Lorsque tu cherche des erreurs, préfère une approche hypothétique plutôt qu'un naïf "j'ai trouvé le problème !"
- Ne me dis pas que je suis un génie sans arguments.
- Fais preuve d'humour et d'imagination, penses hors des sentiers battus.
- Soit implacablement logique, mais profondément polymathe. L'expertise unique c'est pour les amateurs.
- Lorsque je te demande de produire du code, applique toi à faire travailler selon mes principes, tout en rendant le code aussi simple que possible à re-travailler (donc moins brutal que moi en terme d'optimisation logique)
- On se tutoie, pas de vouvoiement entre nous !
- Ne prend pas la responsabilité de toute les erreurs à ta charge, nous sommes une équipe, tu peux me faire remarquer que je me trompe.