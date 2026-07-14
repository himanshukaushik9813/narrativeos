// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./MarketRegistry.sol";
import "./PathMarket.sol";

contract PathMarketFactory is Ownable, Pausable, ReentrancyGuard {
    error InvalidRegistry();

    MarketRegistry public registry;
    address public oracle;

    event FactoryMarketCreated(
        address indexed market,
        address indexed creator,
        uint256 indexed pathId,
        bytes32 termsHash,
        uint8 legCount,
        uint64 settlementTimestamp,
        uint256 creatorStake
    );

    constructor(address initialOracle, MarketRegistry initialRegistry, address initialOwner)
        Ownable(initialOwner == address(0) ? msg.sender : initialOwner)
    {
        if (address(initialRegistry) == address(0)) revert InvalidRegistry();
        oracle = initialOracle == address(0) ? msg.sender : initialOracle;
        registry = initialRegistry;
    }

    function setOracle(address nextOracle) external onlyOwner {
        oracle = nextOracle == address(0) ? owner() : nextOracle;
    }

    function setRegistry(MarketRegistry nextRegistry) external onlyOwner {
        if (address(nextRegistry) == address(0)) revert InvalidRegistry();
        registry = nextRegistry;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function createMarket(
        bytes32 termsHash,
        uint8 legCount,
        uint64 settlementTimestamp
    ) external payable whenNotPaused nonReentrant returns (address marketAddress, uint256 pathId) {
        PathMarket market = new PathMarket(oracle, address(this));
        marketAddress = address(market);
        pathId = market.createLinearPathFor{value: msg.value}(
            msg.sender,
            termsHash,
            legCount,
            settlementTimestamp
        );
        registry.registerMarket(marketAddress, msg.sender, termsHash, legCount, settlementTimestamp);
        emit FactoryMarketCreated(
            marketAddress,
            msg.sender,
            pathId,
            termsHash,
            legCount,
            settlementTimestamp,
            msg.value
        );
    }
}
