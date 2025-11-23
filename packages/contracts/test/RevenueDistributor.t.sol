// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RevenueDistributor} from "../contracts/RevenueDistributor.sol";
import {MockUSDC} from "../contracts/mocks/MockUSDC.sol";

contract RevenueDistributorTest is Test {
    RevenueDistributor public distributor;
    MockUSDC public usdc;

    address public owner = address(this);
    address public photographer = address(0x1);
    address public treasury = address(0x2);
    address public payer = address(0x3);

    function setUp() public {
        usdc = new MockUSDC();
        distributor = new RevenueDistributor(address(usdc), treasury);

        // Mint USDC to payer
        usdc.mint(payer, 10_000 * 10 ** 6);
    }

    // Constructor tests
    function test_constructor_setsUSDC() public view {
        assertEq(address(distributor.usdc()), address(usdc));
    }

    function test_constructor_setsTreasury() public view {
        assertEq(distributor.treasury(), treasury);
    }

    function test_constructor_setsOwner() public view {
        assertEq(distributor.owner(), owner);
    }

    function test_constructor_revertsOnZeroUSDC() public {
        vm.expectRevert(RevenueDistributor.ZeroAddress.selector);
        new RevenueDistributor(address(0), treasury);
    }

    function test_constructor_revertsOnZeroTreasury() public {
        vm.expectRevert(RevenueDistributor.ZeroAddress.selector);
        new RevenueDistributor(address(usdc), address(0));
    }

    // distributePayment tests
    function test_distributePayment_splits90_10() public {
        uint256 amount = 100 * 10 ** 6; // 100 USDC

        // Approve and distribute
        vm.startPrank(payer);
        usdc.approve(address(distributor), amount);
        distributor.distributePayment(photographer, amount);
        vm.stopPrank();

        // Check balances
        assertEq(usdc.balanceOf(photographer), 90 * 10 ** 6, "photographer should receive 90%");
        assertEq(usdc.balanceOf(treasury), 10 * 10 ** 6, "treasury should receive 10%");
    }

    function test_distributePayment_emitsEvent() public {
        uint256 amount = 100 * 10 ** 6;

        vm.startPrank(payer);
        usdc.approve(address(distributor), amount);

        vm.expectEmit(true, false, false, true);
        emit RevenueDistributor.PaymentDistributed(
            photographer,
            amount,
            90 * 10 ** 6,
            10 * 10 ** 6
        );

        distributor.distributePayment(photographer, amount);
        vm.stopPrank();
    }

    function test_distributePayment_revertsOnZeroAmount() public {
        vm.prank(payer);
        vm.expectRevert(RevenueDistributor.ZeroAmount.selector);
        distributor.distributePayment(photographer, 0);
    }

    function test_distributePayment_revertsOnZeroPhotographer() public {
        vm.prank(payer);
        vm.expectRevert(RevenueDistributor.ZeroAddress.selector);
        distributor.distributePayment(address(0), 100 * 10 ** 6);
    }

    function test_distributePayment_handlesOddAmounts() public {
        uint256 amount = 33 * 10 ** 6; // 33 USDC

        vm.startPrank(payer);
        usdc.approve(address(distributor), amount);
        distributor.distributePayment(photographer, amount);
        vm.stopPrank();

        // 33 * 9000 / 10000 = 29.7 USDC
        uint256 expectedPhotographer = (amount * 9000) / 10000;
        uint256 expectedTreasury = amount - expectedPhotographer;

        assertEq(usdc.balanceOf(photographer), expectedPhotographer);
        assertEq(usdc.balanceOf(treasury), expectedTreasury);
    }

    // setTreasury tests
    function test_setTreasury_updatesAddress() public {
        address newTreasury = address(0x4);

        distributor.setTreasury(newTreasury);

        assertEq(distributor.treasury(), newTreasury);
    }

    function test_setTreasury_emitsEvent() public {
        address newTreasury = address(0x4);

        vm.expectEmit(true, true, false, false);
        emit RevenueDistributor.TreasuryUpdated(treasury, newTreasury);

        distributor.setTreasury(newTreasury);
    }

    function test_setTreasury_revertsOnNonOwner() public {
        vm.prank(photographer);
        vm.expectRevert();
        distributor.setTreasury(address(0x4));
    }

    function test_setTreasury_revertsOnZeroAddress() public {
        vm.expectRevert(RevenueDistributor.ZeroAddress.selector);
        distributor.setTreasury(address(0));
    }

    // Fuzz tests
    function testFuzz_distributePayment_maintainsTotalAmount(uint256 amount) public {
        // Bound to reasonable amounts (1 wei to 1 billion USDC)
        amount = bound(amount, 1, 1_000_000_000 * 10 ** 6);

        // Mint enough USDC
        usdc.mint(payer, amount);

        vm.startPrank(payer);
        usdc.approve(address(distributor), amount);
        distributor.distributePayment(photographer, amount);
        vm.stopPrank();

        // Total distributed should equal amount
        uint256 totalDistributed = usdc.balanceOf(photographer) + usdc.balanceOf(treasury);
        assertEq(totalDistributed, amount, "total distributed should equal input amount");
    }
}
