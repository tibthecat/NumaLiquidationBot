import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from 'fs/promises';
import process from 'process';




dotenv.config();
// RPC_URL_SONIC_SNIPE
// PRIVATE_KEY_SNIPE
// ENV Vars
// 📌 Configure wallet & provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_SONIC_SNIPE);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_SNIPE, provider);




const routerAddress = "0x5543c6176feb9b4b179078205d7c29eea2e2d695";
const tokenIn = "0x29219dd400f2Bf60E5a23d13Be72B486D4038894";// USDC SONIC
const tokenOut = "0x83a6d8D9aa761e7e08EBE0BA5399970f9e8F61D9";// NUMA SONIC
const poolAddress = "0xE8d01e7d77c5df338D39Ac9F1563502127Dd3301";

// ABIs
const poolAbi = [
    "event Mint(address sender, address owner, int24 tickLower, int24 tickUpper, uint128 amount, uint256 amount0, uint256 amount1)",
    "function liquidity() view returns (uint128)"
];

// const routerAbi = [
//   "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160)) payable returns (uint256 amountOut)"
// ];

const routerAbi = [
    "function exactInputSingle((address,address,int24,address,uint256,uint256,uint256,uint160)) payable returns (uint256 amountOut)"
];


const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

const poolContract = new ethers.Contract(poolAddress, poolAbi, provider);
const routerContract = new ethers.Contract(routerAddress, routerAbi, wallet);

// Constants

let usdcThreshold = 500000000;// 500 USDC



// 1st try
let amountInUSDC0 = 1000;// 2000 usdc
let expectedNumaAmount0 = 25000;// 4 cts

// TODO 
// amountInUSDC0 = 0.000001;
// expectedNumaAmount0 = 0;

// 2nd try
let amountInUSDC1 = 750;// 
let expectedNumaAmount1 = 15000;// 5 cts
// 3rd try
let amountInUSDC2 = 500;// 
let expectedNumaAmount2 = 0;// 7 cts




const fee = 10000; // 1% pool
const pollInterval = 1000; // 1s polling
let initialLiquidity = null;

let issniping = false;



async function getLiquidity() {
    const liquidityRaw = await poolContract.liquidity();
    const liquidity = BigInt(liquidityRaw);
    return liquidity;
}

