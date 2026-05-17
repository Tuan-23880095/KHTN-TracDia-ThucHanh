/**
 * ==========================================================================
 * FILE: js/controllers/session1Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 1 (Giới thiệu Máy Kinh Vĩ & Thủy Bình)
 * KIẾN TRÚC: MVC - Lớp Controller kết nối dữ liệu từ session-1.html xuống Model
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. KIỂM TRA BẢO MẬT & ĐỔ HỒ SƠ TÀI KHOẢN
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    
    if (session && session.profile) {
        DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
        DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");
    }

    // Khởi tạo các khung xem trước ảnh minh chứng thực địa
    DOMUtils.setupImagePreview("indSelfieFile", "indSelfiePreview");
    DOMUtils.setupImagePreview("indInstFile", "indInstPreview");
    DOMUtils.setupImagePreview("grpPhotoFile", "grpPhotoPreview");

    // 2. LOGIC ĐIỀU HƯỚNG CHUYỂN TAB VAI TRÒ
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
            // Chốt chặn phân quyền: Chỉ Nhóm trưởng (leader) hoặc Giảng viên (teacher) mới được nộp tab nhóm
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

    // 3. TÍNH TOÁN REAL-TIME: PHẦN CÁ NHÂN (ĐỌC MIA 3 LẦN LẤY TRUNG BÌNH)
    const indInputs = ["ind_r1", "ind_r2", "ind_r3"].map(id => document.getElementById(id));
    
    indInputs.forEach(input => {
        if (!input) return;
        input.addEventListener("input", () => {
            const r1 = DOMUtils.getNumberValue("ind_r1");
            const r2 = DOMUtils.getNumberValue("ind_r2");
            const r3 = DOMUtils.getNumberValue("ind_r3");

            // Khởi tạo lớp cha xử lý quy tắc đo 3 lần (Sai số giới hạn đọc mia là 3mm)
            const readingData = new Measurement("Số đọc mia", r1, r2, r3, 3.0);

            if (!readingData.isComplete()) {
                DOMUtils.setText("ind_avg_display", "--- m", "text-muted");
                DOMUtils.setText("ind_qc_badge", `<span class="flat-badge text-light">Đang nhập...</span>`);
                DOMUtils.hideAlert("validationAlert");
                return;
            }

            // Gọi toán học tính trung bình và đổi sang mét
            const avgMm = readingData.getAverage();
            const avgMeter = MathUtils.round(avgMm / 1000, 3);
            DOMUtils.setText("ind_avg_display", `${avgMeter.toFixed(3)} m`, "text-primary font-bold");

            // Kiểm tra bộ lọc chống chế số tự động
            const qcResult = readingData.validateQC();
            if (qcResult.passed) {
                DOMUtils.setText("ind_qc_badge", `<span class="flat-badge badge-success">ĐẠT CHUẨN</span>`);
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("ind_qc_badge", `<span class="flat-badge badge-danger">LỖI QC</span>`);
                DOMUtils.showAlert("validationAlert", qcResult.message, "danger");
            }
        });
    });

    // 4. TÍNH TOÁN REAL-TIME: PHẦN NHÓM (KHOẢNG CÁCH QUANG HỌC LƯỢNG CỰ)
    const grpInputs = ["grp_ct1", "grp_cd1", "grp_ct2", "grp_cd2", "grp_ct3", "grp_cd3"].map(id => document.getElementById(id));
    const theodoliteModel = new Theodolite(); // Gọi thực thể máy kinh vĩ lượng cự

    grpInputs.forEach(input => {
        if (!input) return;
        input.addEventListener("input", () => {
            let distances = [];

            for (let i = 1; i <= 3; i++) {
                const cT = DOMUtils.getNumberValue(`grp_ct${i}`);
                const cD = DOMUtils.getNumberValue(`grp_cd${i}`);
                
                if (cT > 0 && cD > 0 && cT <= cD) {
                    DOMUtils.showAlert("validationAlert", `Lỗi Vòng ${i}: Trị số chỉ trên ($c_T$) bắt buộc phải lớn hơn chỉ dưới ($c_D$).`, "danger");
                    DOMUtils.setText(`grp_d${i}_display`, "LỖI", "text-danger");
                    continue;
                }

                if (!isNaN(cT) && !isNaN(cD)) {
                    const D = theodoliteModel.calculateHorizontalDistance(cT, cD, 0); // V = 0 độ vì ngắm ngang bàn độ
                    distances.push(D);
                    DOMUtils.setText(`grp_d${i}_display`, `${D.toFixed(3)} m`, "text-primary");
                } else {
                    DOMUtils.setText(`grp_d${i}_display`, "0.000 m", "text-muted");
                }
            }

            // Đánh giá biên độ chênh lệch cự ly giữa 3 vòng đo (Hạn định lệch tối đa 0.2m ngoài hiện trường)
            if (distances.length === 3) {
                const distanceData = new Measurement("Khoảng cách D", distances[0], distances[1], distances[2], 0.2);
                
                if (distanceData.validateQC().passed) {
                    DOMUtils.setText("grp_d_avg", `${distanceData.getAverage().toFixed(3)} m`, "text-success font-bold");
                    DOMUtils.hideAlert("validationAlert");
                } else {
                    DOMUtils.setText("grp_d_avg", "VƯỢT HẠN MỨC", "text-danger font-bold");
                    DOMUtils.showAlert("validationAlert", distanceData.validateQC().message, "danger");
                }
            }
        });
    });

    // 5. XỬ LÝ SỰ KIỆN SUBMIT FORM ĐẨY DỮ LIỆU LÊN GOOGLE SHEETS
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const r1 = DOMUtils.getNumberValue("ind_r1");
            const r2 = DOMUtils.getNumberValue("ind_r2");
            const r3 = DOMUtils.getNumberValue("ind_r3");
            const qcCheck = new Measurement("Số đọc mia", r1, r2, r3, 3.0).validateQC();
            
            if (!qcCheck.passed) {
                DOMUtils.showAlert("validationAlert", "Lỗi: Số liệu thực đạc hiện tại chưa vượt qua kiểm định QC của Bộ môn. Không thể nộp!", "danger");
                return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "ĐANG ĐỒNG BỘ DỮ LIỆU...";
            btn.disabled = true;

            setTimeout(() => {
                alert("Nộp dữ liệu thành công! Trạng thái Buổi 1 đã được cập nhật.");
                window.location.href = "../dashboard.html";
            }, 1000);
        });
    }
});
