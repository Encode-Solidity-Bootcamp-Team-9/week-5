import { Contract, ethers } from "ethers";

export async function getLotteryInfo(lotteryContract: Contract): Promise<Object> {
  let lotteryOpen = await lotteryContract.betsOpen();
  const lotteryRound = (await lotteryContract.lotteryRound()).toNumber();
  const ratio  = (await lotteryContract.purchaseRatio()).toNumber();

  let closingTime, closingTimeDate;

  if (lotteryOpen) {
    const currentBlock = await lotteryContract.provider.getBlock("latest");
    const currentBlockDate = new Date(currentBlock.timestamp * 1000);
    closingTime = await lotteryContract.betsClosingTime();
    closingTimeDate = new Date(closingTime.toNumber() * 1000);
    lotteryOpen = lotteryOpen && new Date() < closingTimeDate;

  };

  return {
    open: lotteryOpen,
    round: lotteryRound,
    ratio: ratio,
    closingTime: closingTime,
    closingtimeDate: closingTimeDate
  };
}

export async function getLotteryPrizePool(lotteryContract: Contract): Promise<Object> {
  const lotteryPrizePool = await lotteryContract.prizePool();
  return { mtk: ethers.utils.formatEther(lotteryPrizePool) };
}

export async function getPrizeForAddress(address: string, lotteryContract : Contract): Promise<string> {
  const prize = ethers.utils.formatEther(await lotteryContract.prize(address));
  return prize;
}

export async function getLotteryWinners(lotteryContract: Contract): Promise<any[]> {
  let lotteryWinners = Array();
  try {
    let i = 0;
    while (true) {
      const winner = await lotteryContract.roundWinners(i);
      lotteryWinners.unshift({
        round: winner.round.toNumber(),
        winner: winner.winner,
        reward: ethers.utils.formatEther(winner.reward)
      });
      i++;
    }

  } catch (e) {
    return lotteryWinners;
  }
}