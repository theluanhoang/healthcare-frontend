import { Link } from "react-router-dom"

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d')`,
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 animate-fade-in">HealthCare Blockchain</h1>
          <p className="text-xl md:text-2xl text-gray-100 max-w-3xl mx-auto mb-8 animate-fade-in">
            Nền tảng quản lý hồ sơ y tế an toàn và minh bạch với công nghệ blockchain
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-block px-8 py-3 text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg hover:from-indigo-700 hover:to-blue-600 shadow-md transition-all duration-300 transform hover:scale-105"
            >
              Đăng ký ngay
            </Link>
            <Link
              to="/about"
              className="inline-block px-8 py-3 text-lg font-semibold text-indigo-600 bg-white rounded-lg hover:bg-gray-100 shadow-md transition-all duration-300 transform hover:scale-105"
            >
              Tìm hiểu thêm
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Tính năng nổi bật</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl text-indigo-600 mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">An toàn tuyệt đối</h3>
              <p className="text-gray-600">
                Dữ liệu được mã hóa và lưu trữ trên blockchain, đảm bảo không thể bị thay đổi hoặc xâm phạm.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl text-indigo-600 mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Kết nối dễ dàng</h3>
              <p className="text-gray-600">
                Bệnh nhân và bác sĩ có thể kết nối, chia sẻ thông tin và quản lý lịch hẹn một cách thuận tiện.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl text-indigo-600 mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Thời gian thực</h3>
              <p className="text-gray-600">
                Nhận thông báo ngay lập tức khi có cập nhật về hồ sơ y tế hoặc lịch hẹn của bạn.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