async function snipe() {

    try {
        // const params = {
        //     tokenIn: tokenIn,
        //     tokenOut: tokenOut,
        //     fee: fee,
        //     recipient: wallet.address,
        //     deadline: Math.floor(Date.now() / 1000) + 60, // 1 min deadline
        //     amountIn: amountIn,
        //     amountOutMinimum: numaAmountOutMinimum,
        //     sqrtPriceLimitX96: 0
        // };
        // shadow exchange specific
        // const params = {
        //     tokenIn,
        //     tokenOut,
        //     tickSpacing,           // e.g. 60, 300, 10000 depending on pool fee tier
        //     recipient: wallet.address,
        //     deadline: Math.floor(Date.now() / 1000) + 60,
        //     amountIn,
        //     amountOutMinimum,
        //     sqrtPriceLimitX96: 0
        // };

        let numaAmountOutMinimum = ethers.parseUnits((expectedNumaAmount0).toString(), 18);
        let amountIn = ethers.parseUnits(amountInUSDC0.toString(), 6); // amount to snipe

        let paramsArray = [
            tokenIn,
            tokenOut,
            100,// 1% fee → tickSpacing = 200 but it looks like it's 100
            wallet.address,
            Math.floor(Date.now() / 1000) + 60,
            amountIn,
            numaAmountOutMinimum,
            0
        ];

        console.log("input:", amountIn);
        console.log("expected output:", numaAmountOutMinimum);



        // const tx = await routerContract.exactInputSingle(params, {
        //     value: 0,
        //     gasLimit: 500000,
        //     gasPrice: ethers.parseUnits("50", "gwei") // adjust
        // });

        let tx = await routerContract.exactInputSingle(paramsArray, {
            value: 0,
            gasLimit: 500000,
            gasPrice: ethers.parseUnits("200", "gwei") // adjust
        });


        console.log("Sniping tx sent:", tx.hash);
        issniping = true;
        await tx.wait();
        console.log("Sniping tx confirmed.");


        process.exit(0);
    } catch (error) {
        console.error("********************** TRYING 2ND SLIPPAGE", error.message);
        // try 2nd slippage
        try {
            let numaAmountOutMinimum = ethers.parseUnits((expectedNumaAmount1).toString(), 18);
            let amountIn = ethers.parseUnits(amountInUSDC1.toString(), 6); // amount to snipe

            let paramsArray = [
                tokenIn,
                tokenOut,
                100,// 1% fee → tickSpacing = 200 but it looks like it's 100
                wallet.address,
                Math.floor(Date.now() / 1000) + 60,
                amountIn,
                numaAmountOutMinimum,
                0
            ];

            console.log("input:", amountIn);
            console.log("expected output:", numaAmountOutMinimum);



            // const tx = await routerContract.exactInputSingle(params, {
            //     value: 0,
            //     gasLimit: 500000,
            //     gasPrice: ethers.parseUnits("50", "gwei") // adjust
            // });

            let tx = await routerContract.exactInputSingle(paramsArray, {
                value: 0,
                gasLimit: 500000,
                gasPrice: ethers.parseUnits("200", "gwei") // adjust
            });


            console.log("Sniping tx sent:", tx.hash);
            issniping = true;
            await tx.wait();
            console.log("Sniping tx confirmed.");


            process.exit(0);
        }
        catch (error) {
             console.error("********************** TRYING 3RD SLIPPAGE", error.message);
            // try 3rd slippage
            try {
                let numaAmountOutMinimum = ethers.parseUnits((expectedNumaAmount2).toString(), 18);
                let amountIn = ethers.parseUnits(amountInUSDC2.toString(), 6); // amount to snipe

                let paramsArray = [
                    tokenIn,
                    tokenOut,
                    100,// 1% fee → tickSpacing = 200 but it looks like it's 100
                    wallet.address,
                    Math.floor(Date.now() / 1000) + 60,
                    amountIn,
                    numaAmountOutMinimum,
                    0
                ];

                console.log("input:", amountIn);
                console.log("expected output:", numaAmountOutMinimum);



                // const tx = await routerContract.exactInputSingle(params, {
                //     value: 0,
                //     gasLimit: 500000,
                //     gasPrice: ethers.parseUnits("50", "gwei") // adjust
                // });                

                let tx = await routerContract.exactInputSingle(paramsArray, {
                    value: 0,
                    gasLimit: 500000,
                    gasPrice: ethers.parseUnits("200", "gwei") // adjust
                });


                console.log("Sniping tx sent:", tx.hash);
                issniping = true;
                await tx.wait();
                console.log("Sniping tx confirmed.");


                process.exit(0);
            }
            catch (error) {
                console.error("Snipe failed, continuing polling. Error:", error.message);
               
            }
        }

    }
}



async function main() {
    console.log("Starting LP polling bot...");
    initialLiquidity = await getLiquidity();
    console.log("Initial liquidity:", initialLiquidity.toString());

    const interval = setInterval(async () => {
        try {

            if (!issniping) {
                const currentLiquidity = await getLiquidity();
                console.log("Current liquidity:", currentLiquidity.toString());

                //if (currentLiquidity > (initialLiquidity)) {
                if (currentLiquidity >= initialLiquidity) {// TODO
                    console.log("Liquidity increased!");

                    const tokenContract0 = new ethers.Contract(tokenIn, erc20Abi, provider);
                    const balanceUSDC = await tokenContract0.balanceOf(poolAddress);
                    console.log(`USDC Balance of POOL:`, (balanceUSDC).toString());

                    /*const tokenContract1 = new ethers.Contract(tokenOut, erc20Abi, provider);
                    const balanceNUMA = await tokenContract1.balanceOf(poolAddress);
                    console.log(`NUMA Balance of POOL:`, balanceNUMA.toString());*/

                    if (balanceUSDC > usdcThreshold) {
                        console.log("Sniping...");
                        //clearInterval(interval);
                        await snipe();
                    }

                }
            }
        } catch (err) {
            console.error("Error polling liquidity:", err);
        }
    }, pollInterval);
}

main();