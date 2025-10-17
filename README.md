# 📋 Hive-Trade - Task List (j'aime pas trop, à construire au fur et à mesure)

## Phase 1: Core Infrastructure (5-7 jours)

**1. Setup projet**
- [x] Init repo + structure folders
- [x] connection bootstrap
- [x] UI - Console de connection
- [x] Fork visualizer HiveP2P
- [x] Visualizer in background -> console reduced in the bottom or top or left or right

**2. Turn system**
- [x] Timer 5s ACTION
- [x] Sync hooks pour phases

**2.5 Système de compétences**
- [x] Random pick tous les X turns
- [8/10] Pool de 10 upgrades

**3. Bot (debug) **
- [x] auto upgrades
- [x] auto recycle
- [x] auto respawn

**4. Resources basiques**
- [4] 5 tiers de ressources (structure data)
- [x] Production passive Tier 1
- [ ] Crafting Tier 2-5 (coûts énergie)
- [ ] Inventaire UI

**4.1 Buildings**
- [x] reactor 	 => carte d'upgrade
- [ ] fabricator => carte d'upgrade
- [ ] tradeHub 	 => carte d'upgrade
- [ ] Storage => AGI	=> carte d'upgrade

**4.5 Trading P2P**
- [ ] Propose trade (unicast)
- [ ] Accept/reject
- [ ] Curseur taxation (0-100%)
- [ ] Commission relay automatique

**5. Networking manuel**
- [X] Click pour connecter à un peer
- [ ] Coût connexion (petit = cheap/rapide)
- [x] Slots limités selon les upgrades
- [x] Visualisation connections

**7. Énergie system**
- [x] State: énergie par joueur
- [X] Dissipation passive
- [x] Dissipation active (coûts actions)
- [x] Mort quand énergie = 0

---

## Phase 2: Persistence (3-4 jours)

**7. Hash consensus**
- [x] Compute hash état global (DIGEST phase)
- [x] Gossip hash entre peers
- [x] Detect divergence → resync

**8. Ledger partagé (hangar)**
- [ ] Structure ledger: slots par joueur
- [ ] Curseur stockage pendant game
- [ ] Persist entre spawns (RAM)

**9. Node mort & recyclage**
- [!energy === dead] État "dead" quand énergie = 0
- [x] UI notification -> click -> intents recycling
- [x] Premiers arrivés premiers servi (procédural "random")

---

## Phase 3: Progression & Upgrades (3-4 jours)

**10. Système de compétences**
- [ ] Pool de 15-20 compétences

**11. Meta progression**
- [ ] Track runs jouées
- [ ] Déblocage nouvelles compétences
- [ ] Synergies/merges (si temps)

**12. Upgrades spawn**
- [ ] Presets: Small/Medium/Large
- [ ] Allocate → capacités départ
- [ ] Balance coûts

---

## Phase 4: Events & Juice (3-4 jours)

**13. Events chaotiques** => si on a le temps
- [ ] 8-10 events (Market, Prod, Network)
- [ ] Trigger random 90-120s
- [ ] Annonce visuelle (gros texte)
- [ ] Apply effects temporaires

**14. Feedback visuel**
- [ ] Damage numbers (trades, commissions)
- [ ] Particles (prod, crafts, level-ups)
- [ ] Notation infinie (K, M, B, T...)
- [ ] Animations connexions/trades

**15. UI polish**
- [ ] HUD: timer, inventaire, leaderboard
- [ ] Context menu peers (click node)
- [ ] Event announcements stylées
- [ ] Minimap réseau (optionnel)

---

## Phase 5: Balance & Deploy (2-3 jours)

**16. Balancing**
- [ ] Production rates
- [ ] Valeurs ressources (scoring)
- [ ] Cooldowns events

**17. Testing**
- [ ] Playtest solo (bots?)
- [ ] Playtest multi 5-10 peers
- [ ] Fix bugs critiques
- [ ] Ajustements gameplay

---

## Phase 6: Post-Launch (optionnel)

**19. Features secondaires**
- [ ] Leaderboard global
- [ ] Stats fin de partie
- [ ] Achievements
- [ ] Wrapper Steam (Tauri)

**20. Content**
- [ ] Plus de compétences (30+)
- [ ] Plus d'events
- [ ] Balancing continu

---

**Total: ~16-22 jours** selon vitesse et features skippées.

**Ordre critique:**
Turn system → Énergie → Resources → Trading → Consensus → Progression → Juice

Prêt à attaquer Phase 1 ?