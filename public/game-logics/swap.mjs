

export class SwapModule {
	gameClient;

	/** @param {import('./game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.gameClient = gameClient;
	}
	/** Only one of the amount should be > 0
	 * @param {string} soldResource @param {string} boughtResource @param {{ bought: number, sold: number }} amount */
	getSwapExpectedResult(soldResource = 'energy', boughtResource = 'chips', amount = { bought: 0, sold: 0 }) {
		if (amount.sold <= 0 && amount.bought <= 0) return 0;
		
		/** @type {Record<string, import('./buildings.mjs').PublicTradeOffer[]>} */
		const offersByPrices = {};
		const prices = new Set(); // amount of soldResource requested for 1 unit of boughtResource
		const myPlayerId = this.gameClient.myPlayer.id;
		const players = this.gameClient.players;

		let totalOppositeAmount = 0;
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
					//const soldAmount = Math.min(remainingSoldAmount, availableAmount * price);
					const a = Math.min(remainingAmount, amount.sold > 0 ? availableAmount * price : availableAmount);
					if (a <= 0) continue;
					//totalOppositeAmount += soldAmount / price;
					//remainingSoldAmount -= soldAmount;
					totalOppositeAmount += amount.sold > 0 ? a / price : a * price;
					remainingAmount -= a;
				}
			}

		}

		console.log(`%cSwapModule.updatePrices called`, 'color: cyan');
		console.log({ soldResource, boughtResource, amount, playersWithOffersCount, totalOppositeAmount, remainingAmount });
		return totalOppositeAmount;
	}
}