import "./App.css";
import { useState, useEffect } from "react";
import Web3 from "web3";
import { ethers } from "ethers"

import { getLotteryContract, getTokenContract } from "./utils/hooks/useGetLotteryContract.ts";
import { getGethUsdPrice } from "./utils/hooks/useGetEthPrice.ts";

import { getLotteryPrizePool, getLotteryInfo, getLotteryWinners, getPrizeForAddress } from "./utils/hooks/useGetLotteryInfo.ts";


const lotteryContractAddress = "0x94e01cB9195a9933e29ede975B9751d98Ad53290";


function App() {

  // React hooks to rerender the component when the state changes
  const [lotteryContract, setLotteryContract] = useState();
  const [tokenContract, setTokenContract] = useState();
  const [provider, setProvider] = useState();

  const [tokenSymbol, setTokenSymbol] = useState("LT0");
  const [account, setAccount] = useState(undefined);
  const [balance, setBalance] = useState(0);
  const [mtkBalance, setMtkBalance] = useState(0.0);
  const [userPrizeBalance, setUserPrizeBalance] = useState(0.0);
  const [witdhrawAmount, setWitdhrawAmount] = useState(0.0);

  let [mtkPriceInUsd, setMtkPriceInUsd] = useState(1);

  const [lotteryPrize, setLotteryPrize] = useState({
    mtk: 0
  });
  const [lotteryState, setLotteryState] = useState({
    open: false,
    round: 0,
  });
  const [lotteryClosingTime, setLotteryClosingTime] = useState({
    timeRemaining: {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    },
    dateOfClose: "",
  });

  const [buyTokensState, setbuyTokensState] = useState({
    mtkAmount: 0,
    ethAmount: 0,
  });

  const [buyTicketsAmount, setBuyTicketsAmount] = useState({
    ticketAmount: 0,
    mtkPrice: 0,
  });

  const [winnerList, setWinnerList] = useState([
    {
      round: 0,
      winner: "0x9e9ebd188ecaa8dcaf279380f71a48ab43ccffdf",
      reward: "20000", // should be a bignumber or a string
    },
    {
      round: 1,
      winner: "0x9e9ebd188ecaa8dcaf279380f71a48ab43ccffdf",
      reward: "10000", // should be a bignumber or a string
    },
  ]);

  useEffect(() => {
    setLotteryContract(getLotteryContract(lotteryContractAddress));
  }, [])


  useEffect(() => {
    if (lotteryContract) {
      async function init() {
        setTokenContract(getTokenContract(await lotteryContract.paymentToken()));
      }
      init();
    }
  }, [lotteryContract])

  useEffect(() => {


    if (tokenContract) {

      tokenContract.symbol().then((result) => {
        setTokenSymbol(result);
      });


      if (account) {
        tokenContract.balanceOf(account).then((result) => {
          setMtkBalance(bnToFixedString(result, 2));
        });
      }
    }

    if (lotteryContract) {
      async function lotteryInfo() {

        const lotteryInfo = await getLotteryInfo(lotteryContract);
        setMtkPriceInUsd((await getGethUsdPrice()) / lotteryInfo.ratio);

        setLotteryState(lotteryInfo);

        const lotteryPrize = await getLotteryPrizePool(lotteryContract);
        setLotteryPrize(lotteryPrize);
        setWinnerList(await getLotteryWinners(lotteryContract));


        if (lotteryInfo.open) {
          let delta = (lotteryInfo.closingtimeDate - new Date()) / 1000;
          // calculate (and subtract) whole days
          var days = Math.floor(delta / 86400);
          delta -= days * 86400;

          // calculate (and subtract) whole hours
          var hours = Math.floor(delta / 3600) % 24;
          delta -= hours * 3600;

          // calculate (and subtract) whole minutes
          var minutes = Math.floor(delta / 60) % 60;
          delta -= minutes * 60;

          // what's left is seconds
          var seconds = Math.floor(delta);
          setLotteryClosingTime({
            timeRemaining: {
              days: days,
              hours: hours,
              minutes: minutes,
              seconds: seconds
            },
            dateOfClose: lotteryInfo.closingtimeDate.toLocaleDateString() + ' ' + lotteryInfo.closingtimeDate.toLocaleTimeString(),
          })

        }

        if (account) {
          setUserPrizeBalance(await getPrizeForAddress(account, lotteryContract));
        }


      }
      lotteryInfo();
    }
  }, [account, tokenContract, lotteryContract])

  useEffect(() => {
    if (account) {
      async function onAccountChange() {
        //get eth balance
        setBalance(bnToFixedString(await provider.getBalance(account), 2));
      }
      onAccountChange();
    }

  }, [account])

  function bnToFixedString(numBn, decimals = 2) {
    return (+(ethers.utils.formatEther(numBn))).toFixed(decimals);
  }

  // connect to MetaMask
  const web3 = new Web3(window.ethereum);

  const handleLogin = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        // Request account access
        await window.ethereum.enable();
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(provider);

        // Get the initial wallet address so it can be displayed
        const accounts = await window.ethereum
          .request({ method: "eth_requestAccounts" })
          .catch((error) => {
            alert(error.message); //'Permission to access accounts was denied'
          });
        console.log(accounts);
        setAccount(accounts[0]);

        //if network is not Goerli, switch to Goerli
        const network = window.ethereum.networkVersion;
        console.log(network);
        if (network !== 5) {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x5' }],
          });
        }
      } catch (error) {
        // If there is an error, log it in the console
        console.error(error);
      }
    } else {
      alert("Please install MetaMask first.");
    }
  };

  const buyMtkToken = async () => {
    // Call the smart contract function
    console.log(Web3.utils.toWei(buyTokensState.ethAmount.toString(), 'ether'))
    const result = await lotteryContract.purchaseTokens({ value: Web3.utils.toWei(buyTokensState.ethAmount.toString(), 'ether') })
    // Do something with the result
    //console.log(result);
  };

  const sellMtkToken = async () => {
    const result = await lotteryContract.returnTokens( Web3.utils.toWei(buyTokensState.mtkAmount.toString(), 'ether') )
  };

  async function mtkToEth(amount) {
    const ratio = (await lotteryContract.purchaseRatio()).toNumber();
    return (amount / ratio).toFixed(ratio.toString().length-1);
  }

  function convertMTKtoUSD(amount) {
    return  (mtkPriceInUsd * amount).toFixed(12);
  }


  async function onMTKAmountChange(e) {
    const amount = e.target.value;
    const eth = await mtkToEth(amount);
    setbuyTokensState({ mtkAmount: amount, ethAmount: eth });
  }

  async function onWitdhrawAmountChange(e) {
    const amount = e.target.value;
    setWitdhrawAmount(amount);
  }

  //!!!! Approve not a function??

  const approve = async () => {
    // Call the smart contract function
    console.log(`Approving ${buyTicketsAmount.mtkPrice}...`);
    //convert to wei
    const result = await tokenContract.approve(lotteryContractAddress, Web3.utils.toWei(buyTicketsAmount.mtkPrice.toString(), 'ether'));
    console.log('Approved');
    // Do something with the result
    console.log(result);
  };

  const buyTickets = async () => {
    // Call the smart contract function
    console.log(buyTicketsAmount.ticketAmount);
    const result = await lotteryContract.betMany(buyTicketsAmount.ticketAmount);
    // Do something with the result
    console.log(result);
  };

  const witdhraw = async () => {
    const result = await lotteryContract.prizeWithdraw(Web3.utils.toWei(witdhrawAmount.toString(), 'ether'));
  };

  async function ticketToMtk(amount) {
    //Lower fee and price from contract - can also do it here
    const betFee = await lotteryContract.betFee();
    const betPrice = await lotteryContract.betPrice();
    //format ether
    const totalPrice = ethers.utils.formatEther((betFee).add(betPrice).mul(amount));
    console.log(`Amount: ${amount}, Fee: ${betFee}, Price: ${betPrice}, Total: ${totalPrice}`);
    return totalPrice;
  }

  async function onTicketAmountChange(e) {
    const amount = e.target.value;
    const mtk = await ticketToMtk(amount);
    setBuyTicketsAmount({ ticketAmount: amount, mtkPrice: mtk });
  }

  function toTimeRemainingString(timeRemaining) {
    return `${timeRemaining.days} days ${timeRemaining.hours} hours ${timeRemaining.minutes} minutes ${timeRemaining.seconds} seconds`;
  }

  return (
    <div className="App p-0 m-0 bg-light">

      {/* Header */}
      <div class="bg-dark sticky-top">
        <nav class="navbar navbar-expand-lg bg-body-tertiary">
          <div class="container-fluid">
            <a class="navbar-brand text-success" href={"https://goerli.etherscan.io/address/" + lotteryContractAddress} target="_blank">
              Team 9 Lottery - {lotteryContractAddress}
            </a>
            {account === undefined && (
              <button
                class="btn btn-outline-success"
                type="submit"
                onClick={handleLogin}
              >
                Connect Wallet
              </button>
            )}
            {account !== undefined && <div>{account}</div>}
          </div>
        </nav>
      </div>

      {/* Current Rewards */}
      <div class="container global-rewards-container my-4 px-2">
        <div class="row">
          <div class="global-reward text-start lh-lg">
            <div class>The current lottery reward is
              <span class="reward-mtk fw-bold text-success"> {lotteryPrize.mtk} {tokenSymbol} </span>
              <span class="reward-eth"> [{convertMTKtoUSD(lotteryPrize.mtk)}$] </span>
            </div>
          </div>
          <div className="text-start">You currently have <span className="fw-bold text-success">{balance}</span> ETH</div>
          <div className="text-start mb-3">You currently have <span className="fw-bold text-success">{mtkBalance}</span>  {tokenSymbol}</div>
          <div class="input-group mb-3">
            <span class="input-group-text" id="label-mtk-amount">
              Exchange  {tokenSymbol}
            </span>
            <input
              class="form-control"
              placeholder="How many tokens do you want to exchange"
              aria-label="MTK-Amount"
              aria-describedby="label-mtk-amount"
              type="number"
              onChange={(e) => onMTKAmountChange(e)}
            />
          </div>
          <div class="input-group mb-3">
            <span class="input-group-text" id="label-eth-amount">
               ETH
            </span>
            <input
              type="text"
              class="form-control"
              aria-label="ETH-Amount"
              aria-describedby="label-eth-amount"
              disabled
              value={buyTokensState.ethAmount}
            />
          </div>
          <div className="col-6 mb-2">
            <button class="btn btn-outline-success w-100" type="submit" onClick={buyMtkToken}>
              Buy  {tokenSymbol} Tokens to play the lottery
            </button>
          </div>

          <div className="col-6 mb-2">
            <button class="btn btn-outline-success w-100" type="submit" onClick={sellMtkToken}>
              Sell  {tokenSymbol} Tokens to get ETH
            </button>
          </div>
        </div>

      </div>

      {/* Time before lottery ends */}
      <div className="mb-2 py-2 bg-dark">
        <div className="text-uppercase fs-3 fw-bold text-success">Get your tickets now!</div>
        <code>
          {
            lotteryState.open
              ? (<><span>{toTimeRemainingString(lotteryClosingTime.timeRemaining)}</span> before the draw</>)
              : (<>Round is not yet open</>)
          }
        </code>
      </div>

      {/* Current draw */}
      <div className="container mt-3 mb-2">
        <div className="row">
          <div className="col-3 mb-2 text-start">
            Next draw
          </div>
          <div className="col-9 mb-2 text-start">
            #{lotteryState.round} | Draw: {lotteryClosingTime.dateOfClose}
          </div>
          <div className="col-3 mb-2 text-start">
            Prize Pot
          </div>
          <div className="col-9 mb-2 text-start">
            <span class="reward-mtk fw-bold text-success"> {lotteryPrize.mtk}  {tokenSymbol} </span>
            <span class="reward-eth"> [{convertMTKtoUSD(lotteryPrize.mtk)}$] </span>
          </div>
          <div class="input-group mb-3 col-12 mb-2">
            <label
              class="input-group-text"
              htmlFor="inputGroupSelect01"
            >
              Buy Tickets
            </label>
            <select
              class="form-select"
              id="inputGroupSelect01"
              defaultValue="0"
              value={buyTicketsAmount.amount}
              onChange={(e) => onTicketAmountChange(e)
              }
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <div class="input-group mb-3">
            <span class="input-group-text" id="label-eth-amount">
              Price ({tokenSymbol})
            </span>
            <input
              type="text"
              class="form-control"
              aria-label="MTK-Price"
              aria-describedby="label-mtk-price"
              disabled
              value={buyTicketsAmount.mtkPrice}
            />
          </div>
          <div className="col-6 mb-2">
            <button class="btn btn-outline-success w-100" type="submit" onClick={approve}>
              Approve
            </button>
          </div>
          <div className="col-6 mb-2">
            <button
              class="btn btn-outline-success w-100" type="submit" onClick={buyTickets}
            >
              Buy Tickets
            </button>
          </div>
          <div className="col-12 mb-2">
            <code>You current have <span>0</span> tickets</code>
          </div>
        </div>
      </div>

      {/* Current User prize */}
      <div className="mb-2 py-2 bg-dark">
        <div className="text-uppercase fs-3 fw-bold text-success">Withdraw your win!</div>
        <code>You won a total of {userPrizeBalance}  {tokenSymbol}</code>
      </div>

      {/* Current User prize inputs */}
      <div className="container p-0 mt-2 mb-4">
        <div class="input-group my-4">
          <span class="input-group-text" id="label-mtk-amount">
            Withdraw  {tokenSymbol} Won
          </span>
          <input
            class="form-control"
            placeholder="How many tokens do you want"
            aria-label="MTK-Amount"
            aria-describedby="label-mtk-amount"
            type="number"
            onChange={(e) => onWitdhrawAmountChange(e)}
          />
        </div>
        <button class="btn btn-outline-success w-50" type="submit" onClick={witdhraw}>
          Widthdraw
        </button>
      </div>

      {/* Time before lottery ends */}

      {winnerList.length > 0 && (
        <div className="my-2 py-3 text-secondary bg-white">
          <div className="container">
            <div className="row">
              <div className="col-12 mb-2 text-uppercase">Winners History</div>
              <div className="col-1 mb-2 fw-bold">
                #
              </div>
              <div className="col-5 mb-2 fw-bold">
                Winner
              </div>
              <div className="col-6 mb-2 fw-bold">
                Amount
              </div>
              {winnerList.map((round) => (
                <>
                  <div className="col-1 mb-2">
                    {round.round}
                  </div>
                  <div className="col-5 mb-2">
                    {round.winner}
                  </div>
                  <div className="col-6 mb-2">
                    {round.reward} {tokenSymbol} [{convertMTKtoUSD(round.reward)}$]
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
      )}



    </div>
  );
}

export default App;


