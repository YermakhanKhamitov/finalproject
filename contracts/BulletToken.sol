// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";


contract BulletToken is ERC20, AccessControl {
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public owner;
    
    uint256 public immutable SECONDS_PER_BLOCK;

    
    uint256 public constant DAILY_RATE_BPS = 100; 
    uint256 public constant BPS_DENOM      = 10_000;
    uint256 public constant SECONDS_PER_DAY = 86_400;

    
    uint256 public constant OWNER_FEE_BPS = 500;

    
    struct StakeInfo {
        uint256 stakedAmount;   
        uint256 lastClaimBlock; 
    }

    mapping(address => StakeInfo) public stakes;

    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward, uint256 ownerFee);

    
    
    constructor(uint256 _secondsPerBlock) ERC20("BulletToken", "BLTK") {
        SECONDS_PER_BLOCK = _secondsPerBlock;
        owner = _msgSender();
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(MINTER_ROLE, _msgSender()); 
    }

    
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    
    function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }

    
    
    function burnFrom(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _spendAllowance(from, _msgSender(), amount);
        _burn(from, amount);
    }

    

    
    function stake(uint256 amount) external {
        require(amount > 0, "BulletToken: stake amount must be > 0");

        
        _settleRewards(msg.sender);

        
        _transfer(msg.sender, address(this), amount);

        stakes[msg.sender].stakedAmount += amount;
        stakes[msg.sender].lastClaimBlock = block.number;

        emit Staked(msg.sender, amount);
    }

    
    function unstake(uint256 amount) external {
        StakeInfo storage info = stakes[msg.sender];
        require(amount > 0, "BulletToken: unstake amount must be > 0");
        require(info.stakedAmount >= amount, "BulletToken: insufficient staked balance");

        _settleRewards(msg.sender);

        info.stakedAmount -= amount;
        info.lastClaimBlock = block.number;

        
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    
    function claimRewards() external {
        _settleRewards(msg.sender);
        stakes[msg.sender].lastClaimBlock = block.number;
    }

    
    function pendingRewards(address user) external view returns (uint256) {
        return _calculateReward(user);
    }

    

    
    function _settleRewards(address user) internal {
        uint256 reward = _calculateReward(user);
        if (reward > 0) {
            
            uint256 ownerFee = (reward * OWNER_FEE_BPS) / BPS_DENOM;
            uint256 userReward = reward - ownerFee;

            
            _mint(owner, ownerFee);

            
            _mint(user, userReward);

            emit RewardsClaimed(user, userReward, ownerFee);
        }
        stakes[user].lastClaimBlock = block.number;
    }

    
    function _calculateReward(address user) internal view returns (uint256) {
        StakeInfo storage info = stakes[user];
        if (info.stakedAmount == 0) return 0;

        uint256 elapsedBlocks  = block.number - info.lastClaimBlock;
        uint256 elapsedSeconds = elapsedBlocks * SECONDS_PER_BLOCK;

        
        uint256 dailyReward = (info.stakedAmount * DAILY_RATE_BPS) / BPS_DENOM;

        
        uint256 reward = (dailyReward * elapsedSeconds) / SECONDS_PER_DAY;

        return reward;
    }
}
