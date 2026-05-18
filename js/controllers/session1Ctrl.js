/**
 * ==========================================================================
 * FILE: js/controllers/session1Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển Buổi 1 (Giới thiệu máy Kinh vĩ & Thủy bình)
 * CHỨC NĂNG: 
 * 1. Chốt chặn an ninh: Chống nộp đè dữ liệu (Lockdown Form nếu đã có số liệu)
 * 2. Tự động đổ nút "Xuất báo cáo PDF" động sang trang report-template.html
 * 3. Phân quyền vai trò nhóm trưởng qua UserAuth.hasAccess("leader")
 * 4. Tính toán số đọc trung bình và kiểm định sai số hình học ngoại nghiệp real-time
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    
    // ==========================================
    // 1. KIỂM TRA BẢO MẬT & ĐỔ HỒ SƠ TÀI KHOẢN
    // ==========================================
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    if (!session || !session.profile) return;

    const CURRENT_SESSION_NUM = "1"; // Định danh Buổi 1

    // Hiển thị thông tin sinh viên lên thanh trạng thái
    DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
    DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");

    // Thiết lập tính năng xem trước ảnh minh chứng thực địa
    DOMUtils.setupImagePreview("indSelfieFile", "indSelfiePreview");
    DOMUtils.setupImagePreview("indInstFile", "indInstPreview");
    DOMUtils.setupImagePreview("grpPhotoFile", "grpPhotoPreview");

    // ==========================================
    // 2. CHỐT CHẶN AN NINH HOÀN CÔNG (ANTI-RESUBMIT LOCKDOWN)
    // ==========================================
    try {
        // Gọi API lên GAS kiểm tra xem tài khoản này đã nộp bài buổi 1 chưa
        const checkSubmission = await APIConnector.post("GET_SUBMISSION", {
            mssv_id: session.profile.mssv_id,
            session_name: CURRENT_SESSION_NUM
        });

        if (checkSubmission && checkSubmission.found) {
            // Thực thi kịch bản phong tỏa Form nhập liệu
            executeFormLockdown(session.profile.mssv_id);
            return; // Ngắt tiến trình bên dưới, không cho liên kết các hàm tính toán/nộp bài nữa
        }
    } catch (err) {
        console.error("Lỗi chốt chặn an ninh buổi học: ", err);
    }

    // ==========================================
    // 3. LOGIC ĐIỀU HƯỚNG CHUYỂN TAB VAI TRÒ
    // ==========================================
    const tabIndBtn = document.getElementById("tabIndividualBtn");
    const tabGrpBtn = document.getElementById("tabGroupBtn");

    if (tabIndBtn && tabGrpBtn) {
        tabIndBtn.addEventListener("click", () => {
            tabIndBtn.className = "tab-btn active";
            tabGrpBtn.className = "tab-btn";
            DOMUtils.toggleVisibility("individualForm", true);
            DOMUtils.toggleVisibility("groupForm", false);
            DOMUtils.hideAlert("validationAlert");
        });

        tabGrpBtn.addEventListener("click", () => {
            // Khai thác hàm phân quyền phân cấp đã tối ưu tại UserAuth
            if (!UserAuth.hasAccess("leader")) {
                alert("⛔ Truy cập bị từ chối! Báo cáo kết quả Nhóm chỉ dành cho tài khoản Nhóm trưởng hoặc Giảng viên.");
                return;
            }
            tabGrpBtn.className = "tab-btn active";
            tabIndBtn.className = "tab-btn";
            DOMUtils.toggleVisibility("individualForm", false);
            DOMUtils.toggleVisibility("groupForm", true);
            DOMUtils.hideAlert("validationAlert");
        });
    }

    // ==========================================
    // 4. TÍNH TOÁN REAL-TIME & KIỂM ĐỊNH QC (KHI FORM ĐƯỢC MỞ)
    // ==========================================
    const levelModel = new Level("Máy Thủy Bình");
    const READING_TOLERANCE = 5.0; // Hạn mức biên độ chênh lệch giữa 3 lần đọc mia là 5mm
    
    const indInputIds = ["ind_sau1", "ind_sau2", "ind_sau3"];

    const calculateStationAverage = () => {
        const r1 = DOMUtils.getNumberValue("ind_sau1");
        const r2 = DOMUtils.getNumberValue("ind_sau2");
        const r3 = DOMUtils.getNumberValue("ind_sau3");

        if (!isNaN(r1) && !isNaN(r2) && !isNaN(r3)) {
            // Khởi tạo thực thể kiểm định trắc địa
            const measurement = new Measurement("Đọc số Mia thô", r1, r2, r3, READING_TOLERANCE);
            const qcResult = measurement.validateQC();

            if (qcResult.passed) {
                // Đổi trị trung bình từ milimet (mm) sang mét (m) để ghi sổ hoàn công
                const avg_m = measurement.getAverage() / 1000;
                DOMUtils.setText("ind_h_avg", `${MathUtils.round(avg_m, 3).toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("ind_h_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                DOMUtils.showAlert("validationAlert", `🚨 BIÊN ĐỘ SAI SỐ: Hiệu số giữa lần đọc lớn nhất và nhỏ nhất (${qcResult.diff}mm) vượt quá dung sai cho phép ($\\le 5mm$). Sinh viên phải bắt mục tiêu và đọc lại!`, "danger");
            }
        } else {
            DOMUtils.setText("ind_h_avg", "0.000 m", "text-muted");
        }
    };

    indInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateStationAverage);
    });

    // ==========================================
    // 5. XỬ LÝ SỰ KIỆN SUBMIT FORM LƯU DỮ LIỆU
    // ==========================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", async (e) => {
            e.preventDefault();

            const r1 = DOMUtils.getNumberValue("ind_sau1");
            const r2 = DOMUtils.getNumberValue("ind_sau2");
            const r3 = DOMUtils.getNumberValue("ind_sau3");

            if (isNaN(r1) || !r1 || isNaN(r2) || isNaN(r3)) {
                DOMUtils.showAlert("validationAlert", "Lỗi: Vui lòng nhập đầy đủ trị số của cả 3 lần đọc nghiệm thu trước khi nộp bài.", "danger");
                return;
            }

            const checkQcBeforeSave = new Measurement("Đọc mia", r1, r2, r3, READING_TOLERANCE).validateQC();
            if (!checkQcBeforeSave.passed) {
                DOMUtils.showAlert("validationAlert", "Hệ thống từ chối ghi nhận: Số liệu của bạn đang bị lỗi vượt dung sai kỹ thuật hiện trường!", "danger");
                return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "⌛ ĐANG ĐỒNG BỘ LÊN CƠ SỞ DỮ LIỆU KHOA...";
            btn.disabled = true;

            // Đóng gói Payload theo thiết kế database xử lý chuỗi
            const payload = {
                session_name: CURRENT_SESSION_NUM,
                submit_type: "Cá nhân",
                student_id: session.profile.mssv_id,
                student_name: session.profile.full_name,
                group_id: session.profile.group_id,
                machine_type: "Máy Thủy Bình KHTN",
                target_name: "Mia thực nghiệm trạm đơn",
                result_avg: { r1: r1, r2: r2, r3: r3, average: (r1 + r2 + r3) / 3 },
                qc_evaluation: `ĐẠT CHUẨN (Biên độ lệch: ${checkQcBeforeSave.diff}mm)`,
                r1_data: { reading: r1 },
                r2_data: { reading: r2 },
                r3_data: { reading: r3 },
                student_comment: document.getElementById("student_comment")?.value || ""
            };

            const response = await APIConnector.post("SAVE_DATA", payload);
            if (response && response.status === "success") {
                alert("✅ HOÀN THÀNH: Số liệu đo đạc Buổi 1 đã được khóa cứng trên máy chủ Google Sheets thành công!");
                executeFormLockdown(session.profile.mssv_id); // Đưa form về trạng thái đóng băng lập tức
            } else {
                alert(`🚨 LỖI: ${response.message}`);
                btn.innerHTML = "NỘP BÁO CÁO CÁ NHÂN";
                btn.disabled = false;
            }
        });
    }
});

/**
 * Hàm điều khiển kịch bản đóng băng giao diện (Lockdown) khi đã có số liệu hoàn công
 */
