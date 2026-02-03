// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BulletToken.sol";


contract RussianRoulette {

    
    BulletToken public bulletToken;
    address public owner;

    
    uint256 public constant CHAMBERS           = 6;
    uint256 public constant MIN_WAGER_BLTK     = 1000 * 10**18;  
    
    
    uint256 public constant BASE_PRICE         = 1_000_000;      
    uint256 public constant PRICE_GROWTH_FACTOR = 1_000_000 * 10**18; 
    
    
    uint256 public constant OWNER_FEE_BPS      = 500;
    uint256 public constant BPS_DENOM          = 10_000;

    
    uint256[5] public BULLET_MULTIPLIERS;

    
    enum RoundState { IDLE, COMMITTED, REVEALED, ACTIVE, FINISHED }

    struct Round {
        RoundState   state;
        uint256      wager;            
        uint8        bulletCount;      
        bool[6]      chambers;         
        uint8        currentPos;       
        uint256      totalMultiplier;  
        bytes32      commitHash;       
        uint256      shotsRemaining;   
    }

    mapping(address => Round) public rounds;

    
    event RoundStarted   (address indexed player, uint8  bulletCount, uint256 wager, uint256 totalMultiplier);
    event BarrelSpinned  (address indexed player, uint8  startingPosition);
    event ShotFired      (address indexed player, bool   survived, uint8 chamberIndex);
    event RoundWon       (address indexed player, uint256 payout);
    event RoundLost      (address indexed player, uint256 wagerLost);
    event ETHConverted   (address indexed player, uint256 ethSent, uint256 bltkReceived, uint256 ownerFee, uint256 price);
    event BLTKConverted  (address indexed player, uint256 bltkSent, uint256 ethReceived, uint256 ownerFee, uint256 price);

    
    constructor(address _bulletToken) {
        bulletToken = BulletToken(_bulletToken);
        owner = msg.sender;

        
        BULLET_MULTIPLIERS[0] = 2;
        BULLET_MULTIPLIERS[1] = 3;
        BULLET_MULTIPLIERS[2] = 4;
        BULLET_MULTIPLIERS[3] = 5;
        BULLET_MULTIPLIERS[4] = 6;
    }

    

    
    function getCurrentPrice() public view returns (uint256) {
        uint256 supply = bulletToken.totalSupply();
        return BASE_PRICE + (supply / PRICE_GROWTH_FACTOR);
    }

    
    function convertETHtoBLTK() external payable {
        require(msg.value > 0, "RussianRoulette: must send ETH");
        
        uint256 price = getCurrentPrice();
        uint256 tokensBeforeFee = (msg.value * price) / 1 ether;
        
        
        uint256 ownerFee = (tokensBeforeFee * OWNER_FEE_BPS) / BPS_DENOM;
        uint256 tokensToUser = tokensBeforeFee - ownerFee;
        
        
        bulletToken.mint(msg.sender, tokensToUser);
        
        
        bulletToken.mint(owner, ownerFee);
        
        emit ETHConverted(msg.sender, msg.value, tokensToUser, ownerFee, price);
    }

    
    function convertBLTKtoETH(uint256 bltkAmount) external {
        require(bltkAmount > 0, "RussianRoulette: must convert > 0");
        
        uint256 price = getCurrentPrice();
        
        
        uint256 ownerFeeBLTK = (bltkAmount * OWNER_FEE_BPS) / BPS_DENOM;
        uint256 bltkAfterFee = bltkAmount - ownerFeeBLTK;
        
        
        uint256 ethAmount = (bltkAfterFee * 1 ether) / price;
        
        require(address(this).balance >= ethAmount, "RussianRoulette: insufficient ETH in contract");
        
        
        bulletToken.burnFrom(msg.sender, bltkAfterFee);
        
        
        bulletToken.burnFrom(msg.sender, ownerFeeBLTK);
        bulletToken.mint(owner, ownerFeeBLTK);
        
        
        (bool sent, ) = payable(msg.sender).call{value: ethAmount}("");
        require(sent, "RussianRoulette: ETH transfer failed");
        
        emit BLTKConverted(msg.sender, bltkAmount, ethAmount, ownerFeeBLTK, price);
    }

    

    
    function startRound(uint8 bulletCount, uint256 bltkWager) external {
        require(bulletCount >= 1 && bulletCount <= 5, "RussianRoulette: bulletCount must be 1-5");
        require(bltkWager >= MIN_WAGER_BLTK, "RussianRoulette: wager must be >= MIN_WAGER_BLTK");
        require(
            rounds[msg.sender].state == RoundState.IDLE ||
            rounds[msg.sender].state == RoundState.FINISHED,
            "RussianRoulette: finish current round first"
        );

        
        bulletToken.burnFrom(msg.sender, bltkWager);

        Round storage r = rounds[msg.sender];
        r.state          = RoundState.COMMITTED;
        r.wager          = bltkWager;
        r.bulletCount    = bulletCount;
        r.currentPos     = 0;
        r.totalMultiplier = 0;

        
        for (uint8 i = 0; i < CHAMBERS; i++) {
            r.chambers[i] = false;
        }

        
        for (uint8 i = 0; i < bulletCount; i++) {
            r.chambers[i] = true;
            r.totalMultiplier += BULLET_MULTIPLIERS[i];
        }

        
        r.shotsRemaining = CHAMBERS - bulletCount;

        emit RoundStarted(msg.sender, bulletCount, bltkWager, r.totalMultiplier);
    }

    
    function spinBarrel(bytes32 hash) external {
        Round storage r = rounds[msg.sender];
        require(r.state == RoundState.COMMITTED, "RussianRoulette: must be in COMMITTED state");
        r.commitHash = hash;
        
    }

    
    function revealSpin(bytes32 secret) external {
        Round storage r = rounds[msg.sender];
        require(r.state == RoundState.COMMITTED, "RussianRoulette: must be in COMMITTED state");
        require(r.commitHash != bytes32(0), "RussianRoulette: no commit hash found");

        
        bytes32 computedHash = keccak256(abi.encodePacked(secret));
        require(computedHash == r.commitHash, "RussianRoulette: secret does not match commit");

        
        uint8 startPos = uint8(uint256(keccak256(abi.encodePacked(secret, block.timestamp))) % CHAMBERS);

        
        bool[6] memory rotated;
        for (uint8 i = 0; i < CHAMBERS; i++) {
            rotated[i] = r.chambers[(i + startPos) % CHAMBERS];
        }
        for (uint8 i = 0; i < CHAMBERS; i++) {
            r.chambers[i] = rotated[i];
        }

        r.currentPos = 0;
        r.state      = RoundState.ACTIVE;

        emit BarrelSpinned(msg.sender, startPos);
    }

    
    function shoot() external {
        Round storage r = rounds[msg.sender];
        require(r.state == RoundState.ACTIVE, "RussianRoulette: round is not active");

        bool isBullet = r.chambers[r.currentPos];

        if (isBullet) {
            
            emit ShotFired(msg.sender, false, r.currentPos);
            emit RoundLost(msg.sender, r.wager);

            
            r.state = RoundState.FINISHED;

        } else {
            
            r.shotsRemaining -= 1;
            r.currentPos     += 1;

            emit ShotFired(msg.sender, true, r.currentPos - 1);

            if (r.shotsRemaining == 0) {
                
                uint256 payout = r.wager * r.totalMultiplier;

                
                bulletToken.mint(msg.sender, payout);

                r.state = RoundState.FINISHED;

                emit RoundWon(msg.sender, payout);
            }
            
        }
    }

    

    
    function getRound(address player) external view returns (
        uint8   state,
        uint256 wager,
        uint8   bulletCount,
        uint8   currentPos,
        uint256 totalMultiplier,
        uint256 shotsRemaining
    ) {
        Round storage r = rounds[player];
        return (
            uint8(r.state),
            r.wager,
            r.bulletCount,
            r.currentPos,
            r.totalMultiplier,
            r.shotsRemaining
        );
    }

    
    function revealChambers(address player) external view returns (bool[6] memory) {
        Round storage r = rounds[player];
        require(
            r.state == RoundState.FINISHED,
            "RussianRoulette: chambers only visible after round ends"
        );
        return r.chambers;
    }

    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    

    
    function addLiquidity() external payable {
        require(msg.sender == owner, "RussianRoulette: only owner");
    }

    
    function withdrawETH(uint256 amount) external {
        require(msg.sender == owner, "RussianRoulette: only owner");
        require(address(this).balance >= amount, "RussianRoulette: insufficient balance");
        
        (bool sent, ) = payable(owner).call{value: amount}("");
        require(sent, "RussianRoulette: ETH transfer failed");
    }

    
    receive() external payable {}
}
