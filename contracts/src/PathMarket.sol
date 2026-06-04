// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PathMarket {
    error NotOracle();
    error InvalidLeg();
    error InvalidLegCount();
    error PathNotFound();
    error PathClosed();
    error LegAlreadyResolved();
    error ResolutionOutOfOrder();
    error NothingToClaim();
    error AlreadyClaimed();
    error EmptyStake();
    error TransferFailed();

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

    struct Path {
        address creator;
        bytes32 termsHash;
        uint8 legCount;
        uint8 resolvedLegs;
        bool exists;
        bool closed;
    }

    address public owner;
    address public oracle;
    uint256 public nextPathId = 1;

    mapping(uint256 => Path) public paths;
    mapping(uint256 => mapping(uint8 => Leg)) public legs;
    mapping(uint256 => mapping(uint8 => mapping(address => UserLegStake))) private userStakes;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event OracleUpdated(address indexed oracle);
    event PathCreated(
        uint256 indexed pathId,
        address indexed creator,
        bytes32 indexed termsHash,
        uint8 legCount,
        uint256 creatorStake
    );
    event LegStaked(
        uint256 indexed pathId,
        uint8 indexed legIndex,
        address indexed staker,
        bool support,
        uint256 amount
    );
    event LegResolved(
        uint256 indexed pathId,
        uint8 indexed legIndex,
        bool confirmed,
        bytes32 evidenceHash
    );
    event Claimed(uint256 indexed pathId, address indexed claimant, uint256 amount);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOracle();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    constructor(address initialOracle) {
        owner = msg.sender;
        oracle = initialOracle == address(0) ? msg.sender : initialOracle;
        emit OracleUpdated(oracle);
    }

    function setOracle(address nextOracle) external onlyOwner {
        oracle = nextOracle;
        emit OracleUpdated(nextOracle);
    }

    function createLinearPath(bytes32 termsHash, uint8 legCount) external payable returns (uint256 pathId) {
        if (legCount == 0 || legCount > 10) revert InvalidLegCount();

        pathId = nextPathId++;
        paths[pathId] = Path({
            creator: msg.sender,
            termsHash: termsHash,
            legCount: legCount,
            resolvedLegs: 0,
            exists: true,
            closed: false
        });

        if (msg.value > 0) {
            legs[pathId][0].supportTotal += msg.value;
            userStakes[pathId][0][msg.sender].support += msg.value;
            emit LegStaked(pathId, 0, msg.sender, true, msg.value);
        }

        emit PathCreated(pathId, msg.sender, termsHash, legCount, msg.value);
    }

    function stakeLeg(uint256 pathId, uint8 legIndex, bool support) external payable {
        Path storage path = paths[pathId];
        if (!path.exists) revert PathNotFound();
        if (path.closed) revert PathClosed();
        if (legIndex >= path.legCount) revert InvalidLeg();
        if (legs[pathId][legIndex].resolved) revert LegAlreadyResolved();
        if (msg.value == 0) revert EmptyStake();

        UserLegStake storage stake = userStakes[pathId][legIndex][msg.sender];
        if (support) {
            stake.support += msg.value;
            legs[pathId][legIndex].supportTotal += msg.value;
        } else {
            stake.oppose += msg.value;
            legs[pathId][legIndex].opposeTotal += msg.value;
        }

        emit LegStaked(pathId, legIndex, msg.sender, support, msg.value);
    }

    function resolveLeg(
        uint256 pathId,
        uint8 legIndex,
        bool confirmed,
        bytes32 evidenceHash
    ) external onlyOracle {
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

        if (!confirmed || path.resolvedLegs == path.legCount) {
            path.closed = true;
        }

        emit LegResolved(pathId, legIndex, confirmed, evidenceHash);
    }

    function claim(uint256 pathId) external {
        Path storage path = paths[pathId];
        if (!path.exists) revert PathNotFound();
        if (!path.closed) revert PathClosed();
        if (claimed[pathId][msg.sender]) revert AlreadyClaimed();

        uint256 payout = 0;
        for (uint8 i = 0; i < path.legCount; i++) {
            UserLegStake storage stake = userStakes[pathId][i][msg.sender];
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
        claimed[pathId][msg.sender] = true;

        (bool ok,) = msg.sender.call{value: payout}("");
        if (!ok) revert TransferFailed();

        emit Claimed(pathId, msg.sender, payout);
    }

    function stakeOf(
        uint256 pathId,
        uint8 legIndex,
        address user
    ) external view returns (uint256 support, uint256 oppose) {
        UserLegStake storage stake = userStakes[pathId][legIndex][user];
        return (stake.support, stake.oppose);
    }

    function _winnerPayout(
        uint256 userWinnerStake,
        uint256 winnerTotal,
        uint256 loserTotal
    ) private pure returns (uint256) {
        if (userWinnerStake == 0) {
            return 0;
        }
        if (winnerTotal == 0) {
            return userWinnerStake;
        }
        return userWinnerStake + ((loserTotal * userWinnerStake) / winnerTotal);
    }
}
