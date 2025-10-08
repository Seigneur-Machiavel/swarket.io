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
- [3/10] Pool de 10 compétences (compétence connection en first => gros rate)
=> add lifetime and other requirements to importants upgrades

**3. Énergie system**
- [x] State: énergie par joueur
- [ ] Spawn UI: slider investissement
- [X] Dissipation passive
- [ ] Dissipation active (coûts actions)
- [x] Mort quand énergie = 0

**4. Resources basiques**
- [4] 5 tiers de ressources (structure data)
- [x] Production passive Tier 1
- [ ] Crafting Tier 2-5 (coûts énergie)
- [ ] Inventaire UI

**5. Networking manuel**
- [X] Click pour connecter à un peer
- [ ] Coût connexion (petit = cheap/rapide)
- [ ] Slots limités selon taille
- [ ] Visualisation connections

**6. Trading P2P**
- [ ] Propose trade (unicast)
- [ ] Accept/reject
- [ ] Curseur taxation (0-100%)
- [ ] Commission relay automatique

---

## Phase 2: Consensus & Persistence (3-4 jours)

**7. Hash consensus**
- [ ] Compute hash état global (DIGEST phase)
- [ ] Gossip hash entre peers
- [ ] Detect divergence → resync

**8. Ledger partagé (hangar énergie)**
- [ ] Structure ledger: slots par joueur
- [ ] Gossip balances
- [ ] Curseur stockage pendant game
- [ ] Persist entre spawns (RAM)

**9. Node mort & recyclage**
- [!energy === dead] État "dead" quand énergie = 0
- [ ] UI notification -> click -> intents recycling
- [ ] Premiers arrivés premiers servi (procédural "random")

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
- [ ] Allocate énergie → capacités départ
- [ ] Balance coûts

---

## Phase 4: Events & Juice (3-4 jours)

**13. Events chaotiques**
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
- [ ] Coûts énergie (spawn, craft, connexions)
- [ ] Production rates Tier 1
- [ ] Valeurs ressources (scoring)
- [ ] Cooldowns events

**17. Testing**
- [ ] Playtest solo (bots?)
- [ ] Playtest multi 5-10 peers
- [ ] Fix bugs critiques
- [ ] Ajustements gameplay

**18. Deploy**
- [ ] Build optimisé browser
- [ ] Hébergement static (Vercel/Netlify)
- [ ] Bootstrap nodes (où?)
- [ ] Landing page minimale

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