/**
 * ==========================================================================
 * FILE: js/controllers/session5Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 5 (Đo dài bằng chỉ lượng cự)
 * KIẾN TRÚC: MVC - Xử lý động ma trận Lượng cự kép (mm) và Góc đứng (DMS)
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
    const theodolite = new Theodolite(); // Lớp chuyên xử lý Lượng cự và Góc
    
    // Hàm phụ trợ kiểm tra cụm DMS
    const isDmsComplete = (dmsObj) => {
        return !isNaN(dmsObj.d) && !isNaN(dmsObj.m) && !isNaN(dmsObj.s);
    };

    // Dung sai cho phép lệch giữa 3 lần đo dài bằng quang học (thường cho phép lệch khá lớn, VD: 0.15m)
    const DISTANCE_TOLERANCE = 0.15; 


    // ==========================================
    // 4. TÍNH TOÁN REAL-TIME: PHẦN CÁ NHÂN
    // ==========================================
    // Gom tất cả ID input cá nhân vào mảng để gắn sự kiện
    const indInputIds = [];
    for (let i = 1; i <= 3; i++) {
        indInputIds.push(`ind_ct${i}`, `ind_cd${i}`, `ind_v${i}_d`, `ind_v${i}_m`, `ind_v${i}_s`);
    }

    const calculateIndividualDistance = () => {
        let distances = [];

        for (let i = 1; i <= 3; i++) {
            const cT = DOMUtils.getNumberValue(`ind_ct${i}`);
            const cD = DOMUtils.getNumberValue(`ind_cd${i}`);
            const v_dms = DOMUtils.getDmsValues(`ind_v${i}_d`, `ind_v${i}_m`, `ind_v${i}_s`);

            // Ràng buộc vật lý trắc địa: Chỉ trên phải nằm cao hơn chỉ dưới
            if (cT > 0 && cD > 0 && cT <= cD) {
                DOMUtils.showAlert("validationAlert", `🚨 Lỗi Lần ${i}: Trị số Chỉ trên ($c_T$) bắt buộc phải lớn hơn Chỉ dưới ($c_D$).`, "danger");
                DOMUtils.setText(`ind_d${i}_display`, "LỖI", "text-danger");
                continue;
            }

            if (!isNaN(cT) && !isNaN(cD) && isDmsComplete(v_dms)) {
                // Đổi DMS sang Độ thập phân
                const v_deg = MathUtils.dmsToDecimal(v_dms.d, v_dms.m, v_dms.s);
                // Gọi Model tính khoảng cách D = K * n * cos^2(V)
                const D = theodolite.calculateHorizontalDistance(cT, cD, v_deg);
                
                distances.push(D);
                DOMUtils.setText(`ind_d${i}_display`, `${D.toFixed(3)} m`, "text-primary");
            } else {
                DOMUtils.setText(`ind_d${i}_display`, "0.000 m", "text-muted");
            }
        }

        // TÍNH TRUNG BÌNH & KIỂM ĐỊNH ANTI-CHEAT
        if (distances.length === 3) {
            const distMeasurement = new Measurement("Khoảng cách D", distances[0], distances[1], distances[2], DISTANCE_TOLERANCE);
            const qcResult = distMeasurement.validateQC();

            if (qcResult.passed) {
                DOMUtils.setText("ind_d_avg", `${distMeasurement.getAverage().toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("ind_d_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                DOMUtils.showAlert("validationAlert", `🚨 KIỂM ĐỊNH LỖI: Độ lệch khoảng cách giữa 3 lần đọc mia quá lớn. (Hạn mức $\\le ${DISTANCE_TOLERANCE}m$). Cần đọc lại mia!`, "danger");
            }
        } else {
            DOMUtils.setText("ind_d_avg", `0.000 m`, "text-danger");
        }
    };

    indInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateIndividualDistance);
    });


    // ==========================================
    // 5. TÍNH TOÁN REAL-TIME: PHẦN NHÓM
    // ==========================================
    const grpInputIds = [];
    for (let i = 1; i <= 3; i++) {
        grpInputIds.push(`grp_ct${i}`, `grp_cd${i}`, `grp_v${i}_d`, `grp_v${i}_m`, `grp_v${i}_s`);
    }

    const calculateGroupDistance = () => {
        let distances = [];

        for (let i = 1; i <= 3; i++) {
            const cT = DOMUtils.getNumberValue(`grp_ct${i}`);
            const cD = DOMUtils.getNumberValue(`grp_cd${i}`);
            const v_dms = DOMUtils.getDmsValues(`grp_v${i}_d`, `grp_v${i}_m`, `grp_v${i}_s`);

            if (cT > 0 && cD > 0 && cT <= cD) {
                DOMUtils.showAlert("validationAlert", `🚨 Lỗi Vòng ${i}: Trị số Chỉ trên ($c_T$) phải lớn hơn Chỉ dưới ($c_D$).`, "danger");
                DOMUtils.setText(`grp_d${i}_display`, "LỖI", "text-danger");
                continue;
            }

            if (!isNaN(cT) && !isNaN(cD) && isDmsComplete(v_dms)) {
                const v_deg = MathUtils.dmsToDecimal(v_dms.d, v_dms.m, v_dms.s);
                const D = theodolite.calculateHorizontalDistance(cT, cD, v_deg);
                
                distances.push(D);
                DOMUtils.setText(`grp_d${i}_display`, `${D.toFixed(3)} m`, "text-primary");
            } else {
                DOMUtils.setText(`grp_d${i}_display`, "0.000 m", "text-muted");
            }
        }

        if (distances.length === 3) {
            const distMeasurement = new Measurement("Khoảng cách Tuyến", distances[0], distances[1], distances[2], DISTANCE_TOLERANCE);
            const qcResult = distMeasurement.validateQC();

            if (qcResult.passed) {
                DOMUtils.setText("grp_d_avg", `${distMeasurement.getAverage().toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("grp_d_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                DOMUtils.showAlert("validationAlert", `🚨 KẾT QUẢ KHÔNG ĐẠT: ${qcResult.message}`, "danger");
            }
        } else {
            DOMUtils.setText("grp_d_avg", `0.000 m`, "text-danger");
        }
    };

    grpInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateGroupDistance);
    });


    // ==========================================
    // 6. XỬ LÝ SỰ KIỆN NỘP BÀI (SUBMIT)
    // ==========================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "ĐANG ĐỒNG BỘ DỮ LIỆU...";
            btn.disabled = true;

            setTimeout(() => {
                alert("Nộp dữ liệu thành công! Kỹ năng đo dài lượng cự của bạn đã được ghi nhận.");
                window.location.href = "../dashboard.html";
            }, 1000);
        });
    }
});
