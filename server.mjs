import path from 'path';
import { join } from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { GameClient } from './public/game-logics/game-client.mjs';
import HiveP2P from 'hive-p2p';
HiveP2P.CLOCK.mockMode = true;

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

const cryptoCodex = await HiveP2P.CryptoCodex.createCryptoCodex(true);
const bee0 = await HiveP2P.createPublicNode({ domain: DOMAIN, port: PORT + 1, cryptoCodex, verbose: 3 });
console.log(`Public node id: ${bee0.id} | url: ${bee0.publicUrl}`);

const gameClient = new GameClient(bee0);
setInterval(() => { // empty intent to ensure bee0 participates in turns consensus
	const myIntents = gameClient.turnSystem.digestPlayerActions([], gameClient.height + 1);
	bee0.broadcast({ topic: 'turn-intents', data: myIntents });
}, gameClient.turnSystem.turnDuration);