/**
 * ==========================================================================
 * FILE: js/controllers/session1Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 1 (Giới thiệu Máy Kinh Vĩ & Thủy Bình)
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. KIỂM TRA BẢO MẬT PHIÊN & ĐỔ HỒ SƠ TÀI KHOẢN
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    if (!session || !session.profile) return;

    const CURRENT_SESSION_NUM = "1"; 

    DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
    DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");

    DOMUtils.setupImagePreview("indSelfieFile", "indSelfiePreview");
    DOMUtils.setupImagePreview("indInstFile", "indInstPreview");
    DOMUtils.setupImagePreview("grpPhotoFile", "grpPhotoPreview");

    // 2A. CHỐT CHẶN BẢO MẬT TẦNG 1: TRẠNG THÁI FORM TỪ GIẢNG VIÊN (GET_SETTINGS)
    try {
        const response = await APIConnector.post("GET_SETTINGS", {});
        if (response && response.status === "success") {
            const sessionSetting = response.settings.find(s => s.session_id === "session_1");
            const status = sessionSetting ? sessionSetting.status.toUpperCase().trim() : "CLOSED";
            const isTeacher = UserAuth.hasAccess("teacher");

            if (status === "CLOSED" && !isTeacher) {
                alert("🔒 BẢO MẬT HỆ THỐNG: Biểu mẫu Buổi 1 hiện đang bị khóa sổ. Bạn không được quyền truy cập trực tiếp!");
                window.location.replace("../dashboard.html");
                return; 
            }
        } else {
            if (!UserAuth.hasAccess("teacher")) {
                alert("⚠️ Hệ thống đang cấu hình khẩn cấp. Vui lòng quay lại sau!");
                window.location.replace("../dashboard.html");
                return;
            }
        }
    } catch (err) {
        if (!UserAuth.hasAccess("teacher")) {
            alert("⚠️ Không có kết nối mạng để xác thực trạng thái biểu mẫu. Hệ thống tự động đóng băng!");
            window.location.replace("../dashboard.html");
            return;
        }
    }

    // 2B. CHỐT CHẶN BẢO MẬT TẦNG 2: NGĂN CHẶN NỘP ĐÈ SỐ LIỆU (GET_SUBMISSION)
    try {
        const checkSubmission = await APIConnector.post("GET_SUBMISSION", {
            mssv_id: session.profile.mssv_id,
            session_name: CURRENT_SESSION_NUM
        });

        if (checkSubmission && checkSubmission.found) {
            executeFormLockdown(session.profile.mssv_id);
            return; 
        }
    } catch (err) {
        console.error("Lỗi chốt chặn an ninh hoàn công: ", err);
    }

    // 3. LOGIC ĐIỀU HƯỚNG CHUYỂN TAB VAI TRÒ (Cá nhân / Nhóm)
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
            if (!UserAuth.hasAccess("leader")) {
                alert("⛔ Quyền hạn hạn chế: Chỉ Nhóm trưởng (Leader) mới được quyền nhập và nộp báo cáo nhóm!");
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

    // 4. THEO DÕI REAL-TIME SỐ LIỆU ĐỌC MIA CÁ NHÂN (3 LẦN ĐO)
    const levelModel = new Level("Máy Thủy Bình");
    const READING_TOLERANCE = 3.0; 
    
    const indInputs = ["ind_r1", "ind_r2", "ind_r3", "ind_sau1", "ind_sau2", "ind_sau3"];

    const calculateStationAverage = () => {
        let r1 = DOMUtils.getNumberValue("ind_r1");
        if (isNaN(r1)) r1 = DOMUtils.getNumberValue("ind_sau1");
        let r2 = DOMUtils.getNumberValue("ind_r2");
        if (isNaN(r2)) r2 = DOMUtils.getNumberValue("ind_sau2");
        let r3 = DOMUtils.getNumberValue("ind_r3");
        if (isNaN(r3)) r3 = DOMUtils.getNumberValue("ind_sau3");

        if (!isNaN(r1) && !isNaN(r2) && !isNaN(r3)) {
            const measurementData = new Measurement("Số đọc mia cá nhân", r1, r2, r3, READING_TOLERANCE);
            const avg = measurementData.getAverage();
            const qc = measurementData.validateQC();

            if (qc.passed) {
                const avg_m = avg / 1000;
                DOMUtils.setText("ind_avg_display", `${avg.toFixed(1)} mm`, "text-success font-bold");
                DOMUtils.setText("ind_h_avg", `${MathUtils.round(avg_m, 3).toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
                
                if (document.getElementById("btnSubmitIndividual")) {
                    document.getElementById("btnSubmitIndividual").disabled = false;
                }
            } else {
                DOMUtils.setText("ind_avg_display", "VƯỢT HẠN MỨC", "text-danger font-bold");
                DOMUtils.setText("ind_h_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                
                const diffVal = Math.max(r1, r2, r3) - Math.min(r1, r2, r3);
                DOMUtils.showAlert("validationAlert", `🚨 BIÊN ĐỘ SAI SỐ THÔ: Độ lệch (${diffVal}mm) vượt dung sai ($\\le 3mm$). Sinh viên đo lại!`, "danger");
                
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

    // 5. THEO DÕI REAL-TIME SỐ LIỆU KHOẢNG CÁCH LƯỢNG CỰ NHÓM
    const grpInputs = ["grp_ct1", "grp_cd1", "grp_ct2", "grp_cd2", "grp_ct3", "grp_cd3"];
    
    const checkGroupInputs = () => {
        const ct1 = DOMUtils.getNumberValue("grp_ct1");
        const cd1 = DOMUtils.getNumberValue("grp_cd1");
        const ct2 = DOMUtils.getNumberValue("grp_ct2");
        const cd2 = DOMUtils.getNumberValue("grp_cd2");
        const ct3 = DOMUtils.getNumberValue("grp_ct3");
        const cd3 = DOMUtils.getNumberValue("grp_cd3");

        let d1 = 0, d2 = 0, d3 = 0;
        let validCount = 0;
        let sumD = 0;

        const calcD = (t, b) => (t - b) / 10;

        if (!isNaN(ct1) && !isNaN(cd1)) {
            if (ct1 <= cd1) {
                DOMUtils.setText("grp_d1_display", "LỖI MIA", "text-danger font-bold");
            } else {
                d1 = calcD(ct1, cd1);
                DOMUtils.setText("grp_d1_display", `${d1.toFixed(3)} m`, "text-success");
                sumD += d1; validCount++;
            }
        } else { DOMUtils.setText("grp_d1_display", "0.000 m", "text-muted"); }

        if (!isNaN(ct2) && !isNaN(cd2)) {
            if (ct2 <= cd2) {
                DOMUtils.setText("grp_d2_display", "LỖI MIA", "text-danger font-bold");
            } else {
                d2 = calcD(ct2, cd2);
                DOMUtils.setText("grp_d2_display", `${d2.toFixed(3)} m`, "text-success");
                sumD += d2; validCount++;
            }
        } else { DOMUtils.setText("grp_d2_display", "0.000 m", "text-muted"); }

        if (!isNaN(ct3) && !isNaN(cd3)) {
            if (ct3 <= cd3) {
                DOMUtils.setText("grp_d3_display", "LỖI MIA", "text-danger font-bold");
            } else {
                d3 = calcD(ct3, cd3);
                DOMUtils.setText("grp_d3_display", `${d3.toFixed(3)} m`, "text-success");
                sumD += d3; validCount++;
            }
        } else { DOMUtils.setText("grp_d3_display", "0.000 m", "text-muted"); }

        if (validCount === 3) {
            const avgD = sumD / 3;
            const amplitude = MathUtils.calculateAmplitude([d1, d2, d3]);
            const tolerance = 0.2; 

            if (amplitude <= tolerance) {
                DOMUtils.setText("grp_d_avg", `${avgD.toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
                if (document.getElementById("btnSubmitGroup")) {
                    document.getElementById("btnSubmitGroup").disabled = false;
                }
            } else {
                DOMUtils.setText("grp_d_avg", "VƯỢT HẠN MỨC", "text-danger font-bold");
                DOMUtils.showAlert("validationAlert", `⚠️ Độ lệch lớn nhất là ${amplitude.toFixed(3)}m (Cho phép $\\le 0.2m$). Yêu cầu đo lại!`, "danger");
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
    };

    grpInputs.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) inputEl.addEventListener("input", checkGroupInputs);
    });

    // 6. XỬ LÝ SỰ KIỆN NÚT IN ẤN TRỰC TIẾP
    const btnPrintInd = document.getElementById("btnPrintIndividual");
    if (btnPrintInd) {
        btnPrintInd.addEventListener("click", () => {
            window.print();
        });
    }
    const btnPrintGrp = document.getElementById("btnPrintGroup");
    if (btnPrintGrp) {
        btnPrintGrp.addEventListener("click", () => {
            window.print();
        });
    }

    // =========================================================================
    // 7A. LUỒNG XỬ LÝ SUBMIT BIỂU MẪU CÁ NHÂN (TÍCH HỢP FIREBASE)
    // =========================================================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            let r1 = DOMUtils.getNumberValue("ind_r1") || DOMUtils.getNumberValue("ind_sau1");
            let r2 = DOMUtils.getNumberValue("ind_r2") || DOMUtils.getNumberValue("ind_sau2");
            let r3 = DOMUtils.getNumberValue("ind_r3") || DOMUtils.getNumberValue("ind_sau3");
            
            let commentInput = document.getElementById("student_comment") || 
                               document.getElementById("ind_comment") || 
                               document.getElementById("indComment");
            const comment = commentInput ? commentInput.value.trim() : "";

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
            btn.innerHTML = "⏳ ĐANG XỬ LÝ ẢNH & ĐỒNG BỘ CLOUD...";
            btn.disabled = true;

            // BỌC TRY-CATCH CHO TOÀN BỘ TIẾN TRÌNH UPLOAD VÀ LƯU DỮ LIỆU
            try {
                const selfieInput = document.getElementById("indSelfieFile");
                const instInput = document.getElementById("indInstFile");
                
                let selfieFirebaseUrl = "";
                let instFirebaseUrl = "";
        
                if (selfieInput && selfieInput.files && selfieInput.files[0]) {
                    selfieFirebaseUrl = await FirebaseUploader.processAndUpload(
                        selfieInput.files[0], 
                        `${session.profile.mssv_id}_Buoi1_Selfie`
                    );
                }
        
                if (instInput && instInput.files && instInput.files[0]) {
                    instFirebaseUrl = await FirebaseUploader.processAndUpload(
                        instInput.files[0], 
                        `${session.profile.mssv_id}_Buoi1_ChiKinh`
                    );
                }

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
                    individual_photo_url: selfieFirebaseUrl,
                    group_photo_url: instFirebaseUrl,
                    student_comment: comment
                };

                const response = await APIConnector.post("SAVE_DATA", payload);
                if (response && response.status === "success") {
                    alert("🎉 Chúc mừng! Kết quả cá nhân đã ghi nhận thành công vào Database Khoa.");
                    executeFormLockdown(session.profile.mssv_id); 
                } else {
                    alert(`⛔ Lỗi máy chủ từ chối: ${response.message}`);
                    btn.innerHTML = "NỘP BÁO CÁO CÁ NHÂN";
                    btn.disabled = false;
                }
            } catch (err) {
                alert("🚨 Lỗi đường truyền mạng hoặc tải ảnh: " + err);
                btn.innerHTML = "NỘP BÁO CÁO CÁ NHÂN";
                btn.disabled = false;
            }
        });
    }

    // =========================================================================
    // 7B. LUỒNG XỬ LÝ SUBMIT BIỂU MẪU NHÓM (TÍCH HỢP FIREBASE)
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
            const grpCommentInput = document.getElementById("grpComment") || document.getElementById("grp_comment");
            const comment = grpCommentInput ? grpCommentInput.value.trim() : "";

            const btn = document.getElementById("btnSubmitGroup");
            btn.innerHTML = "⏳ ĐANG XỬ LÝ ẢNH & ĐỒNG BỘ SỔ ĐO NHÓM...";
            btn.disabled = true;

            try {
                const grpInput = document.getElementById("grpPhotoFile");
                let grpFirebaseUrl = "";
                
                if (grpInput && grpInput.files && grpInput.files[0]) {
                    grpFirebaseUrl = await FirebaseUploader.processAndUpload(
                        grpInput.files[0], 
                        `${session.profile.mssv_id}_Buoi1_Group`
                    );
                }

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
                    individual_photo_url: "",
                    group_photo_url: grpFirebaseUrl,
                    student_comment: `Báo cáo tập thể nhóm. ${comment}`
                };

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
                alert("🚨 Thất bại: Lỗi tải ảnh hoặc kết nối API lên Cloud bị ngắt quãng! " + err);
                btn.innerHTML = "NỘP BÁO CÁO TỔNG HỢP NHÓM";
                btn.disabled = false;
            }
        });
    }
});

function executeFormLockdown(mssvId) {
    DOMUtils.showAlert("validationAlert", `⚠️ HỆ THỐNG KHÓA SỔ: Tài khoản [${mssvId}] đã hoàn tất nghĩa vụ nộp số liệu ngoại nghiệp cho Buổi 1. Bạn không thể thay đổi dữ liệu đã lưu trữ trên đám mây.`, "warning");

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
