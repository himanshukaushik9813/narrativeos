// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/PathMarket.sol";
import "../src/MarketRegistry.sol";
import "../src/PathMarketFactory.sol";

contract PathMarketActor {
    receive() external payable {}

    function create(PathMarket market, bytes32 termsHash, uint8 legCount) external payable returns (uint256) {
        return market.createLinearPath{value: msg.value}(termsHash, legCount);
    }

    function stake(PathMarket market, uint256 pathId, uint8 legIndex, bool support) external payable {
        market.stakeLeg{value: msg.value}(pathId, legIndex, support);
    }

    function claim(PathMarket market, uint256 pathId) external {
        market.claim(pathId);
    }

    function resolve(
        PathMarket market,
        uint256 pathId,
        uint8 legIndex,
        bool confirmed,
        bytes32 evidenceHash
    ) external {
        market.resolveLeg(pathId, legIndex, confirmed, evidenceHash);
    }
}

contract PathMarketTest {
    PathMarket private market;
    PathMarketActor private alice;
    PathMarketActor private bob;

    receive() external payable {}

    constructor() payable {}

    function _setup() private {
        market = new PathMarket(address(this), address(this));
        alice = new PathMarketActor();
        bob = new PathMarketActor();
        payable(address(alice)).transfer(20 ether);
        payable(address(bob)).transfer(20 ether);
    }

    function testCreateStakeResolveAndClaim() public {
        _setup();
        uint256 pathId = alice.create{value: 1 ether}(market, keccak256("terms"), 3);
        bob.stake{value: 1 ether}(market, pathId, 0, false);

        market.resolveLeg(pathId, 0, true, keccak256("evidence-1"));
        market.resolveLeg(pathId, 1, true, keccak256("evidence-2"));
        market.resolveLeg(pathId, 2, true, keccak256("evidence-3"));

        uint256 beforeBalance = address(alice).balance;
        alice.claim(market, pathId);
        require(address(alice).balance > beforeBalance, "winner did not receive payout");
    }

    function testOnlyOracleCanResolve() public {
        _setup();
        uint256 pathId = alice.create{value: 1 ether}(market, keccak256("terms"), 1);

        (bool ok,) = address(alice).call(
            abi.encodeWithSelector(
                PathMarketActor.resolve.selector,
                market,
                pathId,
                0,
                true,
                keccak256("evidence")
            )
        );
        require(!ok, "non-oracle resolution should revert");

        (ok,) = address(alice).call(
            abi.encodeWithSelector(
                PathMarketActor.claim.selector,
                market,
                pathId
            )
        );
        require(!ok, "claim before close should revert");
    }

    function testInvalidLegAndResolutionOrderProtection() public {
        _setup();
        uint256 pathId = alice.create{value: 1 ether}(market, keccak256("terms"), 2);

        (bool ok,) = address(market).call(
            abi.encodeWithSelector(PathMarket.resolveLeg.selector, pathId, 1, true, keccak256("late"))
        );
        require(!ok, "out-of-order resolution should revert");

        (ok,) = address(bob).call{value: 1 ether}(
            abi.encodeWithSelector(PathMarketActor.stake.selector, market, pathId, 2, true)
        );
        require(!ok, "invalid leg stake should revert");
    }

    function testUnresolvedFutureLegRefundAfterFailedLinearPath() public {
        _setup();
        uint256 pathId = alice.create{value: 1 ether}(market, keccak256("terms"), 3);
        bob.stake{value: 2 ether}(market, pathId, 2, true);

        market.resolveLeg(pathId, 0, false, keccak256("failed-leg"));

        uint256 beforeBalance = address(bob).balance;
        bob.claim(market, pathId);
        require(address(bob).balance == beforeBalance + 2 ether, "future leg was not refunded");
    }

    function testClaimRewardAliasAndPoolSummary() public {
        _setup();
        uint256 pathId = alice.create{value: 1 ether}(market, keccak256("terms"), 1);
        bob.stake{value: 1 ether}(market, pathId, 0, false);

        market.resolveLeg(pathId, 0, false, keccak256("evidence"));
        (uint256 totalLiquidity, uint256 supportTotal, uint256 opposeTotal,,) = market.poolSummary(pathId);
        require(totalLiquidity == 2 ether, "pool total mismatch");
        require(supportTotal == 1 ether, "support total mismatch");
        require(opposeTotal == 1 ether, "oppose total mismatch");

        uint256 beforeBalance = address(bob).balance;
        (bool ok,) = address(bob).call(
            abi.encodeWithSelector(PathMarketActor.claim.selector, market, pathId)
        );
        require(ok, "claimReward-compatible claim failed");
        require(address(bob).balance > beforeBalance, "winner did not receive reward");
    }

    function testFactoryCreatesRegisteredMarket() public {
        MarketRegistry registry = new MarketRegistry(address(this));
        PathMarketFactory factory = new PathMarketFactory(address(this), registry, address(this));
        registry.setFactory(address(factory));

        (address marketAddress, uint256 pathId) = factory.createMarket{value: 1 ether}(
            keccak256("factory-terms"),
            3,
            uint64(block.timestamp + 7 days)
        );

        require(pathId == 1, "factory path id mismatch");
        require(registry.marketCount() == 1, "registry count mismatch");
        require(registry.marketAt(0) == marketAddress, "registry market mismatch");
        require(registry.isRegisteredMarket(marketAddress), "market not registered");
    }
}
