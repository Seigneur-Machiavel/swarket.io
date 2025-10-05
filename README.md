# 📋 Hive-Trade - Task List

## Phase 1: Core Infrastructure (5-7 jours)

**1. Setup projet**
- [ ] Init repo + structure folders
- [ ] Fork visualizer HiveP2P
- [ ] Setup build pipeline (browser)

**2. Turn system**
- [ ] Timer 5s ACTION / 5s DIGEST
- [ ] Sync hooks pour phases
- [ ] Visual feedback du rythme (optional pulse)

**3. Énergie system**
- [ ] State: énergie par joueur
- [ ] Spawn UI: slider investissement
- [ ] Dissipation passive (coûts actions)
- [ ] Mort quand énergie = 0

**4. Resources basiques**
- [ ] 5 tiers de ressources (structure data)
- [ ] Production passive Tier 1
- [ ] Crafting Tier 2-5 (coûts énergie)
- [ ] Inventaire UI

**5. Networking manuel**
- [ ] Click pour connecter à un peer
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
- [ ] État "dead" quand énergie = 0
- [ ] Inventaire bloqué = lootable
- [ ] Méca connexion pour recycler
- [ ] Premier arrivé premier servi

---

## Phase 3: Progression & Upgrades (3-4 jours)

**10. Système de compétences**
- [ ] Pool de 15-20 compétences
- [ ] Random pick tous les X score
- [ ] UI choix (3 options)
- [ ] Apply effects (prod, slots, auto, etc.)

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