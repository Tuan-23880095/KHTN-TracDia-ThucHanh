/**
 * ====================================================================
 * LỚP QUẢN LÝ XÁC THỰC VÀ PHÂN QUYỀN (USER AUTHENTICATION CORE)
 * Vị trí: js/core/UserAuth.js
 * Nhiệm vụ: Đăng nhập, ĐĂNG KÝ, Đăng xuất, Lưu trữ Token/Session, Phân quyền
 * Áp dụng: OOP, Singleton Pattern, LocalStorage Caching
 * ====================================================================
 */

import apiConnectorInstance from './APIConnector.js';

class UserAuth {
    constructor() {
        this.SESSION_KEY = 'tracdia_user_session';
        this.currentUser = this._loadSession();
    }

    /**
     * 1. HÀM ĐĂNG NHẬP (Login)
     */
    async login(userId, password) {
        try {
            const loginPayload = {
                action: "login",
                credentials: {
                    user_id: userId,
                    password: password
                }
            };

            const response = await apiConnectorInstance.postSubmission(loginPayload, []);

            if (response.success && response.data) {
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
     * 2. HÀM ĐĂNG KÝ TÀI KHOẢN MỚI (Register) - MỚI BỔ SUNG
     * @param {Object} userData - Đối tượng chứa { user_id, full_name, group_id, password }
     * @returns {Promise<Object>} - Kết quả báo về từ Google Sheets
     */
    async register(userData) {
        try {
            // Đóng gói payload chuyên dụng cho chức năng Đăng ký
            const registerPayload = {
                action: "register",
                user_info: {
                    user_id: userData.user_id,
                    full_name: userData.full_name,
                    group_id: userData.group_id,
                    password: userData.password,
                    // BẢO MẬT CỐT LÕI: Ép cứng quyền sinh viên. 
                    // Quản trị viên (Teacher/Leader) phải do Admin set tay trong Google Sheets
                    role: "student" 
                }
            };

            // Gọi API thông qua lớp APIConnector (ném một mảng rỗng [] cho phần measurements vì đây ko phải số liệu)
            const response = await apiConnectorInstance.postSubmission(registerPayload, []);

            // Xử lý luồng phản hồi từ Backend
            if (response.success) {
                return { success: true, message: "Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ." };
            } else {
                return { success: false, message: response.message || "Đăng ký thất bại. Mã số sinh viên này có thể đã tồn tại!" };
            }
        } catch (error) {
            console.error("Lỗi đăng ký:", error);
            return { success: false, message: "Lỗi mạng lưới: Không thể gửi yêu cầu tạo tài khoản đến máy chủ." };
        }
    }

    /**
     * 3. HÀM ĐĂNG XUẤT
     */
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        this.currentUser = null;
        window.location.replace('index.html');
    }

    /**
     * 4. LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * 5. KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * 6. MIDDLEWARE BẢO VỆ ROUTE
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            window.location.replace('index.html');
            return false;
        }
        return true;
    }

    /**
     * 7. KIỂM TRA QUYỀN (RBAC)
     */
    hasRole(requiredRole) {
        if (!this.isLoggedIn()) return false;
        return this.currentUser.role === requiredRole;
    }

    // ================= PRIVATE METHODS =================
    
    _saveSession(userData) {
        this.currentUser = userData;
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(userData));
    }

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

const userAuthInstance = new UserAuth();
export default userAuthInstance;
