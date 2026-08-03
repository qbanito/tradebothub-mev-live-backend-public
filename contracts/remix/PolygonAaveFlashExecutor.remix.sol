// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);
}

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IAavePool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

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

contract PolygonAaveFlashExecutor is IFlashLoanSimpleReceiver {
    error Unauthorized();
    error InvalidAddress();
    error InvalidTarget(address target);
    error DeadlineExpired();
    error ExternalCallFailed(address target, bytes reason);
    error InsufficientRepayment(uint256 balanceAfter, uint256 amountOwed);
    error InsufficientProfit(uint256 profit, uint256 minProfit);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ApprovedTargetUpdated(address indexed target, bool approved);
    event TokenApprovalSet(address indexed token, address indexed spender, uint256 amount);
    event FlashLoanRequested(
        bytes32 indexed opportunityHash,
        address indexed asset,
        uint256 amount,
        uint256 minProfit,
        address profitReceiver
    );
    event FlashLoanSettled(
        bytes32 indexed opportunityHash,
        address indexed asset,
        uint256 amountOwed,
        uint256 profit
    );

    struct SwapCall {
        address target;
        address spender;
        address sellToken;
        uint256 sellAmount;
        uint256 value;
        bytes data;
    }

    struct FlashPlan {
        address asset;
        uint256 amount;
        uint256 minProfit;
        uint256 deadline;
        address profitReceiver;
        bytes32 opportunityHash;
        SwapCall[] calls;
    }

    IPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;
    IAavePool public immutable override POOL;

    address public owner;
    mapping(address => bool) public approvedTargets;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address provider, address initialOwner) {
        if (provider == address(0) || initialOwner == address(0)) revert InvalidAddress();

        ADDRESSES_PROVIDER = IPoolAddressesProvider(provider);
        address pool = IPoolAddressesProvider(provider).getPool();
        if (pool == address(0)) revert InvalidAddress();
        POOL = IAavePool(pool);
        owner = initialOwner;

        emit OwnershipTransferred(address(0), initialOwner);
    }

    receive() external payable {}

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setApprovedTarget(address target, bool approved) external onlyOwner {
        if (target == address(0)) revert InvalidAddress();
        approvedTargets[target] = approved;
        emit ApprovedTargetUpdated(target, approved);
    }

    function setApprovedTargets(address[] calldata targets, bool approved) external onlyOwner {
        uint256 length = targets.length;
        for (uint256 i = 0; i < length; i++) {
            address target = targets[i];
            if (target == address(0)) revert InvalidAddress();
            approvedTargets[target] = approved;
            emit ApprovedTargetUpdated(target, approved);
        }
    }

    function setTokenApproval(address token, address spender, uint256 amount) external onlyOwner {
        _forceApprove(token, spender, amount);
        emit TokenApprovalSet(token, spender, amount);
    }

    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        _safeTransfer(token, to, amount);
    }

    function rescueNative(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert ExternalCallFailed(to, hex"");
    }

    function executeFlashLoan(FlashPlan calldata plan) external onlyOwner {
        if (plan.asset == address(0) || plan.profitReceiver == address(0)) revert InvalidAddress();
        if (block.timestamp > plan.deadline) revert DeadlineExpired();

        emit FlashLoanRequested(
            plan.opportunityHash,
            plan.asset,
            plan.amount,
            plan.minProfit,
            plan.profitReceiver
        );

        POOL.flashLoanSimple(address(this), plan.asset, plan.amount, abi.encode(plan), 0);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        if (msg.sender != address(POOL) || initiator != address(this)) revert Unauthorized();

        FlashPlan memory plan = abi.decode(params, (FlashPlan));
        if (asset != plan.asset) revert InvalidAddress();
        if (block.timestamp > plan.deadline) revert DeadlineExpired();

        uint256 length = plan.calls.length;
        for (uint256 i = 0; i < length; i++) {
            SwapCall memory call_ = plan.calls[i];
            _validateApproved(call_.target);
            if (call_.spender != address(0)) {
                _validateApproved(call_.spender);
            }
            if (call_.sellToken != address(0) && call_.spender != address(0) && call_.sellAmount > 0) {
                _forceApprove(call_.sellToken, call_.spender, call_.sellAmount);
            }

            (bool ok, bytes memory result) = call_.target.call{value: call_.value}(call_.data);
            if (!ok) revert ExternalCallFailed(call_.target, result);
        }

        uint256 amountOwed = amount + premium;
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        if (balanceAfter < amountOwed) revert InsufficientRepayment(balanceAfter, amountOwed);

        uint256 profit = balanceAfter - amountOwed;
        if (profit < plan.minProfit) revert InsufficientProfit(profit, plan.minProfit);

        _forceApprove(asset, address(POOL), amountOwed);
        if (profit > 0) {
            _safeTransfer(asset, plan.profitReceiver, profit);
        }

        emit FlashLoanSettled(plan.opportunityHash, asset, amountOwed, profit);
        return true;
    }

    function _validateApproved(address target) internal view {
        if (!approvedTargets[target]) revert InvalidTarget(target);
    }

    function _forceApprove(address token, address spender, uint256 amount) internal {
        if (token == address(0) || spender == address(0)) revert InvalidAddress();

        (bool okReset, bytes memory resetData) =
            token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, 0));
        if (!okReset || (resetData.length != 0 && !abi.decode(resetData, (bool)))) {
            revert ExternalCallFailed(token, resetData);
        }

        (bool okSet, bytes memory setData) =
            token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, amount));
        if (!okSet || (setData.length != 0 && !abi.decode(setData, (bool)))) {
            revert ExternalCallFailed(token, setData);
        }
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) =
            token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert ExternalCallFailed(token, data);
        }
    }
}
