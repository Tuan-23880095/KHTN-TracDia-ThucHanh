/**
 * ==========================================================================
 * FILE: js/controllers/sessionCtrl.js
 * MỤC ĐÍCH: Bộ điều khiển (Controller) xử lý nghiệp vụ cho Buổi 1
 * CHỨC NĂNG:
 * 1. Phân quyền và hiển thị thông tin sinh viên/nhóm.
 * 2. Xử lý chuyển đổi Tab (Cá nhân / Nhóm).
 * 3. Bắt sự kiện gõ phím (Real-time), gọi Model tính toán và render ra View.
 * 4. Kiểm tra Validation (QC) trước khi cho phép Submit form.
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // BƯỚC 1: BẢO VỆ TRANG & HIỂN THỊ THÔNG TIN PHIÊN
    // ==========================================
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    
    if (session && session.profile) {
        DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
        DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");
    }

    // Thiết lập tính năng xem trước ảnh minh chứng (Sử dụng hàm dùng chung từ DOMUtils)
    DOMUtils.setupImagePreview("indSelfieFile", "indSelfiePreview");
    DOMUtils.setupImagePreview("indInstFile", "indInstPreview");
    DOMUtils.setupImagePreview("grpPhotoFile", "grpPhotoPreview");


    // ==========================================
    // BƯỚC 2: LOGIC CHUYỂN TAB (CÁ NHÂN / NHÓM)
    // ==========================================
    const tabIndBtn = document.getElementById("tabIndividualBtn");
    const tabGrpBtn = document.getElementById("tabGroupBtn");
    const formInd = document.getElementById("individualForm");
    const formGrp = document.getElementById("groupForm");

    if (tabIndBtn && tabGrpBtn) {
        tabIndBtn.addEventListener("click", () => {
            tabIndBtn.classList.add("active");
            tabGrpBtn.classList.remove("active");
            DOMUtils.toggleVisibility("individualForm", true);
            DOMUtils.toggleVisibility("groupForm", false);
            DOMUtils.hideAlert("validationAlert"); // Ẩn thông báo lỗi cũ
        });

        tabGrpBtn.addEventListener("click", () => {
            // Ràng buộc: Chỉ Nhóm trưởng hoặc Giảng viên mới được thao tác Tab này
            if (session.profile.role !== "leader" && session.profile.role !== "teacher") {
                alert("⛔ Trình điều khiển báo cáo Nhóm chỉ dành cho tài khoản Nhóm trưởng (Leader)!");
                return;
            }
            tabGrpBtn.classList.add("active");
            tabIndBtn.classList.remove("active");
            DOMUtils.toggleVisibility("individualForm", false);
            DOMUtils.toggleVisibility("groupForm", true);
            DOMUtils.hideAlert("validationAlert");
        });
    }


    // ==========================================
    // BƯỚC 3: TÍNH TOÁN REAL-TIME CHO FORM CÁ NHÂN (ĐỌC MIA 3 LẦN)
    // ==========================================
    // Lắng nghe sự kiện "input" trên cả 3 ô nhập liệu của phần cá nhân
    const indInputs = ["ind_r1", "ind_r2", "ind_r3"].map(id => document.getElementById(id));
    
    indInputs.forEach(input => {
        if (!input) return;
        input.addEventListener("input", () => {
            // 1. Lấy dữ liệu từ View
            const r1 = DOMUtils.getNumberValue("ind_r1");
            const r2 = DOMUtils.getNumberValue("ind_r2");
            const r3 = DOMUtils.getNumberValue("ind_r3");

            // 2. Khởi tạo đối tượng Model (Class Measurement - Chống chế số)
            // Cài đặt sai số cho phép là 3mm (theo Bareme trắc địa)
            const readingData = new Measurement("Số đọc mia", r1, r2, r3, 3.0);

            // Nếu sinh viên chưa nhập đủ 3 lần, chỉ hiển thị "Đang tính..."
            if (!readingData.isComplete()) {
                DOMUtils.setText("ind_avg_display", "--- m", "text-muted");
                DOMUtils.setText("ind_qc_badge", `<span class="flat-badge text-light">Đang nhập...</span>`);
                DOMUtils.hideAlert("validationAlert");
                return;
            }

            // 3. Nếu nhập đủ, gọi Model tính trung bình và làm tròn sang mét (m)
            const avgMm = readingData.getAverage();
            const avgMeter = MathUtils.round(avgMm / 1000, 3);
            DOMUtils.setText("ind_avg_display", `${avgMeter.toFixed(3)} m`, "text-primary font-bold");

            // 4. Kiểm tra QC Anti-Cheat
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


    // ==========================================
    // BƯỚC 4: TÍNH TOÁN REAL-TIME CHO FORM NHÓM (KHOẢNG CÁCH LƯỢNG CỰ)
    // ==========================================
    // Lắng nghe sự kiện trên các ô nhập chỉ trên/chỉ dưới của 3 vòng đo
    const grpInputs = [
        "grp_ct1", "grp_cd1", 
        "grp_ct2", "grp_cd2", 
        "grp_ct3", "grp_cd3"
    ].map(id => document.getElementById(id));

    // Khởi tạo đối tượng Máy Kinh Vĩ (K=100) để tính khoảng cách
    const theodoliteModel = new Theodolite();

    grpInputs.forEach(input => {
        if (!input) return;
        input.addEventListener("input", () => {
            let distances = [];

            // Vòng lặp tính Khoảng cách D cho từng vòng đo
            for (let i = 1; i <= 3; i++) {
                const cT = DOMUtils.getNumberValue(`grp_ct${i}`);
                const cD = DOMUtils.getNumberValue(`grp_cd${i}`);
                
                // Trắc địa: Nếu chỉ trên nhỏ hơn chỉ dưới -> Lỗi đọc mia
                if (cT > 0 && cD > 0 && cT <= cD) {
                    DOMUtils.showAlert("validationAlert", `Lỗi Vòng ${i}: Chỉ trên ($c_T$) phải lớn hơn Chỉ dưới ($c_D$).`, "danger");
                    DOMUtils.setText(`grp_d${i}_display`, "LỖI", "text-danger");
                    continue;
                }

                if (!isNaN(cT) && !isNaN(cD)) {
                    // Gọi hàm tính của Theodolite. V = 0 độ vì Buổi 1 ngắm ngang.
                    const D = theodoliteModel.calculateHorizontalDistance(cT, cD, 0);
                    distances.push(D);
                    DOMUtils.setText(`grp_d${i}_display`, `${D.toFixed(3)} m`, "text-primary");
                } else {
                    DOMUtils.setText(`grp_d${i}_display`, "0.000 m", "text-muted");
                }
            }

            // Tính trung bình toàn tuyến nếu đủ 3 vòng (Sử dụng Model Measurement)
            if (distances.length === 3) {
                // Sai số đo chiều dài quang học cho phép lệch khá lớn (VD: 0.2m)
                const distanceData = new Measurement("Khoảng cách D", distances[0], distances[1], distances[2], 0.2);
                
                if (distanceData.validateQC().passed) {
                    DOMUtils.setText("grp_d_avg", `${distanceData.getAverage().toFixed(3)} m`, "text-success font-bold");
                    DOMUtils.hideAlert("validationAlert");
                } else {
                    DOMUtils.setText("grp_d_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                    DOMUtils.showAlert("validationAlert", distanceData.validateQC().message, "danger");
                }
            }
        });
    });


    // ==========================================
    // BƯỚC 5: XỬ LÝ SỰ KIỆN SUBMIT (LƯU VỀ GOOGLE SHEETS)
    // ==========================================
    if (formInd) {
        formInd.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            // Re-validate trước khi nộp
            const r1 = DOMUtils.getNumberValue("ind_r1");
            const r2 = DOMUtils.getNumberValue("ind_r2");
            const r3 = DOMUtils.getNumberValue("ind_r3");
            const qcCheck = new Measurement("Số đọc mia", r1, r2, r3, 3.0).validateQC();
            
            if (!qcCheck.passed) {
                DOMUtils.showAlert("validationAlert", "Không thể nộp bài! Số liệu của bạn chưa vượt qua kiểm định QC.", "danger");
                return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "ĐANG XỬ LÝ LƯU TRỮ...";
            btn.disabled = true;

            // TODO: Ở bước thực tế, bạn sẽ dùng FileReader chuyển đổi File Ảnh sang Base64
            // và gọi APIConnector.post("SAVE_DATA", payload) như đã thiết kế ở file backend-gas.
            
            setTimeout(() => {
                alert("Nộp báo cáo cá nhân thành công! Dữ liệu đã ghi nhận vào Google Sheets.");
                btn.innerHTML = "NỘP BÁO CÁO CÁ NHÂN";
                btn.disabled = false;
                window.location.href = "../dashboard.html";
            }, 1000); // Giả lập mạng
        });
    }
});
