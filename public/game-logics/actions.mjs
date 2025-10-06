export class SetParamAction {
	/** @type {string} */	param;
	/** @type {any} */		value;
}

export class TransactionAction {
	/** @type {string} */		to;
	/** @type {string} */		resource;
	/** @type {number} */		amount;
}