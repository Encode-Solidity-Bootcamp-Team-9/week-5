import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as readline from "readline";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Lottery, LotteryToken, LotteryToken__factory, Lottery__factory } from "../typechain-types";
import assert from "assert";
import { Signer } from "ethers";

// For macOS users
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

let contract: Lottery;
let token: LotteryToken;
let signer: Signer;

let showDeploymentOptions : boolean = true;

const TOKEN_RATIO = 100000000;
const BET_PRICE = 1;
const BET_FEE = 0.2;

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  chooseEnv(rl);
}

async function deployLottery() {
  const contractFactory = new Lottery__factory(signer);
  
  contract = await contractFactory.deploy(
    TOKEN_RATIO,
    ethers.utils.parseEther(BET_PRICE.toFixed(18)),
    ethers.utils.parseEther(BET_FEE.toFixed(18))
  );

  await contract.deployed();
  console.log(`Contract deployed (${contract.address})`);

}

async function createLotteryToken() {
  await (await contract.createLotteryToken("LotteryToken", "LT0")).wait();
  await attachLotteryToken();
  const tokenAddress = await contract.paymentToken();
  console.log(`Token created (${tokenAddress})`);
}

async function attachLotteryToken() {
  const tokenAddress = await contract.paymentToken();
  const tokenFactory = new LotteryToken__factory(signer);
  token = tokenFactory.attach(tokenAddress);
}

async function createSigner() {
  const privateKey = process.env.PRIVATE_KEY;
  assert(privateKey, "Environment variable 'PRIVATE_KEY' is not set.");
  const provider = new ethers.providers.AlchemyProvider(
    "goerli",
    process.env.ALCHEMY_API_KEY
  );
  signer = new ethers.Wallet(privateKey, provider);
}

async function mainMenu(rl: readline.Interface) {
  menuOptions(rl);
}

async function chooseEnv(rl: readline.Interface) {
  rl.question(
    "Select environment: \n Options: \n [0]: Exit \n [1]: Existing Lottery on Goerli \n [2]: New contract on goerli \n",
    async (answer: string) => {
      console.log(`Selected: ${answer}\n`);
      let privateKey, provider;
      switch (answer) {
        case '0':
          rl.close();
          return;
        case '1':
          await createSigner();
          const contractFactory = new Lottery__factory(signer);

          rl.question("Conctract address: ", async (answer: string) => {
            contract = contractFactory.attach(answer);
            await attachLotteryToken();
            showDeploymentOptions = false;
            mainMenu(rl);
          });

          break;

        case '2':
          await createSigner();
          mainMenu(rl);
          break;
      }
    });
}

function menuOptions(rl: readline.Interface) {
  rl.question(
    `Select operation: \n Options: \n [0]: Exit \n ${showDeploymentOptions ? '[D]: Deploy Lottery Contract \n [T]: Create LotteryToken \n ':''}[1]: Check state \n [2]: Open bets \n [3]: Top up account tokens \n [4]: Bet with account \n [5]: Close bets \n [6]: Check player prize \n [7]: Withdraw \n [8]: Burn tokens \n`,
    async (answer: string) => {
      console.log(`Selected: ${answer}\n`);
      const option = answer;
      switch (option) {
        case '0':
          rl.close();
          return;
        case 'D':
          try {
            await deployLottery();
          } catch (error) {
            console.log("error\n");
            console.log({ error });
          }
          mainMenu(rl);
          break;
        case 'T':
          try {
            await createLotteryToken();
          } catch (error) {
            console.log("error\n");
            console.log({ error });
          }
          mainMenu(rl);
          break;
        case '1':
          await checkState();
          mainMenu(rl);
          break;
        case '2':
          rl.question("Input duration (in seconds)\n", async (duration) => {
            try {
              await openBets(duration);
            } catch (error) {
              console.log("error\n");
              console.log({ error });
            }
            mainMenu(rl);
          });
          break;
        case '3':
          await displayBalance();
          rl.question("Buy how many tokens?\n", async (amount) => {
            try {
              await buyTokens(amount);
              await displayBalance();
              await displayTokenBalance();
            } catch (error) {
              console.log("error\n");
              console.log({ error });
            }
            mainMenu(rl);
          });

          break;
        case '4':
          await displayTokenBalance();
          rl.question("Bet how many times?\n", async (amount) => {
            try {
              await bet(amount);
              await displayTokenBalance();
            } catch (error) {
              console.log("error\n");
              console.log({ error });
            }
            mainMenu(rl);
          });
          break;
        case '5':
          try {
            await closeLottery();
          } catch (error) {
            console.log("error\n");
            console.log({ error });
          }
          mainMenu(rl);
          break;
        case '6':
          const prize = await displayPrize();
          if (Number(prize) > 0) {
            rl.question(
              "Do you want to claim your prize? [Y/N]\n",
              async (answer) => {
                if (answer.toLowerCase() === "y") {
                  try {
                    await claimPrize(prize);
                  } catch (error) {
                    console.log("error\n");
                    console.log({ error });
                  }
                }
                mainMenu(rl);
              }
            );
          } else {
            mainMenu(rl);
          }
          break;
        case '7':
          await displayTokenBalance();
          await displayOwnerPool();
          rl.question("Withdraw how many tokens?\n", async (amount) => {
            try {
              await withdrawTokens(amount);
            } catch (error) {
              console.log("error\n");
              console.log({ error });
            }
            mainMenu(rl);
          });
          break;
        case '8':
          await displayTokenBalance();
          rl.question("Burn how many tokens?\n", async (amount) => {
            try {
              await burnTokens(amount);
              await displayBalance();
              await displayTokenBalance();
            } catch (error) {
              console.log("error\n");
              console.log({ error });
            }
            mainMenu(rl);
          });
          break;
        default:
          throw new Error("Invalid option");
      }
    }
  );
}

