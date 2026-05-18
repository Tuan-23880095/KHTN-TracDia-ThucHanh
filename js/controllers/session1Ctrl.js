/**
 * ==========================================================================
 * FILE: js/controllers/session1Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 1 (Giới thiệu Máy Kinh Vĩ & Thủy Bình)
 * KIẾN TRÚC: MVC - Kết hợp toàn vẹn Logic tính toán hình học thực địa và Chốt chặn an ninh Cloud
 * KHỚP NỐI: Đồng bộ 100% với hệ thống biến số toàn dự án học phần GEO10055
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    
    // ==========================================
    // 1. KIỂM TRA BẢO MẬT PHIÊN & ĐỔ HỒ SƠ TÀI KHOẢN
    // ==========================================
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    if (!session || !session.profile) return;

    const CURRENT_SESSION_NUM = "1"; // Định danh Buổi 1

    // Hiển thị thông tin sinh viên lên thanh trạng thái hệ thống
    DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
    DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");

    // Khởi tạo các khung xem trước ảnh minh chứng thực địa hiện trường
    DOMUtils.setupImagePreview("indSelfieFile", "indSelfiePreview");
    DOMUtils.setupImagePreview("indInstFile", "indInstPreview");
    DOMUtils.setupImagePreview("grpPhotoFile", "grpPhotoPreview");

    // =====================================================================
    // 2A. CHỐT CHẶN BẢO MẬT TẦNG 1: TRẠNG THÁI FORM TỪ GIẢNG VIÊN (GET_SETTINGS)
    // =====================================================================
    try {
        const response = await APIConnector.post("GET_SETTINGS", {});
        if (response && response.status === "success") {
            // Lấy trạng thái cấu hình đóng/mở của "session_1" từ Sheet Settings
            const sessionSetting = response.settings.find(s => s.session_id === "session_1");
            const status = sessionSetting ? sessionSetting.status.toUpperCase().trim() : "CLOSED";
            
            const isTeacher = UserAuth.hasAccess("teacher");

            // Nếu trạng thái là CLOSED và người truy cập KHÔNG PHẢI GIẢNG VIÊN -> Trục xuất lập tức
            if (status === "CLOSED" && !isTeacher) {
                alert("🔒 BẢO MẬT HỆ THỐNG: Biểu mẫu Buổi 1 hiện đang bị khóa sổ. Bạn không được quyền truy cập trực tiếp!");
                window.location.replace("../dashboard.html");
                return; // Dừng toàn bộ tiến trình tải UI bên dưới
            }
        } else {
            // Khớp nguyên tắc an toàn nghiêm ngặt (Fail-Closed) khi API lỗi dữ liệu
            if (!UserAuth.hasAccess("teacher")) {
                alert("⚠️ Hệ thống đang cấu hình khẩn cấp. Vui lòng quay lại sau!");
                window.location.replace("../dashboard.html");
                return;
            }
        }
    } catch (err) {
        console.error("Lỗi xác thực cấu hình bảo mật hệ thống: ", err);
        // Khớp nguyên tắc an toàn nghiêm ngặt (Fail-Closed) khi mất kết nối mạng
        if (!UserAuth.hasAccess("teacher")) {
            alert("⚠️ Không có kết nối mạng để xác thực trạng thái biểu mẫu. Hệ thống tự động đóng băng!");
            window.location.replace("../dashboard.html");
            return;
        }
    }

    // =====================================================================
    // 2B. CHỐT CHẶN BẢO MẬT TẦNG 2: NGĂN CHẶN NỘP ĐÈ SỐ LIỆU (GET_SUBMISSION)
    // =====================================================================
    try {
        // Gọi API lên GAS kiểm tra xem tài khoản này đã nộp bài buổi 1 thành công chưa
        const checkSubmission = await APIConnector.post("GET_SUBMISSION", {
            mssv_id: session.profile.mssv_id,
            session_name: CURRENT_SESSION_NUM
        });

        if (checkSubmission && checkSubmission.found) {
            // Kích hoạt ngay kịch bản đóng băng phong tỏa toàn bộ Form nhập liệu
            executeFormLockdown(session.profile.mssv_id);
            return; // Ngắt tiến trình bên dưới, ngăn chặn liên kết sự kiện tính toán/nộp bài đè số
        }
    } catch (err) {
        console.error("Lỗi chốt chặn an ninh hoàn công buổi học: ", err);
    }

    // ==========================================
    // 3. LOGIC ĐIỀU HƯỚNG CHUYỂN TAB VAI TRÒ (Cá nhân / Nhóm)
    // ==========================================
    const tabIndBtn = document.getElementById("tabIndividualBtn");
    const tabGrpBtn = document.getElementById("tabGroupBtn");
    const sectionInd = document.getElementById("individualForm");
    const sectionGrp = document.getElementById("groupForm");

    if (tabIndBtn && tabGrpBtn) {
        tabIndBtn.addEventListener("click", () => {
            tabIndBtn.className = "tab-btn active";
            tabGrpBtn.className = "tab-btn";
            DOMUtils.toggleVisibility("individualForm", true);
            DOMUtils.toggleVisibility("groupForm", false);
            if (sectionInd) sectionInd.classList.remove("hidden");
            if (sectionGrp) sectionGrp.classList.add("hidden");
            DOMUtils.hideAlert("validationAlert");
        });

        tabGrpBtn.addEventListener("click", () => {
            // Chốt chặn phân quyền cấp bậc: Chỉ Nhóm trưởng hoặc Giảng viên mới được thao tác tab Nhóm
            if (!UserAuth.hasAccess("leader")) {
                alert("⛔ Quyền hạn hạn chế: Chỉ Nhóm trưởng (Leader) mới được quyền nhập và nộp báo cáo thực đạc của nhóm!");
                return;
            }
            tabGrpBtn.className = "tab-btn active";
            tabIndBtn.className = "tab-btn";
            DOMUtils.toggleVisibility("individualForm", false);
            DOMUtils.toggleVisibility("groupForm", true);
            if (sectionGrp) sectionGrp.classList.remove("hidden");
            if (sectionInd) sectionInd.classList.add("hidden");
            DOMUtils.hideAlert("validationAlert");
        });
    }

    // ==========================================
    // 4. THEO DÕI REAL-TIME SỐ LIỆU ĐỌC MIA CÁ NHÂN (3 LẦN ĐO)
    // ==========================================
    const levelModel = new Level("Máy Thủy Bình");
    const READING_TOLERANCE = 3.0; // Hạn mức chênh lệch tối đa giữa các lần ngắm ngẫu nhiên là 3.0mm chuẩn 04
    
    // Hỗ trợ quét và xử lý linh hoạt cả 2 cấu trúc đặt tên ID biến của phôi HTML cũ và mới
    const indInputs = ["ind_r1", "ind_r2", "ind_r3", "ind_sau1", "ind_sau2", "ind_sau3"];

    const calculateStationAverage = () => {
        let r1 = DOMUtils.getNumberValue("ind_r1");
        if (isNaN(r1)) r1 = DOMUtils.getNumberValue("ind_sau1");

        let r2 = DOMUtils.getNumberValue("ind_r2");
        if (isNaN(r2)) r2 = DOMUtils.getNumberValue("ind_sau2");

        let r3 = DOMUtils.getNumberValue("ind_r3");
        if (isNaN(r3)) r3 = DOMUtils.getNumberValue("ind_sau3");

        // Chỉ thực hiện tính toán và kiểm định khi điền đủ 3 lần đọc mia độc lập
        if (!isNaN(r1) && !isNaN(r2) && !isNaN(r3)) {
            const measurementData = new Measurement("Số đọc mia cá nhân", r1, r2, r3, READING_TOLERANCE);
            const avg = measurementData.getAverage();
            const qc = measurementData.validateQC();

            if (qc.passed) {
                // Đổi kết quả bình quân sang mét (m) để gán cho sổ hoàn công hành chính
                const avg_m = avg / 1000;
                
                // Cập nhật đồng bộ lên cả 2 thẻ hiển thị ID của cả 2 file thiết kế
                DOMUtils.setText("ind_avg_display", `${avg.toFixed(1)} mm`, "text-success font-bold");
                DOMUtils.setText("ind_h_avg", `${MathUtils.round(avg_m, 3).toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
                
                if (document.getElementById("btnSubmitIndividual")) {
                    document.getElementById("btnSubmitIndividual").disabled = false;
                }
            } else {
                // Thất bại: Đánh lỗi cảnh báo chất lượng thô ngoại nghiệp vượt hạn mức dung sai
                DOMUtils.setText("ind_avg_display", "VƯỢT HẠN MỨC", "text-danger font-bold");
                DOMUtils.setText("ind_h_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                
                const diffVal = Math.max(r1, r2, r3) - Math.min(r1, r2, r3);
                DOMUtils.showAlert("validationAlert", `🚨 BIÊN ĐỘ SAI SỐ THÔ: Hiệu số giữa lần đọc lớn nhất và nhỏ nhất (${diffVal}mm) vượt quá dung sai cho phép ($\\le 3mm$). Sinh viên bắt bắt mục tiêu và đọc lại!`, "danger");
                
                if (document.getElementById("btnSubmitIndividual")) {
                    document.getElementById("btnSubmitIndividual").disabled = true;
                }
            }
        } else {
            DOMUtils.setText("ind_avg_display", "0.0 mm", "text-muted");
            DOMUtils.setText("ind_h_avg", "0.000 m", "text-muted");
        }
    };

    indInputs.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) inputEl.addEventListener("input", calculateStationAverage);
    });

    // =========================================================================
    // 5. THEO DÕI REAL-TIME SỐ LIỆU KHOẢNG CÁCH LƯỢNG CỰ CỦA NHÓM (3 LẦN ĐO)
    // =========================================================================
    const grpInputs = ["grp_ct1", "grp_cd1", "grp_ct2", "grp_cd2", "grp_ct3", "grp_cd3"];
    grpInputs.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
            inputEl.addEventListener("input", () => {
                const ct1 = DOMUtils.getNumberValue("grp_ct1");
                const cd1 = DOMUtils.getNumberValue("grp_cd1");
                const ct2 = DOMUtils.getNumberValue("grp_ct2");
                const cd2 = DOMUtils.getNumberValue("grp_cd2");
                const ct3 = DOMUtils.getNumberValue("grp_ct3");
                const cd3 = DOMUtils.getNumberValue("grp_cd3");

                let d1 = 0, d2 = 0, d3 = 0;
                let validCount = 0;
                let sumD = 0;

                // Công thức tính khoảng cách ly tâm phẳng D (mét): (Chỉ trên_mm - Chỉ dưới_mm) / 10
                const calcD = (t, b) => (t - b) / 10;

                // Khảo nghiệm Lần đo số 1
                if (!isNaN(ct1) && !isNaN(cd1)) {
                    if (ct1 <= cd1) {
                        DOMUtils.setText("grp_d1_display", "LỖI MIA", "text-danger font-bold");
                    } else {
                        d1 = calcD(ct1, cd1);
                        DOMUtils.setText("grp_d1_display", `${d1.toFixed(3)} m`, "text-success");
                        sumD += d1; validCount++;
                    }
                } else { DOMUtils.setText("grp_d1_display", "0.000 m", "text-muted"); }

                // Khảo nghiệm Lần đo số 2
                if (!isNaN(ct2) && !isNaN(cd2)) {
                    if (ct2 <= cd2) {
                        DOMUtils.setText("grp_d2_display", "LỖI MIA", "text-danger font-bold");
                    } else {
                        d2 = calcD(ct2, cd2);
                        DOMUtils.setText("grp_d2_display", `${d2.toFixed(3)} m`, "text-success");
                        sumD += d2; validCount++;
                    }
                } else { DOMUtils.setText("grp_d2_display", "0.000 m", "text-muted"); }

                // Khảo nghiệm Lần đo số 3
                if (!isNaN(ct3) && !isNaN(cd3)) {
                    if (ct3 <= cd3) {
                        DOMUtils.setText("grp_d3_display", "LỖI MIA", "text-danger font-bold");
                    } else {
                        d3 = calcD(ct3, cd3);
                        DOMUtils.setText("grp_d3_display", `${d3.toFixed(3)} m`, "text-success");
                        sumD += d3; validCount++;
                    }
                } else { DOMUtils.setText("grp_d3_display", "0.000 m", "text-muted"); }

                // Đánh giá QC lượng cự khi đủ dữ liệu 3 lần đo
                if (validCount === 3) {
                    const avgD = sumD / 3;
                    const amplitude = MathUtils.calculateAmplitude([d1, d2, d3]);
                    const tolerance = 0.2; // Dung sai cho phép biên độ lệch giữa các lần đo là 0.2m (20cm)

                    if (amplitude <= tolerance) {
                        DOMUtils.setText("grp_d_avg", `${avgD.toFixed(3)} m`, "text-success font-bold");
                        DOMUtils.hideAlert("validationAlert");
                        if (document.getElementById("btnSubmitGroup")) {
                            document.getElementById("btnSubmitGroup").disabled = false;
                        }
                    } else {
                        DOMUtils.setText("grp_d_avg", "VƯỢT HẠN MỨC", "text-danger font-bold");
                        DOMUtils.showAlert("validationAlert", `⚠️ Biên độ khoảng cách quá lớn! Độ lệch lớn nhất là ${amplitude.toFixed(3)}m (Cho phép $\\le 0.2m$). Yêu cầu nhóm đo lại!`, "danger");
                        if (document.getElementById("btnSubmitGroup")) {
                            document.getElementById("btnSubmitGroup").disabled = true;
                        }
                    }
                } else {
                    DOMUtils.setText("grp_d_avg", "Chưa đủ dữ liệu", "text-muted font-bold");
                    if (document.getElementById("btnSubmitGroup")) {
                        document.getElementById("btnSubmitGroup").disabled = true;
                    }
                }
            });
        }
    });

    // =========================================================================
    // 6. XỬ LÝ SỰ KIỆN NÚT IN ẤN TRỰC TIẾP (TẬN DỤNG BẢN LỀ TĨNH A4-PRINT.CSS)
    // =========================================================================
    const btnPrintInd = document.getElementById("btnPrintIndividual");
    if (btnPrintInd) {
        btnPrintInd.addEventListener("click", () => {
            let r1 = DOMUtils.getNumberValue("ind_r1");
            if (isNaN(r1)) r1 = DOMUtils.getNumberValue("ind_sau1");
            let r2 = DOMUtils.getNumberValue("ind_r2");
            if (isNaN(r2)) r2 = DOMUtils.getNumberValue("ind_sau2");
            let r3 = DOMUtils.getNumberValue("ind_r3");
            if (isNaN(r3)) r3 = DOMUtils.getNumberValue("ind_sau3");
            
            const machineType = document.getElementById("indMachineType") ? document.getElementById("indMachineType").value : "Máy Thủy Bình";
            const targetName = document.getElementById("indTargetName") ? document.getElementById("indTargetName").value : "Mia chuẩn";

            if (!machineType || !targetName || isNaN(r1) || isNaN(r2) || isNaN(r3)) {
                alert("⚠️ Vui lòng hoàn thành đầy đủ thông tin thiết bị, mục tiêu và 3 lần đọc mia trước khi xuất phiếu in!");
                return;
            }
            window.print();
        });
    }

    const btnPrintGrp = document.getElementById("btnPrintGroup");
    if (btnPrintGrp) {
        btnPrintGrp.addEventListener("click", () => {
            const targetName = document.getElementById("grpTargetName") ? document.getElementById("grpTargetName").value : "";
            const ct1 = DOMUtils.getNumberValue("grp_ct1");
            const cd1 = DOMUtils.getNumberValue("grp_cd1");
            const ct2 = DOMUtils.getNumberValue("grp_ct2");
            const cd2 = DOMUtils.getNumberValue("grp_cd2");
            const ct3 = DOMUtils.getNumberValue("grp_ct3");
            const cd3 = DOMUtils.getNumberValue("grp_cd3");

            if (!targetName || isNaN(ct1) || isNaN(cd1) || isNaN(ct2) || isNaN(cd2) || isNaN(ct3) || isNaN(cd3)) {
                alert("⚠️ Yêu cầu: Vui lòng nhập Tên tuyến đo (Mục tiêu) và hoàn thành đầy đủ 3 lần đo lượng cự trước khi xuất phiếu in!");
                return;
            }
            window.print();
        });
    }

    // =========================================================================
    // 7A. LUỒNG XỬ LÝ SUBMIT BIỂU MẪU CÁ NHÂN TỐI ƯU HÓA CLOUD
    // =========================================================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            let r1 = DOMUtils.getNumberValue("ind_r1");
            if (isNaN(r1)) r1 = DOMUtils.getNumberValue("ind_sau1");
            let r2 = DOMUtils.getNumberValue("ind_r2");
            if (isNaN(r2)) r2 = DOMUtils.getNumberValue("ind_sau2");
            let r3 = DOMUtils.getNumberValue("ind_r3");
            if (isNaN(r3)) r3 = DOMUtils.getNumberValue("ind_sau3");
            
            const comment = document.getElementById("ind_comment") ? document.getElementById("ind_comment").value : (document.getElementById("student_comment") ? document.getElementById("student_comment").value : "");
            const selfieImg = document.getElementById("indSelfiePreview") ? document.getElementById("indSelfiePreview").src : "";
            const instImg = document.getElementById("indInstPreview") ? document.getElementById("indInstPreview").src : "";

            if (isNaN(r1) || !r1 || isNaN(r2) || isNaN(r3)) {
                DOMUtils.showAlert("validationAlert", "Lỗi: Vui lòng nhập đầy đủ trị số của cả 3 lần đọc nghiệm thu trước khi nộp bài.", "danger");
                return;
            }

            const measurementData = new Measurement("Số đọc mia cá nhân", r1, r2, r3, READING_TOLERANCE);
            const qcCheck = measurementData.validateQC();
            
            if (!qcCheck.passed) {
                DOMUtils.showAlert("validationAlert", "Lỗi nghiêm trọng: Số liệu hiện tại vi phạm bareme dung sai của Bộ môn. Không thể nộp bài!", "danger");
                return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "⏳ ĐANG ĐỒNG BỘ CLOUD...";
            btn.disabled = true;

            const payload = {
                session_name: CURRENT_SESSION_NUM,
                submit_type: "Cá nhân",
                student_id: session.profile.mssv_id,
                student_name: session.profile.full_name,
                group_id: session.profile.group_id,
                machine_type: "Máy Thủy Bình / Kinh Vĩ",
                target_name: "Mia thực nghiệm trạm đơn",
                result_avg: { r1, r2, r3, average: measurementData.getAverage() },
                qc_evaluation: `ĐẠT CHUẨN (Biên độ lệch: ${(Math.max(r1, r2, r3) - Math.min(r1, r2, r3))}mm)`,
                r1_data: { reading: r1 },
                r2_data: { reading: r2 },
                r3_data: { reading: r3 },
                individual_photo_base64: selfieImg.startsWith("data:image") ? selfieImg : "",
                group_photo_base64: instImg.startsWith("data:image") ? instImg : "",
                student_comment: comment
            };

            try {
                const response = await APIConnector.post("SAVE_DATA", payload);
                if (response && response.status === "success") {
                    alert("🎉 Chúc mừng! Kết quả thực tập cá nhân Buổi 1 đã ghi nhận thành công vào Google Sheets.");
                    executeFormLockdown(session.profile.mssv_id); // Tự động đóng khóa form lập tức tại Client
                } else {
                    alert(`⛔ Lỗi máy chủ từ chối: ${response.message}`);
                    btn.innerHTML = "NỘP BÁO CÁO CÁ NHÂN";
                    btn.disabled = false;
                }
            } catch (err) {
                alert("🚨 Lỗi đường truyền mạng: Không thể gửi gói tin lên hệ thống cơ sở dữ liệu Khoa!");
                btn.innerHTML = "NỘP BÁO CÁO CÁ NHÂN";
                btn.disabled = false;
            }
        });
    }

    // =========================================================================
    // 7B. LUỒNG XỬ LÝ SUBMIT BIỂU MẪU NHÓM LÊN SERVER GAS
    // =========================================================================
    const formGrp = document.getElementById("groupForm");
    if (formGrp) {
        formGrp.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!UserAuth.hasAccess("leader") && !UserAuth.hasAccess("teacher")) {
                alert("⛔ Bạn không có đặc quyền nộp biểu mẫu này!");
                return;
            }

            const ct1 = DOMUtils.getNumberValue("grp_ct1");
            const cd1 = DOMUtils.getNumberValue("grp_cd1");
            const ct2 = DOMUtils.getNumberValue("grp_ct2");
            const cd2 = DOMUtils.getNumberValue("grp_cd2");
            const ct3 = DOMUtils.getNumberValue("grp_ct3");
            const cd3 = DOMUtils.getNumberValue("grp_cd3");

            if (isNaN(ct1) || isNaN(cd1) || isNaN(ct2) || isNaN(cd2) || isNaN(ct3) || isNaN(cd3)) {
                alert("Vui lòng điền đầy đủ dữ liệu chỉ tiêu kỹ thuật đo lượng cự trước khi nộp!");
                return;
            }

            const d1 = (ct1 - cd1) / 10;
            const d2 = (ct2 - cd2) / 10;
            const d3 = (ct3 - cd3) / 10;
            const avgDistance = (d1 + d2 + d3) / 3;

            const targetName = document.getElementById("grpTargetName") ? document.getElementById("grpTargetName").value : "Tuyến đo";
            const comment = document.getElementById("grpComment") ? document.getElementById("grpComment").value : "";
            const grpImg = document.getElementById("grpPhotoPreview") ? document.getElementById("grpPhotoPreview").src : "";

            const btn = document.getElementById("btnSubmitGroup");
            btn.innerHTML = "⏳ ĐANG ĐỒNG BỘ SỔ ĐO NHÓM...";
            btn.disabled = true;

            const payload = {
                session_name: CURRENT_SESSION_NUM,
                submit_type: "Nhóm",
                student_id: session.profile.mssv_id,
                student_name: session.profile.full_name,
                group_id: session.profile.group_id,
                machine_type: "Đo khoảng cách lượng cự ngắm ngang",
                target_name: targetName,
                result_avg: { d1_m: d1, d2_m: d2, d3_m: d3, khoang_cach_trung_binh_m: avgDistance },
                qc_evaluation: "ĐẠT CHUẨN HÌNH HỌC",
                individual_photo_base64: "",
                group_photo_base64: grpImg.startsWith("data:image") ? grpImg : "",
                student_comment: `Báo cáo tập thể nhóm. ${comment}`
            };

            try {
                const response = await APIConnector.post("SAVE_DATA", payload);
                if (response && response.status === "success") {
                    alert("🎉 Sổ đo ngoại nghiệp tập thể Nhóm đã được nộp và lưu trữ thành công!");
                    window.location.href = "../dashboard.html";
                } else {
                    alert(`⛔ Lỗi: ${response.message}`);
                    btn.innerHTML = "NỘP BÁO CÁO TỔNG HỢP NHÓM";
                    btn.disabled = false;
                }
            } catch (err) {
                alert("🚨 Thất bại: Đường truyền kết nối API lên Cloud bị ngắt quãng!");
                btn.innerHTML = "NỘP BÁO CÁO TỔNG HỢP NHÓM";
                btn.disabled = false;
            }
        });
    }
});

/**
 * Hàm điều khiển kịch bản đóng băng giao diện (Lockdown) khi đã có số liệu hoàn công
 * Bơm động nút "XUẤT PHIẾU BÁO CÁO PDF" sang trang report-template.html
 */
