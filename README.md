# \## 📋 HIVE-TRADE - Spec condensée

# 

# \### 🎯 Concept

# Jeu P2P full décentralisé où tu construis des AGI Units en tradant des ressources. Drop-in continu avec reset économique toutes les 15min. Zéro serveur (sauf bootstraps).

# 

# ---

# 

# \### 🧱 Core Mechanics

# 

# \*\*4 Ressources + AGI Units\*\*

# \- 🔋 Compute / 📊 Data / 🧠 Models / 👷 Engineers

# \- Production passive : 1/sec (Engineers : 1/3sec)

# \- \*\*AGI Unit\*\* = 10 Compute + 10 Data + 10 Models + 1 Engineer

# \- \*\*Upgrades\*\* : Dépenser AGI Units pour booster prod de X%

# 

# \*\*Trading\*\*

# \- Unicast P2P : propose/accept/reject

# \- Commissions relay : 2% par hop automatique

# \- Gossip neighbors = broadcast inventaire + offres

# 

# \*\*Scoring\*\*

# \- Conversion fin de cycle (15min) : ressources → coins

# \- AGI Unit = 100 coins, autres = 5 coins

# \- Leaderboard par coins totaux

# 

# ---

# 

# \### 🔄 Architecture P2P

# 

# \*\*Event "connect"\*\*

# \- Broadcast gossip initial pour sync le nouveau peer

# \- Tous les clients incluent le joueur dans leur state local

# 

# \*\*Consensus par cluster\*\*

# \- Pendant la partie : state local approx (gossip normal)

# \- Endgame : gossip max HOPS (quelques sec) pour consensus final

# \- Compute résultats distribué, pas de source de vérité unique

# 

# \*\*Progression persistante\*\*

# \- \*\*Option A\*\* : Super node collecte stats + distribue unlocks (centralisation légère)

# \- \*\*Option B\*\* : Full décentralisé, stockage RAM local (triche possible)

# \- → Décider après proto

# 

# ---

# 

# \### 🎮 Gameplay Loop

# 

# \*\*Cycle 15min\*\*

# 1\. Spawn → assignation prod aléatoire

# 2\. Trade actif ou relay passif

# 3\. Création AGI Units

# 4\. Upgrades prod (optionnel)

# 5\. Endgame gossip → compute scores

# 6\. Reset économique, nouvelles assignations

# 

# \*\*Raids\*\* (dev fin)

# \- PvP : Coût ressources, vol 20% inventaire, défense possible

# \- NPC : Bots bootstrap qui floodent/volent aléatoirement

# 

# ---

# 

# \### 💎 Progression (simple)

# 

# \*\*Passifs unlockables\*\* (à affiner)

# \- Niveaux via XP (trades + AGI créées)

# \- Boosts prod, réduction commissions, anti-raid, fog of war réduit

# 

# \*\*Cosmétiques\*\*

# \- Skins nodes (couleurs, formes)

# \- Particle effects trades

# \- Badges leaderboard

# 

# \*\*Stockage\*\* : RAM only, pas de localStorage

# 

# ---

# 

# \### 🎨 UI/Visualizer

# 

# \*\*Base\*\* : Fork ton visualizer existant (zoom, pan, pause déjà là)

# 

# \*\*Ajouts\*\*

# \- Filtres visuels (traders actifs, riches, neighbors)

# \- Highlight animations trades

# \- Minimap coin écran

# \- HUD : inventaire, trades en cours, notifs

# \- Menu contextuel clic peer : view inventory/offers, propose trade

# 

# \*\*Couleurs rôles\*\*

# \- Vert = Compute / Bleu = Data / Violet = Models / Orange = Engineers

# 

# ---

# 

# \### 📦 Distribution

# 

# \*\*Browser\*\* (prioritaire)

# \- Hébergement Vercel/Netlify

# \- Full WebRTC cross-platform

# 

# \*\*Steam\*\* (secondaire)

# \- Wrapper Tauri (ou NW.js si full JS)

# \- Free-to-play, cosmétiques optionnels

# 

# ---

# 

# \### ⏱️ Roadmap (11-16 jours)

# 

# \*\*Phase 1 : Core (5-7j)\*\*

# HiveP2P intégré, 4 ressources, trade P2P, commissions, timer 15min, leaderboard

# 

# \*\*Phase 2 : UI (3-4j)\*\*

# Fork visualizer, filtres, HUD complet, menu contextuel, notifs

# 

# \*\*Phase 3 : Progression (2-3j)\*\*

# XP, passifs (4-5 max), skins basiques (5 couleurs)

# 

# \*\*Phase 4 : Package (1-2j)\*\*

# Build browser, wrapper Steam optionnel, deploy

# 

# \*\*Post-launch\*\*

# Raids PvP/NPC, upgrades prod, achievements

# 

# ---

# 

# \### 🚨 Anti-scope creep

# 

# \*\*ON GARDE\*\*

# \- 4 ressources

# \- Trade + commissions

# \- Reset 15min

# \- Progression simple

# 

# \*\*ON SKIP (pour l'instant)\*\*

# \- Vote arbitrage

# \- Alliances/guildes

# \- Futures/options

# \- Audio (sauf si rapide)

# 

# ---

# 

# \*\*Nom\*\* : hive-trade.io ou hivemarkt.io ou swarket.io (domaine à checker)

# 

# \*\*Pitch\*\* : \*"Build AGI in a zero-server P2P economy. Trade resources, raid neighbors, dominate the swarm. Resets every 15 minutes."\*

# 

# Voilà, t'as tout. Go code ! 🐝

