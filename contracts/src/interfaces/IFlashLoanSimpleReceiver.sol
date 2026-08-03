// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IAavePool.sol";
import "./IPoolAddressesProvider.sol";

interface IFlashLoanSimpleReceiver {
    function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider);

    function POOL() external view returns (IAavePool);

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}
