/**
 * Class UserAuth
 * Chịu trách nhiệm thực hiện Logic nghiệp vụ quản lý Phiên (Session) và xác thực người dùng
 */
class UserAuth {
    // Khóa định danh duy nhất để lưu trữ chuỗi phiên trong bộ nhớ LocalStorage
    static STORAGE_KEY = "hcmus_trac_dia_session";

    /**
     * Xác thực thông tin tài khoản qua API và khởi tạo phiên lưu trữ
     * @param {string} mssv - Mã số sinh viên nhập từ trường Input
     * @param {string} password - Mật khẩu người dùng nhập
     * @returns {Promise<Object>} - Trạng thái thành công hoặc thông báo lỗi từ tầng mạng
     */
    static async login(mssv, password) {
        // Gọi đến API kết nối máy chủ xử lý hành động LOGIN
        const result = await APIConnector.post("LOGIN", { mssv, password });

        if (result && result.status === "success") {
            // Khởi tạo một token định danh tạm thời phía Client từ Base64 để đánh dấu phiên
            const clientToken = "TK_" + btoa(result.user.mssv_id + "_" + Date.now());
            
            const sessionData = {
                token: clientToken,
                profile: result.user // Chứa mssv_id, full_name, role, group_id từ Google Sheet đổ về
            };

            // Ghi cấu trúc JSON vào bộ nhớ trình duyệt
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
            return { success: true };
        }

        return { success: false, message: result.message || "Đăng nhập hệ thống thất bại!" };
    }

    /**
     * Hủy bỏ phiên làm việc hiện tại và đưa sinh viên về lại màn hình chính
     */
    static logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        window.location.href = "index.html";
    }

    /**
     * Kiểm tra nhanh trạng thái người dùng đã xác thực thành công hay chưa
     * @returns {boolean}
     */
    static isLoggedIn() {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    }

    /**
     * Trích xuất thông tin hồ sơ của phiên hiện hành
     * @returns {Object|null}
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
    static async forgotPassword(mssv) {
        if (!mssv) return { success: false, message: "Vui lòng nhập MSSV!" };
        
        // Gọi APIConnector với action mới
        const result = await APIConnector.post("FORGOT_PASSWORD", { mssv: mssv });
        
        if (result && result.status === "success") {
            return { success: true, message: result.message };
        }
        return { success: false, message: result?.message || "Lỗi kết nối máy chủ!" };
    }
    /**
     * Kiểm tra quyền hạn theo cấp bậc (Hierarchical Access)
     * Giáo viên (3) > Nhóm trưởng (2) > Sinh viên (1)
     * @param {string} requiredRole - Cấp quyền tối thiểu cần có (VD: "leader")
     * @returns {boolean} - Trả về true nếu đủ hoặc dư quyền
     */
    static hasAccess(requiredRole) {
        const session = this.getSession();
        if (!session) return false; // Chưa đăng nhập thì không có quyền gì cả

        const userRole = session.profile.role; // Lấy role hiện tại của user

        // Định nghĩa bảng điểm quyền lực
        const roleLevels = {
            "student": 1,
            "leader": 2,
            "teacher": 3
        };

        const currentLevel = roleLevels[userRole] || 0;
        const requiredLevel = roleLevels[requiredRole] || 0;

        // Nếu điểm quyền lực hiện tại LỚN HƠN HOẶC BẰNG điểm yêu cầu -> Cho phép qua cổng!
        return currentLevel >= requiredLevel;
    }

    /**
     * Hàm chặn rò rỉ an ninh nội bộ. Đặt ở đầu các file dashboard.html hoặc các bài thực hành
     * Nếu chưa đăng nhập, đá văng sinh viên ra ngoài giao diện đăng nhập gốc
     */
    static protectPage() {
        if (!this.isLoggedIn()) {
            window.location.href = "index.html";
        }
    }
}
