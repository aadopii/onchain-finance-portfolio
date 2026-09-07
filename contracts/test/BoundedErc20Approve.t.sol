// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Context} from "@sail/interfaces/IPermission.sol";
import {BoundedErc20Approve} from "../mandates/BoundedErc20Approve.sol";

/// Foundry tests for the multi-token BoundedErc20Approve. Runs with `forge test`.
contract BoundedErc20ApproveTest {
    address internal constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address internal constant CBHYPE = 0xB200000000000000000000451d033a5000cb479e;
    address internal constant UNI = 0xc3De830EA07524a0761646a6a4e4be0e114a3C83;
    address internal constant ZAMA = 0xA12CC123ba206d4031D1c7f6223D1C2Ec249f4f3;

    address internal constant ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address internal constant AERO = 0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F;
    address internal constant MESSENGER = 0x1682Ae6375C4E4A97e4B583BC394c861A46D8962;
    address internal constant RANDOM_SPENDER = 0x1111111111111111111111111111111111111111;
    address internal constant RANDOM_TOKEN = 0x2222222222222222222222222222222222222222;

    address internal constant ACCOUNT = 0x000000000000000000000000000000000000Acc0;
    bytes4 internal constant APPROVE = 0x095ea7b3;
    bytes4 internal constant OTHER = bytes4(keccak256("transfer(address,uint256)"));

    BoundedErc20Approve internal permission;

    function setUp() public {
        address[] memory tokens = new address[](4);
        tokens[0] = USDC;
        tokens[1] = CBHYPE;
        tokens[2] = UNI;
        tokens[3] = ZAMA;
        address[] memory spenders = new address[](3);
        spenders[0] = ROUTER;
        spenders[1] = AERO;
        spenders[2] = MESSENGER;
        permission = new BoundedErc20Approve(tokens, spenders, 0); // uncapped
    }

    function _ctx(address target, bytes4 selector, uint256 value) internal view returns (Context memory) {
        return Context({
            account: ACCOUNT,
            manager: address(0xA9E7),
            submitter: address(0xA9E7),
            target: target,
            selector: selector,
            value: value,
            blockTimestamp: block.timestamp,
            blockNumber: block.number,
            configEpoch: 0
        });
    }

    function _approve(address spender, uint256 amount) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(APPROVE, spender, amount);
    }

    function test_AllowsUsdcToRouter() public view {
        require(permission.evaluate(_approve(ROUTER, 500e6), _ctx(USDC, APPROVE, 0)), "USDC->router approve must pass");
    }

    function test_AllowsUsdcToAerodrome() public view {
        require(permission.evaluate(_approve(AERO, 500e6), _ctx(USDC, APPROVE, 0)), "USDC->aerodrome approve must pass");
    }

    function test_AllowsUsdcToMessenger() public view {
        require(permission.evaluate(_approve(MESSENGER, 500e6), _ctx(USDC, APPROVE, 0)), "USDC->messenger approve must pass");
    }

    function test_AllowsBasketTokenToRouter() public view {
        require(permission.evaluate(_approve(ROUTER, 1e24), _ctx(UNI, APPROVE, 0)), "basket token sell-leg approve must pass");
    }

    function test_AllowsZamaToRouter() public view {
        require(permission.evaluate(_approve(ROUTER, 1e24), _ctx(ZAMA, APPROVE, 0)), "ZAMA sell-leg approve must pass");
    }

    function test_RejectsWrongSelector() public view {
        require(!permission.evaluate(_approve(ROUTER, 500e6), _ctx(USDC, OTHER, 0)), "wrong selector must fail");
    }

    function test_RejectsNativeValue() public view {
        require(!permission.evaluate(_approve(ROUTER, 500e6), _ctx(USDC, APPROVE, 1)), "native value must fail");
    }

    function test_RejectsUnlistedToken() public view {
        require(!permission.evaluate(_approve(ROUTER, 500e6), _ctx(RANDOM_TOKEN, APPROVE, 0)), "unlisted token must fail");
    }

    function test_RejectsUnlistedSpender() public view {
        require(!permission.evaluate(_approve(RANDOM_SPENDER, 500e6), _ctx(USDC, APPROVE, 0)), "unlisted spender must fail");
    }

    function test_RejectsMalformedCalldata() public view {
        require(!permission.evaluate(hex"095ea7b3", _ctx(USDC, APPROVE, 0)), "truncated calldata must fail");
    }
}

/// A second suite: the CAPPED variant (MAX_APPROVAL non-zero) enforces the ceiling.
contract BoundedErc20ApproveCappedTest {
    address internal constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address internal constant ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address internal constant ACCOUNT = 0x000000000000000000000000000000000000Acc0;
    bytes4 internal constant APPROVE = 0x095ea7b3;

    BoundedErc20Approve internal permission;

    function setUp() public {
        address[] memory tokens = new address[](1);
        tokens[0] = USDC;
        address[] memory spenders = new address[](1);
        spenders[0] = ROUTER;
        permission = new BoundedErc20Approve(tokens, spenders, 1000e6); // cap 1000 USDC
    }

    function _ctx() internal view returns (Context memory) {
        return Context(ACCOUNT, address(0xA9E7), address(0xA9E7), USDC, APPROVE, 0, block.timestamp, block.number, 0);
    }

    function test_CappedAllowsAtCap() public view {
        bytes memory data = abi.encodeWithSelector(APPROVE, ROUTER, 1000e6);
        require(permission.evaluate(data, _ctx()), "approve at cap must pass");
    }

    function test_CappedRejectsOverCap() public view {
        bytes memory data = abi.encodeWithSelector(APPROVE, ROUTER, 1001e6);
        require(!permission.evaluate(data, _ctx()), "approve over cap must fail");
    }
}