function executeFormLockdown(mssvId) {
    // 1. Phát thông báo cảnh báo màu cam (Warning) nhãn phẳng
    DOMUtils.showAlert("validationAlert", `⚠️ HỆ THỐNG KHÓA SỔ: Tài khoản [${mssvId}] đã hoàn tất nghĩa vụ nộp số liệu ngoại nghiệp cho Buổi 1. Bạn không thể thay đổi dữ liệu đã lưu trữ trên đám mây.`, "warning");

    // 2. Vô hiệu hóa (Disable) và gán nền phẳng chỉ đọc cho mọi phần tử nhập liệu
    document.querySelectorAll("input, textarea, select").forEach(el => {
        el.disabled = true;
        el.style.backgroundColor = "#f1f5f9"; 
    });

    const btnSubmitInd = document.getElementById("btnSubmitIndividual");
    if (btnSubmitInd) {
        btnSubmitInd.disabled = true;
        btnSubmitInd.innerHTML = "🔒 SỐ LIỆU ĐÃ ĐƯỢC KHÓA";
        btnSubmitInd.className = "btn btn-secondary cursor-not-allowed";
    }

    // 3. DÙNG DOM CẮT BƠM ĐỘNG NÚT "XUẤT PHIẾU BÁO CÁO PDF" XUẤT HIỆN Ở DƯỚI GÓC TRÁI FORM VÀO ĐÁY KHUÔN BẢNG
    const formContainer = document.querySelector(".layout-form-container");
    if (formContainer && !document.getElementById("btnDynamicExportReport")) {
        const btnExport = document.createElement("a");
        btnExport.id = "btnDynamicExportReport";
        btnExport.href = `report-template.html?session=1&mssv=${mssvId}`;
        btnExport.className = "btn btn-secondary";
        btnExport.style.marginTop = "25px";
        btnExport.style.display = "inline-block";
        btnExport.style.backgroundColor = "#475569";
        btnExport.style.color = "#ffffff";
        btnExport.style.textDecoration = "none";
        btnExport.style.fontWeight = "bold";
        btnExport.innerHTML = "📄 XUẤT PHIẾU BÁO CÁO THỰC TẬP BUỔI 1 (PDF)";
        
        formContainer.appendChild(btnExport);
    }
}
