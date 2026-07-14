// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

abstract contract StakeManager {
    error EmptyStake();

    struct Leg {
        uint256 supportTotal;
        uint256 opposeTotal;
        bool resolved;
        bool confirmed;
        bytes32 evidenceHash;
    }

    struct UserLegStake {
        uint256 support;
        uint256 oppose;
    }

    mapping(uint256 => mapping(uint8 => Leg)) public legs;
    mapping(uint256 => mapping(uint8 => mapping(address => UserLegStake))) internal userStakes;

    event StakePlaced(
        uint256 indexed pathId,
        uint8 indexed legIndex,
        address indexed staker,
        bool support,
        uint256 amount,
        uint256 supportTotal,
        uint256 opposeTotal
    );

    event LegStaked(
        uint256 indexed pathId,
        uint8 indexed legIndex,
        address indexed staker,
        bool support,
        uint256 amount
    );

    function stakeOf(
        uint256 pathId,
        uint8 legIndex,
        address user
    ) external view returns (uint256 support, uint256 oppose) {
        UserLegStake storage stake = userStakes[pathId][legIndex][user];
        return (stake.support, stake.oppose);
    }

    function legPool(
        uint256 pathId,
        uint8 legIndex
    ) external view returns (uint256 supportTotal, uint256 opposeTotal, bool resolved, bool confirmed, bytes32 evidenceHash) {
        Leg storage leg = legs[pathId][legIndex];
        return (leg.supportTotal, leg.opposeTotal, leg.resolved, leg.confirmed, leg.evidenceHash);
    }

    function _stake(
        uint256 pathId,
        uint8 legIndex,
        address staker,
        bool support,
        uint256 amount
    ) internal {
        if (amount == 0) revert EmptyStake();

        UserLegStake storage stake = userStakes[pathId][legIndex][staker];
        Leg storage leg = legs[pathId][legIndex];
        if (support) {
            stake.support += amount;
            leg.supportTotal += amount;
        } else {
            stake.oppose += amount;
            leg.opposeTotal += amount;
        }

        emit LegStaked(pathId, legIndex, staker, support, amount);
        emit StakePlaced(pathId, legIndex, staker, support, amount, leg.supportTotal, leg.opposeTotal);
    }
}
