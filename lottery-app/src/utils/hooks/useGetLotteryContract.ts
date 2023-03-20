import { Contract, ethers } from "ethers";
import LotteryContract  from '../../contracts/Lottery.json'
import LotteryToken  from '../../contracts/LotteryToken.json'


export function getLotteryContract(lotteryContractAddres: string) : Contract {
  const provider = new ethers.providers.Web3Provider( (window as any).ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(
    lotteryContractAddres,
    LotteryContract.abi,
    signer
  );
  return contract;
}

export function getTokenContract(tokenAddress: string) : Contract {
  const provider = new ethers.providers.Web3Provider( (window as any).ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(
    tokenAddress,
    LotteryToken.abi,
    signer
  );
  return contract;
}