// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Roulette {
    IERC20 public token;
    address public owner;

    event GamePlayed(address indexed player, uint256 bet, uint256 ammo, bool win, uint256 result);

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
        owner = msg.sender;
    }

    receive() external payable {}

    function play(uint256 betAmount, uint256 ammoCount) public {
        require(ammoCount >= 1 && ammoCount <= 5, "1-5 bullets only");
        require(token.transferFrom(msg.sender, address(this), betAmount), "Transfer failed");

        uint256 result = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao))) % 6) + 1;
        bool win = (result > ammoCount);

        if (win) {
            uint256 multiplier = getMultiplier(ammoCount);
            uint256 payout = (betAmount * multiplier) / 100;
            require(token.balanceOf(address(this)) >= payout, "Bankroll too low");
            token.transfer(msg.sender, payout);
        }

        emit GamePlayed(msg.sender, betAmount, ammoCount, win, result);
    }

    function getMultiplier(uint256 ammo) public pure returns (uint256) {
        if (ammo == 1) return 120;
        if (ammo == 2) return 160;
        if (ammo == 3) return 200;
        if (ammo == 4) return 300;
        if (ammo == 5) return 500;
        return 0;
    }

    function withdrawTokens(uint256 amount) public {
        require(msg.sender == owner);
        token.transfer(owner, amount);
    }
}