function addLog(element, text, type = 'info') {
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    line.textContent = text;
    element.appendChild(line);
    element.scrollTop = element.scrollHeight;
}

export async function connectionLogs(consoleLog) {
    const connectionLogs = [
        { text: '> Initializing HiveP2P protocol...', type: 'info', delay: 10 },
        { text: '> Generating node identity...', type: 'info', delay: 20 },
        { text: '✓ Identity created', type: 'success', delay: 60 },
        { text: '> Connecting to bootstrap nodes...', type: 'info', delay: 10 },
        { text: '> ws://bootstrap.mycelium.network', type: 'info', delay: 20 },
	];

    for (const log of connectionLogs) {
        await new Promise(resolve => setTimeout(resolve, log.delay));
        addLog(consoleLog, log.text, log.type);
    }
}

export async function connectedLogs(consoleLog) {
	const connectedLogs = [
        { text: '✓ WebSocket connection established', type: 'success', delay: 480 },
        { text: '> Performing handshake...', type: 'info', delay: 120 },
        { text: '✓ Handshake successful', type: 'success', delay: 20 },
        { text: '> Discovering network topology...', type: 'info', delay: 120 },
        { text: '> Ready to spawn node', type: 'success', delay: 200 }
    ];

	for (const log of connectedLogs) {
		await new Promise(resolve => setTimeout(resolve, log.delay));
		addLog(consoleLog, log.text, log.type);
	}
}