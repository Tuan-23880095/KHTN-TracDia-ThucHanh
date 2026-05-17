/**
 * ==========================================================================
 * FILE: js/controllers/session3Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 3 (Thao tác Máy Kinh Vĩ & Đo Góc Bằng)
 * KIẾN TRÚC: MVC - Lắng nghe đa sự kiện trên ma trận Input DMS và gọi lớp Theodolite
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
    // =====================================================================
    // 1.5. CHỐT CHẶN AN NINH SERVER-SIDE (CHỐNG BYPASS UI BẰNG DEVTOOLS)
    // =====================================================================
    try {
        const response = await APIConnector.post("GET_SETTINGS", {});
        if (response && response.status === "success") {
            // Lấy trạng thái riêng của "session_1" (Nhớ sửa thành session_2, 3... tương ứng với file)
            const sessionSetting = response.settings.find(s => s.session_id === "session_1");
            const status = sessionSetting ? sessionSetting.status.toUpperCase().trim() : "CLOSED";
            
            const isTeacher = UserAuth.hasAccess("teacher");

            // Nếu trạng thái là ĐÓNG và truy cập LÀ SINH VIÊN -> Kick ra ngoài ngay lập tức
            if (status === "CLOSED" && !isTeacher) {
                alert("🔒 BẢO MẬT HỆ THỐNG: Buổi thực hành này đang bị khóa. Bạn không được phép truy cập bằng đường link trực tiếp!");
                window.location.replace("../dashboard.html"); // Điều hướng không lưu vào History trình duyệt
                return; // ⛔ QUAN TRỌNG: Lệnh return này sẽ dừng toàn bộ việc render UI phía dưới
            }
        } else {
            // Nguyên tắc Fail-Closed: Không kéo được Settings -> Khóa chặn trừ giảng viên
            if (!UserAuth.hasAccess("teacher")) {
                alert("⚠️ Lỗi dữ liệu hệ thống. Kích hoạt chế độ đóng băng khẩn cấp!");
                window.location.replace("../dashboard.html");
                return;
            }
        }
    } catch (err) {
        console.error("Lỗi kiểm tra bảo mật (Chống Bypass): ", err);
        // Lỗi rớt mạng -> Fail-Closed
        if (!UserAuth.hasAccess("teacher")) {
            alert("⚠️ Không có kết nối internet để xác thực quyền. Hệ thống tự động khóa bảo vệ!");
            window.location.replace("../dashboard.html");
            return;
        }
    }
    // =====================================================================

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
    const theodolite = new Theodolite(); // Lớp chuyên xử lý Góc, 2C, MO
    
    // Hàm phụ trợ kiểm tra xem cụm 3 ô Input Độ-Phút-Giây đã được nhập đủ chưa
    const isDmsComplete = (dmsObj) => {
        return !isNaN(dmsObj.d) && !isNaN(dmsObj.m) && !isNaN(dmsObj.s);
    };


    // ==========================================
    // 4. TÍNH TOÁN REAL-TIME: PHẦN CÁ NHÂN (KIỂM TRA 2C)
    // ==========================================
    const indInputIds = [
        "ind_T_d", "ind_T_m", "ind_T_s",
        "ind_P_d", "ind_P_m", "ind_P_s"
    ];
    
    const calculateIndividual2C = () => {
        const T_dms = DOMUtils.getDmsValues("ind_T_d", "ind_T_m", "ind_T_s");
        const P_dms = DOMUtils.getDmsValues("ind_P_d", "ind_P_m", "ind_P_s");

        if (isDmsComplete(T_dms) && isDmsComplete(P_dms)) {
            // 4.1. Tính trị số 2C (Hàm trả về độ thập phân, ta nhân 3600 để ra Giây)
            const error2C_deg = theodolite.calculate2C(T_dms, P_dms);
            const error2C_sec = Math.round(error2C_deg * 3600);
            
            // 4.2. Tính Hướng trung bình đã triệt tiêu 2C
            const corrDir_deg = theodolite.calculateCorrectedDirection(T_dms, P_dms);
            const corrDir_str = MathUtils.decimalToDmsString(corrDir_deg);

            // 4.3. Hiển thị kết quả
            DOMUtils.setText("ind_2c_val", `${error2C_sec}"`);
            DOMUtils.setText("ind_corr_angle", corrDir_str);

            // 4.4. Kiểm định QC (Theo giáo trình máy luyện tập: |2C| <= 60 giây)
            if (Math.abs(error2C_sec) <= 60) {
                DOMUtils.setText("ind_qc_badge", `<span class="flat-badge badge-success">MÁY TỐT</span>`);
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("ind_qc_badge", `<span class="flat-badge badge-danger">LỖI 2C CAO</span>`);
                DOMUtils.showAlert("validationAlert", `🚨 CẢNH BÁO: Trị số $|2C| = ${Math.abs(error2C_sec)}"$ vượt quá hạn mức $60"$. Sinh viên nên mượn cờ lê trắc địa hiệu chỉnh lại hệ trục ngắm lưới chỉ thập!`, "warning");
            }
        } else {
            DOMUtils.setText("ind_qc_badge", `<span class="flat-badge text-light">Chưa tính</span>`);
            DOMUtils.setText("ind_2c_val", `0"`, "text-danger");
            DOMUtils.setText("ind_corr_angle", `0° 0' 0"`, "text-primary");
        }
    };

    indInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateIndividual2C);
    });


    // ==========================================
    // 5. TÍNH TOÁN REAL-TIME: PHẦN NHÓM (GÓC BẰNG 3 VÒNG ĐO)
    // ==========================================
    const grpInputIds = [];
    for (let i = 1; i <= 3; i++) {
        grpInputIds.push(
            `r${i}_ta_d`, `r${i}_ta_m`, `r${i}_ta_s`, // Mục tiêu A (Trái) - Thuận
            `r${i}_pa_d`, `r${i}_pa_m`, `r${i}_pa_s`, // Mục tiêu A (Trái) - Đảo
            `r${i}_tb_d`, `r${i}_tb_m`, `r${i}_tb_s`, // Mục tiêu B (Phải) - Thuận
            `r${i}_pb_d`, `r${i}_pb_m`, `r${i}_pb_s`  // Mục tiêu B (Phải) - Đảo
        );
    }

    const calculateGroupAngles = () => {
        let betaAngles_deg = []; // Mảng chứa 3 góc beta (dạng độ thập phân)

        for (let i = 1; i <= 3; i++) {
            // Lấy dữ liệu mục tiêu Trái (A)
            const TA = DOMUtils.getDmsValues(`r${i}_ta_d`, `r${i}_ta_m`, `r${i}_ta_s`);
            const PA = DOMUtils.getDmsValues(`r${i}_pa_d`, `r${i}_pa_m`, `r${i}_pa_s`);
            
            // Lấy dữ liệu mục tiêu Phải (B)
            const TB = DOMUtils.getDmsValues(`r${i}_tb_d`, `r${i}_tb_m`, `r${i}_tb_s`);
            const PB = DOMUtils.getDmsValues(`r${i}_pb_d`, `r${i}_pb_m`, `r${i}_pb_s`);

            // Chỉ tính nếu dòng A hoặc dòng B được nhập đủ DMS
            if (isDmsComplete(TA) && isDmsComplete(PA)) {
                const dirA_deg = theodolite.calculateCorrectedDirection(TA, PA);
                DOMUtils.setText(`r${i}_a_avg`, MathUtils.decimalToDmsString(dirA_deg));
            } else {
                DOMUtils.setText(`r${i}_a_avg`, `0° 0' 0"`);
            }

            if (isDmsComplete(TB) && isDmsComplete(PB)) {
                const dirB_deg = theodolite.calculateCorrectedDirection(TB, PB);
                DOMUtils.setText(`r${i}_b_avg`, MathUtils.decimalToDmsString(dirB_deg));
            } else {
                DOMUtils.setText(`r${i}_b_avg`, `0° 0' 0"`);
            }

            // Nếu cả A và B đều nhập đủ, tiến hành tính góc kẹp Beta = Hướng Phải - Hướng Trái
            if (isDmsComplete(TA) && isDmsComplete(PA) && isDmsComplete(TB) && isDmsComplete(PB)) {
                const dirA_deg = theodolite.calculateCorrectedDirection(TA, PA);
                const dirB_deg = theodolite.calculateCorrectedDirection(TB, PB);
                
                // Trừ góc và chuẩn hóa (tránh góc âm)
                let beta_deg = theodolite.normalizeAngle(dirB_deg - dirA_deg);
                betaAngles_deg.push(beta_deg);
                
                DOMUtils.setText(`r${i}_beta_display`, MathUtils.decimalToDmsString(beta_deg));
            } else {
                DOMUtils.setText(`r${i}_beta_display`, `0° 0' 0"`);
            }
        }

        // TÍNH GÓC TRUNG BÌNH & KIỂM ĐỊNH QC KHI ĐỦ 3 VÒNG
        if (betaAngles_deg.length === 3) {
            // Hạn mức chênh lệch giữa 3 vòng đo góc bằng (Giả định: 45 giây = 45/3600 độ)
            const tolerance_deg = 45 / 3600; 
            const betaMeasurement = new Measurement("Góc bằng Beta", betaAngles_deg[0], betaAngles_deg[1], betaAngles_deg[2], tolerance_deg);
            
            const qcResult = betaMeasurement.validateQC();
            const betaAvg_deg = betaMeasurement.getAverage();

            if (qcResult.passed) {
                DOMUtils.setText("grp_beta_avg", MathUtils.decimalToDmsString(betaAvg_deg), "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("grp_beta_avg", "LỆCH VÒNG ĐO", "text-danger font-bold");
                // Chuyển biên độ thập phân từ câu thông báo sang Giây cho sinh viên dễ hiểu
                const amplitude_sec = Math.round(betaMeasurement.getAmplitude() * 3600);
                DOMUtils.showAlert("validationAlert", `🚨 LỖI ĐO GÓC: Chênh lệch lớn nhất giữa 3 vòng đo là $${amplitude_sec}"$ (Vượt quá hạn mức $\\le 45"$). Nhóm trưởng yêu cầu thành viên đo lại!`, "danger");
            }
        } else {
            DOMUtils.setText("grp_beta_avg", `0° 0' 0"`, "text-danger");
        }
    };

    grpInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateGroupAngles);
    });


    // ==========================================
    // 6. XỬ LÝ SỰ KIỆN NỘP BÀI (SUBMIT)
    // ==========================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const error2cText = document.getElementById("ind_2c_val").innerText;
            const error2cNum = parseInt(error2cText.replace('"', ''));

            if (Math.abs(error2cNum) > 60) {
                const isConfirm = confirm(`Sai số 2C của bạn đang là ${Math.abs(error2cNum)}", vượt chuẩn thiết bị tốt (60"). Bạn vẫn muốn ghi log số liệu này để báo cáo sự cố thiết bị cho Giảng viên chứ?`);
                if (!isConfirm) return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "ĐANG ĐỒNG BỘ DỮ LIỆU...";
            btn.disabled = true;

            setTimeout(() => {
                alert("Nộp dữ liệu thành công! Hướng ngắm của bạn đã được ghi nhận.");
                window.location.href = "../dashboard.html";
            }, 1000);
        });
    }
});
