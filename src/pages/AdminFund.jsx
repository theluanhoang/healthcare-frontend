import { useState, useEffect } from "react";
import { useSmartContract } from "../hooks";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import {
  ArrowPathIcon,
  CurrencyDollarIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";

export default function AdminFund() {
  const { contract, signer } = useSmartContract();
  const [loading, setLoading] = useState(false);
  const [ethAmount, setEthAmount] = useState("");
  const [contractBalance, setContractBalance] = useState("0");
  const [currentRate, setCurrentRate] = useState("100000");

  // Fetch contract data
  const fetchContractData = async () => {
    if (!contract || !signer) return;

    try {
      // Get contract ETH balance
      const balance = await signer.provider.getBalance(contract.target);
      setContractBalance(ethers.formatEther(balance));

      // Get current token rate
      const rate = await contract.tokenToGasRate();
      setCurrentRate(rate.toString());
    } catch (error) {
      console.error("Error fetching contract data:", error);
    }
  };

  useEffect(() => {
    fetchContractData();
  }, [contract, signer]);

  // Add ETH to contract
  const addEthToContract = async () => {
    if (!contract || !signer || !ethAmount) return;

    try {
      setLoading(true);
      const amountInWei = ethers.parseEther(ethAmount);

      const tx = await signer.sendTransaction({
        to: contract.target,
        value: amountInWei
      });

      toast.info("Đang xử lý giao dịch...", {
        autoClose: false,
        toastId: "processing-eth"
      });

      await tx.wait();
      toast.dismiss("processing-eth");
      toast.success("Đã thêm ETH thành công!");

      // Reset form and refresh data
      setEthAmount("");
      await fetchContractData();
    } catch (error) {
      console.error("Error adding ETH:", error);
      toast.error("Không thể thêm ETH vào contract");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contract Balance Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-2 text-indigo-600 mb-4">
                <WalletIcon className="h-6 w-6" />
                <h2 className="text-xl font-bold">Số dư Contract</h2>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {Number(contractBalance).toFixed(4)} ETH
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Tỷ lệ quy đổi: 1 ETH = {currentRate} HTC
              </p>
            </div>
          </div>

          {/* Add ETH Form */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-2 text-indigo-600 mb-4">
                <CurrencyDollarIcon className="h-6 w-6" />
                <h2 className="text-xl font-bold">Thêm ETH</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="eth-amount" className="block text-sm font-medium text-gray-700">
                    Số lượng ETH
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      id="eth-amount"
                      value={ethAmount}
                      onChange={(e) => setEthAmount(e.target.value)}
                      placeholder="0.0"
                      className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={addEthToContract}
                  disabled={!ethAmount || loading}
                  className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    "Thêm ETH"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 