
export class GameConsole {
	consoleElement = document.getElementById('console');
	logElement = document.getElementById('console-log');

	/** @param {string} text @param {'info' | 'success' | 'error'} type */
	addLog(text, type = 'info') {
		const line = document.createElement('div');
		line.className = `log-line log-${type}`;
		line.textContent = text;
		this.logElement.appendChild(line);
		this.logElement.scrollTop = this.logElement.scrollHeight;
	}
	async renderConnectionLogs() {
		const connectionLogs = [
			{ text: '> Initializing HiveP2P protocol...', type: 'info', delay: 10 },
			{ text: '> Generating node identity...', type: 'info', delay: 20 },
			{ text: '✓ Identity created', type: 'success', delay: 60 },
			{ text: '> Connecting to bootstrap nodes...', type: 'info', delay: 10 },
			{ text: '> ws://bootstrap.hive-p2p:77642', type: 'info', delay: 20 },
			{ text: '> Initializing WebSocket connection...', type: 'info', delay: 120 },
		];
	
		for (const log of connectionLogs) {
			await new Promise(resolve => setTimeout(resolve, log.delay));
			this.addLog(log.text, log.type);
		}
	}
	async renderConnectedLogs() {
		const connectedLogs = [
			{ text: '✓ WebSocket connection established', type: 'success', delay: 480 },
			{ text: '> Performing handshake...', type: 'info', delay: 120 },
			{ text: '✓ Handshake successful', type: 'success', delay: 20 },
			{ text: '> Discovering network topology...', type: 'info', delay: 120 },
			{ text: '> Ready to enter the network', type: 'success', delay: 200 }
		];
	
		for (const log of connectedLogs) {
			await new Promise(resolve => setTimeout(resolve, log.delay));
			this.addLog(log.text, log.type);
		}
	}
}

