/**
 * ==========================================================================
 * FILE: js/core/APIConnector.js
 * MỤC ĐÍCH: Xử lý giao tiếp mạng (Network Layer) giữa Frontend và Google Apps Script
 * KIẾN TRÚC: Mô hình Request/Response không đồng bộ (Async/Await), tối ưu lỗi CORS
 * ==========================================================================
 */

class APIConnector {
    
    // 🔴 QUAN TRỌNG: Thầy sẽ thay thế đường link này bằng URL thực tế sau khi Deploy Google Apps Script
    static SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywy9koPCpQY7obQIOkNcW2c48Na8WTHwZJ-YvTRElfYkPbjL6XnvmFWbFVVhJBH9wo/exec";

    /**
     * Gửi yêu cầu POST chứa dữ liệu JSON lên Google Apps Script
     * @param {string} action - Tên hành động (Ví dụ: "LOGIN", "SAVE_DATA", "FORGOT_PASSWORD")
     * @param {Object} payloadData - Dữ liệu thực thi kèm theo (MSSV, password, mảng số liệu...)
     * @returns {Promise<Object>} - Đối tượng JSON trả về từ Server
     */
    static async post(action, payloadData = {}) {
        
        // 1. Đóng gói dữ liệu (Payload) theo đúng chuẩn Router mà tệp Code.gs đang đợi
        const requestBody = {
            action: action,
            data: payloadData
        };

        try {
            // 2. Kích hoạt kết nối HTTP tới Máy chủ Google
            const response = await fetch(this.SCRIPT_URL, {
                method: "POST",
                // 💡 THỦ THUẬT VƯỢT LỖI CORS CỦA GOOGLE:
                // Không dùng "application/json" vì nó sẽ kích hoạt request OPTIONS (Preflight) khiến GAS chặn đứng.
                // Phải dùng "text/plain" để Google cho phép dữ liệu bay thẳng vào hàm doPost(e).
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(requestBody),
                // Lệnh bắt buộc: Google Apps Script Web App luôn điều hướng (redirect) khi trả kết quả
                redirect: "follow" 
            });

            // 3. Xử lý trạng thái rớt mạng hoặc link Web App bị sai
            if (!response.ok) {
                throw new Error(`Lỗi kết nối HTTP! Mã trạng thái: ${response.status}`);
            }

            // 4. Phân giải phản hồi (Response) thành JSON để trả về cho Controller
            const responseData = await response.json();
            return responseData;

        } catch (error) {
            // 5. Bắt các lỗi vỡ mạng, đứt cáp, timeout... để Frontend không bị treo trắng xóa
            console.error(`[APIConnector] 🚨 Lỗi kịch liệt khi thực thi action "${action}":`, error);
            
            // Trả về một object giả lập để các Controller (như authCtrl) báo lỗi thân thiện cho SV
            return {
                status: "error",
                message: "Không thể kết nối đến Máy chủ dữ liệu Khoa Địa chất. Vui lòng kiểm tra lại 4G/Wifi hoặc thử lại sau."
            };
        }
    }
}
