// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract PaymentProcessor {
    event PaymentReceived(address indexed from, uint256 amount, bytes32 indexed paymentId);
    event PaymentSettled(bytes32 indexed paymentId, address indexed to, uint256 amount);

    mapping(bytes32 => bool) public settledPayments;

    function processPayment(bytes32 paymentId) external payable {
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(!settledPayments[paymentId], "Payment already settled");
        
        emit PaymentReceived(msg.sender, msg.value, paymentId);
    }

    function settlePayment(bytes32 paymentId, address payable recipient, uint256 amount) external {
        require(!settledPayments[paymentId], "Payment already settled");
        require(address(this).balance >= amount, "Insufficient balance");
        
        settledPayments[paymentId] = true;
        recipient.transfer(amount);
        
        emit PaymentSettled(paymentId, recipient, amount);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
