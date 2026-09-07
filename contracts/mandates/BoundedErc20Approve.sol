// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPermission, Context} from "@sail/interfaces/IPermission.sol";
import {SailCalldata} from "./SailCalldata.sol";

/// @title BoundedErc20Approve
/// @notice Bounds a standalone ERC-20 `approve(spender, amount)` call, so the agent can grant its
///         own router/messenger allowance (the agent-managed approve model) without an owner
///         signature. Multi-token: one instance covers every token the agent must approve on a
///         chain (USDC for the buy/bridge legs, each basket token for its sell leg).
///
/// ENFORCES ON-CHAIN (kernel calls evaluate() on every dispatch; false ⇒ dispatch blocked):
///   approve(address spender, uint256 amount)  selector 0x095ea7b3
///     • ctx.target ∈ tokens      (the ERC-20 being approved — USDC or a basket token)
///     • spender ∈ spenders       (the swap routers / CCTP messenger this mandate trusts)
///     • ctx.value == 0           (approve never carries native value)
///     • amount ≤ MAX_APPROVAL    (0 == uncapped — see note below)
///
/// AGENT-ENFORCED / NOT BOUNDED HERE (off-chain — can change without redeploying this contract):
///   • How much it approves on a given tick (the runtime approves the exact trade amount).
///   • When it re-approves.
///
/// MAX_APPROVAL == 0 means the approve amount is uncapped. The agent-managed model relies on the
/// swap/bridge permissions for the real bounds: each swap's `amountIn` is capped by the swap
/// permission, the recipient is pinned to the SMA, and the min-out floor is enforced. An uncapped
/// approve does not widen any single trade — it only removes the cumulative-allowance ceiling that
/// the owner-set model provides. Set MAX_APPROVAL non-zero to re-add a per-approve ceiling if a
/// finite standing exposure is preferred.
contract BoundedErc20Approve is IPermission {
    bytes32 private constant DISCRIMINATOR = keccak256("BoundedErc20Approve");
    bytes4 private constant APPROVE_SELECTOR = 0x095ea7b3; // approve(address,uint256)

    mapping(address => bool) public isAllowedToken;
    mapping(address => bool) public isAllowedSpender;
    uint256 public immutable MAX_APPROVAL; // 0 == uncapped

    constructor(address[] memory tokens, address[] memory spenders, uint256 maxApproval) {
        for (uint256 i = 0; i < tokens.length; i++) isAllowedToken[tokens[i]] = true;
        for (uint256 i = 0; i < spenders.length; i++) isAllowedSpender[spenders[i]] = true;
        MAX_APPROVAL = maxApproval;
    }

    function evaluate(bytes calldata txData, Context calldata ctx) external view returns (bool) {
        if (ctx.selector != APPROVE_SELECTOR) return false;
        if (ctx.value != 0) return false;
        if (!isAllowedToken[ctx.target]) return false;
        if (!SailCalldata.hasParams(txData, 2)) return false;
        address spender = SailCalldata.asAddress(txData, 0);
        uint256 amount = SailCalldata.asUint256(txData, 1);
        if (!isAllowedSpender[spender]) return false;
        if (MAX_APPROVAL != 0 && amount > MAX_APPROVAL) return false;
        return true;
    }

    function discriminator() external pure returns (bytes32) {
        return DISCRIMINATOR;
    }
}
