/**
 * ====================================================================
 * TRÌNH ĐIỀU KHIỂN ĐĂNG NHẬP (AUTHENTICATION CONTROLLER)
 * Vị trí: js/controllers/authCtrl.js
 * Nhiệm vụ: Bắt sự kiện Form index.html -> Validate -> Gọi UserAuth.js
 * Áp dụng: MVC Pattern, DOM Event Delegation, Promise/Async Await
 * ====================================================================
 */

// 1. Nhập khẩu Bộ não xác thực (Model)
import userAuthInstance from '../core/UserAuth.js'; 

// 2. Nhập khẩu Hộp công cụ thao tác giao diện (View Utilities)
import { 
    showMessage, 
    hideMessage, 
    toggleButtonLoading, 
    getInputValue, 
    highlightInputError 
} from '../utils/domUtils.js';

// Kích hoạt khi toàn bộ cây DOM của index.html đã được tải xong
document.addEventListener('DOMContentLoaded', () => {
    
    // Ánh xạ đến Form đăng nhập dựa trên ID đã chốt ở index.html
    const loginForm = document.getElementById('loginForm');
    
    // Kỹ thuật Fail-fast: Nếu không tìm thấy Form (đề phòng script chạy sai trang), dừng ngay lập tức
    if (!loginForm) return;

    // Lắng nghe sự kiện Submit (Khi sinh viên bấm nút hoặc gõ Enter trên điện thoại)
    loginForm.addEventListener('submit', async (event) => {
        // NGĂN CHẶN HÀNH VI MẶC ĐỊNH: Không cho trình duyệt tự động tải lại trang (F5)
        event.preventDefault();

        // Bước 1: Dọn dẹp trạng thái lỗi cũ (nếu có) trước khi bắt đầu
        hideMessage('authErrorMessage');
        highlightInputError('txtUserId', false);
        highlightInputError('txtPassword', false);

        // Bước 2: Lấy dữ liệu an toàn qua domUtils (Tự động trim khoảng trắng thừa)
        const userId = getInputValue('txtUserId', 'string');
        const password = getInputValue('txtPassword', 'string');

        // Bước 3: Validate cục bộ (Frontend Validation) - Tiết kiệm băng thông gọi API
        let hasError = false;

        if (!userId) {
            highlightInputError('txtUserId', true); // Bôi đỏ ô MSSV
            hasError = true;
        }
        
        if (!password) {
            highlightInputError('txtPassword', true); // Bôi đỏ ô Mật khẩu
            hasError = true;
        }

        // Nếu có lỗi để trống, báo đỏ và dừng lại, không gọi API
        if (hasError) {
            showMessage('authErrorMessage', 'Vui lòng nhập đầy đủ Mã số định danh và Mật khẩu!', 'error');
            return; 
        }

        // Bước 4: Khóa Form & Bật Spinner quay vòng để tránh "Spam Click"
        // Chữ 'ĐĂNG NHẬP HỆ THỐNG' được truyền vào để giữ lại text gốc khi spinner tắt
        toggleButtonLoading('btnLogin', true, 'ĐĂNG NHẬP HỆ THỐNG');

        // Bước 5: Đưa luồng dữ liệu sang Model để gọi API Backend (Google Apps Script)
        const result = await userAuthInstance.login(userId, password);

        // Bước 6: Lắng nghe phản hồi và Điều khiển giao diện
        if (result.success) {
            // Hiển thị khung màu xanh lá cây báo thành công
            showMessage('authErrorMessage', 'Đăng nhập thành công! Đang vào hệ thống...', 'success');
            
            // Chuyển hướng mượt mà sang Dashboard sau 0.5 giây (Tạo cảm giác hệ thống xử lý chuyên nghiệp)
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 500);
            
        } else {
            // Thất bại (Sai pass, lỗi mạng...): Tắt Spinner, nhả khóa nút bấm
            toggleButtonLoading('btnLogin', false, 'ĐĂNG NHẬP HỆ THỐNG');
            
            // Hiển thị khung màu đỏ kèm lời nhắn lỗi từ Backend trả về
            showMessage('authErrorMessage', result.message, 'error');
            
            // Xóa rỗng ô mật khẩu và focus lại để sinh viên gõ lại nhanh hơn
            const txtPassword = document.getElementById('txtPassword');
            txtPassword.value = '';
            txtPassword.focus();
        }
    });
});
