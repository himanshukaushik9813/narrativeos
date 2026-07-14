// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./RewardDistributor.sol";

contract PathMarket is Ownable, Pausable, ReentrancyGuard, RewardDistributor {
    error NotOracle();

    uint64 public constant DEFAULT_SETTLEMENT_WINDOW = 14 days;

    address public oracle;
    uint256 public nextPathId = 1;

    event OracleUpdated(address indexed oracle);
    event PathCreated(
        uint256 indexed pathId,
        address indexed creator,
        bytes32 indexed termsHash,
        uint8 legCount,
        uint256 creatorStake
    );
    event MarketCreated(
        uint256 indexed pathId,
        address indexed creator,
        bytes32 indexed termsHash,
        uint8 legCount,
        uint64 settlementTimestamp,
        uint256 creatorStake
    );
    event ProbabilityUpdated(uint256 indexed pathId, uint256 probabilityBps, bytes32 indexed evidenceHash);

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    constructor(address initialOracle, address initialOwner)
        Ownable(initialOwner == address(0) ? msg.sender : initialOwner)
    {
        oracle = initialOracle == address(0) ? msg.sender : initialOracle;
        emit OracleUpdated(oracle);
    }

    function setOracle(address nextOracle) external onlyOwner {
        oracle = nextOracle == address(0) ? owner() : nextOracle;
        emit OracleUpdated(oracle);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function createLinearPath(bytes32 termsHash, uint8 legCount)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (uint256 pathId)
    {
        pathId = _createLinearPathFor(
            msg.sender,
            termsHash,
            legCount,
            uint64(block.timestamp + DEFAULT_SETTLEMENT_WINDOW),
            msg.value
        );
    }

    function createLinearPathWithSettlement(
        bytes32 termsHash,
        uint8 legCount,
        uint64 settlementTimestamp
    ) external payable whenNotPaused nonReentrant returns (uint256 pathId) {
        pathId = _createLinearPathFor(
            msg.sender,
            termsHash,
            legCount,
            settlementTimestamp,
            msg.value
        );
    }

    function createLinearPathFor(
        address creator,
        bytes32 termsHash,
        uint8 legCount,
        uint64 settlementTimestamp
    ) external payable onlyOwner whenNotPaused nonReentrant returns (uint256 pathId) {
        pathId = _createLinearPathFor(creator, termsHash, legCount, settlementTimestamp, msg.value);
    }

    function stakeLeg(uint256 pathId, uint8 legIndex, bool support)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        _assertStakeable(pathId, legIndex);
        _stake(pathId, legIndex, msg.sender, support, msg.value);
        _markActive(pathId);
    }

    function resolveLeg(
        uint256 pathId,
        uint8 legIndex,
        bool confirmed,
        bytes32 evidenceHash
    ) external onlyOracle whenNotPaused {
        _resolveLeg(pathId, legIndex, confirmed, evidenceHash);
    }

    function expire(uint256 pathId) external onlyOracle whenNotPaused {
        Path storage path = paths[pathId];
        if (!path.exists) revert PathNotFound();
        if (path.settlementTimestamp != 0 && block.timestamp < path.settlementTimestamp) {
            revert SettlementWindowClosed();
        }
        _expire(pathId);
    }

    function updateProbability(uint256 pathId, uint256 probabilityBps, bytes32 evidenceHash)
        external
        onlyOracle
        whenNotPaused
    {
        if (!paths[pathId].exists) revert PathNotFound();
        emit ProbabilityUpdated(pathId, probabilityBps, evidenceHash);
    }

    function claim(uint256 pathId) external whenNotPaused nonReentrant {
        _claim(pathId, msg.sender);
    }

    function claimReward(uint256 pathId) external whenNotPaused nonReentrant returns (uint256 amount) {
        amount = _claim(pathId, msg.sender);
    }

    function poolSummary(
        uint256 pathId
    )
        external
        view
        returns (
            uint256 totalLiquidity,
            uint256 supportTotal,
            uint256 opposeTotal,
            uint256 resolvedLegs,
            MarketStatus status
        )
    {
        Path storage path = paths[pathId];
        if (!path.exists) revert PathNotFound();

        for (uint8 i = 0; i < path.legCount; i++) {
            supportTotal += legs[pathId][i].supportTotal;
            opposeTotal += legs[pathId][i].opposeTotal;
        }
        totalLiquidity = supportTotal + opposeTotal;
        resolvedLegs = path.resolvedLegs;
        status = path.status;
    }

    function _createLinearPathFor(
        address creator,
        bytes32 termsHash,
        uint8 legCount,
        uint64 settlementTimestamp,
        uint256 creatorStake
    ) private returns (uint256 pathId) {
        if (settlementTimestamp <= block.timestamp) {
            settlementTimestamp = uint64(block.timestamp + DEFAULT_SETTLEMENT_WINDOW);
        }

        pathId = nextPathId++;
        _createPath(pathId, creator, termsHash, legCount, settlementTimestamp);

        if (creatorStake > 0) {
            _stake(pathId, 0, creator, true, creatorStake);
        }

        emit PathCreated(pathId, creator, termsHash, legCount, creatorStake);
        emit MarketCreated(pathId, creator, termsHash, legCount, settlementTimestamp, creatorStake);
    }
}
