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

/**
 * ==========================================================================
 * FILE: js/controllers/dashboardCtrl.js
 * MỤC ĐÍCH: Bộ điều khiển trung tâm cho trang Dashboard chính
 * CHỨC NĂNG:
 * 1. Nhận diện Role, phân cấp kế thừa (Teacher hiển thị switch, Student chịu ổ khóa).
 * 2. Gọi API kéo trạng thái OPEN/CLOSED real-time từ Sheet Settings.
 * 3. Bảo vệ giao diện nghiêm ngặt, chặn click chuột nếu Form bị khóa sổ.
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. CHỐT CHẶN AN NINH & TẢI THÔNG TIN HỒ SƠ
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    
    if (session && session.profile) {
        DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
        DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");
    }

    // Định nghĩa cấu trúc dữ liệu tĩnh cho tên và mô tả của 9 buổi học trắc địa
    const sessionsMetadata = [
        { id: "session_1", title: "Buổi 1: Giới thiệu máy Kinh vĩ & Thủy bình", desc: "Thao tác đọc số trên mia 3 lần độc lập và đo khoảng cách lượng cự ngắm ngang." },
        { id: "session_2", title: "Buổi 2: Thao tác định tâm & Cân bằng máy", desc: "Rèn luyện trí nhớ cơ bắp thao tác cân máy dưới áp lực thời gian và hạn mức sai số tâm e <= 2mm." },
        { id: "session_3", title: "Buổi 3: Phương pháp đo Góc bằng", desc: "Tiến hành đo góc bằng qua 3 vòng đo cụm kính, tính sai số 2C và trị số hướng trung bình." },
        { id: "session_4", title: "Buổi 4: Đo Góc đứng & Cao lượng giác", desc: "Khảo sát bàn độ đứng, tính sai số chỉ tiêu MO, góc đứng V và chênh cao lượng giác h." },
        { id: "session_5", title: "Buổi 5: Đo dài bằng chỉ lượng cự lượng giác", desc: "Vận dụng phương sai lượng cự kép kết hợp góc đứng để tính cự ly phẳng bản đồ." },
        { id: "session_6", title: "Buổi 6: Đo cao hình học & Kiểm định góc i", desc: "Thực hiện bài kiểm định máy thủy bình kinh điển (phương pháp đo từ giữa và đo lệch tâm)." },
        { id: "session_7", title: "Buổi 7: Dẫn chuyền cao độ kỹ thuật tuyến kín", desc: "Phát triển mạng lưới đường chuyền độ cao ngoại nghiệp khép khít mốc hành chính." },
        { id: "session_8", title: "Buổi 8: Tính toán nội nghiệp Bình sai lưới", desc: "Xử lý sai số khép fh, phân bổ số hiệu chỉnh vi vào sổ đo hoàn công cao độ." },
        { id: "session_9", title: "Buổi 9: Sát hạch kỹ năng thực hành tổng hợp", desc: "Kỳ thi cuối kỳ tập trung: Giám thị phát đề ngẫu nhiên, hệ thống đếm ngược 60 phút tự động khóa bài." }
    ];

    // 2. KÉO DỮ LIỆU ĐÓNG/MỞ FORM TỪ SHEET SETTINGS QUA TẦNG API
    let sessionsSettings = {};
    try {
        // Gọi lệnh POST ngầm hỏi trạng thái hệ thống
        const response = await APIConnector.post("GET_SETTINGS", {});
        if (response && response.status === "success") {
            // Biến đổi mảng trả về thành Object cấu trúc dạng { session_1: "OPEN", session_2: "CLOSED" }
            response.settings.forEach(item => {
                sessionsSettings[item.session_id] = item.status.toUpperCase().trim();
            });
        } else {
            // VÁ LỖ HỔNG: Áp dụng Fail-Closed thay vì Fail-Open
            console.warn("Không kéo được Settings từ Sheet, áp dụng chế độ CLOSED an toàn (Fail-Closed).");
            sessionsMetadata.forEach(s => sessionsSettings[s.id] = "CLOSED"); 
        }
    } catch (err) {
        // VÁ LỖ HỔNG: Đóng băng toàn bộ hệ thống khi rớt mạng
        console.error("Lỗi cổng API kết nối mạng: ", err);
        sessionsMetadata.forEach(s => sessionsSettings[s.id] = "CLOSED"); 
    }

    // 3. THỰC THI PHÂN QUYỀN HIERARCHICAL VÀ RENDER VIEW INTERFACE

    // CHỨC NĂNG A: Dành riêng cho tài khoản GIẢNG VIÊN (role === "teacher")
    if (UserAuth.hasAccess("teacher")) {
        // Hiện bảng điều khiển đặc quyền
        DOMUtils.toggleVisibility("teacherSettingsPanel", true);
        const switchMatrix = document.getElementById("switchMatrixContainer");
        switchMatrix.innerHTML = ""; // Clear dữ liệu rác

        // Vòng lặp vẽ 9 cái công tắc Toggle Switch
        sessionsMetadata.forEach(s => {
            const isChecked = sessionsSettings[s.id] === "OPEN" ? "checked" : "";
            
            const switchCard = document.createElement("div");
            switchCard.className = "switch-item";
            switchCard.innerHTML = `
                <span>${s.title.split(":")[0]}</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="switch_${s.id}" ${isChecked}>
                    <span class="slider"></span>
                </label>
            `;
            switchMatrix.appendChild(switchCard);

            // Gắn sự kiện lắng nghe gạt công tắc (Real-time update lên Google Sheets)
            document.getElementById(`switch_${s.id}`).addEventListener("change", async function() {
                const newStatus = this.checked ? "OPEN" : "CLOSED";
                this.disabled = true; // Khóa tạm thời tránh nhấn liên tục (debounce)
                
                const updateRes = await APIConnector.post("UPDATE_SETTING", {
                    session_id: s.id,
                    status: newStatus
                });

                if (updateRes && updateRes.status === "success") {
                    console.log(`[GAS Server] Cập nhật thành công ${s.id} sang trạng thái: ${newStatus}`);
                    // Thầy chỉnh xong thì giao diện hiển thị Grid bên dưới của thầy tự đồng bộ luôn
                    const targetCard = document.getElementById(`card_${s.id}`);
                    const targetBadge = document.getElementById(`badge_${s.id}`);
                    const targetBtn = document.getElementById(`btn_${s.id}`);
                    
                    if (newStatus === "OPEN") {
                        targetBadge.className = "status-badge status-open";
                        targetBadge.innerText = "ĐANG MỞ FORM";
                        targetBtn.innerText = "VÀO BIỂU MẪU ĐO ➜";
                    } else {
                        targetBadge.className = "status-badge status-closed";
                        targetBadge.innerText = "ĐÃ KHÓA SỔ";
                        targetBtn.innerText = "XEM LẠI SỐ LIỆU 👁";
                    }
                } else {
                    alert("⛔ Lỗi hệ thống: Không thể ghi nhận trạng thái lên Google Sheets. Vui lòng kiểm tra lại kết nối!");
                    this.checked = !this.checked; // Trả lại trạng thái switch cũ trên UI
                }
                this.disabled = false;
            });
        });
    }

    // CHỨC NĂNG B: RENDER LƯỚI 9 CARD BÀI THỰC HÀNH CHUNG (Hỗ trợ bẫy khóa an ninh cho SV)
    const gridContainer = document.getElementById("sessionGridContainer");
    gridContainer.innerHTML = "";

    sessionsMetadata.forEach(s => {
        const currentStatus = sessionsSettings[s.id] || "CLOSED";
        const isClosed = currentStatus === "CLOSED";
        const isTeacher = UserAuth.hasAccess("teacher");

        const card = document.createElement("div");
        card.className = "session-card";
        card.id = `card_${s.id}`;

        // NÂNG CẤP BẢO MẬT: Nếu form ĐÓNG và người truy cập LÀ SINH VIÊN/NHÓM TRƯỞNG -> Kích hoạt Grayscale và khóa click
        if (isClosed && !isTeacher) {
            card.classList.add("state-locked");
        }

        // Định hình văn bản nút bấm và nhãn trạng thái tương ứng
        let badgeClass = isClosed ? "status-closed" : "status-open";
        let badgeText = isClosed ? "ĐÃ KHÓA SỔ" : "ĐANG MỞ FORM";
        
        // Thiết lập nút bấm thông minh
        let btnText = "VÀO BIỂU MẪU ĐO ➜";
        if (isClosed) {
            btnText = isTeacher ? "XEM LẠI SỐ LIỆU 👁" : "🔒 GIẢNG VIÊN CHƯA MỞ FORM";
        }

        card.innerHTML = `
            <div>
                <div class="session-title">${s.title}</div>
                <div class="session-desc">${s.desc}</div>
            </div>
            <div class="session-action">
                <span class="status-badge ${badgeClass}" id="badge_${s.id}">${badgeText}</span>
                <a href="pages/session-${s.id.split("_")[1]}.html" class="btn btn-primary btn-enter" id="btn_${s.id}" style="text-decoration:none; font-size:9.5pt; padding:6px 12px;">
                    ${btnText}
                </a>
            </div>
        `;
        gridContainer.appendChild(card);
    });
});
