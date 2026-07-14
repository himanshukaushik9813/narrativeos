// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/PathMarket.sol";

contract DeployPathMarket {
    function deploy(address oracle) external returns (PathMarket) {
        return new PathMarket(oracle, msg.sender);
    }
}
