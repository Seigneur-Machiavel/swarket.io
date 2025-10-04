🐝 HIVE-TRADE - Game Design Document

🎯 Core Concept

Monde P2P persistant. Nodes ont une durée de vie limitée par l'énergie. Économie émergente où producteurs et parasites coexistent naturellement.



⚙️ Core Loop

Turn System (invisible)



5sec ACTION → 5sec DIGEST → repeat

Joueurs sentent un rythme, pas des tours



Node Lifecycle



Spawn avec X énergie investie

Produis/trade/taxe pendant ta vie

Énergie → 0 = mort

Loot recyclable par autres nodes

Respawn avec énergie stockée





🔋 Énergie (ressource meta)

Usages :



Spawner avec capacités de départ

Upgrade pendant game

Connection aux autres nodes

Craft des ressources hautes



Conservation :



Curseur "stockage" : sacrifice croissance pour sécurité

Stocké dans hangar commun (ledger partagé)

Pas d'énergie = mort permanente (game over, restart from 0)



Dissipation :



Coûts actions (trading, crafting, connections)

Si insuffisant : decay passif 0.5%/heure





📦 Ressources (5 tiers)

T1 Raw : Compute, Data, Models, Engineers (prod passive)

T2 Refined : 3x T1 → 1x T2

T3 Advanced : 2x T2 différents → 1x T3

T4 Proto : 2x T3 → 1x T4

T5 AGI : 2x T4 + bonus → AGI Unit

Crafting coûte de l'énergie. Plus haut tier = plus cher.



🔗 Networking

Connections manuelles au départ



Coût : Énergie selon taille du node

Petit node : 1-3 slots, rapide (2-5s connect)

Gros node : 10-20 slots, lent (15-30s connect)



Relaying \& Taxation



Curseur 0-100% de commission

Taxer fort = risque d'être évité

Node mort = inventaire bloqué, recyclable



Upgrades déblocables



Auto-connect

Smart routing

+slots





🎲 Progression (Vampire Survivors style)

Pendant game :



Tous les X score : choix parmi 3 compétences random

Catégories : Production, Trading, Network, Automation, Defense



Meta progression :



Plus de parties = plus de compétences dans pool

Déblocages de merges/synergies

Pas de idle, chaque run est isolée (sauf énergie stockée)





🌪️ Events Chaotiques (90-120sec)

Auto-générés selon état monde :



Beaucoup de richesse ? → Market Crash

Peu d'activité ? → Bull Market

Trop de gros nodes ? → Fragmentation

Équilibré ? → Events neutres



Types :



Market (prix x2 ou /2)

Production (boost ou nerf)

Network (connections free ou throttle)

Chaos (swaps, volatilité)





👹 Parasites (gameplay émergent)

Nodes destructeurs :



Spawn cheap (peu d'énergie)

Petits, agiles, peu de prod

Taxent à 80-100% pour intercepter trades

Raident nodes morts rapidement



Régulation naturelle :



Parasites → Producteurs prudents → Moins à voler → Parasites meurent

Cycle prédateur-proie auto-équilibré





🏛️ Consensus \& Sync

Hash-based consensus



Chaque DIGEST phase : compute hash état global

Si divergence : pull state depuis majorité

Pas de POW, juste sync gossip



Ledger partagé (hangar énergie)



Chaque node a slot dans livre de compte

Consensus sur balances via hash

Simple, pas besoin blockchain complète





📊 Feedback \& Juice

Nombres infinis : 1.2K → 1.2M → 1.2B → ...

Damage numbers : Trades, commissions, crafts

Particles : Productions, level-ups, events

Annonces : Gros texte central pour events



🎮 Node Types (émergents, pas forcés)

Factory : Gros, statique, prod élevée

Trader : Moyen, mobile, connections optimisées

Relay Hub : Gros, central, faibles taxes

Parasite : Petit, rapide, taxes max

Recycler : Petit, agile, rush les morts



🚀 Roadmap (12-15 jours)

Phase 1 : Core (5j)



5 tiers ressources + crafting

Énergie system + spawn

Turn-based 5s/5s

Connections manuelles

Trading P2P



Phase 2 : Progression (3j)



Pool 20 compétences

Random picks

Meta déblocages

Ledger consensus



Phase 3 : Juice (3j)



Events chaotiques

Damage numbers + particles

UI polish

Hash sync



Phase 4 : Deploy (2j)



Balance

Browser deploy

Leaderboard (optionnel)

