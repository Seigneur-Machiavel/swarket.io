

export class SwapModule {
	cssStyle = 'color: lightgreen; font-weight: bold;';
	gameClient;

	/** @param {import('./game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.gameClient = gameClient;
	}
	/** Only one of the amount should be > 0
	 * @param {string} soldResource @param {string} boughtResource @param {{ bought: number, sold: number }} amount */
	getSwapExpectedResult(soldResource = 'energy', boughtResource = 'chips', amount = { bought: 0, sold: 0 }) {
		let totalOppositeAmount = 0;
		let playersToInform = [];
		if (amount.sold <= 0 && amount.bought <= 0) return { totalOppositeAmount, playersToInform };
		
		/** @type {Record<string, import('./buildings.mjs').PublicTradeOffer[]>} */
		const offersByPrices = {};
		const prices = new Set(); // amount of soldResource requested for 1 unit of boughtResource
		const myPlayerId = this.gameClient.myPlayer.id;
		const players = this.gameClient.players;

		let remainingAmount = amount.sold > 0 ? amount.sold : amount.bought;
		let playersWithOffersCount = 0;
		for (const pid in players) {
			const tH = players[pid].tradeHub;
			if (!tH || pid === myPlayerId) continue;

			// OFFERS RELATED TO THE SOLD RESOURCE
			const relatedOffers = tH.publicOffersByResource[soldResource];
			if (!relatedOffers) continue;

			// FILTER OFFERS THAT CAN MATCH THE REQUEST (SOLD RESOURCE)
			for (const offerId in relatedOffers) {
				const offer = relatedOffers[offerId];
				const [rName, reqAmount] = [offer.resourceName, offer.requestedAmount];
				if (rName !== boughtResource) continue;
				if (prices.has(reqAmount)) continue; // already processed this price

				playersWithOffersCount++;
				if (!offersByPrices[reqAmount]) offersByPrices[reqAmount] = [];
				prices.add(reqAmount);
				offersByPrices[reqAmount].push(offer);
			}

			// SORT OFFERS BY PRICE ASCENDING
			const sortedPrices = Array.from(prices).sort((a, b) => a - b);
			//console.log('SwapModule.updatePrices | sortedPrices:', sortedPrices, { offersByPrices });

			// CALCULATE THE BEST PRICE THAT CAN FULFILL THE REQUEST
			for (const price of sortedPrices) {
				if (remainingAmount <= 0) break;
				for (const offer of offersByPrices[price]) {
					const player = players[offer.playerId];
					const stock = player.inventory.getAmount(boughtResource);
					const availableAmount = Math.max(0, stock - offer.minStock);
					const a = Math.min(remainingAmount, amount.sold > 0 ? availableAmount * price : availableAmount);
					if (a <= 0) continue;

					totalOppositeAmount += amount.sold > 0 ? a / price : a * price;
					remainingAmount -= a;
					playersToInform.push(player.id);
					if (remainingAmount <= 0) break;
				}
			}
		}

		// DEBUG LOGS
		console.log(`%cSwapModule.updatePrices called`, this.cssStyle);
		console.log({ soldResource, boughtResource, amount, playersWithOffersCount, totalOppositeAmount, remainingAmount });
		return { totalOppositeAmount, playersToInform };
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {string[]} organizedIds */
	execTurnSwaps(gameClient, organizedIds) {
		const players = gameClient.players;
		for (const playerId of organizedIds) {
			const maker = gameClient.players[playerId];
			const tradeHub = maker?.tradeHub;
			if (!maker || !tradeHub) continue;

			for (const pid in tradeHub.authorizedFills) {
				const taker = players[pid];
				const takerOrder = taker?.tradeHub?.getTakerOrder;
				if (!takerOrder) continue;

				const fill = tradeHub.authorizedFills[pid];
				const [ sentResource, minStock, tookResource, price ] = fill;
				const { soldResource, soldAmount, boughtResource, maxPricePerUnit, filledAmount } = takerOrder;
				if (price > maxPricePerUnit) continue; // price no longer acceptable
				if (soldResource !== tookResource || boughtResource !== sentResource) continue; // resources do not match

				// CALCULATE MAX AMOUNTS THAT CAN BE TRADED
				const makerStock = maker.inventory.getAmount(sentResource);
				const makerMaxSoldAmount = Math.max(0, makerStock - minStock);
				const takerStock = taker.inventory.getAmount(tookResource);
				const takerRemainingSold = Math.max(0, soldAmount - filledAmount);
				const takerMaxBoughtAmount = Math.max(0, takerRemainingSold / price);
				const optimisticSoldAmount = Math.min(makerMaxSoldAmount, takerMaxBoughtAmount);
				
				const takerOptimisticPayment = optimisticSoldAmount * price;
				const takerPayment = Math.min(takerStock, takerOptimisticPayment);
				const makerPayment = takerPayment / price;
				if (takerPayment <= 0 || makerPayment <= 0) continue; // nothing to trade

				// EXECUTE THE TRADE
				maker.inventory.subtractAmount(sentResource, makerPayment);
				taker.inventory.subtractAmount(tookResource, takerPayment);
				maker.inventory.addAmount(tookResource, takerPayment);
				taker.inventory.addAmount(sentResource, makerPayment);

				// DEDUCE FILLED AMOUNT TO TAKER ORDER -> DELETE ORDER IF FULLY FILLED
				taker.tradeHub.countFillOfTakerOrder(takerPayment);
				console.log(`%cSwap executed between Maker ${maker.id} and Taker ${taker.id} | ${makerPayment} ${sentResource} for ${takerPayment} ${tookResource}`, this.cssStyle);
			}

			maker.tradeHub.authorizedFills = {}; // reset after processing all fills
		}
	}
}