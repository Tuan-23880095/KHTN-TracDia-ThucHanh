/**
 * ====================================================================
 * LỚP ĐIỀU PHỐI KẾT NỐI REST API (REST API CONNECTOR CORE)
 * Vị trí: js/core/APIConnector.js
 * Nhiệm vụ: Quản lý cấu hình, thực hiện các yêu cầu HTTP (GET/POST) kết nối GAS
 * Áp dụng: OOP, Singleton Pattern, Centralized Static Configuration
 * ====================================================================
 */

export class APIConnector {
    // 1. CẤU HÌNH TẬP TRUNG (Static Properties) - Đáp ứng yêu cầu chứa cả URL và Firebase
    static CONFIG = {
        // Đường dẫn URL Web App nhận được sau khi bạn Deploy file Code.gs trên Apps Script
        BACKEND_URL: "https://script.google.com/macros/s/AKfycbxQXwmFKrPzDKzyCdSZXLI8pEcPPMjZ7SL5hiFlXRf1iNqK2-1QYWKWrbOkH5nLhsaI/exec",
        
        // Lưu trữ ID dự án Firebase để phục vụ việc kiểm tra tính đồng bộ hệ thống khi cần
        FIREBASE_PROJECT_ID: "link-anh-web"
    };

    /**
     * 2. HÀM POST GỬI DỮ LIỆU ĐO ĐẠC QUAN HỆ (CHA - CON JSON)
     * Gửi đồng bộ thông tin chung của buổi học và mảng số liệu chi tiết lên Google Sheets
     * @param {Object} submissionObj - Đối tượng chứa thông tin bảng CHA (SUBMISSIONS)
     * @param {Array<Object>} measurementsArray - Mảng chứa danh sách mốc đo bảng CON (MEASUREMENTS)
     * @returns {Promise<Object>} - Phản hồi chuẩn hóa { success: true/false, message: "...", data: null/... }
     */
    async postSubmission(submissionObj, measurementsArray) {
        // Đóng gói gói hàng (Payload) theo đúng cấu trúc lớp APIController bên phía GAS đang đợi
        const payload = {
            submission: submissionObj,
            measurements: measurementsArray
        };

        try {
            // Phát lệnh fetch() POST xuyên miền (CORS) lên đám mây Google
            const response = await fetch(APIConnector.CONFIG.BACKEND_URL, {
                method: "POST",
                mode: "cors", // Kích hoạt CORS ép trình duyệt không chặn gói tin
                headers: {
                    // Sử dụng text/plain để vượt qua bộ lọc kiểm tra CORS sơ bộ (Preflight request) của một số trình duyệt mobile, GAS vẫn đọc mượt mà
                    "Content-Type": "text/plain;charset=utf-8" 
                },
                body: JSON.stringify(payload) // Mã hóa cứng cục Object thành Chuỗi văn bản JSON
            });

            // Nếu đường truyền có vấn đề (HTTP Status khác 200-299)
            if (!response.ok) {
                throw new Error(`Máy chủ phản hồi lỗi mã hiệu HTTP: ${response.status}`);
            }

            // Giải mã cục JSON chuyên nghiệp được trả về từ hàm sendResponse của GAS
            const jsonResult = await response.json();
            return jsonResult;

        } catch (error) {
            console.error("❌ Thất bại nghiêm trọng tại lớp APIConnector (POST):", error);
            // Trả về Object cấu trúc lỗi đồng bộ để Controller phía ngoài bắt lỗi render lên giao diện UI
            return {
                success: false,
                message: "Lỗi kết nối mạng thực địa: " + error.message,
                data: null
            };
        }
    }

    /**
     * 3. HÀM GET LẤY DỮ LIỆU CẤU HÌNH (MỞ RỘNG)
     * Dùng khi cần load danh sách USERS hoặc bareme giới hạn CONFIGS từ Sheets về điện thoại
     * @param {string} action - Hành động chỉ định (VD: 'getConfigs')
     * @returns {Promise<Object>}
     */
    async getFetch(action) {
        try {
            const targetUrl = `${APIConnector.CONFIG.BACKEND_URL}?action=${action}`;
            const response = await fetch(targetUrl, { method: "GET" });
            
            if (!response.ok) throw new Error(`Lỗi HTTP GET: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("❌ Thất bại tại lớp APIConnector (GET):", error);
            return { success: false, message: error.message };
        }
    }
}

// 4. ÁP DỤNG SINGLETON PATTERN: Khởi tạo duy nhất 1 thực thể và export mặc định
const apiConnectorInstance = new APIConnector();
export default apiConnectorInstance;
