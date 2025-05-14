import { ethers } from "ethers";
import { createContext, useEffect, useState } from "react";
import HealthcareABI from "../contracts/HealthcareABI.json";

export const SmartContractContext = createContext();

const contractAddress = "0xfE40717CE0C4eE58b721deeC208fC5f3DF06f8cd";

export const SmartContractProvider = ({ children }) => {
  const [signer, setSigner] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);

  const initContract = async () => {
    if (!window.ethereum) {
      const errorMsg = "Vui lòng cài đặt MetaMask để tiếp tục.";
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      console.log("INIT CONTRACT");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      console.log("Connected to network:", network.chainId);

      if (network.chainId !== BigInt(1337)) {
        const errorMsg = "Vui lòng chuyển MetaMask sang mạng Hardhat local (Chain ID: 1337).";
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(
        contractAddress,
        HealthcareABI,
        signer
      );

      setProvider(provider);
      setSigner(signer);
      setContract(contractInstance);
      setError(null);

      const address = await signer.getAddress();
      setWalletAddress(address);
      console.log("provider:::", provider);
      console.log("signer:::", signer);
      console.log("contract:::", contractInstance);
      console.log("walletAddress:::", address);
    } catch (error) {
      console.error("Lỗi khởi tạo hợp đồng: ", error);
      setError(error.message || "Oops! Lỗi khởi tạo hợp đồng.");
      throw error;
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Vui lòng cài đặt MetaMask để tiếp tục.");
      return;
    }

    try {
      if (!contract || !signer) {
        await initContract();
      }

      const address = await signer.getAddress();
      setWalletAddress(address);
      setError(null);
      console.log("Connected walletAddress:::", address);
      return address;
    } catch (err) {
      console.error("Lỗi kết nối ví:", err);
      setError(err.message);
      throw err;
    }
  };

  const getUser = async (address) => {
    if (!address || !contract) {
      const errorMsg = "Hợp đồng hoặc địa chỉ ví chưa sẵn sàng.";
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      console.log("Calling getUser for address:", address);
      const userData = await contract.getUser(address);
      console.log("Raw userData from contract:", userData);
      const [fullName, email, role, isVerified, ipfsHash] = userData || [];
      return {
        fullName: fullName || "",
        email: email || "",
        role: role ? role.toString() : "0",
        isVerified: isVerified || false,
        ipfsHash: ipfsHash || "",
      };
    } catch (error) {
      console.error("Không thể truy xuất thông tin người dùng:", error);
      setError("Không thể truy xuất thông tin người dùng.");
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      setWalletAddress(null);
      setSigner(null);
      setProvider(null);
      setContract(null);
      setError(null);
      console.log("Wallet disconnected successfully.");
    } catch (err) {
      console.error("Lỗi khi ngắt kết nối ví:", err);
      setError("Không thể ngắt kết nối ví.");
    }
  };

  // Tự động khởi tạo hợp đồng ngay khi mount
  useEffect(() => {
    const initialize = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send("eth_accounts", []);
          console.log("Available accounts on mount:", accounts);
          await initContract();
        }
      } catch (err) {
        console.error("Lỗi khởi tạo ban đầu:", err);
        setError("Không thể khởi tạo hợp đồng hoặc kết nối ví.");
      }
    };
    initialize();
  }, []);

  return (
    <SmartContractContext.Provider
      value={{
        initContract,
        contract,
        signer,
        provider,
        error,
        walletAddress,
        connectWallet,
        getUser,
        disconnectWallet,
      }}
    >
      {children}
    </SmartContractContext.Provider>
  );
};