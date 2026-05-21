/**
 * ==========================================================================
 * FILE: js/controllers/session1Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển Buổi 1 - Đã tách biệt hoàn toàn luồng Khóa Form Cá nhân / Nhóm
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    if (!session || !session.profile) return;

    const CURRENT_SESSION_NUM = "1"; 

    DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
    DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");

    DOMUtils.setupImagePreview("indSelfieFile", "indSelfiePreview");
    DOMUtils.setupImagePreview("indInstFile", "indInstPreview");
    DOMUtils.setupImagePreview("grpPhotoFile", "grpPhotoPreview");

    // 2A. CHỐT CHẶN BẢO MẬT TẦNG 1: TRẠNG THÁI TỪ GIẢNG VIÊN
    try {
        const response = await APIConnector.post("GET_SETTINGS", {});
        if (response && response.status === "success") {
            const sessionSetting = response.settings.find(s => s.session_id === "session_1");
            const status = sessionSetting ? sessionSetting.status.toUpperCase().trim() : "CLOSED";
            const isTeacher = UserAuth.hasAccess("teacher");

            if (status === "CLOSED" && !isTeacher) {
                alert("🔒 BẢO MẬT HỆ THỐNG: Biểu mẫu Buổi 1 hiện đang bị khóa sổ.");
                window.location.replace("../dashboard.html");
                return; 
            }
        }
    } catch (err) {
        console.warn("Bypass GET_SETTINGS due to network error");
    }

    // 2B. CHỐT CHẶN BẢO MẬT TẦNG 2: KIỂM TRA ĐỘC LẬP TỪNG BÀI NỘP
    try {
        const checkSubmission = await APIConnector.post("GET_SUBMISSION", {
            mssv_id: session.profile.mssv_id,
            session_name: CURRENT_SESSION_NUM,
            group_id: session.profile.group_id
        });

        if (checkSubmission && checkSubmission.status === "success") {
            if (checkSubmission.indFound) {
                executeIndividualLockdown(session.profile.mssv_id);
            }
            if (checkSubmission.grpFound) {
                executeGroupLockdown();
            }
            // 🌟 KHÔNG CÓ LỆNH RETURN Ở ĐÂY để toàn bộ kịch bản tab Nhóm bên dưới chạy bình thường
        }
    } catch (err) {
        console.error("Lỗi chốt chặn an ninh hoàn công: ", err);
    }

    // 3. LOGIC ĐIỀU HƯỚNG CHUYỂN TAB VAI TRÒ
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
                alert("⛔ Quyền hạn hạn chế: Chỉ Nhóm trưởng mới được nộp báo cáo nhóm!");
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

    // 4. THEO DÕI REAL-TIME SỐ LIỆU ĐỌC MIA CÁ NHÂN
    const READING_TOLERANCE = 3.0; 
    const indInputs = ["ind_r1", "ind_r2", "ind_r3", "ind_sau1", "ind_sau2", "ind_sau3"];

    const calculateStationAverage = () => {
        let r1 = DOMUtils.getNumberValue("ind_r1") || DOMUtils.getNumberValue("ind_sau1");
        let r2 = DOMUtils.getNumberValue("ind_r2") || DOMUtils.getNumberValue("ind_sau2");
        let r3 = DOMUtils.getNumberValue("ind_r3") || DOMUtils.getNumberValue("ind_sau3");

        if (!isNaN(r1) && !isNaN(r2) && !isNaN(r3)) {
            const measurementData = new Measurement("Số đọc mia", r1, r2, r3, READING_TOLERANCE);
            const avg = measurementData.getAverage();
            const qc = measurementData.validateQC();

            if (qc.passed) {
                DOMUtils.setText("ind_avg_display", `${avg.toFixed(1)} mm`, "text-success font-bold");
                DOMUtils.setText("ind_h_avg", `${(avg/1000).toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
                if (document.getElementById("btnSubmitIndividual")) document.getElementById("btnSubmitIndividual").disabled = false;
            } else {
                DOMUtils.setText("ind_avg_display", "VƯỢT HẠN MỨC", "text-danger font-bold");
                DOMUtils.setText("ind_h_avg", "VƯỢT SAI SỐ", "text-danger font-bold");
                const diffVal = Math.max(r1, r2, r3) - Math.min(r1, r2, r3);
                DOMUtils.showAlert("validationAlert", `🚨 BIÊN ĐỘ SAI SỐ THÔ: Độ lệch ${diffVal}mm vượt dung sai!`, "danger");
                if (document.getElementById("btnSubmitIndividual")) document.getElementById("btnSubmitIndividual").disabled = true;
            }
        }
    };

    indInputs.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) inputEl.addEventListener("input", calculateStationAverage);
    });

    // 5. THEO DÕI REAL-TIME SỐ LIỆU KHOẢNG CÁCH LƯỢNG CỰ NHÓM
    const grpInputs = ["grp_ct1", "grp_cd1", "grp_ct2", "grp_cd2", "grp_ct3", "grp_cd3"];
    
    const checkGroupInputs = () => {
        const ct1 = DOMUtils.getNumberValue("grp_ct1"); const cd1 = DOMUtils.getNumberValue("grp_cd1");
        const ct2 = DOMUtils.getNumberValue("grp_ct2"); const cd2 = DOMUtils.getNumberValue("grp_cd2");
        const ct3 = DOMUtils.getNumberValue("grp_ct3"); const cd3 = DOMUtils.getNumberValue("grp_cd3");

        let d1 = 0, d2 = 0, d3 = 0, validCount = 0, sumD = 0;
        const calcD = (t, b) => (t - b) / 10;

        if (!isNaN(ct1) && !isNaN(cd1)) {
            if (ct1 <= cd1) DOMUtils.setText("grp_d1_display", "LỖI MIA", "text-danger");
            else { d1 = calcD(ct1, cd1); DOMUtils.setText("grp_d1_display", `${d1.toFixed(3)} m`, "text-success"); sumD += d1; validCount++; }
        }
        if (!isNaN(ct2) && !isNaN(cd2)) {
            if (ct2 <= cd2) DOMUtils.setText("grp_d2_display", "LỖI MIA", "text-danger");
            else { d2 = calcD(ct2, cd2); DOMUtils.setText("grp_d2_display", `${d2.toFixed(3)} m`, "text-success"); sumD += d2; validCount++; }
        }
        if (!isNaN(ct3) && !isNaN(cd3)) {
            if (ct3 <= cd3) DOMUtils.setText("grp_d3_display", "LỖI MIA", "text-danger");
            else { d3 = calcD(ct3, cd3); DOMUtils.setText("grp_d3_display", `${d3.toFixed(3)} m`, "text-success"); sumD += d3; validCount++; }
        }

        if (validCount === 3) {
            const avgD = sumD / 3;
            const amplitude = MathUtils.calculateAmplitude([d1, d2, d3]);
            if (amplitude <= 0.2) {
                DOMUtils.setText("grp_d_avg", `${avgD.toFixed(3)} m`, "text-success font-bold");
                DOMUtils.hideAlert("validationAlert");
                if (document.getElementById("btnSubmitGroup")) document.getElementById("btnSubmitGroup").disabled = false;
            } else {
                DOMUtils.setText("grp_d_avg", "VƯỢT HẠN MỨC", "text-danger font-bold");
                DOMUtils.showAlert("validationAlert", `⚠️ Độ lệch lớn nhất là ${amplitude.toFixed(3)}m (Cho phép <= 0.2m).`, "danger");
                if (document.getElementById("btnSubmitGroup")) document.getElementById("btnSubmitGroup").disabled = true;
            }
        }
    };

    grpInputs.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) inputEl.addEventListener("input", checkGroupInputs);
    });

    // 6. XỬ LÝ SỰ KIỆN NÚT IN ẤN TRỰC TIẾP
    if (document.getElementById("btnPrintIndividual")) {
        document.getElementById("btnPrintIndividual").addEventListener("click", () => { window.print(); });
    }
    if (document.getElementById("btnPrintGroup")) {
        document.getElementById("btnPrintGroup").addEventListener("click", () => { window.print(); });
    }

    // 7A. LUỒNG XỬ LÝ SUBMIT BIỂU MẪU CÁ NHÂN
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", async (e) => {
            e.preventDefault();
            let r1 = DOMUtils.getNumberValue("ind_r1") || DOMUtils.getNumberValue("ind_sau1");
            let r2 = DOMUtils.getNumberValue("ind_r2") || DOMUtils.getNumberValue("ind_sau2");
            let r3 = DOMUtils.getNumberValue("ind_r3") || DOMUtils.getNumberValue("ind_sau3");
            let commentInput = document.getElementById("student_comment") || document.getElementById("ind_comment");
            const comment = commentInput ? commentInput.value.trim() : "";

            if (isNaN(r1) || !r1 || isNaN(r2) || isNaN(r3)) return;

            const measurementData = new Measurement("Số đọc mia", r1, r2, r3, READING_TOLERANCE);
            if (!measurementData.validateQC().passed) return;

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "⏳ ĐANG XỬ LÝ ẢNH & ĐỒNG BỘ...";
            btn.disabled = true;

            try {
                const selfieInput = document.getElementById("indSelfieFile");
                const instInput = document.getElementById("indInstFile");
                let selfieFirebaseUrl = "", instFirebaseUrl = "";
        
                if (selfieInput && selfieInput.files && selfieInput.files[0]) {
                    selfieFirebaseUrl = await FirebaseUploader.processAndUpload(selfieInput.files[0], `${session.profile.mssv_id}_Buoi1_Selfie`);
                }
                if (instInput && instInput.files && instInput.files[0]) {
                    instFirebaseUrl = await FirebaseUploader.processAndUpload(instInput.files[0], `${session.profile.mssv_id}_Buoi1_ChiKinh`);
                }

                const payload = {
                    session_name: CURRENT_SESSION_NUM, submit_type: "Cá nhân",
                    student_id: session.profile.mssv_id, student_name: session.profile.full_name, group_id: session.profile.group_id,
                    machine_type: "Máy Thủy Bình / Kinh Vĩ", target_name: "Mia thực nghiệm trạm đơn",
                    result_avg: { r1, r2, r3, average: measurementData.getAverage() },
                    qc_evaluation: `ĐẠT CHUẨN (Lệch: ${(Math.max(r1, r2, r3) - Math.min(r1, r2, r3))}mm)`,
                    r1_data: { reading: r1 }, r2_data: { reading: r2 }, r3_data: { reading: r3 },
                    individual_photo_url: selfieFirebaseUrl, group_photo_url: instFirebaseUrl, student_comment: comment
                };

                const response = await APIConnector.post("SAVE_DATA", payload);
                if (response && response.status === "success") {
                    alert("🎉 Ghi nhận thành công bài Cá Nhân vào Database Khoa.");
                    executeIndividualLockdown(session.profile.mssv_id); 
                } else {
                    alert(`⛔ Lỗi: ${response.message}`);
                    btn.innerHTML = "NỘP BÁO CÁO CÁ NHÂN"; btn.disabled = false;
                }
            } catch (err) {
                alert("🚨 Lỗi đường truyền: " + err);
                btn.innerHTML = "NỘP BÁO CÁO CÁ NHÂN"; btn.disabled = false;
            }
        });
    }

    // 7B. LUỒNG XỬ LÝ SUBMIT BIỂU MẪU NHÓM
    const formGrp = document.getElementById("groupForm");
    if (formGrp) {
        formGrp.addEventListener("submit", async (e) => {
            e.preventDefault();
            const ct1 = DOMUtils.getNumberValue("grp_ct1"); const cd1 = DOMUtils.getNumberValue("grp_cd1");
            const ct2 = DOMUtils.getNumberValue("grp_ct2"); const cd2 = DOMUtils.getNumberValue("grp_cd2");
            const ct3 = DOMUtils.getNumberValue("grp_ct3"); const cd3 = DOMUtils.getNumberValue("grp_cd3");

            if (isNaN(ct1) || isNaN(cd1) || isNaN(ct2) || isNaN(cd2) || isNaN(ct3) || isNaN(cd3)) return;

            const d1 = (ct1 - cd1) / 10, d2 = (ct2 - cd2) / 10, d3 = (ct3 - cd3) / 10;
            const avgDistance = (d1 + d2 + d3) / 3;
            const targetName = document.getElementById("grpTargetName") ? document.getElementById("grpTargetName").value : "Tuyến đo";
            const grpCommentInput = document.getElementById("grpComment") || document.getElementById("grp_comment");
            const comment = grpCommentInput ? grpCommentInput.value.trim() : "";

            const btn = document.getElementById("btnSubmitGroup");
            btn.innerHTML = "⏳ ĐANG XỬ LÝ ẢNH NHÓM...";
            btn.disabled = true;

            try {
                const grpInput = document.getElementById("grpPhotoFile");
                let grpFirebaseUrl = "";
                if (grpInput && grpInput.files && grpInput.files[0]) {
                    grpFirebaseUrl = await FirebaseUploader.processAndUpload(grpInput.files[0], `${session.profile.mssv_id}_Buoi1_Group`);
                }

                const payload = {
                    session_name: CURRENT_SESSION_NUM, submit_type: "Nhóm",
                    student_id: session.profile.mssv_id, student_name: session.profile.full_name, group_id: session.profile.group_id,
                    machine_type: "Đo khoảng cách lượng cự", target_name: targetName,
                    result_avg: { d1_m: d1, d2_m: d2, d3_m: d3, khoang_cach_trung_binh_m: avgDistance },
                    qc_evaluation: "ĐẠT CHUẨN HÌNH HỌC", individual_photo_url: "", group_photo_url: grpFirebaseUrl,
                    student_comment: `Báo cáo tập thể. ${comment}`
                };

                const response = await APIConnector.post("SAVE_DATA", payload);
                if (response && response.status === "success") {
                    alert("🎉 Sổ đo nhóm đã nộp thành công!");
                    executeGroupLockdown();
                } else {
                    alert(`⛔ Lỗi: ${response.message}`);
                    btn.innerHTML = "NỘP BÁO CÁO NHÓM"; btn.disabled = false;
                }
            } catch (err) {
                alert("🚨 Lỗi: " + err);
                btn.innerHTML = "NỘP BÁO CÁO NHÓM"; btn.disabled = false;
            }
        });
    }
});

// KHÓA SỔ BIỆT LẬP FORM CÁ NHÂN
function executeIndividualLockdown(mssvId) {
    DOMUtils.showAlert("validationAlert", `⚠️ HỆ THỐNG KHÓA SỔ CÁ NHÂN: Bạn đã hoàn tất nộp số liệu Cá nhân Buổi 1.`, "warning");
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.querySelectorAll("input, textarea, select").forEach(el => {
            el.disabled = true; el.style.backgroundColor = "#f1f5f9"; 
        });
    }
    const btnSubmitInd = document.getElementById("btnSubmitIndividual");
    if (btnSubmitInd) {
        btnSubmitInd.disabled = true; btnSubmitInd.innerHTML = "🔒 SỐ LIỆU CÁ NHÂN ĐÃ KHÓA";
        btnSubmitInd.className = "btn btn-secondary cursor-not-allowed";
    }
    // Hiện nút xuất PDF
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

// KHÓA SỔ BIỆT LẬP FORM NHÓM
function executeGroupLockdown() {
    const formGrp = document.getElementById("groupForm");
    if (formGrp) {
        formGrp.querySelectorAll("input, textarea, select").forEach(el => {
            el.disabled = true; el.style.backgroundColor = "#f1f5f9"; 
        });
    }
    const btnSubmitGrp = document.getElementById("btnSubmitGroup");
    if (btnSubmitGrp) {
        btnSubmitGrp.disabled = true; btnSubmitGrp.innerHTML = "🔒 SỐ LIỆU NHÓM ĐÃ KHÓA";
        btnSubmitGrp.className = "btn btn-secondary cursor-not-allowed";
    }
}
