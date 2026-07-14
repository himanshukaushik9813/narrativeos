// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SettlementManager.sol";

abstract contract RewardDistributor is SettlementManager {
    error NothingToClaim();
    error AlreadyClaimed();
    error TransferFailed();

    mapping(uint256 => mapping(address => bool)) public claimed;

    event Claimed(uint256 indexed pathId, address indexed claimant, uint256 amount);
    event RewardClaimed(uint256 indexed pathId, address indexed claimant, uint256 amount, uint256 blockNumber);

    function _claim(uint256 pathId, address claimant) internal returns (uint256 payout) {
        Path storage path = paths[pathId];
        if (!path.exists) revert PathNotFound();
        if (!path.closed) revert PathClosed();
        if (claimed[pathId][claimant]) revert AlreadyClaimed();

        for (uint8 i = 0; i < path.legCount; i++) {
            UserLegStake storage stake = userStakes[pathId][i][claimant];
            Leg storage leg = legs[pathId][i];

            if (!leg.resolved) {
                payout += stake.support + stake.oppose;
                continue;
            }

            if (leg.confirmed) {
                payout += _winnerPayout(stake.support, leg.supportTotal, leg.opposeTotal);
            } else {
                payout += _winnerPayout(stake.oppose, leg.opposeTotal, leg.supportTotal);
            }
        }

        if (payout == 0) revert NothingToClaim();
        claimed[pathId][claimant] = true;

        (bool ok,) = claimant.call{value: payout}("");
        if (!ok) revert TransferFailed();

        emit Claimed(pathId, claimant, payout);
        emit RewardClaimed(pathId, claimant, payout, block.number);
    }

    function claimable(uint256 pathId, address claimant) external view returns (uint256 payout) {
        Path storage path = paths[pathId];
        if (!path.exists || !path.closed || claimed[pathId][claimant]) {
            return 0;
        }

        for (uint8 i = 0; i < path.legCount; i++) {
            UserLegStake storage stake = userStakes[pathId][i][claimant];
            Leg storage leg = legs[pathId][i];

            if (!leg.resolved) {
                payout += stake.support + stake.oppose;
            } else if (leg.confirmed) {
                payout += _winnerPayout(stake.support, leg.supportTotal, leg.opposeTotal);
            } else {
                payout += _winnerPayout(stake.oppose, leg.opposeTotal, leg.supportTotal);
            }
        }
    }

    function _winnerPayout(
        uint256 userWinnerStake,
        uint256 winnerTotal,
        uint256 loserTotal
    ) internal pure returns (uint256) {
        if (userWinnerStake == 0) {
            return 0;
        }
        if (winnerTotal == 0) {
            return userWinnerStake;
        }
        return userWinnerStake + ((loserTotal * userWinnerStake) / winnerTotal);
    }
}
