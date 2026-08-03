// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IERC20.sol";

contract MockPolygonSwapTarget {
    error Unauthorized();
    error InvalidAddress();
    error TransferFailed(address token);

    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MockPayout(address indexed token, address indexed receiver, uint256 amount);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert InvalidAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function payout(address token, address receiver, uint256 amount) external onlyOwner {
        if (token == address(0) || receiver == address(0)) revert InvalidAddress();
        bool ok = IERC20(token).transfer(receiver, amount);
        if (!ok) revert TransferFailed(token);
        emit MockPayout(token, receiver, amount);
    }

    function sweep(address token, address receiver, uint256 amount) external onlyOwner {
        if (token == address(0) || receiver == address(0)) revert InvalidAddress();
        bool ok = IERC20(token).transfer(receiver, amount);
        if (!ok) revert TransferFailed(token);
    }
}
