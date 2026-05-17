/**
 * Class APIConnector
 * Quản lý kết nối HTTP POST/GET đồng bộ với Google Apps Script API
 */
class APIConnector {
    // URL Web App nhận được sau khi tiến hành Deploy mã nguồn Code.gs bên phía Apps Script
    // Hãy thay thế chuỗi này bằng URL thực tế của bạn
    static GAS_URL = "https://script.google.com/macros/s/AKfycbzOklUavB1YvlSh_p4eS1wFudz8FpXUEDexZ6xCu1ZUmfSZb8sQ8cB5sLZwlhbwes3j/exec";

    /**
     * Gửi một POST Request dạng JSON tới Google Apps Script
     * @param {string} action - Hành động xử lý (LOGIN, SAVE_DATA,...)
     * @param {Object} data - Payload dữ liệu thô gửi kèm
     * @returns {Promise<Object>} - Trả về Object kết quả từ máy chủ giải mã JSON
     */
    static async post(action, data) {
        try {
            // Sử dụng Content-Type là text/plain để tránh kích hoạt CORS preflight (OPTIONS) phức tạp trên GAS
            const response = await fetch(this.GAS_URL, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify({ action, data })
            });

            if (!response.ok) {
                throw new Error(`HTTP Error! Trạng thái kết nối máy chủ: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Lỗi tại lớp APIConnector:", error);
            return { 
                status: "error", 
                message: "Không thể thiết lập kết nối đến máy chủ Google. Vui lòng kiểm tra lại đường truyền mạng!" 
            };
        }
    }
}
