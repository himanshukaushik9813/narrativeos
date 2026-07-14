// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./StakeManager.sol";

abstract contract SettlementManager is StakeManager {
    error PathNotFound();
    error PathClosed();
    error InvalidLeg();
    error InvalidLegCount();
    error LegAlreadyResolved();
    error ResolutionOutOfOrder();
    error SettlementWindowClosed();

    enum MarketStatus {
        Open,
        Active,
        PendingResolution,
        Resolved,
        Cancelled,
        Expired
    }

    struct Path {
        address creator;
        bytes32 termsHash;
        uint8 legCount;
        uint8 resolvedLegs;
        bool exists;
        bool closed;
        uint64 settlementTimestamp;
        uint64 createdAt;
        MarketStatus status;
        bool winningSupport;
        bytes32 finalEvidenceHash;
    }

    mapping(uint256 => Path) public paths;

    event LegResolved(uint256 indexed pathId, uint8 indexed legIndex, bool confirmed, bytes32 evidenceHash);
    event MarketResolved(
        uint256 indexed pathId,
        bool winningSupport,
        bytes32 indexed evidenceHash,
        uint256 settlementBlock,
        uint256 rewardPool
    );
    event MarketExpired(uint256 indexed pathId, uint256 settlementBlock);

    function pathSummary(
        uint256 pathId
    )
        external
        view
        returns (
            address creator,
            bytes32 termsHash,
            uint8 legCount,
            uint8 resolvedLegs,
            uint64 settlementTimestamp,
            MarketStatus status,
            bool winningSupport
        )
    {
        Path storage path = paths[pathId];
        if (!path.exists) revert PathNotFound();
        return (
            path.creator,
            path.termsHash,
            path.legCount,
            path.resolvedLegs,
            path.settlementTimestamp,
            path.status,
            path.winningSupport
        );
    }

    function _createPath(
        uint256 pathId,
        address creator,
        bytes32 termsHash,
        uint8 legCount,
        uint64 settlementTimestamp
    ) internal {
        if (legCount == 0 || legCount > 10) revert InvalidLegCount();
        paths[pathId] = Path({
            creator: creator,
            termsHash: termsHash,
            legCount: legCount,
            resolvedLegs: 0,
            exists: true,
            closed: false,
            settlementTimestamp: settlementTimestamp,
            createdAt: uint64(block.timestamp),
            status: MarketStatus.Open,
            winningSupport: false,
            finalEvidenceHash: bytes32(0)
        });
    }

    function _assertStakeable(uint256 pathId, uint8 legIndex) internal view {
        Path storage path = paths[pathId];
        if (!path.exists) revert PathNotFound();
        if (path.closed) revert PathClosed();
        if (path.settlementTimestamp != 0 && block.timestamp >= path.settlementTimestamp) {
            revert SettlementWindowClosed();
        }
        if (legIndex >= path.legCount) revert InvalidLeg();
        if (legs[pathId][legIndex].resolved) revert LegAlreadyResolved();
    }

    function _markActive(uint256 pathId) internal {
        Path storage path = paths[pathId];
        if (path.status == MarketStatus.Open) {
            path.status = MarketStatus.Active;
        }
    }

    function _resolveLeg(
        uint256 pathId,
        uint8 legIndex,
        bool confirmed,
        bytes32 evidenceHash
    ) internal returns (bool closed) {
        Path storage path = paths[pathId];
        if (!path.exists) revert PathNotFound();
        if (path.closed) revert PathClosed();
        if (legIndex >= path.legCount) revert InvalidLeg();
        if (legIndex != path.resolvedLegs) revert ResolutionOutOfOrder();

        Leg storage leg = legs[pathId][legIndex];
        if (leg.resolved) revert LegAlreadyResolved();

        leg.resolved = true;
        leg.confirmed = confirmed;
        leg.evidenceHash = evidenceHash;
        path.resolvedLegs += 1;
        path.status = MarketStatus.PendingResolution;

        if (!confirmed || path.resolvedLegs == path.legCount) {
            path.closed = true;
            path.status = MarketStatus.Resolved;
            path.winningSupport = confirmed;
            path.finalEvidenceHash = evidenceHash;
            closed = true;
            emit MarketResolved(pathId, confirmed, evidenceHash, block.number, _rewardPool(pathId, path.legCount));
        }

        emit LegResolved(pathId, legIndex, confirmed, evidenceHash);
    }

    function _expire(uint256 pathId) internal {
        Path storage path = paths[pathId];
        if (!path.exists) revert PathNotFound();
        if (path.closed) revert PathClosed();
        path.closed = true;
        path.status = MarketStatus.Expired;
        emit MarketExpired(pathId, block.number);
    }

    function _rewardPool(uint256 pathId, uint8 legCount) internal view returns (uint256 total) {
        for (uint8 i = 0; i < legCount; i++) {
            Leg storage leg = legs[pathId][i];
            total += leg.supportTotal + leg.opposeTotal;
        }
    }
}
