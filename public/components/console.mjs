import { getGameConsoleText } from '../language.mjs';

/** @type {{ [key: string]: { type: string, delay: number }[] }} */
const EVENTS_LOGS = {
	CONNECTION: [
		{ type: 'info', delay: 10 },
		{ type: 'info', delay: 20 },
		{ type: 'success', delay: 60 },
		{ type: 'info', delay: 10 },
		{ type: 'info', delay: 20 },
		{ type: 'info', delay: 120 },
	],
	CONNECTED: [
		{ type: 'success', delay: 480 },
		{ type: 'info', delay: 120 },
		{ type: 'success', delay: 20 },
		{ type: 'info', delay: 120 },
		{ type: 'success', delay: 200 }
	]
}

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
	/** @param {'CONNECTION' | 'CONNECTED'} event */
	async renderEventLogs(event = 'CONNECTION') {
		const l = EVENTS_LOGS[event] || [];
		for (let i = 0; i < l.length; i++) {
			await new Promise(resolve => setTimeout(resolve, l[i].delay));
			const text = getGameConsoleText(event, i);
			this.addLog(text, l[i].type);
		}
	}
}

