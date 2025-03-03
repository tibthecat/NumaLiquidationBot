import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// 📌 Configure wallet & provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_FORK);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 📌 Compound contracts
const comptrollerAddress = "0x3ed8ba3118f8089b6a4e42a1d7c44d87cf324694"; // sepolia Comptroller
const cNumaAddress = "0xdfee096d2d16f6174bee3e6ab69781d9bd70ad67"; // cnuma
const cLstAddress = "0x58a7660a5d70fce1608633488ed6ee4a8be03c0b"; // clst
const vaultAddress = "0xcf0142346d487308dfd3c56d8bf889ad8c3ad0ca"; // 





const comptrollerAbi = [
    "function getAllMarkets() view returns (address[])",
    "function closeFactorMantissa() view returns (uint256)",
    "function getAccountLiquidityIsolate(address,address,address) view returns (uint, uint, uint, uint,uint)"
];

const cTokenAbi = [
    "function borrowBalanceStored(address account) view returns (uint256)",
    "function exchangeRateStored() view returns (uint256)",
    "function liquidateBorrow(address borrower, uint256 repayAmount, address cTokenCollateral) returns (uint256)",
    "event Borrow(address borrower, uint256 borrowAmount, uint256 accountBorrows, uint256 totalBorrows)",
    "function borrowBalanceStored(address account) view returns (uint256)",
];
const vaultAbi = [
    "function numaToLst(uint256 _amount) external view returns (uint256)",
    "function liquidateLstBorrower(address _borrower,uint _lstAmount,bool _swapToInput,bool _flashloan)"
];




const comptroller = new ethers.Contract(comptrollerAddress, comptrollerAbi, provider);
const cNuma = new ethers.Contract(cNumaAddress, cTokenAbi, wallet);
const crEth = new ethers.Contract(cLstAddress, cTokenAbi, wallet);
const vault = new ethers.Contract(vaultAddress, vaultAbi, wallet);



async function getAllLstBorrowers(fromBlock = 1660722) {
    //const cTokenContract = new ethers.Contract(market, cTokenAbi, provider);
  
    // 🔍 Fetch Borrow Events
    const borrowFilter = crEth.filters.Borrow();
    const logs = await provider.getLogs({
        address: cLstAddress,
        fromBlock, // Set to a recent block to avoid excessive data
        toBlock: "latest",
        topics: borrowFilter.topics,
    });

    // 📌 Extract Unique Borrower Addresses
    const borrowers = new Set();
    logs.forEach((log) => {
        const parsed = crEth.interface.parseLog(log);
        if (parsed != null)
        {
            //console.log(parsed.args.borrower);
            borrowers.add(parsed.args.borrower);
        }
    });

    console.log(`📌 Found ${borrowers.size} borrowers in LST market`);
    return Array.from(borrowers);
}

async function getUnhealthyAccountsLstBorrow() {
    const unhealthyAccounts = [];
    const borrowers = await getAllLstBorrowers();
    let price = await vault.numaToLst(ethers.parseEther("1"));
    console.log(`numa price ${price}` );
    
    for (const borrower of borrowers) {
        const borrowBalance = await crEth.borrowBalanceStored(borrower);
            if (borrowBalance > 0n)
            {
                console.log(borrowBalance);
                console.log(comptroller);
                let liquidity = await comptroller.getAccountLiquidityIsolate(borrower,cNumaAddress,cLstAddress);
                //console.log(liquidity);
                let badDebt = liquidity[3];
                let ltv = liquidity[4];
                console.log(`📌 Liquidity ${liquidity[1]} `);
                console.log(`📌 Shortfall ${liquidity[2]} `);
                console.log(`📌 Bad debt ${liquidity[3]} `);
                console.log(`📌 LTV ${liquidity[4]} `);
                if (badDebt < 0n)
                {
                    // try standart
                    console.log(`STANDART LIQUIDATION`);
                    await vault.liquidateLstBorrower(borrower,
                        borrowBalance,
                        true,
                        true
                    )

                }
                if ((badDebt > 0n) && (ltv > ethers.parseEther("1.1")))
                {
                    // try partial
                }
            }
           
        
        }
    //}
    return unhealthyAccounts;
}



async function main() {
    console.log("🚀 Liquidation bot started...");

    while (true) {
        try {
            console.log("🚀 reth borrows...");
            const unhealthyAccounts = await getUnhealthyAccountsLstBorrow();


        } catch (error) {
            console.error("❌ Error:", error);
        }
        console.log("********************************");

        // Wait before next scan
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5s delay
    }
}

main();
