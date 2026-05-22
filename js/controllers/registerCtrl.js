/**
 * ====================================================================
 * TRÌNH ĐIỀU KHIỂN ĐĂNG KÝ (REGISTRATION CONTROLLER)
 * Vị trí: js/controllers/registerCtrl.js
 * Nhiệm vụ: Bắt sự kiện Form register.html -> Validate Client-side 
 * -> Gọi UserAuth.register()
 * Áp dụng: MVC Pattern, DOM Event Delegation, Form Validation
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

// Kích hoạt khi cây DOM của register.html đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    
    // Ánh xạ đến Form đăng ký dựa trên ID đã chốt ở register.html
    const registerForm = document.getElementById('registerForm');
    
    // Fail-fast: Dừng chạy script nếu không tìm thấy form
    if (!registerForm) return;

    // Lắng nghe sự kiện Submit
    registerForm.addEventListener('submit', async (event) => {
        // NGĂN CHẶN HÀNH VI MẶC ĐỊNH: Không tải lại trang (F5)
        event.preventDefault();

        // Bước 1: Dọn dẹp trạng thái lỗi cũ (Reset View)
        hideMessage('registerErrorMessage');
        const inputIds = ['txtFullName', 'txtUserId', 'txtRegPassword', 'txtConfirmPassword'];
        inputIds.forEach(id => highlightInputError(id, false));

        // Bước 2: Trích xuất dữ liệu an toàn (Tự động trim khoảng trắng thừa)
        const fullName = getInputValue('txtFullName', 'string');
        const userId = getInputValue('txtUserId', 'string');
        const groupId = getInputValue('txtGroupId', 'string'); // Có thể rỗng
        const password = getInputValue('txtRegPassword', 'string');
        const confirmPassword = getInputValue('txtConfirmPassword', 'string');

        // Bước 3: Validate cục bộ (Frontend Validation)
        let hasEmptyError = false;

        // Bắt lỗi để trống các trường bắt buộc
        if (!fullName) { highlightInputError('txtFullName', true); hasEmptyError = true; }
        if (!userId) { highlightInputError('txtUserId', true); hasEmptyError = true; }
        if (!password) { highlightInputError('txtRegPassword', true); hasEmptyError = true; }
        if (!confirmPassword) { highlightInputError('txtConfirmPassword', true); hasEmptyError = true; }

        if (hasEmptyError) {
            showMessage('registerErrorMessage', 'Vui lòng điền đầy đủ các trường bắt buộc (*).', 'error');
            return; // Chặn luồng, không gửi lên Server
        }

        // BẮT LỖI NGHIỆP VỤ CAO CẤP: Mật khẩu và Xác nhận mật khẩu không khớp
        if (password !== confirmPassword) {
            highlightInputError('txtRegPassword', true);     // Bôi đỏ ô Mật khẩu
            highlightInputError('txtConfirmPassword', true); // Bôi đỏ ô Xác nhận
            showMessage('registerErrorMessage', 'Mật khẩu và Xác nhận mật khẩu không khớp. Vui lòng gõ lại!', 'error');
            
            // Xóa rỗng 2 ô mật khẩu và tự động focus lại vào ô mật khẩu đầu tiên
            document.getElementById('txtRegPassword').value = '';
            document.getElementById('txtConfirmPassword').value = '';
            document.getElementById('txtRegPassword').focus();
            return; // Chặn luồng
        }

        // Đóng gói đối tượng người dùng (Payload)
        const userData = {
            user_id: userId,
            full_name: fullName,
            group_id: groupId || "N/A", // Nếu không điền nhóm thì gán mặc định
            password: password
        };

        // Bước 4: Khóa Form & Bật Spinner chống Spam Click
        toggleButtonLoading('btnRegister', true, 'ĐĂNG KÝ TÀI KHOẢN');

        // Bước 5: Gọi hàm Đăng ký từ Core Model
        const result = await userAuthInstance.register(userData);

        // Bước 6: Xử lý kết quả trả về từ Google Sheets
        if (result.success) {
            // Hiển thị thông báo thành công màu xanh lá
            showMessage('registerErrorMessage', '🎉 Tạo tài khoản thành công! Đang chuyển hướng về trang Đăng nhập...', 'success');
            
            // Xóa trắng form để bảo mật
            registerForm.reset();

            // Chuyển hướng về index.html sau 1.5 giây
            setTimeout(() => {
                window.location.replace('index.html');
            }, 1500);
            
        } else {
            // Thất bại (Trùng MSSV, lỗi mạng...): Tắt Spinner, nhả khóa nút
            toggleButtonLoading('btnRegister', false, 'ĐĂNG KÝ TÀI KHOẢN');
            
            // Bôi đỏ ô MSSV vì lỗi phổ biến nhất là trùng mã số sinh viên
            highlightInputError('txtUserId', true);
            
            // Hiển thị thông báo lỗi
            showMessage('registerErrorMessage', result.message, 'error');
        }
    });
});
