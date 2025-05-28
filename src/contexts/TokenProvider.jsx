import { createContext, useContext, useState, useEffect } from "react";
import { useSmartContract } from "../hooks";
import { ethers } from "ethers";

const TokenContext = createContext();

export function useToken() {
  return useContext(TokenContext);
}

// Expose formatEthValue for use in other components
export { formatEthValue };

// Format large numbers to K, M, B format with better decimal handling
const formatLargeNumber = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return "0";
  
  const absNum = Math.abs(value);
  if (absNum >= 1e9) {
    const billions = value / 1e9;
    return billions.toFixed(2).replace(/\.?0+$/, '') + 'B';
  }
  if (absNum >= 1e6) {
    const millions = value / 1e6;
    return millions.toFixed(2).replace(/\.?0+$/, '') + 'M';
  }
  if (absNum >= 1e3) {
    const thousands = value / 1e3;
    return thousands.toFixed(2).replace(/\.?0+$/, '') + 'K';
  }
  return value.toFixed(4).replace(/\.?0+$/, '');
};

// Format token from Wei to standard units (HTC, K HTC, M HTC, B HTC)
const formatTokenAmount = (weiAmount, { hideUnit = false } = {}) => {
  try {
    // Convert to string first to handle BigInt
    const rawAmount = weiAmount.toString();
    
    // Convert to BigInt for safe large number handling
    const tokenAmount = BigInt(rawAmount);
    
    // Log for debugging
    console.log('Formatting token amount:', {
      rawAmount,
      tokenAmount: tokenAmount.toString()
    });
    
    // Unit postfix
    const unit = hideUnit ? '' : ' HTC';
    
    // Special case for zero
    if (tokenAmount === BigInt(0)) return "0" + unit;
    
    // For extremely large numbers, show in scientific notation
    if (rawAmount.length > 15) {
      const firstFew = rawAmount.slice(0, 4); // Get first 4 digits
      const exponent = rawAmount.length - 1; // Calculate the exponent
      return `${firstFew[0]}.${firstFew.slice(1)}e${exponent}` + unit;
    }
    
    // Convert to number for normal formatting
    const absNum = Number(tokenAmount);
    
    // Format large numbers
    if (absNum >= 1e9) {
      return (absNum / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B' + unit;
    }
    if (absNum >= 1e6) {
      return (absNum / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' + unit;
    }
    if (absNum >= 1e3) {
      return (absNum / 1e3).toFixed(2).replace(/\.?0+$/, '') + 'K' + unit;
    }
    
    // Regular numbers - no decimals needed for our token
    return absNum.toString() + unit;

  } catch (error) {
    console.error("Error formatting token amount:", error);
    console.error("Input value:", weiAmount);
    return "0" + unit; // Return 0 instead of error message
  }
};

// Format ETH value similarly
const formatEthValue = (ethAmount) => {
  if (typeof ethAmount !== 'number' || isNaN(ethAmount)) return "0 ETH";
  if (ethAmount === 0) return "0 ETH";
  
  const absNum = Math.abs(ethAmount);
  if (absNum >= 1e9) {
    const billions = ethAmount / 1e9;
    return billions.toFixed(2).replace(/\.?0+$/, '') + 'B ETH';
  }
  if (absNum >= 1e6) {
    const millions = ethAmount / 1e6;
    return millions.toFixed(2).replace(/\.?0+$/, '') + 'M ETH';
  }
  if (absNum >= 1e3) {
    const thousands = ethAmount / 1e3;
    return thousands.toFixed(2).replace(/\.?0+$/, '') + 'K ETH';
  }

  // Hiển thị số thông thường (< 1000)
  if (absNum < 0.000001) {
    return ethAmount.toFixed(6).replace(/\.?0+$/, '') + ' ETH';
  }
  if (absNum < 1) {
    return ethAmount.toFixed(4).replace(/\.?0+$/, '') + ' ETH';
  }
  return ethAmount.toFixed(4).replace(/\.?0+$/, '') + ' ETH';
};

export function TokenProvider({ children }) {
  const { contract, signer } = useSmartContract();
  const [tokenBalance, setTokenBalance] = useState("0 HTC");
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

  const fetchTokenBalance = async (retryCount = 3, retryDelay = 500) => {
    if (!contract || !signer) return;

    const getBalance = async () => {
      const address = await signer.getAddress();
      console.log('Fetching balance for address:', address);
      const balance = await contract.getTokenBalance(address);
      console.log('Raw balance (BigNumber):', balance.toString());
      
      // Additional debug info
      const formattedEther = ethers.formatEther(balance);
      console.log('Formatted in Ether:', formattedEther);
      return balance;
    };

    try {
      let attempts = 0;
      let success = false;

      while (attempts < retryCount && !success) {
        try {
          const balance = await getBalance();
          console.log('Successfully fetched balance on attempt:', attempts + 1);
          
          const formattedBalance = formatTokenAmount(balance);
          console.log('Final formatted balance:', formattedBalance);
          
          setTokenBalance(formattedBalance);
          setLastUpdateTime(Date.now());
          success = true;
          
          return balance;
        } catch (error) {
          console.error("Error in balance check attempt:", error);
          attempts++;
          if (attempts < retryCount) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching token balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId;
    
    if (contract && signer) {
      // Initial fetch
      fetchTokenBalance();
      
      // Set up interval for subsequent fetches
      intervalId = setInterval(() => {
        fetchTokenBalance();
      }, 5000); // Check every 5 seconds

      // Listen for relevant events that affect token balance
      const handleTokenEvent = async (from, to, amount) => {
        console.log('Token event:', { from, to, amount });
        // Thêm small delay để đợi transaction hoàn tất
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchTokenBalance();
      };

      const handleSurveyCompleted = async (surveyId, user, reward) => {
        console.log('Survey completed:', { surveyId, user, reward });
        // Thêm small delay để đợi transaction hoàn tất
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchTokenBalance();
      };

      const handleActivityRewardClaimed = async (activityId, user, reward) => {
        console.log('Activity reward claimed:', { activityId, user, reward });
        // Thêm small delay để đợi transaction hoàn tất
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchTokenBalance();
      };

      // Add event listeners
      contract.on('Transfer', handleTokenEvent);
      contract.on('SurveyCompleted', handleSurveyCompleted);
      contract.on('ActivityRewardClaimed', handleActivityRewardClaimed);

      // Remove event listeners on cleanup
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        contract.off('Transfer', handleTokenEvent);
        contract.off('SurveyCompleted', handleSurveyCompleted);
        contract.off('ActivityRewardClaimed', handleActivityRewardClaimed);
      };
    }
  }, [contract, signer]);

  return (
    <TokenContext.Provider value={{ tokenBalance, loading, fetchTokenBalance, formatTokenAmount, formatEthValue }}>
      {children}
    </TokenContext.Provider>
  );
} 