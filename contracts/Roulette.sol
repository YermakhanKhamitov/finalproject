// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BulletToken.sol";

contract Roulette is Ownable {
    BulletToken public token;

    event GamePlayed(
        address indexed player, 
        uint256 bet, 
        uint8 ammo, 
        uint256 randomValue, 
        bool won, 
        uint256 reward
    );
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event CasinoBankrollFunded(address indexed funder, uint256 amount);
    event ETHReceived(address indexed sender, uint256 amount);

    constructor(address tokenAddress) Ownable(msg.sender) {
        token = BulletToken(tokenAddress);
    }

    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    function play(uint256 bet, uint8 ammo) external {
        require(bet > 0, "Bet must be greater than 0");
        require(ammo >= 1 && ammo <= 5, "Ammo must be between 1 and 5");
        require(token.balanceOf(msg.sender) >= bet, "Insufficient balance");

        token.transferFrom(msg.sender, address(this), bet);

        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    token.balanceOf(address(this)),
                    block.number
                )
            )
        ) % 6;

        bool isWin = random >= ammo;
        uint256 reward = 0;

        if (isWin) {
            uint256 mult = (6 * 1e18) / (6 - ammo);
            reward = (bet * mult) / 1e18;

            require(
                token.balanceOf(address(this)) >= reward, 
                "Casino bankroll insufficient - please fund the casino!"
            );
        }

        emit GamePlayed(msg.sender, bet, ammo, random, isWin, reward);

        if (isWin) {
            token.transfer(msg.sender, reward);
        }
    }

    function fundCasino(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        token.transferFrom(msg.sender, address(this), amount);
        emit CasinoBankrollFunded(msg.sender, amount);
    }

    function getCasinoBankroll() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function calculatePotentialReward(uint256 bet, uint8 ammo) 
        external 
        pure 
        returns (uint256) 
    {
        require(ammo >= 1 && ammo <= 5, "Ammo must be between 1 and 5");
        uint256 mult = (6 * 1e18) / (6 - ammo);
        return (bet * mult) / 1e18;
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        require(token.balanceOf(address(this)) >= amount, "Insufficient balance");
        token.transfer(owner(), amount);
        emit FundsWithdrawn(owner(), amount);
    }

    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
