// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MarketRegistry is Ownable {
    error NotFactory();
    error InvalidMarket();

    struct MarketRecord {
        address market;
        address creator;
        bytes32 termsHash;
        uint8 legCount;
        uint64 settlementTimestamp;
        uint256 createdAt;
    }

    address public factory;
    address[] private markets;
    mapping(address => bool) public isRegisteredMarket;
    mapping(address => MarketRecord) public records;

    event FactoryUpdated(address indexed factory);
    event MarketRegistered(
        address indexed market,
        address indexed creator,
        bytes32 indexed termsHash,
        uint8 legCount,
        uint64 settlementTimestamp
    );

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner == address(0) ? msg.sender : initialOwner) {}

    function setFactory(address nextFactory) external onlyOwner {
        factory = nextFactory;
        emit FactoryUpdated(nextFactory);
    }

    function registerMarket(
        address market,
        address creator,
        bytes32 termsHash,
        uint8 legCount,
        uint64 settlementTimestamp
    ) external onlyFactory {
        if (market == address(0) || isRegisteredMarket[market]) revert InvalidMarket();
        isRegisteredMarket[market] = true;
        markets.push(market);
        records[market] = MarketRecord({
            market: market,
            creator: creator,
            termsHash: termsHash,
            legCount: legCount,
            settlementTimestamp: settlementTimestamp,
            createdAt: block.timestamp
        });
        emit MarketRegistered(market, creator, termsHash, legCount, settlementTimestamp);
    }

    function marketCount() external view returns (uint256) {
        return markets.length;
    }

    function marketAt(uint256 index) external view returns (address) {
        return markets[index];
    }

    function allMarkets() external view returns (address[] memory) {
        return markets;
    }
}
