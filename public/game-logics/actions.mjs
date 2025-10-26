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

export class newPlayerAction {
	type = 'new-player';
	/** @type {Object | Array} */		playerData;
	/** @type {'object' | 'array'} */	extractionMode;
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

export class SetPrivateTradeOffer { // PRIVATE OFFER ONLY
	type = 'set-private-trade-offer';
	/** @type {string} */	resourceName;
	/** @type {number} */	amount;
	/** @type {string} */	requestedResourceName;
	/** @type {number} */	requestedAmount;
	/** @type {string} */ 	targetPlayerId;
}

export class CancelPrivateTradeOffer {
	type = 'cancel-private-trade-offer';
	/** @type {string} */ 	targetPlayerId;
}

export class TakePrivateTradeOffer {
	type = 'take-private-trade-offer';
	/** @type {string} */	 offererId;
}

export class SetTakerOrderAction {
	type = 'set-taker-order';
	/** @type {string} */	 soldResource;
	/** @type {number} */	 soldAmount;
	/** @type {string} */	 boughtResource;
	/** @type {number} */	 maxPricePerUnit;
	/** @type {number} */	 expiry;
}

export class AuthorizedFillsAction {
	type = 'authorized-fills';
	/** key: playerId, value: [sentResource, minStock, tookResource, price]
	 * @type {Record<string, [string, number, string, number]>} */
	fills;
}

export class RecycleAction {
	type = 'recycle';
	/** @type {string} */	fromDeadNodeId;
}