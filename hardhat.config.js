import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

export default {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },

    ...(process.env.INFURA_KEY && process.env.PRIVATE_KEY ? {
      sepolia: {
        url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
        accounts: [process.env.PRIVATE_KEY]
      }
    } : {})
  }
};
