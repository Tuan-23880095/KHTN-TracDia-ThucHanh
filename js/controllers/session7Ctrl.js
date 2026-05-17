/**
 * ==========================================================================
 * FILE: js/controllers/session7Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 7 (Dẫn chuyền cao độ tuyến kín)
 * KIẾN TRÚC: MVC - Xử lý tính chênh cao trạm và Auto QC sai số khép toàn tuyến
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. KIỂM TRA BẢO MẬT & ĐỔ HỒ SƠ TÀI KHOẢN
    // ==========================================
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    
    if (session && session.profile) {
        DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
        DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");
    }

    // Thiết lập tính năng xem trước ảnh minh chứng thực địa
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
            if (session.profile.role !== "leader" && session.profile.role !== "teacher") {
                alert("⛔ Trình điều khiển báo cáo Nhóm chỉ dành cho tài khoản Nhóm trưởng!");
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
    const levelModel = new Level("Tuyến Thủy Bình");
    const ELEVATION_TOLERANCE = 3.0; // Hạn mức lệch chênh cao giữa 3 lần đo tại 1 trạm là 3mm


    // ==========================================
    // 4. TÍNH TOÁN REAL-TIME: PHẦN CÁ NHÂN (1 TRẠM TRONG TUYẾN)
    // ==========================================
    const indInputIds = [];
    for (let i = 1; i <= 3; i++) {
        indInputIds.push(`ind_sau${i}`, `ind_truoc${i}`);
    }

    const calculateStationElevation = () => {
        let h_values = [];

        for (let i = 1; i <= 3; i++) {
            const bs = DOMUtils.getNumberValue(`ind_sau${i}`);   // Mia Sau (Backsight)
            const fs = DOMUtils.getNumberValue(`ind_truoc${i}`); // Mia Trước (Foresight)

            if (!isNaN(bs) && !isNaN(fs)) {
                // Tính chênh cao h = Sau - Trước
                const h_mm = levelModel.calculateSingleElevation(bs, fs);
                h_values.push(h_mm);
                
                DOMUtils.setText(`ind_h${i}_display`, `${MathUtils.round(h_mm, 1)} mm`, h_mm < 0 ? "text-danger" : "text-primary");
            } else {
                DOMUtils.setText(`ind_h${i}_display`, "0 mm", "text-muted");
            }
        }

        // ĐÁNH GIÁ QC VÀ TÍNH TRUNG BÌNH KHI ĐỦ 3 LẦN ĐO
        if (h_values.length === 3) {
            const hMeasurement = new Measurement("Chênh cao 1 Trạm", h_values[0], h_values[1], h_values[2], ELEVATION_TOLERANCE);
            const qcResult = hMeasurement.validateQC();

            if (qcResult.passed) {
                // Đổi kết quả trung bình sang mét (m)
                const avg_m = hMeasurement.getAverage() / 1000;
                DOMUtils.setText("ind_h_avg", `${MathUtils.round(avg_m, 3).toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("ind_h_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                DOMUtils.showAlert("validationAlert", `🚨 KIỂM ĐỊNH TRẠM: Độ lệch chênh cao giữa 3 lần đọc vượt quá $\\pm 3mm$. Vui lòng kiểm tra lại bọt thủy và đọc lại!`, "danger");
            }
        } else {
            DOMUtils.setText("ind_h_avg", `0.000 m`, "text-danger");
        }
    };

    indInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateStationElevation);
    });


    // ==========================================
    // 5. TÍNH TOÁN REAL-TIME: PHẦN NHÓM (KIỂM TRA TUYẾN KÍN)
    // ==========================================
    // Lắng nghe sự kiện từ Tổng chiều dài và Tổng chênh cao
    const grpTotalDistInput = document.getElementById("grpTotalDist");
    const grpSumHInput = document.getElementById("grpSumH");
    
    // Theo quy phạm trắc địa, công thức dung sai khép tuyến kỹ thuật thường là:
    // f_cp = ± 50 * sqrt(L_km)  [đơn vị: mm]
    const FCP_COEFFICIENT = 50; 

    const calculateLoopClosure = () => {
        const totalDist_m = DOMUtils.getNumberValue("grpTotalDist"); // \sum D (mét)
        const sumH_mm = DOMUtils.getNumberValue("grpSumH");         // \sum h_đo (mm)

        if (!isNaN(totalDist_m) && totalDist_m > 0 && !isNaN(sumH_mm)) {
            // Bước 1: Đối với tuyến kín xuất phát và khép về cùng 1 mốc, chênh cao lý thuyết \sum h_lt = 0.
            // Do đó, sai số khép thực tế f_h chính bằng tổng chênh cao đo được.
            const fh = sumH_mm;
            
            // Hiển thị f_h với dấu +/- rõ ràng
            const fh_sign = fh > 0 ? "+" : "";
            DOMUtils.setText("grp_fh_display", `${fh_sign}${MathUtils.round(fh, 1)} mm`, "text-danger");

            // Bước 2: Tính sai số khép cho phép f_cp = 50 * sqrt(L) với L tính bằng km
            const L_km = totalDist_m / 1000;
            const fcp = FCP_COEFFICIENT * Math.sqrt(L_km);
            const fcp_rounded = MathUtils.round(fcp, 1);
            
            DOMUtils.setText("grp_fcp_display", `± ${fcp_rounded} mm`, "text-primary");

            // Bước 3: Đánh giá chất lượng tuyến (Auto QC)
            if (Math.abs(fh) <= fcp_rounded) {
                // ĐẠT CHUẨN
                DOMUtils.setText("grp_eval_msg", "✅ ĐẠT CHUẨN ĐƯỜNG CHUYỀN (Được phép về phòng nội nghiệp)", "flat-badge badge-success font-bold");
                DOMUtils.hideAlert("validationAlert");
            } else {
                // VƯỢT SAI SỐ
                DOMUtils.setText("grp_eval_msg", "🚨 VƯỢT SAI SỐ KHÉP (Bắt buộc phải tìm lỗi hoặc đo lại tuyến)", "flat-badge badge-danger font-bold");
                DOMUtils.showAlert("validationAlert", `**BÁO ĐỘNG NGOẠI NGHIỆP:** Sai số khép thực tế ($|f_h| = ${Math.abs(fh)}$ mm) đang lớn hơn dung sai cho phép ($f_{cp} = ${fcp_rounded}$ mm). Lưới đường chuyền bị gãy!`, "danger");
            }

        } else {
            DOMUtils.setText("grp_fh_display", "0 mm", "text-muted");
            DOMUtils.setText("grp_fcp_display", "± 0 mm", "text-muted");
            DOMUtils.setText("grp_eval_msg", "Đang chờ dữ liệu...", "flat-badge text-light");
            DOMUtils.hideAlert("validationAlert");
        }
    };

    if (grpTotalDistInput) grpTotalDistInput.addEventListener("input", calculateLoopClosure);
    if (grpSumHInput) grpSumHInput.addEventListener("input", calculateLoopClosure);


    // ==========================================
    // 6. XỬ LÝ SỰ KIỆN NỘP BÀI (SUBMIT FORM)
    // ==========================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Re-validate dữ liệu của 1 trạm
            const h1 = levelModel.calculateSingleElevation(DOMUtils.getNumberValue("ind_sau1"), DOMUtils.getNumberValue("ind_truoc1"));
            const h2 = levelModel.calculateSingleElevation(DOMUtils.getNumberValue("ind_sau2"), DOMUtils.getNumberValue("ind_truoc2"));
            const h3 = levelModel.calculateSingleElevation(DOMUtils.getNumberValue("ind_sau3"), DOMUtils.getNumberValue("ind_truoc3"));
            
            const qcCheck = new Measurement("Chênh cao", h1, h2, h3, ELEVATION_TOLERANCE).validateQC();
            
            if (!qcCheck.passed) {
                DOMUtils.showAlert("validationAlert", "Lỗi: Số liệu chênh cao 3 lần của bạn lệch quá 3mm. Dữ liệu trạm không đáng tin cậy để nộp!", "danger");
                return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "ĐANG LƯU SỐ LIỆU TRẠM...";
            btn.disabled = true;

            setTimeout(() => {
                alert("Nộp số liệu trạm thành công! Vui lòng báo cáo lại với Nhóm trưởng để tổng hợp toàn tuyến.");
                window.location.href = "../dashboard.html";
            }, 1000);
        });
    }
});
