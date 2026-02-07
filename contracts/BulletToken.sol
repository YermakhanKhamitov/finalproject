// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BulletToken is ERC20, Ownable {
    uint256 public rate = 1000;
    mapping(address => bool) public minters;

    constructor() ERC20("Bullet Token", "BULLET") Ownable(msg.sender) {
        minters[msg.sender] = true;
    }

    function buyTokens() external payable {
        require(msg.value > 0);
        uint256 amount = msg.value * rate;
        _mint(msg.sender, amount);
    }

    function mint(address to, uint256 amount) external {
        require(minters[msg.sender]);
        _mint(to, amount);
    }

    function addMinter(address m) external onlyOwner {
        minters[m] = true;
    }
}
