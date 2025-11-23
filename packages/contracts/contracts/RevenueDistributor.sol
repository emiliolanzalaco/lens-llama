// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RevenueDistributor
 * @notice Distributes USDC payments between photographers and the platform treasury
 * @dev 90% goes to photographer, 10% goes to platform treasury
 */
contract RevenueDistributor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public treasury;

    uint256 public constant PHOTOGRAPHER_SHARE_BPS = 9000; // 90%
    uint256 public constant BPS_DENOMINATOR = 10000;

    event PaymentDistributed(
        address indexed photographer,
        uint256 amount,
        uint256 photographerShare,
        uint256 platformShare
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    error ZeroAddress();
    error ZeroAmount();

    constructor(address _usdc, address _treasury) Ownable(msg.sender) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();

        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    /**
     * @notice Distributes payment between photographer and platform
     * @param photographer Address of the photographer to receive 90%
     * @param amount Total USDC amount to distribute
     */
    function distributePayment(
        address photographer,
        uint256 amount
    ) external nonReentrant {
        if (photographer == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 photographerAmount = (amount * PHOTOGRAPHER_SHARE_BPS) / BPS_DENOMINATOR;
        uint256 platformAmount = amount - photographerAmount;

        // Transfer from caller to recipients
        usdc.safeTransferFrom(msg.sender, photographer, photographerAmount);
        usdc.safeTransferFrom(msg.sender, treasury, platformAmount);

        emit PaymentDistributed(photographer, amount, photographerAmount, platformAmount);
    }

    /**
     * @notice Updates the treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();

        address oldTreasury = treasury;
        treasury = newTreasury;

        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
}
