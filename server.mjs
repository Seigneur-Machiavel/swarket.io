import path from 'path';
import { join } from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { GameClient } from './public/game-logics/game.mjs';
import { AutoPlayer } from './public-debug/auto-play.mjs';
import HiveP2P from 'hive-p2p';
import { NodeInteractor } from './public/game-logics/node-interactions.mjs';
HiveP2P.CLOCK.mockMode = true;
HiveP2P.CONFIG.NODE.MANUAL_BAN_MODE = true;
//HiveP2P.CONFIG.NODE.DEFAULT_VERBOSE = 4;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hiveP2PRoot = path.resolve(__dirname, 'node_modules', 'hive-p2p');

const IS_DEBUG = true;
const DOMAIN = '0.0.0.0'; // '0.0.0.0' | 'localhost'
const PORT = 27260;
const app = express();
app.use(express.static(join(__dirname, 'public')));
if (IS_DEBUG) app.use(express.static(join(__dirname, 'public-debug')));
app.listen(PORT, DOMAIN, () => console.log(`Server running at http://${DOMAIN}:${PORT}/`));
app.use('/hive-p2p', express.static(hiveP2PRoot));
app.get('/', (req, res) => res.sendFile(join(__dirname, 'public/index.html')));

const verbose = 2;
const seedUint8Array = new Uint8Array(32);
for (let i = 0; i < 'swarket-bee0'.length; i++) seedUint8Array[i] = 'swarket-bee0'.charCodeAt(i);
const cryptoCodex = await HiveP2P.CryptoCodex.createCryptoCodex(true, seedUint8Array);
const bee0 = await HiveP2P.createPublicNode({ domain: DOMAIN, port: PORT + 1, cryptoCodex, verbose });
console.log(`%cPublic node id: ${bee0.id} | url: ${bee0.publicUrl}`, 'color: cyan');

const gameClient = new GameClient(bee0, true, 'energy');
gameClient.myPlayer.name = 'bootstrap: Bee0';
gameClient.myPlayer.production.energy = 1_000; 			// BYPASS
gameClient.myPlayer.inventory.setAmount('energy', 100); // BYPASS
gameClient.myPlayer.maxEnergy = 999_999_999; 			// BYPASS
gameClient.onExecutedTurn.push(async(height = 0) => {
	await new Promise(resolve => setTimeout(resolve, Math.round(gameClient.turnSystem.turnDuration / 10)));
	gameClient.digestMyAction({ type: `Bee0_${Math.random()}` });
	//bee0.broadcast("Hello everyone! I'm bee bee0 :)");

	for (let i = 0; i < bees.length; i++) {
		clients[i].digestMyAction({ type: `${bees[i].id}_${Math.random()}` });
		//bees[i].broadcast(`Hello everyone! I'm bee ${bees[i].id} :)`);
		if (!clients[i].alive && IS_DEBUG) {
			const currentId = bees[i].id;
			console.log(`%c${currentId} is dead. Respawning...`, 'color: red');
			bees[i].destroy();

			const { bee, client } = await createPlayer();
			bees[i] = bee;
			clients[i] = client;
			console.log(`%c${currentId} respawned as ${bees[i].id}`, 'color: green');
		}
	}

	//if (height % 10 === 0) console.log(`%c${bee0.id} trust: ${bee0.arbiter.trustBalances[bees[0].id]}`, 'color: cyan');
});

async function createPlayer() {
	const bee = await HiveP2P.createNode({ bootstraps: [bee0.publicUrl], verbose });
	bee.topologist.automation.incomingOffer = false;	// disable auto-accept incoming offers
	bee.topologist.automation.spreadOffers = false; 	// disable auto-spread offers
	const client = new GameClient(bee);
	if (IS_DEBUG) new AutoPlayer(client, NodeInteractor);
	return { bee, client };
}

const bees = [];
const clients = [];
//await new Promise(resolve => setTimeout(resolve, 10000));
for (let i = 0; i < 2; i++) {
	const { bee, client } = await createPlayer();
	bees.push(bee); clients.push(client);
}

// DEBUG: LOG ALL GOSSIP MESSAGES
//bee0.onGossipData((fromId, message) => console.log(`%c[${bee0.id}] from [${fromId}]: ${message}`, 'color: cyan'));
//for (const bee of bees)
	//bee.onGossipData((fromId, message) => console.log(`%c[${bee.id}] from [${fromId}]: ${message}`, 'color: white'));