// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract BulletToken is ERC20, Ownable {

    uint256 public rate = 1000; 
    
    mapping(address => bool) public minters;

    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    constructor() ERC20("Bullet Token", "BULLET") Ownable(msg.sender) {}

    function buyTokens() external payable {
        require(msg.value > 0, "Send ETH to buy tokens");

        uint256 amount = msg.value * rate;
        _mint(msg.sender, amount);
        
        emit TokensPurchased(msg.sender, msg.value, amount);
    }

    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "Not authorized to mint");
        _mint(to, amount);
    }

    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
