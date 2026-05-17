/**
 * ==========================================================================
 * FILE: js/controllers/session6Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 6 (Đo Chênh Cao & Kiểm Định Góc i)
 * KIẾN TRÚC: MVC - Lắng nghe sự kiện đọc mia, xử lý chênh cao và góc i qua Model
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. KIỂM TRA BẢO MẬT & TẢI HỒ SƠ TÀI KHOẢN
    // ==========================================
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    
    if (session && session.profile) {
        DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
        DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");
    }

    // Thiết lập tính năng xem trước ảnh minh chứng
    DOMUtils.setupImagePreview("indSelfieFile", "indSelfiePreview");
    DOMUtils.setupImagePreview("indInstFile", "indInstPreview");
    DOMUtils.setupImagePreview("grpPhotoFile", "grpPhotoPreview");


    // ==========================================
    // 2. LOGIC ĐIỀU HƯỚNG CHUYỂN TAB VAI TRÒ
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
            if (!UserAuth.hasAccess("leader")) {
                alert("⛔ Truy cập bị từ chối! Khu vực này chỉ dành cho Ban cán sự nhóm hoặc Giảng viên.");
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
    // 3. KHỞI TẠO LỚP TOÁN HỌC TRẮC ĐỊA
    // ==========================================
    const levelModel = new Level("Trạm Thủy Bình"); // Gọi thực thể máy Thủy Bình
    const ELEVATION_TOLERANCE = 3.0; // Sai số cho phép giữa các lần đo chênh cao là 3mm


    // ==========================================
    // 4. TÍNH TOÁN REAL-TIME: PHẦN CÁ NHÂN (CHÊNH CAO 3 LẦN ĐO)
    // ==========================================
    const indInputIds = [];
    for (let i = 1; i <= 3; i++) {
        indInputIds.push(`ind_a${i}`, `ind_b${i}`); // a: Mia Sau, b: Mia Trước
    }

    const calculateIndividualElevation = () => {
        let h_values = [];

        for (let i = 1; i <= 3; i++) {
            const a = DOMUtils.getNumberValue(`ind_a${i}`); // Mia Sau (mm)
            const b = DOMUtils.getNumberValue(`ind_b${i}`); // Mia Trước (mm)

            if (!isNaN(a) && !isNaN(b)) {
                // h = Sau - Trước
                const h_mm = levelModel.calculateSingleElevation(a, b);
                h_values.push(h_mm);
                
                // Hiển thị chênh cao từng lần đo (Giữ nguyên đơn vị mm để SV dễ đối chiếu)
                DOMUtils.setText(`ind_h${i}_display`, `${MathUtils.round(h_mm, 1)} mm`, "text-primary");
            } else {
                DOMUtils.setText(`ind_h${i}_display`, "0 mm", "text-muted");
            }
        }

        // ĐÁNH GIÁ QC VÀ TÍNH TRUNG BÌNH KHI ĐỦ 3 LẦN ĐO
        if (h_values.length === 3) {
            // Khởi tạo đối tượng Measurement để chạy bộ lọc Anti-Cheat biên độ 3mm
            const hMeasurement = new Measurement("Chênh cao trạm", h_values[0], h_values[1], h_values[2], ELEVATION_TOLERANCE);
            const qcResult = hMeasurement.validateQC();

            if (qcResult.passed) {
                // Chuyển kết quả trung bình sang mét (m)
                const avg_m = hMeasurement.getAverage() / 1000;
                DOMUtils.setText("ind_h_avg", `${MathUtils.round(avg_m, 3).toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("ind_h_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                DOMUtils.showAlert("validationAlert", qcResult.message, "danger");
            }
        } else {
            DOMUtils.setText("ind_h_avg", `0.000 m`, "text-danger");
        }
    };

    indInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateIndividualElevation);
    });


    // ==========================================
    // 5. TÍNH TOÁN REAL-TIME: PHẦN NHÓM (KIỂM ĐỊNH SAI SỐ GÓC i)
    // ==========================================
    const grpInputIds = [
        "grp_a1", "grp_b1", // Trạm 1 (Giữa)
        "grp_b2", "grp_a2", "grpDistD" // Trạm 2 (Lệch tâm)
    ];

    const calculateAngleI = () => {
        const a1 = DOMUtils.getNumberValue("grp_a1");
        const b1 = DOMUtils.getNumberValue("grp_b1");
        const b2 = DOMUtils.getNumberValue("grp_b2");
        const a2 = DOMUtils.getNumberValue("grp_a2");
        const distD = DOMUtils.getNumberValue("grpDistD");

        let h0_correct = NaN;

        // BƯỚC 1: Xử lý Trạm 1 (Tính chênh cao đúng h0)
        if (!isNaN(a1) && !isNaN(b1)) {
            h0_correct = levelModel.calculateSingleElevation(a1, b1);
            DOMUtils.setText("grp_h0_val", `${MathUtils.round(h0_correct, 1)} mm`, "text-primary");
        } else {
            DOMUtils.setText("grp_h0_val", "0 mm", "text-muted");
        }

        // BƯỚC 2: Xử lý Trạm 2 và Giải bài toán góc i
        if (!isNaN(h0_correct) && !isNaN(b2) && !isNaN(a2) && !isNaN(distD) && distD > 0) {
            
            // Tính số đọc lý thuyết trên mia xa A (a2_LT = b2 + h0)
            const a2_theory = b2 + h0_correct;
            DOMUtils.setText("grp_a2_theory", `${MathUtils.round(a2_theory, 1)} mm`, "text-primary");

            // Đưa dữ liệu vào Level Model để tính toán và đánh giá
            const station1 = { sau_A: a1, truoc_B: b1 };
            const station2 = { xa_A: a2, gan_B: b2 };
            
            const iResult = levelModel.checkAngleI(station1, station2, distD);

            // Cập nhật giao diện phân tích tự động
            DOMUtils.setText("grp_x_val", `${iResult.linearErrorMm} mm`, iResult.passed ? "text-success" : "text-danger");
            DOMUtils.setText("grp_i_val", `${iResult.angleISeconds}"`, iResult.passed ? "text-success" : "text-danger");
            DOMUtils.setText("grp_eval_msg", iResult.message, iResult.passed ? "text-success font-bold" : "text-danger font-bold");

            // Hiển thị Alert Box nếu máy bị lỗi nặng
            if (!iResult.passed) {
                DOMUtils.showAlert("validationAlert", `🚨 KIỂM ĐỊNH THẤT BẠI: ${iResult.message}`, "danger");
            } else {
                DOMUtils.hideAlert("validationAlert");
            }

        } else {
            DOMUtils.setText("grp_a2_theory", "--- mm", "text-muted");
            DOMUtils.setText("grp_x_val", "0.0 mm", "text-dark");
            DOMUtils.setText("grp_i_val", `0.0"`, "text-primary");
            DOMUtils.setText("grp_eval_msg", "Vui lòng nhập đủ số liệu hai trạm để hệ thống chạy hàm hậu kiểm QC.", "text-muted font-italic");
        }
    };

    grpInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateAngleI);
    });


    // ==========================================
    // 6. XỬ LÝ SỰ KIỆN NỘP BÀI (SUBMIT FORM)
    // ==========================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Khởi tạo lại một đối tượng để bắt QC trước khi nộp
            const h1 = levelModel.calculateSingleElevation(DOMUtils.getNumberValue("ind_a1"), DOMUtils.getNumberValue("ind_b1"));
            const h2 = levelModel.calculateSingleElevation(DOMUtils.getNumberValue("ind_a2"), DOMUtils.getNumberValue("ind_b2"));
            const h3 = levelModel.calculateSingleElevation(DOMUtils.getNumberValue("ind_a3"), DOMUtils.getNumberValue("ind_b3"));
            
            const qcCheck = new Measurement("Chênh cao", h1, h2, h3, ELEVATION_TOLERANCE).validateQC();
            
            if (!qcCheck.passed) {
                DOMUtils.showAlert("validationAlert", "Lỗi: Số liệu đọc mia của bạn có độ lệch vượt $3mm$. Hãy đo lại cẩn thận trước khi nộp!", "danger");
                return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "ĐANG ĐỒNG BỘ DỮ LIỆU...";
            btn.disabled = true;

            setTimeout(() => {
                alert("Nộp dữ liệu thành công! Thao tác đo cao hình học của bạn đã được ghi nhận.");
                window.location.href = "../dashboard.html";
            }, 1000);
        });
    }
});
