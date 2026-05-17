/**
 * ==========================================================================
 * FILE: js/controllers/dashboardCtrl.js
 * MỤC ĐÍCH: Điều khiển logic giao diện Bảng điều khiển trung tâm (dashboard.html)
 * CHỨC NĂNG: 
 * 1. Chặn truy cập trái phép bằng cơ chế kiểm tra Phiên (Session)
 * 2. Phân quyền UI (Giáo viên quản trị / Sinh viên thực hành)
 * 3. Điều khiển trạng thái Đạt chuẩn (QC) hoặc Khóa tiến độ của 9 buổi học
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    
    // BƯỚC 1: BẢO VỆ AN NINH TRANG (Page Protection)
    // Nếu sinh viên cố tình vào thẳng trang này bằng URL mà chưa đăng nhập, hàm sẽ đá văng ra index.html
    UserAuth.protectPage();

    // BƯỚC 2: TRÍCH XUẤT THÔNG TIN PHIÊN LÀM VIỆC (Extract Session Profile)
    const session = UserAuth.getSession();
    if (!session || !session.profile) {
        UserAuth.logout(); // Dự phòng trường hợp token hỏng hoặc dữ liệu session lỗi
        return;
    }

    // Phân rã cấu trúc dữ liệu người dùng được trả về từ Google Sheet ở bước đăng nhập
    const { mssv_id, full_name, role, group_id } = session.profile;

    // BƯỚC 3: ĐỔ DỮ LIỆU ĐỊNH DANH RA GIAO DIỆN (Render Identity Views)
    const displayFullName = document.getElementById("displayFullName");
    const displayMssv = document.getElementById("displayMssv");
    const displayGroupId = document.getElementById("displayGroupId");
    const userRoleBadge = document.getElementById("userRoleBadge");

    if (displayFullName) displayFullName.textContent = full_name;
    if (displayMssv) displayMssv.textContent = mssv_id;
    if (displayGroupId) displayGroupId.textContent = group_id || "Chưa phân nhóm";

    // Cập nhật nhãn và phong cách phẳng (flat class) cho thuộc tính chức danh
    if (userRoleBadge) {
        if (role === "teacher") {
            userRoleBadge.textContent = "Giảng viên";
            userRoleBadge.classList.add("role-teacher");
        } else if (role === "leader") {
            userRoleBadge.textContent = "Nhóm trưởng";
            userRoleBadge.classList.add("role-leader");
        } else {
            userRoleBadge.textContent = "Sinh viên";
        }
    }

    // BƯỚC 4: XỬ LÝ PHÂN QUYỀN GIAO DIỆN GIÁO VIÊN (Role-based Teacher Rendering)
    const teacherPanel = document.getElementById("teacherPanel");
    if (role === "teacher") {
        if (teacherPanel) {
            teacherPanel.classList.remove("hidden"); // Hiển thị dải thống kê real-time của giáo viên
            // Lưu ý: Tại đây bạn có thể gọi APIConnector.post("GET_TEACHER_STATS", {}) để cập nhật số liệu thực tế
        }
    }

    // BƯỚC 5: XỬ LÝ TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI 9 BUỔI THỰC HÀNH (Dynamic Session Matrix)
    // Thực tế hệ thống sẽ gọi lên Google Sheets để xem sinh viên/nhóm này đã hoàn thành bài nào.
    // Dưới đây là mảng cấu trúc trạng thái mẫu để Controller duyệt và render phẳng ra giao diện.
    // Bạn có thể chuyển cấu trúc này thành một lệnh fetch() từ APIConnector nếu cần lấy dữ liệu động từ Google Sheet.
    
    const mockSessionsProgress = {
        1: { completed: true, locked: false, statusText: "ĐẠT CHUẨN (QC)" },
        2: { completed: true, locked: false, statusText: "ĐẠT CHUẨN (QC)" },
        3: { completed: false, locked: false, statusText: "CHƯA NỘP" },
        4: { completed: false, locked: false, statusText: "CHƯA NỘP" },
        5: { completed: false, locked: false, statusText: "CHƯA NỘP" },
        6: { completed: false, locked: false, statusText: "CHƯA NỘP" },
        7: { completed: false, locked: true, statusText: "CHƯA MỞ" },
        8: { completed: false, locked: true, statusText: "CHƯA MỞ" },
        9: { completed: false, locked: false, statusText: "SẴN SÀNG THI" } // Buổi thi sát hạch luôn sẵn sàng nếu giáo viên kích hoạt
    };

    // Duyệt qua chu kỳ tuần tự 9 buổi để thực thi thay đổi DOM hình ảnh
    for (let sessionNum = 1; sessionNum <= 9; sessionNum++) {
        const cardElement = document.getElementById(`card-session-${sessionNum}`);
        const statusTextElement = document.getElementById(`status-text-${sessionNum}`);
        const progress = mockSessionsProgress[sessionNum];

        if (cardElement && progress) {
            // Nếu là tài khoản Giảng viên, tự động mở khóa (unlocked) toàn bộ các card để giáo viên kiểm tra form
            if (role === "teacher") {
                cardElement.classList.remove("state-locked");
                if (statusTextElement && sessionNum !== 9) {
                    statusTextElement.textContent = "XEM BIỂU MẪU";
                }
                continue; // Bỏ qua các bước kiểm tra khóa/hoàn thành của sinh viên bên dưới
            }

            // Xử lý trạng thái bị khóa do chưa đến tiến độ (Locked State)
            if (progress.locked) {
                cardElement.classList.add("state-locked");
                if (statusTextElement) {
                    statusTextElement.textContent = progress.statusText;
                    statusTextElement.className = "flat-badge text-light"; // Chuyển chữ sang màu xám mờ
                }
            } 
            // Xử lý trạng thái đã hoàn thành bài tập nộp hiện trường và đạt chuẩn QC (Completed State)
            else if (progress.completed) {
                cardElement.classList.add("status-completed");
                if (statusTextElement) {
                    statusTextElement.textContent = progress.statusText;
                    statusTextElement.className = "flat-badge badge-success"; // Đổ màu nền xanh phẳng
                }
            }
            // Xử lý bài học đang mở nhưng chưa nộp dữ liệu (Active State)
            else {
                if (statusTextElement && sessionNum !== 9) {
                    statusTextElement.textContent = progress.statusText;
                    statusTextElement.className = "flat-badge text-primary font-bold"; // Chuyển chữ xanh nổi bật
                }
            }
        }
    }

    // BƯỚC 6: RÀNG BUỘC SỰ KIỆN ĐĂNG XUẤT (Logout Event Binding)
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
            e.preventDefault();
            const confirmLogout = confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản lý trắc địa?");
            if (confirmLogout) {
                UserAuth.logout(); // Hủy token trong localStorage và chuyển hướng
            }
        });
    }
});