async function checkState() {
  const state = await contract.betsOpen();
  console.log(`The lottery is ${state ? "open" : "closed"}\n`);
  if (!state) return;
  const currentBlock = await contract.provider.getBlock("latest");
  const currentBlockDate = new Date(currentBlock.timestamp * 1000);
  const closingTime = await contract.betsClosingTime();
  const closingTimeDate = new Date(closingTime.toNumber() * 1000);
  console.log(
    `The last block was mined at ${currentBlockDate.toLocaleDateString()} : ${currentBlockDate.toLocaleTimeString()}\n`
  );
  console.log(
    `lottery should close at ${closingTimeDate.toLocaleDateString()} : ${closingTimeDate.toLocaleTimeString()}\n`
  );
}

async function openBets(duration: string) {
  const currentBlock = await contract.provider.getBlock("latest");
  const tx = await contract.openBets(currentBlock.timestamp + Number(duration));
  const receipt = await tx.wait();
  console.log(`Bets opened (${receipt.transactionHash})`);
}

async function displayBalance() {
  const address = await signer.getAddress();
  const balanceBN = await contract.provider.getBalance(
    address
  );
  const balance = ethers.utils.formatEther(balanceBN);
  console.log(
    `The account of address ${address
    } has ${balance} ETH\n`
  );
}

async function buyTokens(amount: string) {
  const tx = await contract.connect(signer).purchaseTokens({
    value: ethers.utils.parseEther(amount).div(TOKEN_RATIO),
  });
  const receipt = await tx.wait();
  console.log(`Tokens bought (${receipt.transactionHash})\n`);
}

async function displayTokenBalance() {
  const address = await signer.getAddress();
  const balanceBN = await token.balanceOf(address);
  const balance = ethers.utils.formatEther(balanceBN);
  console.log(
    `The account of address ${address
    } has ${balance} LT0\n`
  );
}

async function bet(amount: string) {
  const allowTx = await token
    .connect(signer)
    .approve(contract.address, ethers.constants.MaxUint256);
  await allowTx.wait();
  const tx = await contract.connect(signer).betMany(amount);
  const receipt = await tx.wait();
  console.log(`Bets placed (${receipt.transactionHash})\n`);
}

async function closeLottery() {
  const tx = await contract.closeLottery();
  const receipt = await tx.wait();
  console.log(`Bets closed (${receipt.transactionHash})\n`);
}

async function displayPrize(): Promise<string> {
  const address = await signer.getAddress();
  const prizeBN = await contract.prize(address);
  const prize = ethers.utils.formatEther(prizeBN);
  console.log(
    `The account of address ${address
    } has earned a prize of ${prize} Tokens\n`
  );
  return prize;
}

async function claimPrize(amount: string) {
  const tx = await contract
    .connect(signer)
    .prizeWithdraw(ethers.utils.parseEther(amount));
  const receipt = await tx.wait();
  console.log(`Prize claimed (${receipt.transactionHash})\n`);
}

async function displayOwnerPool() {
  const balanceBN = await contract.ownerPool();
  const balance = ethers.utils.formatEther(balanceBN);
  console.log(`The owner pool has (${balance}) Tokens \n`);
}

async function withdrawTokens(amount: string) {
  const tx = await contract.ownerWithdraw(ethers.utils.parseEther(amount));
  const receipt = await tx.wait();
  console.log(`Withdraw confirmed (${receipt.transactionHash})\n`);
}

async function burnTokens(amount: string) {
  const allowTx = await token
    .connect(signer)
    .approve(contract.address, ethers.constants.MaxUint256);
  const receiptAllow = await allowTx.wait();
  console.log(`Allowance confirmed (${receiptAllow.transactionHash})\n`);
  const tx = await contract
    .connect(signer)
    .returnTokens(ethers.utils.parseEther(amount));
  const receipt = await tx.wait();
  console.log(`Burn confirmed (${receipt.transactionHash})\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
