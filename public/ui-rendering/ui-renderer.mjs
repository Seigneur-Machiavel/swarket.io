const { connectionLogs, connectedLogs } = await import('./connection-loader.mjs');

class UiRenderer {
	elements = {
		consoleLog: document.getElementById('console-log'),
	};

	renderConnectionScreen() { connectionLogs(this.elements.consoleLog); }
	renderConnectedScreen() { connectedLogs(this.elements.consoleLog); }
}

export const uiRenderer = new UiRenderer();