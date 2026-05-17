/**
 * Bộ điều khiển authCtrl
 * Ràng buộc sự kiện (Event Listener) và điều khiển hiển thị trạng thái của trang index.html
 */
document.addEventListener("DOMContentLoaded", () => {
    
    // ĐIỀU HƯỚNG SỚM: Nếu sinh viên đã có phiên đăng nhập hợp lệ, chuyển thẳng vào Dashboard
    if (UserAuth.isLoggedIn()) {
        window.location.href = "dashboard.html";
        return;
    }

    // Lấy các phần tử DOM đã thiết lập ID chính xác từ file index.html
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("errorMessage");
    const btnSubmitLogin = document.getElementById("btnSubmitLogin");
    const btnForgotPassword = document.getElementById("btnForgotPassword");

    // Xử lý hành động Submit Form Đăng nhập
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Chặn hành vi tải lại trang mặc định của Form HTML

            const mssv = document.getElementById("mssv").value.trim();
            const password = document.getElementById("password").value;

            // BƯỚC 1: CẬP NHẬT TRẠNG THÁI UI SANG "LOADING" (Tránh việc sinh viên click liên tục nhiều lần)
            errorMessage.classList.add("hidden");
            btnSubmitLogin.disabled = true;
            btnSubmitLogin.classList.add("opacity-70", "cursor-not-allowed");
            btnSubmitLogin.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg> ĐANG XỬ LÝ...`;

            // BƯỚC 2: CHUYỂN GIAO DỮ LIỆU XUỐNG TẦNG LOGIC NGHIỆP VỤ (CORE)
            const result = await UserAuth.login(mssv, password);

            // BƯỚC 3: NHẬN PHẢN HỒI VÀ ĐIỀU KHIỂN HIỂN THỊ RA VIEW
            if (result.success) {
                // Xác thực thành công -> Di chuyển vào trang tổng quan quản lý
                window.location.href = "dashboard.html";
            } else {
                // Thất bại -> Hiển thị hộp thông báo lỗi màu đỏ và khôi phục trạng thái nút bấm ban đầu
                errorMessage.textContent = result.message;
                errorMessage.classList.remove("hidden");
                
                btnSubmitLogin.disabled = false;
                btnSubmitLogin.classList.remove("opacity-70", "cursor-not-allowed");
                btnSubmitLogin.innerHTML = "ĐĂNG NHẬP";
            }
        });
    }

    // Xử lý hành động Click nút Quên mật khẩu
    if (btnForgotPassword) {
        btnForgotPassword.addEventListener("click", async (e) => {
            e.preventDefault(); // Ngăn hành vi mặc định nếu là thẻ <a> hoặc <button>
            
            const mssvField = document.getElementById("mssv");
            const mssv = mssvField ? mssvField.value.trim() : "";

            // Kiểm tra tính hợp lệ dữ liệu đầu vào phía Client
            if (!mssv) {
                alert("Hệ thống yêu cầu: Vui lòng nhập Mã số sinh viên (MSSV) của bạn vào ô trống trước khi bấm Quên mật khẩu.");
                if (mssvField) mssvField.focus();
                return;
            } 

            // Cập nhật giao diện (UX) để sinh viên biết hệ thống đang xử lý
            const originalText = btnForgotPassword.innerHTML;
            btnForgotPassword.innerHTML = "ĐANG GỬI EMAIL...";
            btnForgotPassword.style.pointerEvents = "none";
            btnForgotPassword.style.opacity = "0.7";

            try {
                // GỌI API THỰC TẾ: Chuyển yêu cầu xuống tầng Network (UserAuth -> APIConnector -> GAS)
                const result = await UserAuth.forgotPassword(mssv);

                if (result.success) {
                    // Thành công: Backend đã tìm thấy MSSV và gửi email
                    alert(`✅ THÀNH CÔNG!\n${result.message}`);
                } else {
                    // Thất bại: Không tìm thấy MSSV hoặc lỗi mạng
                    alert(`🚨 LỖI: ${result.message}`);
                }
            } catch (error) {
                alert("🚨 Đã có lỗi xảy ra trong quá trình gửi yêu cầu. Vui lòng thử lại sau.");
                console.error(error);
            } finally {
                // Khôi phục lại trạng thái nút bấm ban đầu
                btnForgotPassword.innerHTML = originalText;
                btnForgotPassword.style.pointerEvents = "auto";
                btnForgotPassword.style.opacity = "1";
            }
        });
    }
});
