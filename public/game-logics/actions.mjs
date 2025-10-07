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