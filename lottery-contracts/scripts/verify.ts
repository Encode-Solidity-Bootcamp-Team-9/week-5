import { ethers, run } from "hardhat";
import * as dotenv from "dotenv";

// For macOS users
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") })

async function verif() {

    console.log("Verifying the contract on etherscan...");

    await run("verify:verify", {
    address: "0x4A9411a01C58733e78EB03B0009170969eCfCEF8",
    constructorArguments: [
        1,
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("0.2"),
    ],
  });

}

verif();
