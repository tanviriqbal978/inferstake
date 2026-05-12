// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  InferStake — Native Token Edition
 * @notice AI-powered staking protocol on Ritual Chain.
 *         Stakes the NATIVE RITUAL token (msg.value) — no ERC-20 approve needed.
 *
 * Reward formula:
 *   reward = stakedAmount × (apyBasisPoints / 10_000) × timeStaked / 365 days
 *
 * Deploy on Ritual Chain (ID 1979) via Remix IDE:
 *   1. Compiler 0.8.20, optimisation ON (200 runs)
 *   2. Environment: Injected Provider — MetaMask (Ritual Chain)
 *   3. No constructor args needed
 *   4. After deploy: call fundRewardReserve() with some RITUAL to seed rewards
 */

interface IInfernetCoordinator {
    function requestCompute(
        string  calldata modelId,
        bytes   calldata input,
        uint256 callbackGasLimit
    ) external returns (uint256 requestId);
}

contract InferStake {

    /* ─── Constants ─────────────────────────────────────── */
    address public constant INFERNET_COORDINATOR = 0x000000000000000000000000000000000000080C;
    uint256 public constant BASIS_POINTS_DENOM   = 10_000;
    uint256 public constant SECONDS_PER_YEAR     = 365 days;

    /* ─── State ──────────────────────────────────────────── */
    address public owner;
    uint256 public apyBasisPoints   = 1500;   // 15.00%
    uint256 public minStakeAmount   = 0.01 ether;
    string  public aiModelId        = "inferstake-advisor-v1";

    // Reward reserve — owner funds this separately so principal is safe
    uint256 public rewardReserve;

    // Protocol totals
    uint256 public totalStaked;
    uint256 public totalStakers;
    uint256 public totalAiQueries;

    struct StakeInfo {
        uint256 stakedAmount;
        uint256 stakeTimestamp;
        uint256 accruedRewards;
        uint256 aiRequestId;
    }
    mapping(address => StakeInfo) public stakes;

    /* ─── Events ─────────────────────────────────────────── */
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event RewardReserveFunded(uint256 amount);
    event APYUpdated(uint256 oldBps, uint256 newBps);
    event AIAdvisoryRequested(address indexed user, uint256 requestId);

    /* ─── Modifiers ──────────────────────────────────────── */
    modifier onlyOwner() {
        require(msg.sender == owner, "InferStake: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /* ════════════════════════════════════════════════════════
       CORE — Native Token Staking
    ════════════════════════════════════════════════════════ */

    /**
     * @notice Stake native RITUAL tokens.
     * @dev    Send RITUAL as msg.value — no ERC-20 approve needed.
     */
    function stake() external payable {
        require(msg.value >= minStakeAmount, "InferStake: below minimum stake");

        StakeInfo storage info = stakes[msg.sender];

        // Snapshot pending rewards before changing balance
        if (info.stakedAmount > 0) {
            info.accruedRewards += _pendingRewards(msg.sender);
        } else {
            totalStakers += 1;
        }

        info.stakedAmount  += msg.value;
        info.stakeTimestamp = block.timestamp;
        totalStaked        += msg.value;

        emit Staked(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Unstake (withdraw) principal.
     *         Rewards are snapshotted — claim separately.
     */
    function unstake(uint256 amount) external {
        StakeInfo storage info = stakes[msg.sender];
        require(info.stakedAmount >= amount, "InferStake: insufficient balance");
        require(amount > 0, "InferStake: zero amount");

        info.accruedRewards += _pendingRewards(msg.sender);
        info.stakedAmount   -= amount;
        info.stakeTimestamp  = block.timestamp;
        totalStaked         -= amount;

        if (info.stakedAmount == 0) totalStakers -= 1;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "InferStake: transfer failed");

        emit Unstaked(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Claim all accrued rewards (paid from rewardReserve).
     */
    function claimRewards() external {
        StakeInfo storage info = stakes[msg.sender];
        uint256 claimable = info.accruedRewards + _pendingRewards(msg.sender);
        require(claimable > 0, "InferStake: nothing to claim");
        require(rewardReserve >= claimable, "InferStake: reserve insufficient");

        info.accruedRewards = 0;
        info.stakeTimestamp = block.timestamp;
        rewardReserve      -= claimable;

        (bool ok, ) = msg.sender.call{value: claimable}("");
        require(ok, "InferStake: reward transfer failed");

        emit RewardsClaimed(msg.sender, claimable, block.timestamp);
    }

    /* ════════════════════════════════════════════════════════
       AI ADVISOR — Ritual Infernet
    ════════════════════════════════════════════════════════ */

    function requestAIAdvisory() external returns (uint256 requestId) {
        StakeInfo storage info = stakes[msg.sender];

        bytes memory payload = abi.encode(
            msg.sender,
            info.stakedAmount,
            _pendingRewards(msg.sender) + info.accruedRewards,
            apyBasisPoints,
            block.timestamp - info.stakeTimestamp
        );

        requestId = IInfernetCoordinator(INFERNET_COORDINATOR).requestCompute(
            aiModelId, payload, 200_000
        );

        info.aiRequestId = requestId;
        totalAiQueries  += 1;

        emit AIAdvisoryRequested(msg.sender, requestId);
    }

    /* ════════════════════════════════════════════════════════
       VIEW FUNCTIONS
    ════════════════════════════════════════════════════════ */

    function getStakedBalance(address user) external view returns (uint256) {
        return stakes[user].stakedAmount;
    }

    function getRewards(address user) external view returns (uint256) {
        return stakes[user].accruedRewards + _pendingRewards(user);
    }

    function getUserDashboard(address user)
        external view
        returns (
            uint256 stakedAmount,
            uint256 totalRewards,
            uint256 apyBps,
            uint256 timeStakedSeconds,
            uint256 lastAiRequestId
        )
    {
        StakeInfo storage info = stakes[user];
        stakedAmount      = info.stakedAmount;
        totalRewards      = info.accruedRewards + _pendingRewards(user);
        apyBps            = apyBasisPoints;
        timeStakedSeconds = info.stakeTimestamp == 0 ? 0 : block.timestamp - info.stakeTimestamp;
        lastAiRequestId   = info.aiRequestId;
    }

    function getProtocolStats()
        external view
        returns (
            uint256 _totalStaked,
            uint256 _totalStakers,
            uint256 _totalAiQueries,
            uint256 _apyBasisPoints
        )
    {
        return (totalStaked, totalStakers, totalAiQueries, apyBasisPoints);
    }

    /* ════════════════════════════════════════════════════════
       OWNER FUNCTIONS
    ════════════════════════════════════════════════════════ */

    /// Fund the reward reserve — send RITUAL as msg.value
    function fundRewardReserve() external payable onlyOwner {
        require(msg.value > 0, "InferStake: send RITUAL to fund");
        rewardReserve += msg.value;
        emit RewardReserveFunded(msg.value);
    }

    function setAPY(uint256 newApyBps) external onlyOwner {
        require(newApyBps <= 10_000, "InferStake: APY > 100%");
        emit APYUpdated(apyBasisPoints, newApyBps);
        apyBasisPoints = newApyBps;
    }

    function setMinStakeAmount(uint256 amount) external onlyOwner {
        minStakeAmount = amount;
    }

    function setAIModelId(string calldata newId) external onlyOwner {
        aiModelId = newId;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "InferStake: zero address");
        owner = newOwner;
    }

    function emergencyWithdraw(uint256 amount) external onlyOwner {
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "InferStake: withdraw failed");
    }

    /* ════════════════════════════════════════════════════════
       INTERNAL
    ════════════════════════════════════════════════════════ */

    function _pendingRewards(address user) internal view returns (uint256) {
        StakeInfo storage info = stakes[user];
        if (info.stakedAmount == 0 || info.stakeTimestamp == 0) return 0;
        uint256 elapsed = block.timestamp - info.stakeTimestamp;
        return (info.stakedAmount * apyBasisPoints * elapsed)
               / (BASIS_POINTS_DENOM * SECONDS_PER_YEAR);
    }

    /// Accept direct ETH/RITUAL transfers (for reward funding convenience)
    receive() external payable {
        if (msg.sender == owner) {
            rewardReserve += msg.value;
        }
    }
}
