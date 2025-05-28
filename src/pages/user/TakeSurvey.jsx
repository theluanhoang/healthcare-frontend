import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartContract } from '../../hooks';
import { useAuth } from '../../hooks';
import useIpfs from '../../hooks/useIPFS';
import { toast } from 'react-toastify';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const Role = {
  NONE: 0,
  PATIENT: 1,
  DOCTOR: 2
};

export default function TakeSurvey() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { contract, signer } = useSmartContract();
  const { authState } = useAuth();
  const { getJson, uploadJson, isReady } = useIpfs();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!contract || !signer) {
        setError('Vui lòng kết nối ví để tiếp tục');
        return;
      }

      if (!isReady) {
        setError('Đang khởi tạo IPFS...');
        return;
      }

      if (!authState.role) {
        setError('Vui lòng đăng nhập để tiếp tục');
        return;
      }

      try {
        setLoading(true);
        const surveyData = await contract.surveys(surveyId);
        
        // Check if survey exists and is active
        if (!surveyData.isActive) {
          setError('Khảo sát này không tồn tại hoặc đã kết thúc');
          return;
        }

        // Log time values for debugging
        const now = Math.floor(Date.now() / 1000);
        const startTime = Number(surveyData.startTime);
        const endTime = Number(surveyData.endTime);
        console.log('Time values:', {
          currentTime: now,
          startTime: startTime,
          endTime: endTime,
          formattedCurrentTime: new Date(now * 1000).toLocaleString(),
          formattedStartTime: new Date(startTime * 1000).toLocaleString(),
          formattedEndTime: new Date(endTime * 1000).toLocaleString()
        });

        // Check survey time
        if (now < startTime) {
          setError(`Khảo sát sẽ bắt đầu vào ${new Date(startTime * 1000).toLocaleString()}`);
          return;
        }

        if (now > endTime) {
          setError('Khảo sát đã kết thúc');
          return;
        }

        // Check if user is registered
        const userAddress = await signer.getAddress();
        const userData = await contract.users(userAddress);
        if (userData.role === Role.NONE) {
          setError('Vui lòng đăng ký tài khoản trước khi thực hiện khảo sát');
          return;
        }

        // Check if user has the correct role
        if (Number(surveyData.targetRole) !== Number(userData.role)) {
          setError(`Khảo sát này chỉ dành cho ${surveyData.targetRole === Role.PATIENT ? 'bệnh nhân' : 'bác sĩ'}`);
          return;
        }

        // Check if user has already completed this survey
        const hasCompleted = await contract.hasSurveyCompleted(surveyId, userAddress);
        if (hasCompleted) {
          setError('Bạn đã hoàn thành khảo sát này');
          return;
        }

        // Get survey details from IPFS
        const jsonData = await getJson(surveyData.ipfsHash);
        const parsedData = JSON.parse(jsonData);

        setSurvey({
          id: Number(surveyId),
          title: surveyData.title,
          reward: surveyData.reward.toString(),
          questions: parsedData.questions || [],
          responses: parsedData.responses || [],
          ipfsHash: surveyData.ipfsHash,
          targetRole: Number(surveyData.targetRole)
        });

        // Initialize answers object
        const initialAnswers = {};
        parsedData.questions.forEach((q, index) => {
          initialAnswers[index] = '';
        });
        setAnswers(initialAnswers);
        setError(null);

      } catch (error) {
        console.error('Error fetching survey:', error);
        setError('Không thể tải thông tin khảo sát');
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [contract, signer, surveyId, isReady, authState.role]);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || submitting) return;

    try {
      setSubmitting(true);

      // Validate all questions are answered
      const unansweredQuestions = Object.entries(answers).filter(([_, value]) => !value.trim());
      if (unansweredQuestions.length > 0) {
        toast.error('Vui lòng trả lời tất cả các câu hỏi');
        return;
      }

      // Check user registration again before submitting
      const userAddress = await signer.getAddress();
      const userData = await contract.users(userAddress);
      console.log('User data:', {
        address: userAddress,
        role: Number(userData.role),
        isVerified: userData.isVerified
      });

      if (userData.role === Role.NONE) {
        toast.error('Vui lòng đăng ký tài khoản trước khi thực hiện khảo sát');
        return;
      }

      // Get latest survey data to check conditions
      const surveyData = await contract.surveys(surveyId);
      console.log('Survey data:', {
        id: surveyId,
        isActive: surveyData.isActive,
        targetRole: Number(surveyData.targetRole),
        startTime: Number(surveyData.startTime),
        endTime: Number(surveyData.endTime),
        currentTime: Math.floor(Date.now() / 1000)
      });

      // Validate survey conditions
      if (!surveyData.isActive) {
        toast.error('Khảo sát này không còn hoạt động');
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      if (now < Number(surveyData.startTime)) {
        toast.error('Khảo sát chưa bắt đầu');
        return;
      }

      if (now > Number(surveyData.endTime)) {
        toast.error('Khảo sát đã kết thúc');
        return;
      }

      if (Number(surveyData.targetRole) !== Number(userData.role)) {
        toast.error(`Khảo sát này chỉ dành cho ${surveyData.targetRole === Role.PATIENT ? 'bệnh nhân' : 'bác sĩ'}`);
        return;
      }

      // Check if already completed
      const hasCompleted = await contract.hasSurveyCompleted(surveyId, userAddress);
      console.log('Has completed:', hasCompleted);
      if (hasCompleted) {
        toast.error('Bạn đã hoàn thành khảo sát này');
        return;
      }

      // Prepare response data
      const responseData = {
        userId: userAddress,
        timestamp: Math.floor(Date.now() / 1000),
        answers: Object.values(answers)
      };

      // Update responses in IPFS
      const updatedData = {
        questions: survey.questions,
        responses: [...survey.responses, responseData]
      };

      console.log('Uploading to IPFS:', updatedData);
      const newIpfsHash = await uploadJson(JSON.stringify(updatedData));
      console.log('New IPFS hash:', newIpfsHash);

      // Submit survey response to blockchain
      toast.info('Đang gửi câu trả lời...', {
        autoClose: false,
        toastId: 'submitting-survey'
      });

      console.log('Calling completeSurvey with:', {
        surveyId,
        newIpfsHash
      });

      try {
        // Estimate gas first to check for potential errors
        const gasEstimate = await contract.completeSurvey.estimateGas(surveyId, newIpfsHash);
        console.log('Gas estimate:', gasEstimate.toString());

        const tx = await contract.completeSurvey(surveyId, newIpfsHash, {
          gasLimit: Math.floor(gasEstimate.toString() * 1.2) // Add 20% buffer
        });
        console.log('Transaction sent:', tx.hash);
        await tx.wait();
        console.log('Transaction confirmed');

        toast.dismiss('submitting-survey');
        toast.success('Gửi câu trả lời thành công!');

        // Navigate back to survey list
        navigate('/surveys');
      } catch (txError) {
        console.error('Transaction error:', txError);
        if (txError.data) {
          // Try to decode the error
          const errorMessage = txError.data.message || txError.message;
          toast.error(`Lỗi giao dịch: ${errorMessage}`);
        } else {
          toast.error('Không thể hoàn thành giao dịch. Vui lòng thử lại sau.');
        }
      }

    } catch (error) {
      console.error('Error submitting survey:', error);
      let errorMessage = 'Không thể gửi câu trả lời. ';
      
      if (error.message.includes('Survey is not active')) {
        errorMessage += 'Khảo sát này đã kết thúc.';
      } else if (error.message.includes('Survey has not started')) {
        errorMessage += 'Khảo sát chưa bắt đầu.';
      } else if (error.message.includes('Survey has ended')) {
        errorMessage += 'Khảo sát đã kết thúc.';
      } else if (error.message.includes('Already completed this survey')) {
        errorMessage += 'Bạn đã hoàn thành khảo sát này.';
      } else if (error.message.includes('Not authorized for this survey')) {
        errorMessage += 'Bạn không có quyền thực hiện khảo sát này.';
      } else {
        errorMessage += 'Vui lòng thử lại sau.';
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải khảo sát...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={() => navigate('/surveys')}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-blue-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/surveys')}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Quay lại danh sách
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{survey.title}</h1>
          <div className="flex items-center text-gray-600">
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            <span>Phần thưởng: <span className="font-medium text-indigo-600">{Number(survey.reward)} HCT</span></span>
          </div>
        </div>

        {/* Survey Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {survey.questions.map((question, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Câu {index + 1}: {question.text}
              </h3>

              {question.type === 'text' ? (
                <textarea
                  value={answers[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  placeholder="Nhập câu trả lời của bạn"
                />
              ) : (
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={option.text}
                        checked={answers[index] === option.text}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="text-gray-700">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                submitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Đang gửi...
                </>
              ) : (
                'Gửi câu trả lời'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 