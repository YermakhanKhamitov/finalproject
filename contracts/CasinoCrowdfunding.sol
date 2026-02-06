// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BulletToken.sol";

contract CasinoCrowdfunding is Ownable {
    BulletToken public token;

    struct Campaign {
        string title;
        uint256 goal;          
        uint256 deadline;      
        uint256 totalRaised;    
        bool finalized;         
        bool successful;        
        address beneficiary;    
    }

    Campaign public campaign;
    mapping(address => uint256) public contributions;
    address[] public contributors;
    
    uint256 public constant TOKEN_REWARD_RATE = 1000; 

    event CampaignCreated(
        string title, 
        uint256 goal, 
        uint256 deadline, 
        address beneficiary
    );
    event ContributionMade(
        address indexed contributor, 
        uint256 amount, 
        uint256 tokensIssued
    );
    event CampaignFinalized(
        bool successful, 
        uint256 totalRaised
    );
    event FundsTransferred(
        address indexed beneficiary, 
        uint256 amount
    );

    constructor(address tokenAddress) Ownable(msg.sender) {
        token = BulletToken(tokenAddress);
    }

    function createCampaign(
        string memory title,
        uint256 goal,
        uint256 durationInDays,
        address beneficiary
    ) external onlyOwner {
        require(campaign.deadline == 0, "Campaign already exists");
        require(goal > 0, "Goal must be greater than 0");
        require(durationInDays > 0, "Duration must be greater than 0");
        require(beneficiary != address(0), "Invalid beneficiary");

        uint256 deadline = block.timestamp + (durationInDays * 1 days);

        campaign = Campaign({
            title: title,
            goal: goal,
            deadline: deadline,
            totalRaised: 0,
            finalized: false,
            successful: false,
            beneficiary: beneficiary
        });

        emit CampaignCreated(title, goal, deadline, beneficiary);
    }

    function contribute() external payable {
        require(campaign.deadline > 0, "No active campaign");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(!campaign.finalized, "Campaign already finalized");
        require(msg.value > 0, "Must contribute more than 0");

        if (contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
        }
        contributions[msg.sender] += msg.value;
        campaign.totalRaised += msg.value;

        uint256 tokensToIssue = msg.value * TOKEN_REWARD_RATE;
        token.mint(msg.sender, tokensToIssue);

        emit ContributionMade(msg.sender, msg.value, tokensToIssue);
    }

    function finalizeCampaign() external {
        require(campaign.deadline > 0, "No campaign exists");
        require(block.timestamp >= campaign.deadline, "Campaign still active");
        require(!campaign.finalized, "Already finalized");

        campaign.finalized = true;
        campaign.successful = campaign.totalRaised >= campaign.goal;

        emit CampaignFinalized(campaign.successful, campaign.totalRaised);

        if (campaign.successful) {
            payable(campaign.beneficiary).transfer(campaign.totalRaised);
            emit FundsTransferred(campaign.beneficiary, campaign.totalRaised);
        }
    }

    function withdrawFailedContribution() external {
        require(campaign.finalized, "Campaign not finalized");
        require(!campaign.successful, "Campaign was successful");
        
        uint256 contribution = contributions[msg.sender];
        require(contribution > 0, "No contribution found");

        contributions[msg.sender] = 0;
        payable(msg.sender).transfer(contribution);
    }

    function getCampaignDetails() external view returns (
        string memory title,
        uint256 goal,
        uint256 deadline,
        uint256 totalRaised,
        bool finalized,
        bool successful,
        address beneficiary,
        uint256 contributorsCount
    ) {
        return (
            campaign.title,
            campaign.goal,
            campaign.deadline,
            campaign.totalRaised,
            campaign.finalized,
            campaign.successful,
            campaign.beneficiary,
            contributors.length
        );
    }

    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }

    function getContributorsCount() external view returns (uint256) {
        return contributors.length;
    }

    function isCampaignActive() external view returns (bool) {
        return campaign.deadline > 0 && 
               block.timestamp < campaign.deadline && 
               !campaign.finalized;
    }

    function getTimeRemaining() external view returns (uint256) {
        if (campaign.deadline == 0 || block.timestamp >= campaign.deadline) {
            return 0;
        }
        return campaign.deadline - block.timestamp;
    }
}
