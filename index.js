require('dotenv').config();

const { ethers } = require('ethers');
const { formatEther } = require('ethers/utils');

const GAS_LIMIT_DEFAULT = 21000;

const provider = new ethers.WebSocketProvider('wss://thrilling-ancient-snowflake.ethereum-sepolia.quiknode.pro/92d9c26bf7617a9902be2a5bd777875c195a7eef/');

const depositWallet = new ethers.Wallet(
  process.env.DEPOSIT_WALLET_PRIVATE_KEY,
  provider,
);

const main = async () => {
  try {
    const depositWalletAddress = await depositWallet.getAddress();
    console.log(`Watching for incoming transactions to ${depositWalletAddress}...`);

    provider.on('pending', async (txHash) => {
      try {
        const tx = await provider.getTransaction(txHash);

        if (tx && tx.to === depositWalletAddress) {
          console.log(`Receiving ${formatEther(tx.value)} ETH from ${tx.from}...`);

          // Check if the transaction is already confirmed
          const receipt = await provider.getTransactionReceipt(txHash);
          if (receipt && receipt.confirmations >= process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL) {
            console.log(`Transaction already confirmed. Proceeding with withdrawal...`);
          } else {
            console.log(`Waiting for ${process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL} confirmations...`);
            await provider.waitForTransaction(txHash, process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL);
          }

          // Use tx.value as the amount to withdraw
          const withdrawalTx = {
            to: process.env.VAULT_WALLET_ADDRESS,
            from: depositWalletAddress,
            chainId: tx.chainId,
            gasPrice: tx.gasPrice,
            gasLimit: GAS_LIMIT_DEFAULT,
            value: tx.value, // Use the value from the incoming transaction
          };

          const withdrawalReceipt = await depositWallet.sendTransaction(withdrawalTx);
          console.log(`Withdrew ${formatEther(withdrawalReceipt.value)} ETH to VAULT (${process.env.VAULT_WALLET_ADDRESS}) ✅`);
        }
      } catch (err) {
        console.error('Error processing transaction:', err);
      }
    });
  } catch (err) {
    console.error('Error initializing deposit wallet:', err);
  }
};

if (require.main === module) {
  main();
}
