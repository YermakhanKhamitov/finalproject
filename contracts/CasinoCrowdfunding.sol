// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBulletToken {
    function mint(address to, uint256 amount) external;
}

contract CasinoCrowdfunding {
    IBulletToken public token;
    address payable public rouletteAddress;
    
    struct Campaign {
        uint256 goal;
        uint256 raised;
        uint256 deadline;
        bool finalized;
    }

    Campaign public campaign;

    constructor(address _tokenAddress, address payable _rouletteAddress, uint256 _goal, uint256 _duration) {
        token = IBulletToken(_tokenAddress);
        rouletteAddress = _rouletteAddress;
        campaign = Campaign(_goal, 0, block.timestamp + _duration, false);
    }

    function contribute() public payable {
        require(block.timestamp < campaign.deadline, "Campaign ended");
        campaign.raised += msg.value;
        token.mint(msg.sender, msg.value * 100);
    }

    function finalizeCampaign() public {
        require(!campaign.finalized, "Already finalized");
        campaign.finalized = true;
        rouletteAddress.transfer(address(this).balance);
    }
}