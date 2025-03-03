// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Mintable is IERC20 {
    function mint(address to, uint256 amount) external;
}

contract MintNuma is Script {
    function run() external {
        vm.startBroadcast();

        address token = 0xf478F8dEDebe67cC095693A9d6778dEb3fb67FFe; // Replace with ERC20 contract
        address recipient = 0xe8153Afbe4739D4477C1fF86a26Ab9085C4eDC69;  // Replace with recipient

        IERC20Mintable(token).mint(recipient, 500000000 ether);

        console.log("Minted 500000000 tokens to", recipient);
        console.log("numa supply", IERC20Mintable(token).totalSupply());

        vm.stopBroadcast();
    }
}
