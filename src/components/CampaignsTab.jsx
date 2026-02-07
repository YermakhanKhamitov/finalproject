import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const CampaignTabs = ({ contract }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const count = await contract.campaignCount();
      const items = [];
      
      for (let i = 1; i <= count; i++) {
        const c = await contract.getCampaign(i);
        items.push({
          id: i,
          title: c.title,
          goal: ethers.formatEther(c.goal),
          raised: ethers.formatEther(c.raised),
          deadline: new Date(Number(c.deadline) * 1000).toLocaleDateString(),
          finalized: c.finalized,
          creator: c.creator
        });
      }
      setCampaigns(items);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract) fetchCampaigns();
  }, [contract]);

  if (loading) return <div style={{color: 'white', padding: '20px'}}>Loading campaigns...</div>;

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h2>Active Campaigns</h2>
      <div style={{ display: 'grid', gap: '20px' }}>
        {campaigns.map((camp) => (
          <div key={camp.id} style={{ border: '1px solid #444', padding: '15px', borderRadius: '8px', background: '#222' }}>
            <h3>{camp.title}</h3>
            <p>Goal: {camp.goal} ETH</p>
            <p>Raised: {camp.raised} ETH</p>
            <p>Deadline: {camp.deadline}</p>
            <p>Status: {camp.finalized ? "Finished" : "Active"}</p>
            
            {!camp.finalized && (
              <button 
                onClick={async () => {
                  const tx = await contract.contribute(camp.id, { value: ethers.parseEther("0.01") });
                  await tx.wait();
                  fetchCampaigns();
                }}
                style={{ background: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
              >
                Contribute 0.01 ETH
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignTabs;