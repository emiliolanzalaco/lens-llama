// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../../contracts/PaymentToken.sol";

contract PaymentTokenTest is Test {
    PaymentToken token;
    address owner = address(1);
    address user = address(2);

    function setUp() public {
        vm.prank(owner);
        token = new PaymentToken();
    }

    function testInitialSupply() public {
        assertEq(token.totalSupply(), 1000000 * 10 ** 18);
        assertEq(token.balanceOf(owner), 1000000 * 10 ** 18);
    }

    function testMint() public {
        vm.prank(owner);
        token.mint(user, 1000 * 10 ** 18);
        assertEq(token.balanceOf(user), 1000 * 10 ** 18);
    }

    function testFailMintUnauthorized() public {
        vm.prank(user);
        token.mint(user, 1000 * 10 ** 18);
    }
}
