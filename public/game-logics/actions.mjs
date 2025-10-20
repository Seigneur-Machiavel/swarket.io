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

export class UpgradeModuleAction {
	type = 'upgrade-module';
	/** @type {string} */	buildingName;
	/** @type {string} */	value;
}

export class SetParamAction {
	type = 'set-param';
	/** @type {string} */	param;
	/** @type {any} */		value;
}

export class SetTradeOffer {
	type = 'set-trade-offer';
	/** @type {string} */	resourceName;
	/** @type {number} */	amount;
	/** @type {string} */	requestedResourceName;
	/** @type {number} */	requestedAmount;
	/** @type {string | undefined} undefined for public offers */
	targetPlayerId;
}

export class CancelTradeOffer {
	type = 'cancel-trade-offer';
	/** @type {string | undefined} undefined for private offers */
	resourceName;
	/** @type {string | undefined} undefined for public offers */
	targetPlayerId;
}

export class TakeTradeOffer {
	type = 'take-trade-offer';
	/** @type {string} */ offererId;
	/** @type {string | undefined} undefined for private offers */
	resourceName;
	/** @type {number | undefined} undefined for private offers */
	amount;
}

export class RecycleAction {
	type = 'recycle';
	/** @type {string} */	fromDeadNodeId;
}
