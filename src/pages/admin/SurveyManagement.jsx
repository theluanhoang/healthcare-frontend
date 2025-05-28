import { useState, useEffect, useRef } from 'react';
import { useSmartContract } from '../../hooks';
import useIpfs from '../../hooks/useIPFS';
import { toast } from 'react-toastify';
import { 
  PlusIcon, 
  TrashIcon, 
  CalendarIcon, 
  CurrencyDollarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function SurveyManagement() {
  const { contract, signer } = useSmartContract();
  const { uploadJson, getJson, isReady } = useIpfs();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);

  // Add Role enum mapping at the top of the component
  const Role = {
    NONE: 0,
    PATIENT: 1,
    DOCTOR: 2
  };

  const initialFormData = {
    title: '',
    reward: '',
    startTime: '',
    endTime: '',
    targetRole: Role.PATIENT, // Use enum value instead of string
    questions: [{ 
      id: 1, 
      text: '',
      type: 'text',
      options: []
    }]
  };

  const [formData, setFormData] = useState(initialFormData);

  // Cache for IPFS data
  const ipfsCache = useRef(new Map());
  const abortControllerRef = useRef(null);

  // Check if user is owner/admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!contract || !signer) return;
      try {
        const owner = await contract.owner();
        const address = await signer.getAddress();
        setIsAdmin(owner.toLowerCase() === address.toLowerCase());
      } catch (error) {
        console.error('Error checking admin status:', error);
        setError('Không thể kiểm tra quyền admin');
      }
    };
    checkAdmin();
  }, [contract, signer]);

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

    return () => {
      // Cleanup: abort any pending IPFS requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [contract, signer, isReady]);

  const fetchSurveys = async () => {
    if (!contract || !isReady) return;

    try {
      setLoading(true);
      setLoadingMessage('Đang tải danh sách khảo sát...');
      const surveyCount = await contract.surveyCount();
      
      // Fetch surveys in batches of 5 to avoid overwhelming the network
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

      setSurveys(surveys);
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
      // Remove this check to show all surveys including inactive ones
      // if (!survey || !survey.isActive) return null;

      // Check cache first
      if (ipfsCache.current.has(survey.ipfsHash)) {
        const cachedData = ipfsCache.current.get(survey.ipfsHash);
        return {
          id: Number(id),
          title: survey.title,
          reward: survey.reward.toString(),
          startTime: survey.startTime.toString(),
          endTime: survey.endTime.toString(),
          isActive: survey.isActive,
          targetRole: Number(survey.targetRole), // Convert to number
          questions: cachedData.questions || []
        };
      }

      // Fetch from IPFS with timeout
      const jsonData = await Promise.race([
        getJson(survey.ipfsHash),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('IPFS timeout')), 5000)
        )
      ]);

      let questions = [];
      try {
        const parsedData = JSON.parse(jsonData);
        questions = parsedData.questions || [];
        // Cache the parsed data
        ipfsCache.current.set(survey.ipfsHash, parsedData);
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
        targetRole: Number(survey.targetRole), // Convert to number
        questions
      };
    } catch (error) {
      if (error.message === 'IPFS timeout') {
        console.warn(`IPFS timeout for survey ${id}, skipping...`);
        return null;
      }
      console.error(`Error fetching survey ${id}:`, error);
      return null;
    }
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { 
        id: prev.questions.length + 1, 
        text: '',
        type: 'text',
        options: []
      }]
    }));
  };

  const removeQuestion = (id) => {
    if (formData.questions.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const updateQuestion = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === id ? { ...q, [field]: value } : q
      )
    }));
  };

  const addOption = (questionId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? { ...q, options: [...q.options, { id: q.options.length + 1, text: '' }] }
          : q
      )
    }));
  };

  const updateOption = (questionId, optionId, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? {
              ...q,
              options: q.options.map(opt => 
                opt.id === optionId ? { ...opt, text: value } : opt
              )
            }
          : q
      )
    }));
  };

  const removeOption = (questionId, optionId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? {
              ...q,
              options: q.options.filter(opt => opt.id !== optionId)
            }
          : q
      )
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedSurvey(null);
  };

  const createSurvey = async (e) => {
    e.preventDefault();
    if (!contract || !signer || !isReady) {
      toast.error('Hệ thống chưa sẵn sàng, vui lòng thử lại sau');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if user is admin
      if (!isAdmin) {
        toast.error('Chỉ admin mới có quyền tạo khảo sát');
        return;
      }

      // Validate form
      if (!formData.title || !formData.reward || !formData.startTime || !formData.endTime) {
        toast.error('Vui lòng điền đầy đủ thông tin');
        return;
      }

      if (formData.questions.some(q => !q.text.trim())) {
        toast.error('Vui lòng điền đầy đủ nội dung câu hỏi');
        return;
      }

      // Validate reward value
      const rewardValue = parseFloat(formData.reward);
      if (isNaN(rewardValue) || rewardValue <= 0) {
        toast.error('Phần thưởng phải là số dương');
        return;
      }

      // Convert reward to integer tokens
      const rewardInTokens = Math.floor(rewardValue);

      // Convert and validate dates
      const now = Math.floor(Date.now() / 1000);
      const startTime = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(formData.endTime).getTime() / 1000);

      if (startTime < now) {
        toast.error('Thời gian bắt đầu phải là thời điểm trong tương lai');
        return;
      }

      if (startTime >= endTime) {
        toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
        return;
      }

      // Upload questions to IPFS
      const ipfsHash = await uploadJson(JSON.stringify({
        questions: formData.questions,
        responses: []
      }));

      // Ensure targetRole is a number
      const targetRole = Number(formData.targetRole);
      console.log('Creating survey with params:', {
        title: formData.title,
        ipfsHash,
        reward: rewardInTokens,
        startTime,
        endTime,
        targetRole
      });

      // Create survey on blockchain with correct parameter order
      const tx = await contract.createSurvey(
        formData.title,
        ipfsHash,
        rewardInTokens,
        startTime,
        endTime,
        targetRole // Pass the number value
      );

      toast.info('Đang tạo khảo sát...', {
        autoClose: false,
        toastId: 'creating-survey'
      });

      await tx.wait();
      
      toast.dismiss('creating-survey');
      toast.success('Tạo khảo sát thành công!');

      // Reset form and close modal
      resetForm();
      setIsModalOpen(false);

      // Refresh surveys list
      await fetchSurveys();

    } catch (error) {
      console.error('Error creating survey:', error);
      setError('Không thể tạo khảo sát');
      
      if (error.message.includes('Start time must be in the future')) {
        toast.error('Thời gian bắt đầu phải là thời điểm trong tương lai');
      } else if (error.message.includes('End time must be after start time')) {
        toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
      } else if (error.message.includes('Ownable: caller is not the owner')) {
        toast.error('Chỉ admin mới có quyền tạo khảo sát');
      } else {
        toast.error('Không thể tạo khảo sát. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSurveyStatus = async (id, currentStatus) => {
    try {
      const tx = await contract.toggleSurveyStatus(id);
      await tx.wait();
      await fetchSurveys();
      toast.success(currentStatus ? 'Đã tắt khảo sát' : 'Đã kích hoạt khảo sát');
    } catch (error) {
      console.error('Error toggling survey status:', error);
      toast.error('Không thể thay đổi trạng thái khảo sát');
    }
  };

  // Add this function to handle setting form data when viewing details
  const handleViewDetails = (survey) => {
    setSelectedSurvey(survey);
    // Convert timestamp to YYYY-MM-DD format for date inputs
    const startDate = new Date(Number(survey.startTime) * 1000).toISOString().split('T')[0];
    const endDate = new Date(Number(survey.endTime) * 1000).toISOString().split('T')[0];
    
    setFormData({
      title: survey.title,
      reward: survey.reward,
      startTime: startDate,
      endTime: endDate,
      questions: survey.questions.map((q, index) => ({
        id: index + 1,
        text: q.text,
        type: q.type || 'text',
        options: q.options || []
      })),
      targetRole: survey.targetRole
    });
    setIsModalOpen(true);
  };

  // Add function to calculate survey statistics
  const calculateSurveyStats = () => {
    const now = Math.floor(Date.now() / 1000);
    const patientSurveys = surveys.filter(s => Number(s.targetRole) === Role.PATIENT);
    const doctorSurveys = surveys.filter(s => Number(s.targetRole) === Role.DOCTOR);

    return {
      total: surveys.length,
      active: surveys.filter(s => s.isActive && Number(s.endTime) >= now).length,
      completed: surveys.filter(s => !s.isActive || Number(s.endTime) < now).length,
      patientTotal: patientSurveys.length,
      patientActive: patientSurveys.filter(s => s.isActive && Number(s.endTime) >= now).length,
      doctorTotal: doctorSurveys.length,
      doctorActive: doctorSurveys.filter(s => s.isActive && Number(s.endTime) >= now).length,
    };
  };

  // Update the stats section in the render
  const stats = calculateSurveyStats();

  // Update the getRoleName function
  const getRoleName = (role) => {
    switch (Number(role)) { // Convert to number to handle both string and number inputs
      case Role.PATIENT:
        return 'Bệnh nhân';
      case Role.DOCTOR:
        return 'Bác sĩ';
      default:
        return 'Không xác định';
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">{loadingMessage}</p>
          {loading && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-800"
            >
              Tải lại trang nếu đợi quá lâu
            </button>
          )}
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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-blue-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Quản lý khảo sát</h1>
              <p className="text-gray-600">Tạo và quản lý các khảo sát cho bệnh nhân</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all duration-200 hover:scale-105"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Tạo khảo sát mới
            </button>
          </div>
        </div>

        {/* Update Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100">
                <UserGroupIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng số khảo sát</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Đang hoạt động</p>
                <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-100">
                <XCircleIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Đã kết thúc</p>
                <p className="text-2xl font-semibold text-gray-600">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Update Survey List */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Khảo sát cho bệnh nhân ({stats.patientTotal})</h2>
            <p className="text-sm text-gray-500">Đang hoạt động: {stats.patientActive}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys
              .filter(survey => Number(survey.targetRole) === Role.PATIENT)
              .map((survey) => {
                const now = Math.floor(Date.now() / 1000);
                const isExpired = Number(survey.endTime) < now;
                const status = !survey.isActive ? 'inactive' : isExpired ? 'expired' : 'active';
                
                return (
                  <div
                    key={survey.id}
                    className={`bg-white rounded-xl shadow-md overflow-hidden transform transition-all duration-200 hover:shadow-lg ${
                      status === 'inactive' || status === 'expired' ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {survey.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : status === 'expired'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {status === 'active' 
                            ? 'Đang hoạt động'
                            : status === 'expired'
                            ? 'Đã hết hạn'
                            : 'Đã tắt'}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center text-gray-600">
                          <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">
                            Phần thưởng: <span className="font-medium text-indigo-600">{Number(survey.reward)} HCT</span>
                          </span>
                        </div>

                        <div className="flex items-center text-gray-600">
                          <CalendarIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">
                            {new Date(Number(survey.startTime) * 1000).toLocaleDateString()} - {new Date(Number(survey.endTime) * 1000).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center text-gray-600">
                          <UserGroupIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">
                            Đối tượng: <span className="font-medium text-indigo-600">{getRoleName(survey.targetRole)}</span>
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex space-x-3">
                        {status !== 'expired' && (
                          <button
                            onClick={() => toggleSurveyStatus(survey.id, survey.isActive)}
                            className={`flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg ${
                              survey.isActive
                                ? 'text-red-700 bg-red-50 hover:bg-red-100'
                                : 'text-green-700 bg-green-50 hover:bg-green-100'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200`}
                          >
                            {survey.isActive ? 'Tắt khảo sát' : 'Kích hoạt'}
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(survey)}
                          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Khảo sát cho bác sĩ ({stats.doctorTotal})</h2>
            <p className="text-sm text-gray-500">Đang hoạt động: {stats.doctorActive}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys
              .filter(survey => Number(survey.targetRole) === Role.DOCTOR)
              .map((survey) => {
                const now = Math.floor(Date.now() / 1000);
                const isExpired = Number(survey.endTime) < now;
                const status = !survey.isActive ? 'inactive' : isExpired ? 'expired' : 'active';
                
                return (
                  <div
                    key={survey.id}
                    className={`bg-white rounded-xl shadow-md overflow-hidden transform transition-all duration-200 hover:shadow-lg ${
                      status === 'inactive' || status === 'expired' ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {survey.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : status === 'expired'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {status === 'active' 
                            ? 'Đang hoạt động'
                            : status === 'expired'
                            ? 'Đã hết hạn'
                            : 'Đã tắt'}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center text-gray-600">
                          <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">
                            Phần thưởng: <span className="font-medium text-indigo-600">{Number(survey.reward)} HCT</span>
                          </span>
                        </div>

                        <div className="flex items-center text-gray-600">
                          <CalendarIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">
                            {new Date(Number(survey.startTime) * 1000).toLocaleDateString()} - {new Date(Number(survey.endTime) * 1000).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center text-gray-600">
                          <UserGroupIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm">
                            Đối tượng: <span className="font-medium text-indigo-600">{getRoleName(survey.targetRole)}</span>
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex space-x-3">
                        {status !== 'expired' && (
                          <button
                            onClick={() => toggleSurveyStatus(survey.id, survey.isActive)}
                            className={`flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg ${
                              survey.isActive
                                ? 'text-red-700 bg-red-50 hover:bg-red-100'
                                : 'text-green-700 bg-green-50 hover:bg-green-100'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200`}
                          >
                            {survey.isActive ? 'Tắt khảo sát' : 'Kích hoạt'}
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(survey)}
                          className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold">
                  {selectedSurvey ? 'Chi tiết khảo sát' : 'Tạo khảo sát mới'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={createSurvey} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Basic Info Section */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tiêu đề khảo sát
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Nhập tiêu đề khảo sát"
                          required
                          readOnly={selectedSurvey !== null}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Đối tượng khảo sát
                        </label>
                        <select
                          value={formData.targetRole}
                          onChange={(e) => setFormData(prev => ({ ...prev, targetRole: Number(e.target.value) }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                          disabled={selectedSurvey !== null}
                        >
                          <option value={Role.PATIENT}>Bệnh nhân</option>
                          <option value={Role.DOCTOR}>Bác sĩ</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phần thưởng (HCT)
                        </label>
                        <input
                          type="number"
                          value={formData.reward}
                          onChange={(e) => setFormData(prev => ({ ...prev, reward: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Nhập số lượng token"
                          min="0"
                          step="0.1"
                          required
                          readOnly={selectedSurvey !== null}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ngày bắt đầu
                          </label>
                          <input
                            type="date"
                            value={formData.startTime}
                            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                            readOnly={selectedSurvey !== null}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ngày kết thúc
                          </label>
                          <input
                            type="date"
                            value={formData.endTime}
                            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                            readOnly={selectedSurvey !== null}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Questions Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Danh sách câu hỏi</h3>
                      </div>

                      <div className="space-y-4">
                        {formData.questions.map((question, index) => (
                          <div key={question.id} className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="flex flex-col space-y-4">
                              {/* Question Header */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-500">Câu hỏi {index + 1}</span>
                                <div className="flex items-center space-x-2">
                                  {!selectedSurvey && (
                                    <select
                                      value={question.type}
                                      onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                                    >
                                      <option value="text">Câu trả lời tự do</option>
                                      <option value="multiple">Trắc nghiệm</option>
                                    </select>
                                  )}
                                  {!selectedSurvey && formData.questions.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeQuestion(question.id)}
                                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                    >
                                      <TrashIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Question Input */}
                              <div className="relative">
                                <input
                                  type="text"
                                  value={question.text}
                                  onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                  placeholder="Nhập nội dung câu hỏi"
                                  required
                                  readOnly={selectedSurvey !== null}
                                />
                              </div>

                              {/* Multiple choice options */}
                              {question.type === 'multiple' && (
                                <div className="pl-4 space-y-3">
                                  <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-500 mb-2">Các lựa chọn</span>
                                  </div>
                                  {question.options.map((option, optionIndex) => (
                                    <div key={option.id} className="flex items-center space-x-2">
                                      <div className="flex items-center space-x-3 flex-1">
                                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm">
                                          {String.fromCharCode(65 + optionIndex)}
                                        </span>
                                        <input
                                          type="text"
                                          value={option.text}
                                          onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                          placeholder={`Lựa chọn ${String.fromCharCode(65 + optionIndex)}`}
                                          required
                                          readOnly={selectedSurvey !== null}
                                        />
                                      </div>
                                      {!selectedSurvey && (
                                        <button
                                          type="button"
                                          onClick={() => removeOption(question.id, option.id)}
                                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {!selectedSurvey && (
                                    <button
                                      type="button"
                                      onClick={() => addOption(question.id)}
                                      className="mt-2 inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors duration-200"
                                    >
                                      <PlusIcon className="h-4 w-4 mr-1" />
                                      Thêm lựa chọn
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Question Button */}
                      {!selectedSurvey && (
                        <div className="mt-6 flex justify-center">
                          <button
                            type="button"
                            onClick={addQuestion}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 hover:scale-105 shadow-sm"
                          >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Thêm câu hỏi
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  {!selectedSurvey && (
                    <button
                      type="submit"
                      onClick={createSurvey}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Tạo khảo sát
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add custom scrollbar styles to your CSS
<style jsx>{`
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #CBD5E0 #EDF2F7;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: #EDF2F7;
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #CBD5E0;
    border-radius: 3px;
    border: 2px solid #EDF2F7;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #A0AEC0;
  }
`}</style>