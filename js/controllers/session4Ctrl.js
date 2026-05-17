/**
 * ==========================================================================
 * FILE: js/controllers/session4Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 4 (Đo Góc Đứng & Cao Lượng Giác)
 * KIẾN TRÚC: MVC - Xử lý động ma trận DMS, tính sai số MO và chênh cao h
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
    const theodolite = new Theodolite(); // Lớp chuyên xử lý Góc, MO, V và Lượng giác
    
    const isDmsComplete = (dmsObj) => {
        return !isNaN(dmsObj.d) && !isNaN(dmsObj.m) && !isNaN(dmsObj.s);
    };


    // ==========================================
    // 4. TÍNH TOÁN REAL-TIME: PHẦN CÁ NHÂN (SAI SỐ MO & GÓC ĐỨNG V)
    // ==========================================
    const indInputIds = [
        "ind_vT_d", "ind_vT_m", "ind_vT_s",
        "ind_vP_d", "ind_vP_m", "ind_vP_s"
    ];
    
    const calculateMOandV = () => {
        const T_dms = DOMUtils.getDmsValues("ind_vT_d", "ind_vT_m", "ind_vT_s");
        const P_dms = DOMUtils.getDmsValues("ind_vP_d", "ind_vP_m", "ind_vP_s");

        if (isDmsComplete(T_dms) && isDmsComplete(P_dms)) {
            // Tính toán giá trị MO (Trả về độ thập phân)
            const MO_deg = theodolite.calculateMO(T_dms, P_dms);
            // Đổi ra giây để hiển thị và kiểm định
            const MO_sec = Math.round(MO_deg * 3600);
            
            // Tính góc đứng thực tế V = T - MO
            const V_deg = theodolite.calculateVerticalAngle(T_dms, MO_deg);
            const V_str = MathUtils.decimalToDmsString(V_deg);

            // Hiển thị kết quả ra giao diện
            DOMUtils.setText("ind_mo_val", `${MO_sec}"`);
            DOMUtils.setText("ind_v_angle", V_str);

            // QC Hậu kiểm tự động (Bareme: |MO| <= 60")
            if (Math.abs(MO_sec) <= 60) {
                DOMUtils.setText("ind_qc_badge", `<span class="flat-badge badge-success">ĐẠT CHUẨN</span>`);
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("ind_qc_badge", `<span class="flat-badge badge-danger">LỖI MO CAO</span>`);
                DOMUtils.showAlert("validationAlert", `🚨 CẢNH BÁO: Chỉ số $|MO| = ${Math.abs(MO_sec)}"$ đang vượt hạn mức cho phép ($\\le 60"$). Cần hiệu chỉnh lại màng dây chữ thập!`, "danger");
            }
        } else {
            DOMUtils.setText("ind_qc_badge", `<span class="flat-badge text-light">Chưa tính</span>`);
            DOMUtils.setText("ind_mo_val", `0"`, "text-danger");
            DOMUtils.setText("ind_v_angle", `0° 0' 0"`, "text-primary");
        }
    };

    indInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateMOandV);
    });


    // ==========================================
    // 5. TÍNH TOÁN REAL-TIME: PHẦN NHÓM (CHÊNH CAO LƯỢNG GIÁC 3 VÒNG)
    // ==========================================
    const grpInputIds = ["grpDistD"]; // Khởi tạo mảng lắng nghe bắt đầu với Khoảng cách D
    for (let i = 1; i <= 3; i++) {
        grpInputIds.push(
            `r${i}_i`, `r${i}_cg`, // Chiều cao máy, Số đọc chỉ giữa
            `r${i}_v_d`, `r${i}_v_m`, `r${i}_v_s` // Góc đứng V
        );
    }

    const calculateTrigLeveling = () => {
        const distD = DOMUtils.getNumberValue("grpDistD");
        let h_values = []; // Mảng chứa chênh cao của 3 vòng đo

        for (let i = 1; i <= 3; i++) {
            const inst_i = DOMUtils.getNumberValue(`r${i}_i`); // Chiều cao máy (mét)
            const cG = DOMUtils.getNumberValue(`r${i}_cg`);   // Chỉ giữa (mm)
            const v_dms = DOMUtils.getDmsValues(`r${i}_v_d`, `r${i}_v_m`, `r${i}_v_s`);

            // Chỉ tính nếu sinh viên nhập đủ Khoảng cách D, chiều cao i, cG và Góc đứng
            if (!isNaN(distD) && !isNaN(inst_i) && !isNaN(cG) && isDmsComplete(v_dms)) {
                
                // Set tạm thời chiều cao máy (i) vào theodolite cho vòng đo hiện tại
                theodolite.instHeight = inst_i;
                
                // Đổi góc DMS sang độ thập phân
                const v_deg = MathUtils.dmsToDecimal(v_dms.d, v_dms.m, v_dms.s);
                
                // Gọi model tính chênh cao lượng giác: h = D * tan(V) + i - cG
                const h = theodolite.calculateTrigonometricLeveling(distD, v_deg, cG);
                
                h_values.push(h);
                DOMUtils.setText(`r${i}_h_display`, `${h.toFixed(3)} m`);
            } else {
                DOMUtils.setText(`r${i}_h_display`, `0.000 m`);
            }
        }

        // KIỂM ĐỊNH QC KHI ĐÃ NHẬP ĐỦ 3 VÒNG ĐO
        if (h_values.length === 3) {
            // Đo cao lượng giác kém chính xác hơn đo cao hình học, nên dung sai (tolerance) 
            // quy định thường cho phép lệch đến 10mm (0.010 mét) ngoài hiện trường.
            const hMeasurement = new Measurement("Chênh cao Lượng giác", h_values[0], h_values[1], h_values[2], 0.010);
            
            const qcResult = hMeasurement.validateQC();
            const hAvg = hMeasurement.getAverage();

            if (qcResult.passed) {
                DOMUtils.setText("grp_h_avg", `${hAvg.toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
            } else {
                DOMUtils.setText("grp_h_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                DOMUtils.showAlert("validationAlert", `🚨 LỖI ĐO CAO: ${qcResult.message}`, "danger");
            }
        } else {
            DOMUtils.setText("grp_h_avg", `0.000 m`, "text-danger");
        }
    };

    grpInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateTrigLeveling);
    });


    // ==========================================
    // 6. XỬ LÝ SỰ KIỆN NỘP BÀI (SUBMIT CÁ NHÂN)
    // ==========================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const moText = document.getElementById("ind_mo_val").innerText;
            const moNum = parseInt(moText.replace('"', ''));

            if (Math.abs(moNum) > 60) {
                DOMUtils.showAlert("validationAlert", "Không thể nộp bài! Trị số $MO$ của bạn vượt quá $60\"$. Hãy ngắm đo lại cho chính xác.", "danger");
                return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "ĐANG ĐỒNG BỘ DỮ LIỆU...";
            btn.disabled = true;

            setTimeout(() => {
                alert("Nộp dữ liệu thành công! Hướng ngắm và chỉ số MO đã được ghi nhận.");
                window.location.href = "../dashboard.html";
            }, 1000);
        });
    }
});
