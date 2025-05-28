import { useState, useEffect } from 'react';
import { useSmartContract } from '../../hooks';
import useIpfs from '../../hooks/useIPFS';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const Role = {
  NONE: 0,
  PATIENT: 1,
  DOCTOR: 2
};

export default function SurveyList() {
  const { contract, signer, userRole } = useSmartContract();
  const { getJson, isReady } = useIpfs();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (!contract || !signer) {
          setLoadingMessage('Đang kết nối với ví...');
          return;
        }

        if (!isReady) {
          setLoadingMessage('Đang khởi tạo IPFS...');
          return;
        }

        await fetchSurveys();
      } catch (error) {
        console.error('Initialization error:', error);
        setError('Không thể khởi tạo hệ thống');
      }
    };

    init();
  }, [contract, signer, isReady]);

  const fetchSurveys = async () => {
    if (!contract || !isReady) return;

    try {
      setLoading(true);
      setLoadingMessage('Đang tải danh sách khảo sát...');
      const surveyCount = await contract.surveyCount();
      
      const batchSize = 5;
      const surveys = [];
      
      for (let i = 1; i <= Number(surveyCount); i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, Number(surveyCount) + 1); j++) {
          batch.push(fetchSurveyDetails(j));
        }
        
        setLoadingMessage(`Đang tải khảo sát ${i} - ${Math.min(i + batchSize - 1, Number(surveyCount))}/${Number(surveyCount)}...`);
        const batchResults = await Promise.all(batch);
        surveys.push(...batchResults.filter(Boolean));
      }

      // Filter surveys based on user role and active status
      const filteredSurveys = surveys.filter(survey => 
        survey.isActive && 
        Number(survey.targetRole) === Number(userRole) &&
        Number(survey.endTime) * 1000 > Date.now()
      );

      setSurveys(filteredSurveys);
      setError(null);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      setError('Không thể tải danh sách khảo sát');
      toast.error('Không thể tải danh sách khảo sát');
    } finally {
      setLoading(false);
    }
  };

  const fetchSurveyDetails = async (id) => {
    try {
      const survey = await contract.surveys(id);
      if (!survey.isActive) return null;

      // Check if user has already completed this survey
      const hasCompleted = await contract.hasCompletedSurvey(id);
      if (hasCompleted) return null;

      const jsonData = await getJson(survey.ipfsHash);
      let questions = [];
      try {
        const parsedData = JSON.parse(jsonData);
        questions = parsedData.questions || [];
      } catch (error) {
        console.error(`Error parsing survey ${id} data:`, error);
      }

      return {
        id: Number(id),
        title: survey.title,
        reward: survey.reward.toString(),
        startTime: survey.startTime.toString(),
        endTime: survey.endTime.toString(),
        isActive: survey.isActive,
        targetRole: survey.targetRole,
        questions
      };
    } catch (error) {
      console.error(`Error fetching survey ${id}:`, error);
      return null;
    }
  };

  const handleTakeSurvey = (surveyId) => {
    navigate(`/survey/${surveyId}`);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={() => {
              setError(null);
              fetchSurveys();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // If no surveys available
  if (surveys.length === 0) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Không có khảo sát nào</h2>
            <p className="text-gray-600">Hiện tại không có khảo sát nào dành cho bạn.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-blue-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Danh sách khảo sát</h1>
          <p className="text-gray-600">
            Thực hiện khảo sát để nhận token thưởng
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => {
            const timeLeft = Math.max(0, Number(survey.endTime) * 1000 - Date.now());
            const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            return (
              <div
                key={survey.id}
                className="bg-white rounded-xl shadow-md overflow-hidden transform transition-all duration-200 hover:shadow-lg"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {survey.title}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Đang mở
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-600">
                      <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                      <span className="text-sm">
                        Phần thưởng: <span className="font-medium text-indigo-600">{Number(survey.reward)} HCT</span>
                      </span>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      <span className="text-sm">
                        Hết hạn: {new Date(Number(survey.endTime) * 1000).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      <span className="text-sm">
                        Còn lại: {daysLeft} ngày {hoursLeft} giờ
                      </span>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      <span className="text-sm">
                        Số câu hỏi: {survey.questions.length}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTakeSurvey(survey.id)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                  >
                    Thực hiện khảo sát
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 