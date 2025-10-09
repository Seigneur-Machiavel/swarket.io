import path from 'path';
import { join } from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { GameClient } from './public/game-logics/game.mjs';
import HiveP2P from 'hive-p2p';
HiveP2P.CLOCK.mockMode = true;
//HiveP2P.CONFIG.NODE.DEFAULT_VERBOSE = 4;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hiveP2PRoot = path.resolve(__dirname, 'node_modules', 'hive-p2p');

const DOMAIN = 'localhost'; // '0.0.0.0'
const PORT = 3000;
const app = express();
app.use(express.static(join(__dirname, 'public')));
app.listen(PORT, DOMAIN, () => console.log(`Server running at http://${DOMAIN}:${PORT}/`));
app.use('/hive-p2p', express.static(hiveP2PRoot));
app.get('/', (req, res) => res.sendFile(join(__dirname, 'public/index.html')));

const verbose = 2;
const cryptoCodex = await HiveP2P.CryptoCodex.createCryptoCodex(true);
const bee0 = await HiveP2P.createPublicNode({ domain: DOMAIN, port: PORT + 1, cryptoCodex, verbose });
console.log(`Public node id: ${bee0.id} | url: ${bee0.publicUrl}`);

const gameClient = new GameClient(bee0, true);
gameClient.myPlayer.name = 'bootstrap: Bee0';
gameClient.myPlayer.energy = 100_000_000_000; // infinite energy
gameClient.myPlayer.maxEnergy = 100_000_000_000; // infinite energy
gameClient.digestMyAction({ type: 'noop' }); // bypass first turn
setInterval(() => { // empty intent to ensure bee0 participates in turns consensus
	gameClient.digestMyAction({ type: 'noop' });
}, gameClient.turnSystem.turnDuration);