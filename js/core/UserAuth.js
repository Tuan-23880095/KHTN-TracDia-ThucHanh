/**
 * Class UserAuth
 * Chịu trách nhiệm thực hiện Logic nghiệp vụ quản lý Phiên (Session) và xác thực người dùng
 */
class UserAuth {
    // Khóa định danh duy nhất để lưu trữ chuỗi phiên trong bộ nhớ LocalStorage
    static STORAGE_KEY = "hcmus_trac_dia_session";

    /**
     * Xác thực thông tin tài khoản qua API và khởi tạo phiên lưu trữ
     */
    static async login(mssv, password) {
        const result = await APIConnector.post("LOGIN", { mssv, password });

        if (result && result.status === "success") {
            const clientToken = "TK_" + btoa(result.user.mssv_id + "_" + Date.now());
            
            const sessionData = {
                token: clientToken,
                profile: result.user 
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
            return { success: true };
        }

        return { success: false, message: result.message || "Đăng nhập hệ thống thất bại!" };
    }

    /**
     * Hủy bỏ phiên làm việc hiện tại và đưa người dùng về lại màn hình chính
     */
    static logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        window.location.href = "index.html";
    }

    /**
     * Kiểm tra nhanh trạng thái người dùng đã xác thực thành công hay chưa
     */
    static isLoggedIn() {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    }

    /**
     * Trích xuất thông tin hồ sơ của phiên hiện hành
     */
    static getSession() {
        const session = localStorage.getItem(this.STORAGE_KEY);
        if (!session) return null;
        try {
            return JSON.parse(session);
        } catch (e) {
            this.logout();
            return null;
        }
    }

    /**
     * Gửi yêu cầu cấp lại mật khẩu
     */
    static async forgotPassword(mssv) {
        if (!mssv) return { success: false, message: "Vui lòng nhập MSSV!" };
        
        const result = await APIConnector.post("FORGOT_PASSWORD", { mssv: mssv });
        
        if (result && result.status === "success") {
            return { success: true, message: result.message };
        }
        return { success: false, message: result?.message || "Lỗi kết nối máy chủ!" };
    }

    /**
     * Kiểm tra quyền hạn theo cấp bậc (Hierarchical Access)
     * Giáo viên (3) > Nhóm trưởng (2) > Sinh viên (1)
     */
    static hasAccess(requiredRole) {
        const session = this.getSession();
        
        // BẢO MẬT: Kiểm tra sâu xem profile và role có tồn tại không để tránh lỗi undefined
        if (!session || !session.profile || !session.profile.role) {
            return false;
        }

        // BẢO MẬT: Chuẩn hóa chuỗi (chuyển chữ thường, xóa khoảng trắng) để so sánh chính xác tuyệt đối
        const userRole = session.profile.role.toLowerCase().trim();
        const targetRole = requiredRole.toLowerCase().trim();

        const roleLevels = {
            "student": 1,
            "leader": 2,
            "teacher": 3
        };

        const currentLevel = roleLevels[userRole] || 0;
        const requiredLevel = roleLevels[targetRole] || 0;

        return currentLevel >= requiredLevel;
    }

    /**
     * Hàm chặn rò rỉ an ninh nội bộ điều hướng sớm
     */
    static protectPage() {
        if (!this.isLoggedIn()) {
            window.location.href = "index.html";
        }
    }
}
