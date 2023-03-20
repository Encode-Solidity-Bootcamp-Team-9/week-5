import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts1 = await hre.ethers.getSigners();

  for (const account of accounts1) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  paths: { tests: "tests" },
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: false,
        runs: 0,
      },
    }
  },
  networks: {
    goerli: {
      chainId: 5,
      url: `https://eth-goerli.alchemyapi.io/v2/c6DalefEuYNe2PJdprfD8I95Eo7LkIUg`,
      accounts: ["e759cb1030cd6b2c76eb1476f0a05110c316cfc89e039368a280d512ddca2333"]
    },
  },
  etherscan: {
    apiKey: {
      goerli: "B6K4YRQV5EMM2HVG8E77CBNUKCSMUEIEMT"
    }
  }
};

export default config;
