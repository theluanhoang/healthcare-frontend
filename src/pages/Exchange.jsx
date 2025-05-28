import { useState, useEffect } from "react";
import { useSmartContract } from "../hooks";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

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
    
    // Số lớn hơn 1, hiển thị tối đa 2 chữ số thập phân
    return value.toFixed(2).replace(/\.?0+$/, '');
  };

  // Format large numbers to K, M, B format
  const formatLargeNumber = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    
    const absNum = Math.abs(num);
    if (absNum >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    }
    if (absNum >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    }
    if (absNum >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
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
      // So sánh trực tiếp với raw balance
      const userTokensNum = Number(userTokens);
      
      if (isNaN(numValue) || numValue <= 0) {
        setExchangeError("Vui lòng nhập số lượng hợp lệ");
      } else if (numValue > userTokensNum) {
        setExchangeError("Số dư token không đủ");
      }
    }
  };

  // Đổi token lấy gas
  const exchangeTokens = async () => {
    if (!contract || !signer) {
      toast.error("Vui lòng kết nối ví MetaMask");
      return;
    }

    try {
      setLoading(true);
      
      // Validate số lượng
      const numValue = Number(exchangeAmount);
      const userTokensNum = Number(userTokens);
      
      if (numValue > userTokensNum) {
        toast.error("Số dư token không đủ");
        return;
      }

      if (numValue <= 0) {
        toast.error("Số lượng token phải lớn hơn 0");
        return;
      }

      // Lấy địa chỉ user và contract
      const userAddress = await signer.getAddress();
      console.log("Exchange info:", {
        userAddress,
        contractAddress: contract.target,
        userTokenBalance: userTokensNum
      });

      // Kiểm tra số dư ETH của contract trước khi thực hiện giao dịch
      const contractETHBalance = await signer.provider.getBalance(contract.target);
      console.log("Contract ETH balance:", ethers.formatEther(contractETHBalance), "ETH");

      if (contractETHBalance === BigInt(0)) {
        toast.error("Smart contract không có ETH để thực hiện giao dịch. Vui lòng thông báo cho admin.");
        return;
      }

      // Lấy tỷ lệ quy đổi từ contract
      const tokenToGasRate = await contract.tokenToGasRate();
      console.log("Token to gas rate:", tokenToGasRate.toString());

      // Kiểm tra số token có phải là bội số của tokenToGasRate
      if (numValue % Number(tokenToGasRate) !== 0) {
        toast.error(`Số lượng token phải là bội số của ${tokenToGasRate.toString()}`);
        return;
      }

      // Convert số lượng token thành BigNumber không sử dụng decimals
      const tokenAmountBN = BigInt(numValue);
      console.log("Token amount (BigInt):", tokenAmountBN.toString());

      // Tính toán số ETH sẽ nhận được (với Wei)
      const oneEtherInWei = ethers.parseEther("1.0");
      const expectedETH = (tokenAmountBN * oneEtherInWei) / BigInt(tokenToGasRate);
      console.log("Exchange details:", {
        tokenAmount: tokenAmountBN.toString(),
        rate: tokenToGasRate.toString(),
        expectedETH: expectedETH.toString(),
        expectedETHInEther: ethers.formatEther(expectedETH)
      });

      // Kiểm tra số dư ETH của contract
      if (contractETHBalance < expectedETH) {
        toast.error(`Smart contract không đủ ETH để thực hiện giao dịch (cần ${ethers.formatEther(expectedETH)} ETH). Vui lòng thông báo cho admin.`);
        return;
      }

      // Lưu số dư ETH của user trước khi giao dịch
      const userETHBalanceBefore = await signer.provider.getBalance(userAddress);
      console.log("User ETH balance before:", ethers.formatEther(userETHBalanceBefore), "ETH");

      // Kiểm tra allowance
      const allowance = await contract.allowance(userAddress, contract.target);
      console.log("Allowance check:", {
        current: allowance.toString(),
        required: tokenAmountBN.toString(),
        hasEnough: allowance >= tokenAmountBN
      });

      if (allowance < tokenAmountBN) {
        const approveTx = await contract.approve(contract.target, tokenAmountBN);
        toast.info("Đang xử lý approve token...");
        await approveTx.wait();
        toast.success("Đã approve token thành công!");
      }

      // Chuẩn bị transaction parameters
      const txParams = {
        gasLimit: BigInt(300000)  // Tăng gas limit
      };

      console.log("Transaction parameters:", {
        ...txParams,
        tokenAmount: tokenAmountBN.toString()
      });

      // Thực hiện giao dịch
      const tx = await contract.exchangeTokensForGas(tokenAmountBN, txParams);

      console.log("Transaction sent:", {
        hash: tx.hash,
        data: tx.data,
        ...tx
      });

      toast.info("Đang xử lý giao dịch...");
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Đợi một chút để các thay đổi được cập nhật trên blockchain
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Kiểm tra số dư ETH của user sau giao dịch
        const userETHBalanceAfter = await signer.provider.getBalance(userAddress);
        const ethDifference = userETHBalanceAfter - userETHBalanceBefore;
        
        console.log("Exchange result:", {
          ethBalanceBefore: ethers.formatEther(userETHBalanceBefore),
          ethBalanceAfter: ethers.formatEther(userETHBalanceAfter),
          difference: ethers.formatEther(ethDifference),
          gasCost: ethers.formatEther(userETHBalanceBefore - userETHBalanceAfter)
        });

        // Kiểm tra số dư token sau giao dịch
        const newTokenBalance = await contract.balanceOf(userAddress);
        console.log("Token balance after:", {
          before: userTokensNum,
          after: newTokenBalance.toString(),
          difference: userTokensNum - Number(newTokenBalance)
        });

        // Kiểm tra số dư ETH của contract sau giao dịch
        const contractETHBalanceAfter = await signer.provider.getBalance(contract.target);
        console.log("Contract ETH balance after:", {
          before: ethers.formatEther(contractETHBalance),
          after: ethers.formatEther(contractETHBalanceAfter),
          difference: ethers.formatEther(contractETHBalance - contractETHBalanceAfter)
        });

        if (ethDifference <= BigInt(0)) {
          toast.warning("Token đã được đổi nhưng có thể có vấn đề với việc nhận ETH. Vui lòng kiểm tra lại số dư và liên hệ admin.");
        } else {
          toast.success(`Đổi token thành công! Nhận được ${ethers.formatEther(ethDifference)} ETH`);
        }

        await fetchTokenBalance();
        await updateEthBalance();
        setExchangeAmount("");
      } else {
        console.error("Transaction failed:", receipt);
        toast.error("Giao dịch thất bại");
      }
    } catch (error) {
      console.error("Error in token exchange:", error);
      
      // Log chi tiết lỗi để debug
      console.log("Detailed error:", {
        code: error.code,
        message: error.message,
        data: error.data,
        transaction: error.transaction,
        error: error
      });

      // Xử lý các loại lỗi
      if (error.code === 'ACTION_REJECTED') {
        toast.error("Giao dịch đã bị hủy");
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error("Không đủ ETH để thanh toán gas fee");
      } else if (error.data?.message?.includes('insufficient allowance')) {
        toast.error("Chưa được phép sử dụng đủ số token này");
      } else if (error.data?.message?.includes('insufficient balance')) {
        toast.error("Số dư token không đủ");
      } else if (error.data?.message?.includes('execution reverted')) {
        toast.error("Smart contract từ chối giao dịch. Có thể contract không đủ ETH.");
      } else {
        toast.error("Không thể thực hiện giao dịch. Vui lòng thử lại sau");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsConnecting(true);
      await login();
      
      // Kiểm tra thông tin user
      const user = await contract.getUser(await signer.getAddress());
      if (!user || (user[0].toString() === "0" && !user[2])) {
        // Nếu user chưa đăng ký (role = 0 và không có fullName), chuyển đến trang đăng ký
        navigate("/register");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Không thể kết nối ví");
    } finally {
      setIsConnecting(false);
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
                    ≈ {formatEthValue(Number(userTokens) / 100000)} {/* 100000 token = 1 ETH */}
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
                    <p className="text-lg font-semibold">100,000 HTC</p>
                    <p className="text-sm text-gray-500">Token</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-lg font-semibold">1 ETH</p>
                    <p className="text-sm text-gray-500">Ethereum</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  <p>• Số lượng tối thiểu: 1,000 HTC</p>
                  <p>• Bạn cần tối thiểu 100,000 HTC để nhận được 1 ETH</p>
                  <p>• Token sẽ được chuyển đổi theo tỷ lệ 100,000 HTC = 1 ETH</p>
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
                        = {formatLargeNumber(Number(exchangeAmount))} HTC
                      </p>
                      <p className="text-sm text-gray-500">
                        ≈ {formatNumber(Number(exchangeAmount) / 100000)} ETH
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