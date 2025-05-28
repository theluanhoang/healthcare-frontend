import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartContract } from '../../hooks';
import useIpfs from '../../hooks/useIPFS';
import { toast } from 'react-toastify';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function TakeSurvey() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { contract, signer } = useSmartContract();
  const { getJson, uploadJson } = useIpfs();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!contract || !signer) return;

      try {
        setLoading(true);
        const surveyData = await contract.surveys(surveyId);
        
        // Check if survey exists and is active
        if (!surveyData.isActive) {
          setError('Khảo sát này không tồn tại hoặc đã kết thúc');
          return;
        }

        // Check if user has already completed this survey
        const hasCompleted = await contract.hasCompletedSurvey(surveyId);
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
          ipfsHash: surveyData.ipfsHash
        });

        // Initialize answers object
        const initialAnswers = {};
        parsedData.questions.forEach((q, index) => {
          initialAnswers[index] = '';
        });
        setAnswers(initialAnswers);

      } catch (error) {
        console.error('Error fetching survey:', error);
        setError('Không thể tải thông tin khảo sát');
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [contract, signer, surveyId]);

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

      // Prepare response data
      const responseData = {
        userId: await signer.getAddress(),
        timestamp: Math.floor(Date.now() / 1000),
        answers: Object.values(answers)
      };

      // Update responses in IPFS
      const updatedData = {
        questions: survey.questions,
        responses: [...survey.responses, responseData]
      };

      // Upload updated data to IPFS
      const newIpfsHash = await uploadJson(JSON.stringify(updatedData));

      // Submit survey response to blockchain
      const tx = await contract.submitSurveyResponse(surveyId, newIpfsHash);
      
      toast.info('Đang gửi câu trả lời...', {
        autoClose: false,
        toastId: 'submitting-survey'
      });

      await tx.wait();

      toast.dismiss('submitting-survey');
      toast.success('Gửi câu trả lời thành công!');

      // Navigate back to survey list
      navigate('/surveys');

    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Không thể gửi câu trả lời. Vui lòng thử lại sau.');
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