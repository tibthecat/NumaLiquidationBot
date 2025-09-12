// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {Config} from "../include/Config.sol";
import {IERC20, ICNumaToken} from "../include/Interfaces.sol";



contract LiquidationTest is Test {
    

    address user = makeAddr(Config.user);

    ICNumaToken cLst;
    IERC20 numa;
    IERC20 lst;

    function setUp() public 
    {
        cLst = ICNumaToken(Config.cLst_address);
        numa = IERC20(Config.numa_address);
        lst = IERC20(Config.lst_address);
     
    }

    function test_StandardLiquidation() public {
        // check account state
        // - account should have borrow balance at zero
        uint borrowBalance = cLst.borrowBalanceStored(user);
        assertEq(borrowBalance, 0);

        // check bot profit
        uint numaBotBalance = numa.balanceOf(Config.bot_address);
        console.log("NUMA balance of bot", numaBotBalance);
        //assertGt(numaBotBalance, 0);

        uint lstBotBalance = lst.balanceOf(Config.bot_address);
        console.log("LST balance of bot", lstBotBalance);
        assertGt(lstBotBalance, 0);

       
    }


}
