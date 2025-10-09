

/** @param {Array<{type: string}>} actions */
export function filterValidActions(actions) {
	const includesActions = new Set(); // to avoid duplicates of same action type
	const validActions = [];
	for (const action of actions) {
		if (typeof action !== 'object' || !action.type) continue;
		const type = action.type;
		if (includesActions.has(type) // CHECK DUPLICATES OF SPECIFIC ACTIONS
			&& ['upgrade', 'recycle'].includes(type)) continue;
			
		// CHECK ACTION STRUCTURE
		if (type === 'upgrade' && typeof action.upgradeName !== 'string') continue;
		else if (type === 'recycle' && typeof action.fromDeadNodeId !== 'string') continue;
		
		includesActions.add(type);
		validActions.push(action);
	}

	//if (validActions.length && validActions[0].type !== 'noop') console.log('Valid actions:', validActions);
	return validActions;
}

export class UpgradeAction {
	type = 'upgrade';
	/** @type {string} */		upgradeName;
}

export class SetParamAction {
	type = 'set-param';
	/** @type {string} */	param;
	/** @type {any} */		value;
}

export class TransactionAction {
	type = 'transaction';
	/** @type {string} */		to;
	/** @type {string} */		resource;
	/** @type {number} */		amount;
}

export class RecycleAction {
	type = 'recycle';
	/** @type {string} */		fromDeadNodeId;
}
