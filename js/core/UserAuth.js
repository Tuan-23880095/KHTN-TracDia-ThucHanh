/**
 * ====================================================================
 * LỚP QUẢN LÝ XÁC THỰC VÀ PHÂN QUYỀN (USER AUTHENTICATION CORE)
 * Vị trí: js/core/UserAuth.js
 * Nhiệm vụ: Đăng nhập, Đăng xuất, Lưu trữ Token/Session, Phân quyền
 * Áp dụng: OOP, Singleton Pattern, LocalStorage Caching
 * ====================================================================
 */

// Import lớp kết nối API để thực hiện request kiểm tra mật khẩu
import apiConnectorInstance from './APIConnector.js';

class UserAuth {
    constructor() {
        // Khóa định danh để lưu vào bộ nhớ cục bộ của trình duyệt
        this.SESSION_KEY = 'tracdia_user_session';
        // Tự động khôi phục thông tin người dùng nếu đã đăng nhập từ trước
        this.currentUser = this._loadSession();
    }

    /**
     * 1. HÀM ĐĂNG NHẬP (Giao tiếp với Backend GAS)
     * @param {string} userId - Mã số sinh viên / Mã GV
     * @param {string} password - Mật khẩu
     * @returns {Promise<Object>} - Kết quả đăng nhập
     */
    async login(userId, password) {
        try {
            // Đóng gói payload gửi lên Google Apps Script
            const loginPayload = {
                action: "login",
                credentials: {
                    user_id: userId,
                    password: password
                }
            };

            // Gọi API thông qua lớp APIConnector
            // Lưu ý: Backend GAS cần được cấu hình để nhận action='login' và check bảng USERS
            const response = await apiConnectorInstance.postSubmission(loginPayload, []);

            if (response.success && response.data) {
                // Đăng nhập thành công, lưu thông tin vào LocalStorage
                // Cấu trúc data mong đợi: { user_id, full_name, role, group_id }
                this._saveSession(response.data);
                return { success: true, message: "Đăng nhập thành công!" };
            } else {
                return { success: false, message: response.message || "Tài khoản hoặc mật khẩu không đúng." };
            }

        } catch (error) {
            console.error("Lỗi xác thực:", error);
            return { success: false, message: "Lỗi kết nối máy chủ xác thực." };
        }
    }

    /**
     * 2. HÀM ĐĂNG XUẤT
     * Xóa sạch dữ liệu phiên và chuyển hướng về trang đăng nhập
     */
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        this.currentUser = null;
        // Chuyển hướng về trang chủ (index.html)
        window.location.replace('../index.html');
    }

    /**
     * 3. LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI
     * @returns {Object|null}
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * 4. KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * 5. MIDDLEWARE BẢO VỆ ROUTE (Chống truy cập trái phép)
     * Gọi hàm này ở đầu các file Controller (như sessionCtrl.js) để chặn sinh viên chưa đăng nhập
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            window.location.replace('../index.html');
            return false;
        }
        return true;
    }

    /**
     * 6. KIỂM TRA QUYỀN (Role-based Access Control)
     * Dùng để ẩn/hiện chức năng tùy theo việc đó là Sinh viên hay Giảng viên
     * @param {string} requiredRole - 'student', 'leader', 'teacher'
     */
    hasRole(requiredRole) {
        if (!this.isLoggedIn()) return false;
        return this.currentUser.role === requiredRole;
    }

    // ================= PRIVATE METHODS =================
    
    // Lưu phiên vào LocalStorage (Đã mã hóa thành chuỗi JSON)
    _saveSession(userData) {
        this.currentUser = userData;
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(userData));
    }

    // Đọc phiên từ LocalStorage khi F5 tải lại trang
    _loadSession() {
        try {
            const sessionData = localStorage.getItem(this.SESSION_KEY);
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (e) {
            console.error("Lỗi đọc Session:", e);
            return null;
        }
    }
}

// Khởi tạo Singleton Instance
const userAuthInstance = new UserAuth();
export default userAuthInstance;