function executeFormLockdown(mssvId) {
    // 1. Phát thông báo cảnh báo màu cam (Warning)
    DOMUtils.showAlert("validationAlert", `⚠️ HỆ THỐNG KHÓA SỔ: Tài khoản [${mssvId}] đã hoàn tất nghĩa vụ nộp số liệu ngoại nghiệp cho Buổi 1. Bạn không thể thay đổi dữ liệu đã lưu trữ trên đám mây.`, "warning");

    // 2. Vô hiệu hóa (Disable) toàn bộ hệ thống tương tác nhập liệu
    document.querySelectorAll("input, textarea, select").forEach(el => {
        el.disabled = true;
        el.style.backgroundColor = "#f1f5f9"; // Đổi nền xám chỉ đọc
    });

    const btnSubmitInd = document.getElementById("btnSubmitIndividual");
    if (btnSubmitInd) {
        btnSubmitInd.disabled = true;
        btnSubmitInd.innerHTML = "🔒 SỐ LIỆU ĐÃ ĐƯỢC KHÓA";
        btnSubmitInd.className = "btn btn-secondary cursor-not-allowed";
    }

    // 3. DÙNG DOM CẮT BƠM ĐỘNG NÚT "XUẤT PHIẾU BÁO CÁO PDF" XUẤT HIỆN Ở DƯỚI GÓC TRÁI FORM
    const formContainer = document.querySelector(".layout-form-container");
    if (formContainer && !document.getElementById("btnDynamicExportReport")) {
        const btnExport = document.createElement("a");
        btnExport.id = "btnDynamicExportReport";
        // Truyền tham số cấu trúc: report-template.html?session=1&mssv=24270025
        btnExport.href = `report-template.html?session=1&mssv=${mssvId}`;
        btnExport.className = "btn btn-secondary";
        btnExport.style.marginTop = "25px";
        btnExport.style.display = "inline-block";
        btnExport.style.backgroundColor = "#475569";
        btnExport.style.color = "#ffffff";
        btnExport.style.textDecoration = "none";
        btnExport.style.fontWeight = "bold";
        btnExport.innerHTML = "📄 XUẤT PHIẾU BÁO CÁO THỰC TẬP BUỔI 1 (PDF)";
        
        // Thêm nút vào đáy của khung biểu mẫu
        formContainer.appendChild(btnExport);
    }
}
