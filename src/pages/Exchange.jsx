import { useState, useEffect } from "react";
import { useSmartContract } from "../hooks";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { useLocation } from "react-router-dom";
import {
  ArrowsRightLeftIcon,
  WalletIcon,
  ArrowPathIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";
import { useToken, formatEthValue } from "../contexts/TokenProvider";

export default function Exchange() {
  const { contract, signer } = useSmartContract();
  const { tokenBalance, fetchTokenBalance, formatTokenAmount, formatEthValue } = useToken();
  const [userTokens, setUserTokens] = useState(0);
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [exchangeError, setExchangeError] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Format number with better readability
  const formatNumber = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return "0";
    
    // Nếu số = 0, trả về "0"
    if (value === 0) return "0";
    
    // Định dạng số nhỏ
    if (value < 0.01) {
      // Bỏ qua các số 0 không cần thiết
      const fixedNum = value.toFixed(18).replace(/\.?0+$/, '');
      return fixedNum;
    }
    
    // Nếu số nhỏ hơn 1, hiển thị tối đa 6 chữ số thập phân
    if (value < 1) {
      return value.toFixed(6).replace(/\.?0+$/, '');
    }
    
    // Số lớn hơn 1, hiển thị tối đa 4 chữ số thập phân
    return value.toFixed(4).replace(/\.?0+$/, '');
  };

  // Format large numbers to K, M, B format
  const formatLargeNumber = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    
    const absNum = Math.abs(num);
    if (absNum >= 1e9) {
      return (num / 1e9).toFixed(1) + 'B';
    }
    if (absNum >= 1e6) {
      return (num / 1e6).toFixed(1) + 'M';
    }
    if (absNum >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K';
    }
    return num.toFixed(2);
  };

  // Cập nhật số dư token
  const updateTokenBalance = async () => {
    if (!contract || !signer) return;
    try {
      const address = await signer.getAddress();
      const balance = await contract.getTokenBalance(address);
      setUserTokens(balance);  // Lưu số Wei chính xác
      await fetchTokenBalance(); // Cập nhật context
    } catch (error) {
      console.error("Error updating token balance:", error);
    }
  };

  // Cập nhật số dư ETH
  const updateEthBalance = async () => {
    if (!signer) return;
    try {
      const address = await signer.getAddress();
      const balance = await signer.provider.getBalance(address);
      const ethValue = ethers.formatEther(balance);
      setEthBalance(ethValue);
    } catch (error) {
      console.error("Error updating ETH balance:", error);
    }
  };

  // Load user data
  useEffect(() => {
    const fetchData = async () => {
      if (!contract || !signer) return;

      try {
        setLoading(true);
        // Cập nhật cả hai số dư
        await Promise.all([
          updateTokenBalance(),
          updateEthBalance()
        ]);

        // Nếu được chuyển hướng từ trang khảo sát, tự động điền số token
        if (location.state?.fromSurvey) {
          setExchangeAmount(location.state.reward);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contract, signer, location.state]);

  // Validate and handle exchange amount input
  const handleExchangeAmountChange = (e) => {
    const value = e.target.value;
    setExchangeAmount(value);
    
    // Clear previous error
    setExchangeError("");
    
    if (value) {
      const numValue = Number(value);
      const userTokensNum = Number(ethers.formatEther(userTokens));
      
      if (isNaN(numValue) || numValue <= 0) {
        setExchangeError("Vui lòng nhập số lượng hợp lệ");
      } else if (numValue > userTokensNum) {
        setExchangeError("Số dư token không đủ");
      }
    }
  };

  // Đổi token lấy gas
  const exchangeTokens = async () => {
    if (!contract || !signer || !exchangeAmount) return;
    
    try {
      setLoading(true);
      
      // Validate số lượng
      const numValue = Number(exchangeAmount);
      const userTokensNum = Number(ethers.formatEther(userTokens.toString()));
      
      if (numValue > userTokensNum) {
        toast.error("Số dư token không đủ");
        return;
      }

      if (numValue <= 0) {
        toast.error("Số lượng token phải lớn hơn 0");
        return;
      }

      // Giới hạn số lượng token tối đa có thể đổi trong một lần
      if (numValue > 10000) {
        toast.error("Số lượng token tối đa có thể đổi là 10,000 HCT");
        return;
      }

      // Kiểm tra số lượng token có hợp lệ không
      if (!Number.isFinite(numValue) || Number.isNaN(numValue)) {
        toast.error("Số lượng token không hợp lệ");
        return;
      }

      // Kiểm tra số dư ETH của contract
      const contractBalance = await signer.provider.getBalance(contract.target);
      console.log("Contract ETH balance:", ethers.formatEther(contractBalance));
      
      // Tính toán số token cần thiết (đảm bảo đúng format)
      const tokenAmount = ethers.parseUnits(numValue.toString(), 18);
      console.log("Token amount in wei:", tokenAmount.toString());

      // Tính toán số ETH sẽ nhận được (100,000 token = 1 ETH)
      // Vì tokenAmount đã là Wei, chúng ta chỉ cần chia cho tỷ lệ
      const expectedETH = tokenAmount / BigInt(100000);
      console.log("Expected ETH in wei:", expectedETH.toString());
      console.log("Expected ETH in ether:", ethers.formatEther(expectedETH));

      if (contractBalance < expectedETH) {
        toast.error("Smart contract không đủ ETH để thực hiện giao dịch. Vui lòng thông báo cho admin.");
        console.log("Required ETH:", ethers.formatEther(expectedETH));
        console.log("Contract balance:", ethers.formatEther(contractBalance));
        return;
      }

      // Kiểm tra allowance với số Wei chính xác
      try {
        const allowance = await contract.allowance(await signer.getAddress(), contract.target);
        console.log("Current allowance:", allowance.toString());
        console.log("Required amount:", tokenAmount.toString());
        
        if (allowance < tokenAmount) {
          // Nếu chưa approve đủ, thực hiện approve với số Wei chính xác
          const approveTx = await contract.approve(contract.target, tokenAmount);
          
          toast.info("Đang xử lý approve token...", {
            autoClose: false,
            toastId: "processing-approve"
          });
            
          await approveTx.wait();
          toast.dismiss("processing-approve");
          toast.success("Đã approve token thành công!");
        }
      } catch (error) {
        console.error("Error checking/setting allowance:", error);
        if (error.code === 'ACTION_REJECTED') {
          toast.error("Bạn đã từ chối approve token");
        } else {
          toast.error("Không thể approve token");
        }
        return;
      }

      // Thực hiện đổi token
      try {
        toast.info("Đang xử lý giao dịch...", {
          autoClose: false,
          toastId: "processing-exchange"
        });

        // Log thêm thông tin debug
        const from = await signer.getAddress();
        console.log("Debug info:", {
          from,
          to: contract.target,
          tokenAmount: tokenAmount.toString(),
          contractBalance: contractBalance.toString(),
          expectedETH: expectedETH.toString()
        });

        // Lấy nonce hiện tại
        const nonce = await signer.provider.getTransactionCount(from, "latest");
        console.log("Current nonce:", nonce);

        // Lấy gas price hiện tại
        const feeData = await signer.provider.getFeeData();
        console.log("Fee data:", {
          gasPrice: feeData.gasPrice?.toString(),
          maxFeePerGas: feeData.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
        });

        // Chuẩn bị transaction data
        const data = contract.interface.encodeFunctionData("exchangeTokensForGas", [tokenAmount]);
        console.log("Encoded function data:", data);

        // Tạo transaction object
        const tx = {
          from,
          to: contract.target,
          data,
          nonce,
          gasLimit: ethers.toBigInt("200000"),
          type: 2, // EIP-1559
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        };

        console.log("Transaction object:", tx);

        // Gửi transaction
        const response = await signer.sendTransaction(tx);
        console.log("Transaction sent:", response.hash);

        // Chờ giao dịch hoàn thành với timeout 5 phút
        const receipt = await Promise.race([
          response.wait(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Giao dịch quá thời gian chờ")), 300000)
          )
        ]);

        // Đóng toast đang xử lý
        toast.dismiss("processing-exchange");
        
        if (receipt.status === 1) {
          toast.success("Đổi token thành công!");
          
          // Chờ một chút để blockchain cập nhật
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Cập nhật số token và số dư ETH
          await fetchTokenBalance();
          await updateEthBalance();
          setExchangeAmount("");
          setExchangeError("");
        } else {
          console.error("Transaction failed:", receipt);
          toast.error("Giao dịch thất bại");
        }
      } catch (error) {
        console.error("Error in token exchange:", error);
        
        // Đóng toast đang xử lý
        toast.dismiss("processing-exchange");

        // Xử lý các loại lỗi cụ thể
        if (error.code === 'ACTION_REJECTED') {
          toast.error("Giao dịch đã bị hủy");
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
          toast.error("Không đủ ETH để thanh toán gas");
        } else if (error.message?.includes('timeout')) {
          toast.error("Giao dịch đã quá thời gian chờ. Vui lòng kiểm tra sau.");
        } else if (error.data?.message?.includes('insufficient allowance')) {
          toast.error("Chưa được phép sử dụng đủ số token này");
        } else if (error.data?.message?.includes('insufficient balance')) {
          toast.error("Số dư token không đủ");
        } else if (error.data?.message?.includes('execution reverted')) {
          toast.error("Smart contract từ chối giao dịch. Có thể contract không đủ ETH.");
        } else {
          toast.error("Không thể thực hiện giao dịch. Vui lòng thử lại sau");
        }

        // Log chi tiết lỗi để debug
        console.log("Error details:", {
          code: error.code,
          message: error.message,
          data: error.data,
          transaction: error.transaction
        });
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error in token exchange:", error);
      toast.error("Có lỗi xảy ra khi thực hiện giao dịch");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Token Balance Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-2 text-indigo-600 mb-4">
                <WalletIcon className="h-6 w-6" />
                <h2 className="text-xl font-bold">Số dư</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-bold text-gray-900 mb-2">
                    {tokenBalance}
                  </p>
                  <p className="text-sm text-gray-500">
                    ≈ {formatEthValue(Number(userTokens) * 0.00001)} {/* 1 Token = 0.00001 ETH */}
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {Number(ethBalance).toFixed(4)} <span className="text-green-600">ETH</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Token Exchange Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden lg:col-span-2">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-indigo-600">
                  <ArrowsRightLeftIcon className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Đổi token</h2>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Tỷ giá quy đổi</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-lg font-semibold">1 HCT</p>
                    <p className="text-sm text-gray-500">Token</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-lg font-semibold">0.001 ETH</p>
                    <p className="text-sm text-gray-500">Ethereum</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                  <label htmlFor="exchange-amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng HCT muốn đổi
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      id="exchange-amount"
                      value={exchangeAmount}
                      onChange={handleExchangeAmountChange}
                      placeholder="Nhập số token"
                      className={`block w-full rounded-lg border ${
                        exchangeError ? 'border-red-300' : 'border-gray-300'
                      } pl-4 pr-12 py-3 focus:ring-2 ${
                        exchangeError ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-indigo-500 focus:border-indigo-500'
                      } sm:text-sm`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className={`sm:text-sm ${exchangeError ? 'text-red-500' : 'text-gray-500'}`}>HCT</span>
                    </div>
                  </div>
                  {exchangeError ? (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {exchangeError}
                    </p>
                  ) : exchangeAmount ? (
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-500">
                        = {formatLargeNumber(Number(exchangeAmount))} HCT
                      </p>
                      <p className="text-sm text-gray-500">
                        ≈ {formatLargeNumber(Number(exchangeAmount) * 0.001)} ETH
                      </p>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={exchangeTokens}
                  disabled={!exchangeAmount || loading || exchangeError}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] self-end"
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    "Đổi Token"
                  )}
                </button>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <p className="flex items-center space-x-1">
                  <span>•</span>
                  <span>Token sẽ được chuyển đổi thành ETH và gửi về ví của bạn</span>
                </p>
                <p className="flex items-center space-x-1">
                  <span>•</span>
                  <span>Giao dịch có thể mất vài phút để hoàn thành</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 