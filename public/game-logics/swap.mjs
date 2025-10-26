import { SeededRandom } from './consensus.mjs';

export class SwapModule {
	verb;
	cssStyle = 'color: lightgreen; font-weight: bold;';
	gameClient;

	/** @param {import('./game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.gameClient = gameClient;
		this.verb = gameClient.verb;
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
		if (this.verb > 2) console.log(`%cSwapModule.updatePrices called`, this.cssStyle);
		if (this.verb > 2) console.log({ soldResource, boughtResource, amount, playersWithOffersCount, totalOppositeAmount, remainingAmount });
		return { totalOppositeAmount, playersToInform };
	}
	/** @param {string[]} organizedIds (alive only) @param {string} randomSeed */
	attributeTurnThefts(organizedIds, randomSeed, maxTheftsPerPlayer = 5) {
		let totalThefts = 0;
		const { players, deadPlayers } = this.gameClient;

		// AT FIRST WE CLEANUP PREVIOUS TURN THEFTS
		for (const pid in players) players[pid].tradeHub.turnThiefs = [];

		// THEN WE ATTRIBUTE NEW TURN THEFTS BASED ON THEFT CAPACITY
		for (const pid of organizedIds) {
			const thief = players[pid];
			if (!thief) continue;
			for (let i = 0; i < thief.tradeHub?.getMaxThefts || 0; i++) {
				const targetId = SeededRandom.pickOne(organizedIds, `${randomSeed}-${pid}-thief-${i}`);
				const target = players[targetId];
				if (!target || target === pid || deadPlayers.has(target)) continue;
				if (target.tradeHub.turnThiefs.length >= maxTheftsPerPlayer) continue; // target already has max thefts
				target.tradeHub.turnThiefs.push(target);
				totalThefts++;
			}
		}

		if (this.verb > 1) console.log(`%cTotal turn thefts attributed: ${totalThefts}`, this.cssStyle);
	}

	/** @param {import('./game.mjs').GameClient} gameClient @param {string[]} organizedIds */
	execTurnSwaps(gameClient, organizedIds) {
		const lth = gameClient.turnSystem.prevHash;
		let rndIndex = 0;
		const players = gameClient.players;
		for (const playerId of organizedIds) {
			rndIndex++;
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

				const makerFinalIncome = this.#applyThiefsAndTaxes(gameClient, maker, tookResource, takerPayment, `${lth}-${rndIndex}-maker-${maker.id}`);
				const takerFinalIncome = this.#applyThiefsAndTaxes(gameClient, taker, sentResource, makerPayment, `${lth}-${rndIndex}-taker-${taker.id}`);
				maker.inventory.addAmount(tookResource, makerFinalIncome);
				taker.inventory.addAmount(sentResource, takerFinalIncome);

				// DEDUCE FILLED AMOUNT TO TAKER ORDER -> DELETE ORDER IF FULLY FILLED
				taker.tradeHub.countFillOfTakerOrder(takerPayment);
				if (this.verb > 1) console.log(`%cSwap executed between Maker ${maker.id} and Taker ${taker.id} | ${makerPayment} ${sentResource} for ${takerPayment} ${tookResource}`, this.cssStyle);
				if (this.verb > 1) console.log(`After thefts and taxes: Maker received ${makerFinalIncome.toFixed(3)} ${tookResource}, Taker received ${takerFinalIncome.toFixed(3)} ${sentResource}`);
			}

			maker.tradeHub.authorizedFills = {}; // reset after processing all fills
		}
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {import('./player.mjs').PlayerNode} player @param {string} resource @param {string} tookResource @param {number} amount */
	#applyThiefsAndTaxes(gameClient, player, resource, amount, randomSeed = 'theft') {
		// APPLY ROBBERIES
		let finalAmount = 0 + amount;
		for (const thiefId of player.tradeHub?.turnThiefs || []) {
			const thief = gameClient.players[thiefId];
			if (!thief) continue;

			const theftSuccessRate = thief.tradeHub.getTheftSuccessRate;
			const rnd = SeededRandom.randomFloat(randomSeed);
			if (rnd > theftSuccessRate) continue; // theft failed

			const theftLossRate = player.tradeHub.getTheftLossRate;
			const stolenAmount = finalAmount * 0.1 * theftLossRate; // steal 10% of the amount adjusted by loss rate
			finalAmount -= stolenAmount;
			if (this.verb > 1) console.log(`%cPlayer ${thief.id} stole ${stolenAmount.toFixed(3)} ${resource} from Player ${player.id} (Success rate: ${(theftSuccessRate*100).toFixed(2)}%, Random: ${(rnd*100).toFixed(2)}%)`, this.cssStyle);

			thief.inventory.addAmount(resource, stolenAmount);
			break; // only one thief can steal per transaction
		}

		// APPLY TAXES
		if (finalAmount <= 0) return 0;
		const taxRate = player.tradeHub.getTaxRate;
		finalAmount -= finalAmount * taxRate;
		return finalAmount;
	}
}