import { useEffect, useState } from "react";
import { useSmartContract } from "../hooks";
import useIpfs from "../hooks/useIPFS";
import { toast } from "react-toastify";
import { Dialog } from "@headlessui/react";
import { ethers } from "ethers";
import { ArrowPathIcon, ArrowsRightLeftIcon, WalletIcon, DocumentTextIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

export default function Surveys() {
  const { contract, signer } = useSmartContract();
  const { getJson, addJson } = useIpfs();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTokens, setUserTokens] = useState(0);
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyResponses, setSurveyResponses] = useState({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exchangeError, setExchangeError] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [depositAmount, setDepositAmount] = useState("1");
  const [isAdmin, setIsAdmin] = useState(false);

  // Kiểm tra xem user có phải là admin không
  useEffect(() => {
    const checkAdmin = async () => {
      if (!contract || !signer) return;
      const address = await signer.getAddress();
      const owner = await contract.owner();
      setIsAdmin(address.toLowerCase() === owner.toLowerCase());
    };
    checkAdmin();
  }, [contract, signer]);

  // Cập nhật số dư ETH
  const updateEthBalance = async () => {
    if (!signer) return;
    const address = await signer.getAddress();
    const balance = await signer.provider.getBalance(address);
    setEthBalance(ethers.formatEther(balance));
  };

  // Hàm nạp ETH vào contract cho môi trường test
  const depositETHToContract = async () => {
    if (!contract || !signer) return;

    try {
      setLoading(true);
      
      // Gửi ETH vào contract
      const tx = await signer.sendTransaction({
        to: contract.target,
        value: ethers.parseEther(depositAmount)
      });

      toast.info("Đang nạp ETH vào contract...", {
        autoClose: false,
        toastId: "depositing-eth"
      });

      await tx.wait();
      
      toast.dismiss("depositing-eth");
      toast.success(`Đã nạp ${depositAmount} ETH vào contract thành công!`);

      // Kiểm tra số dư mới
      const balance = await signer.provider.getBalance(contract.target);
      console.log("New contract balance:", ethers.formatEther(balance));

      // Cập nhật số dư ETH của user
      await updateEthBalance();

    } catch (error) {
      console.error("Error depositing ETH:", error);
      toast.error("Không thể nạp ETH vào contract");
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách khảo sát và số token của user
  useEffect(() => {
    const fetchData = async () => {
      if (!contract || !signer) return;

      try {
        setLoading(true);
        const address = await signer.getAddress();
        
        // Lấy số token hiện có
        const balance = await contract.getTokenBalance(address);
        setUserTokens(balance.toString());

        // Lấy số dư ETH
        await updateEthBalance();

        // Lấy số lượng khảo sát
        const surveyCount = await contract.surveyCount();
        
        // Lấy thông tin chi tiết của từng khảo sát
        const surveyPromises = [];
        for (let i = 1; i <= surveyCount; i++) {
          surveyPromises.push(fetchSurveyDetails(i));
        }
        
        const surveyDetails = await Promise.all(surveyPromises);
        setSurveys(surveyDetails.filter(Boolean));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Không thể tải dữ liệu khảo sát");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contract, signer]);

  // Lấy chi tiết khảo sát từ IPFS
  const fetchSurveyDetails = async (surveyId) => {
    try {
      const survey = await contract.getSurveyDetails(surveyId);
      if (!survey.isActive) return null;

      const ipfsData = await getJson(survey.ipfsHash);
      const surveyData = JSON.parse(ipfsData);
      
      return {
        id: surveyId,
        title: survey.title,
        reward: survey.reward.toString(), // Lưu dưới dạng string để giữ nguyên độ chính xác
        startTime: Number(survey.startTime),
        endTime: Number(survey.endTime),
        questions: surveyData.questions,
        hasCompleted: await contract.hasSurveyCompleted(surveyId, await signer.getAddress())
      };
    } catch (error) {
      console.error(`Error fetching survey ${surveyId}:`, error);
      return null;
    }
  };

  // Xử lý thay đổi câu trả lời
  const handleResponseChange = (questionId, value) => {
    setSurveyResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Hoàn thành khảo sát
  const completeSurvey = async (surveyId) => {
    if (!contract || !signer || !selectedSurvey) return;

    try {
      setLoading(true);
      
      // Kiểm tra câu trả lời đầy đủ
      const unansweredQuestions = selectedSurvey.questions.filter(
        q => !surveyResponses[q.id]
      );

      if (unansweredQuestions.length > 0) {
        toast.error("Vui lòng trả lời tất cả câu hỏi");
        return;
      }

      // Lưu câu trả lời lên IPFS
      const responseHash = await addJson(JSON.stringify({
        surveyId,
        responses: surveyResponses,
        timestamp: Date.now()
      }));
      
      // Gọi smart contract để nhận thưởng
      const tx = await contract.completeSurvey(surveyId, responseHash);
      await tx.wait();
      
      toast.success("Hoàn thành khảo sát thành công!");
      
      // Cập nhật UI
      const updatedSurveys = [...surveys];
      const surveyIndex = updatedSurveys.findIndex(s => s.id === surveyId);
      if (surveyIndex !== -1) {
        updatedSurveys[surveyIndex].hasCompleted = true;
      }
      setSurveys(updatedSurveys);
      
      // Cập nhật số token
      const balance = await contract.getTokenBalance(await signer.getAddress());
      setUserTokens(balance.toString());

      // Đóng dialog
      setIsDialogOpen(false);
      setSelectedSurvey(null);
      setSurveyResponses({});
    } catch (error) {
      console.error("Error completing survey:", error);
      toast.error("Không thể hoàn thành khảo sát");
    } finally {
      setLoading(false);
    }
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

  // Format token amount from Wei to Token with formatted number
  const formatTokenAmount = (weiAmount) => {
    try {
      const bn = ethers.getBigInt(weiAmount.toString());
      const tokenAmount = Number(ethers.formatEther(bn));
      return formatLargeNumber(tokenAmount);
    } catch (error) {
      console.error("Error formatting token amount:", error);
      return "0.00";
    }
  };

  // Validate and handle exchange amount input
  const handleExchangeAmountChange = (e) => {
    const value = e.target.value;
    setExchangeAmount(value);
    
    // Clear previous error
    setExchangeError("");
    
    if (value) {
      const numValue = Number(value);
      const userTokensNum = Number(formatTokenAmount(userTokens));
      
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
          const balance = await contract.getTokenBalance(await signer.getAddress());
          setUserTokens(balance.toString());
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
        {/* Token Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                    {formatTokenAmount(userTokens)} <span className="text-indigo-600">HCT</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    ≈ {formatLargeNumber(Number(ethers.formatEther(userTokens.toString())) * 0.001)} ETH
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
                {/* Chỉ hiển thị nút nạp ETH cho admin */}
                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      min="0.1"
                      step="0.1"
                    />
                    <button
                      onClick={depositETHToContract}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Nạp ETH (Test)
                    </button>
                  </div>
                )}
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

        {/* Surveys Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-indigo-600 mb-6">
            <DocumentTextIcon className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Danh sách khảo sát</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-200 hover:scale-105">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{survey.title}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Phần thưởng</span>
                      <span className="font-semibold text-indigo-600">{formatTokenAmount(survey.reward)} HCT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Thời gian</span>
                      <span className="text-sm text-gray-600">
                        {new Date(survey.startTime * 1000).toLocaleDateString()} -{" "}
                        {new Date(survey.endTime * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {survey.hasCompleted ? (
                    <div className="mt-6 flex items-center justify-center px-4 py-2 bg-green-50 rounded-lg">
                      <span className="text-green-600 font-medium">Đã hoàn thành</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedSurvey(survey);
                        setIsDialogOpen(true);
                      }}
                      className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                      Làm khảo sát
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {surveys.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl shadow-xl">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-lg text-gray-600">Chưa có khảo sát nào được tạo.</p>
            </div>
          )}
        </div>
      </div>

      {/* Survey Dialog */}
      {selectedSurvey && (
        <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 mb-4">
                      {selectedSurvey.title}
                    </Dialog.Title>
                    <div className="mt-4 space-y-4">
                      {selectedSurvey.questions.map((question) => (
                        <div key={question.id}>
                          <label htmlFor={`response-${question.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                            {question.text}
                          </label>
                          <textarea
                            id={`response-${question.id}`}
                            value={surveyResponses[question.id] || ''}
                            onChange={(e) => handleResponseChange(question.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            rows="3"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => completeSurvey(selectedSurvey.id)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Hoàn thành
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedSurvey(null);
                    setSurveyResponses({});
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}