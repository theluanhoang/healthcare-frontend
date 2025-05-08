import axios from "axios";
import { ethers } from "ethers";
import React, { useState } from "react";

function LoginRegister() {
  const [walletAddress, setWalletAddress] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) {
      return setStatus("Vui lòng cài MetaMask!");
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      setWalletAddress(address);

      // 1. Gửi ví đến backend để lấy nonce
      const { data } = await axios.post("http://localhost:3000/auth/nonce", {
        walletAddress: address,
      });

      const nonce = data.nonce;

      // 2. Ký nonce bằng ví
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonce);

      // 3. Gửi nonce + signature về backend để xác thực
      const response = await axios.post("http://localhost:3000/auth/verify", {
        walletAddress: address,
        signature,
      });

      setToken(response.data.token);
      setStatus("Xác thực thành công!");
    } catch (error) {
      console.error(error);
      setStatus("Đăng nhập thất bại!");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow rounded text-center">
      <h2 className="text-xl font-bold mb-4">Đăng nhập / Đăng ký với MetaMask</h2>

      <button
        onClick={connectWallet}
        className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
      >
        Kết nối ví MetaMask
      </button>

      {walletAddress && <p className="mt-4">Đã kết nối: {walletAddress}</p>}
      {status && <p className="mt-2 text-sm text-gray-600">{status}</p>}
      {token && <p className="mt-2 text-green-600">JWT Token: {token}</p>}
    </div>
  );
}

export default LoginRegister;
