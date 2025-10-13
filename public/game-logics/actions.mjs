/** @param {Array<{type: string, param?: string}>} actions */
export function filterValidActions(actions) {
	/** @type {Array<string>} */
	const validActions = [];
	const includesActions = new Set(); // to avoid duplicates of same action type
	const includesParams = new Set(); // to avoid duplicates of same param
	for (const action of actions.reverse()) {
		const type = action.type || {};
		if (typeof action !== 'object' || typeof type !== 'string') continue;
		// CHECK DUPLICATES OF SPECIFIC ACTIONS
		if (includesActions.has(type))
			if (type === 'upgrade' || type === 'recycle') continue;
			else if (type === 'set-param' && includesParams.has(action.param)) continue;
			
		// CHECK ACTION STRUCTURE
		if (type === 'upgrade' && typeof action.upgradeName !== 'string') continue;
		else if (type === 'recycle' && typeof action.fromDeadNodeId !== 'string') continue;
		
		includesActions.add(type);
		if (type === 'set-param') includesParams.add(action.param);
		validActions.push(action);
	}

	return validActions;
}

export class UpgradeAction {
	type = 'upgrade';
	/** @type {string} */	upgradeName;
}

export class SetParamAction {
	type = 'set-param';
	/** @type {string} */	param;
	/** @type {any} */		value;
}

export class TransactionAction {
	type = 'transaction';
	/** @type {string} */	to;
	/** @type {string} */	resource;
	/** @type {number} */	amount;
}

export class RecycleAction {
	type = 'recycle';
	/** @type {string} */	fromDeadNodeId;
}
