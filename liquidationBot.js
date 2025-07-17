import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from 'fs/promises';
import process from 'process';

// You can also use a lightweight CLI parser like `minimist` if needed
const args = process.argv.slice(2);
const listOnly = args.includes('-l') || args.includes('--list');
dotenv.config();

// 📌 Configure wallet & provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_SONIC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);


// 📌 contracts SONIC
const comptrollerAddress = "0x30047cca309b7aac3613ae5b990cf460253c9b98"; 
const cNumaAddress = "0x16d4b53de6aba4b68480c7a3b6711df25fcb12d7"; 
const cLstAddress = "0xb2a43445b97cd6a179033788d763b8d0c0487e36"; 

const vaultAddress = "0xde76288c3b977776400fe44fe851bbe2313f1806";  
const oracleAddress = "0xa92025d87128c1e2dcc0a08afbc945547ca3b084";
const stsAddress = "0xe5da20f15420ad15de0fa650600afc998bbe3955";
const collateralFactor = 950000000000000000;





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
    "function balanceOf(address account) view returns (uint256)",
    "function getAccountSnapshot(address account) external view returns (uint, uint, uint, uint)"
];
const vaultAbi = [
    "function numaToLst(uint256 _amount) external view returns (uint256)",
    "function liquidateLstBorrower(address _borrower,uint _lstAmount,bool _swapToInput,bool _flashloan)"
];


const compoundOracleAbi = [
    "function getUnderlyingPriceAsBorrowed(address cToken) public view returns (uint)",
    "function getUnderlyingPriceAsCollateral(address cToken) public view returns (uint)"
];



const comptroller = new ethers.Contract(comptrollerAddress, comptrollerAbi, provider);
const cNuma = new ethers.Contract(cNumaAddress, cTokenAbi, wallet);
const crEth = new ethers.Contract(cLstAddress, cTokenAbi, wallet);
const vault = new ethers.Contract(vaultAddress, vaultAbi, wallet);
const oracle = new ethers.Contract(oracleAddress, compoundOracleAbi, wallet);
const sts = new ethers.Contract(stsAddress, cTokenAbi, wallet);
async function getBorrowersWithLTV(fromBlock = 1660722) 
{
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

async function getBorrowerData(address) {
  try {
    const [ , liquidity, shortfall,badDebt,Ltv ] = await comptroller.getAccountLiquidityIsolate(address,cNumaAddress,cLstAddress);


    const supplyBal = await cNuma.balanceOf(address);
    const exRate = await cNuma.exchangeRateStored();

    // borrow balance
    const borrowUnderlying = await crEth.borrowBalanceStored(address);
    const borrowPriceInSts = await oracle.getUnderlyingPriceAsBorrowed(crEth);
    const borrowInsTs = borrowPriceInSts * borrowUnderlying / BigInt(1e18);



    const snapshot = await cNuma.getAccountSnapshot(address);
    const collateralPrice = await oracle.getUnderlyingPriceAsCollateral(cNuma);

    const collateralBalance = snapshot[1];
    const exchangeRate = snapshot[3];
 
    const tokensToDenomCollateral = BigInt(collateralFactor)*exchangeRate*collateralPrice;
    const tokensToDenomCollateralNoCollateralFactor = exchangeRate*collateralPrice;

    const collateralInsTs = collateralBalance * tokensToDenomCollateral / BigInt(1e54);
    const collateralInsTsNoCF = collateralBalance * tokensToDenomCollateralNoCollateralFactor / BigInt(1e36);


    let LiquidationType = 0;// 0: no liquidation, 1: std liquidation, 2: partial liquidation threshold, 3: partial liquidation ltv > 110 4: bad debt liquidation
    let LiquidationAmount = borrowInsTs;
    if (shortfall > 0) 
    {
        LiquidationType = 1;// just call liquidate
        if (Number(ethers.formatUnits(Ltv, 16)) > 110) // > 110
        {
            // partial liquidation ltv > 110
            LiquidationType = 3;// find optimal % of borrow amount
            // 50%
            LiquidationAmount = 0.5*LiquidationAmount;
        }
        else if (badDebt > 0) // 100 -> 110
        {
            // bad debt liquidation
            LiquidationType = 4;// TODO
        }
    
        else if (borrowInsTs > BigInt(300000000000000000000000))
        {
            LiquidationType = 2; // we can liquidate 300000000000000000000000 or more
            LiquidationAmount = 300000000000000000000000;
        }

    }
    let LiquidityInVault = true;
    let VaultBalance = await sts.balanceOf(vaultAddress);
    if (VaultBalance < LiquidationAmount)
    {
        LiquidityInVault = false;
    }

    return {
      address,
      borrowSts: Number(ethers.formatUnits(borrowInsTs, 18)),
      collateralSts: Number(ethers.formatUnits(collateralInsTs, 18)),
      collateralInsTsNoCF: Number(ethers.formatUnits(collateralInsTsNoCF, 18)),
      liquidity: Number(ethers.formatUnits(liquidity, 18)),
      shortfall: Number(ethers.formatUnits(shortfall, 18)),
      badDebt: Number(ethers.formatUnits(badDebt, 18)),
      ltv: Number(ethers.formatUnits(Ltv, 18)),
      ltvpct: Number(ethers.formatUnits(Ltv, 16)),
      liquidationType: LiquidationType,
      liquidationAmount: Number(ethers.formatUnits(LiquidationAmount,18)),
      vaultBalance: Number(ethers.formatUnits(VaultBalance,18)),
      liquidityInVault: LiquidityInVault

    };
  } catch (err) {
    console.error(`Failed to fetch data for ${address}:`, err.message);
    return null;
  }
}





async function main() {
    console.log("🚀 Liquidation bot started...");


    // if -l, get all borrowers then exit
    if (listOnly) {
        const borrowers = await getBorrowersWithLTV();
        
        const allData = [];

        for (const addr of borrowers) {
            const data = await getBorrowerData(addr);
            if (data) allData.push(data);
        }
        console.log(allData);    
        await fs.writeFile('borrowersData.json', JSON.stringify(allData, null, 2));
        console.log(`Saved ${allData.length} borrower entries to borrowersData.json`);
        
        
        return; // exit here
    }
    else
    {

        while (true) {
        const borrowers = await getBorrowersWithLTV();
        for (const addr of borrowers) {
            const data = await getBorrowerData(addr);
            if (data.liquidationType != 0)
            {
                // liquidation possible
                if (data.liquidityInVault)
                {
                    // we don't need to provide liquidity
                    if (data.liquidationType == 1)
                    {                       
                        await vault.liquidateLstBorrower(addr,
                            data.liquidationAmount,
                            true,
                            true
                        )
                    }
                    else if (data.liquidationType == 2)
                    {
                        await vault.liquidateLstBorrower(addr,
                            data.liquidationAmount,
                            true,
                            true
                        )
                    }
                    else if (data.liquidationType == 3)
                    {                        
                        await vault.liquidateLstBorrower(addr,
                            data.liquidationAmount,
                            true,
                            true
                        )
                    }
                    else if (data.liquidationType == 4)
                    {
                        // TODO
                        // BAD DEBT liquidation

                    }
                }
                else
                {
                    // TODO: provide liquidity
                }


            }

        }
 
        console.log("********************************");

        // Wait before next scan
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5s delay
    }
}
}

main();
