// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBulletToken {
    function mint(address to, uint256 amount) external;
}

contract CasinoCrowdfunding {
    IBulletToken public token;
    address payable public rouletteAddress;
    
    struct Campaign {
        string title;
        uint256 goal;
        uint256 raised;
        uint256 deadline;
        bool finalized;
        address creator;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public campaignCount;

    constructor(address _tokenAddress, address payable _rouletteAddress) {
        token = IBulletToken(_tokenAddress);
        rouletteAddress = _rouletteAddress;
        createCampaign("Initial Casino Fund", 10 ether, 30 days);
    }

    function createCampaign(string memory _title, uint256 _goal, uint256 _duration) public returns (uint256) {
        campaignCount++;
        campaigns[campaignCount] = Campaign({
            title: _title,
            goal: _goal,
            raised: 0,
            deadline: block.timestamp + _duration,
            finalized: false,
            creator: msg.sender
        });
        return campaignCount;
    }

    function contribute(uint256 _campaignId) public payable {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp < campaign.deadline, "Ended");
        require(!campaign.finalized, "Finalized");
        require(msg.value > 0, "Zero ETH");

        campaign.raised += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;
        
        try token.mint(msg.sender, msg.value * 100) {} catch {}
    }

    function finalizeCampaign(uint256 _campaignId) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp >= campaign.deadline || campaign.raised >= campaign.goal, "Not met");
        require(!campaign.finalized, "Finalized");

        campaign.finalized = true;
        if (campaign.raised > 0) {
            rouletteAddress.transfer(campaign.raised);
        }
    }

    function getCampaign(uint256 _id) public view returns (Campaign memory) {
        return campaigns[_id];
    }

    function getContribution(uint256 _campaignId, address _user) public view returns (uint256) {
        return contributions[_campaignId][_user];
    }
}