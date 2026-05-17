/**
 * ==========================================================================
 * FILE: js/controllers/session1Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 1 (Giới thiệu Máy Kinh Vĩ & Thủy Bình)
 * KIẾN TRÚC: MVC - Lớp Controller kết nối dữ liệu từ session-1.html xuống Model
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. KIỂM TRA BẢO MẬT & ĐỔ HỒ SƠ TÀI KHOẢN KHÁCH HÀNG
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
            // Lấy trạng thái cấu hình riêng của "session_1" từ Sheet Settings
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
            // Khớp nguyên tắc Fail-Closed khi API lỗi dữ liệu
            if (!UserAuth.hasAccess("teacher")) {
                alert("⚠️ Hệ thống đang cấu hình khẩn cấp. Vui lòng quay lại sau!");
                window.location.replace("../dashboard.html");
                return;
            }
        }
    } catch (err) {
        console.error("Lỗi xác thực cấu hình bảo mật: ", err);
        // Khớp nguyên tắc Fail-Closed khi mất kết nối mạng toàn cục
        if (!UserAuth.hasAccess("teacher")) {
            alert("⚠️ Không có kết nối mạng để xác thực trạng thái biểu mẫu. Hệ thống tự động đóng băng!");
            window.location.replace("../dashboard.html");
            return;
        }
    }

    // Khởi tạo các khung xem trước ảnh minh chứng thực địa
    DOMUtils.setupImagePreview("indSelfieFile", "indSelfiePreview");
    DOMUtils.setupImagePreview("indInstFile", "indInstPreview");
    DOMUtils.setupImagePreview("grpPhotoFile", "grpPhotoPreview");

    // 2. LOGIC ĐIỀU HƯỚNG CHUYỂN TAB VAI TRÒ (Cá nhân / Nhóm)
    const tabIndBtn = document.getElementById("tabIndividualBtn");
    const tabGrpBtn = document.getElementById("tabGroupBtn");
    const sectionInd = document.getElementById("individualForm");
    const sectionGrp = document.getElementById("groupForm");

    if (tabIndBtn && tabGrpBtn && sectionInd && sectionGrp) {
        tabIndBtn.addEventListener("click", () => {
            tabIndBtn.className = "tab-btn active";
            tabGrpBtn.className = "tab-btn";
            sectionInd.classList.remove("hidden");
            sectionGrp.classList.add("hidden");
        });

        tabGrpBtn.addEventListener("click", () => {
            // Chốt chặn phân quyền: Chỉ Nhóm trưởng hoặc Giảng viên mới được thao tác tab Nhóm
            if (!UserAuth.hasAccess("leader")) {
                alert("⛔ Quyền hạn hạn chế: Chỉ Nhóm trưởng (Leader) mới được quyền nhập và nộp báo cáo thực đạc của nhóm!");
                return;
            }
            tabGrpBtn.className = "tab-btn active";
            tabIndBtn.className = "tab-btn";
            sectionGrp.classList.remove("hidden");
            sectionInd.classList.add("hidden");
        });
    }

    // 3. THEO DÕI REAL-TIME SỐ LIỆU ĐỌC MIA CÁ NHÂN (Tính toán tự động và Kiểm định QC)
    const indInputs = ["ind_r1", "ind_r2", "ind_r3"];
    indInputs.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
            inputEl.addEventListener("input", () => {
                const r1 = DOMUtils.getNumberValue("ind_r1");
                const r2 = DOMUtils.getNumberValue("ind_r2");
                const r3 = DOMUtils.getNumberValue("ind_r3");

                // Chỉ thực hiện tính toán khi sinh viên điền đủ 3 lần đọc độc lập
                if (!isNaN(r1) && !isNaN(r2) && !isNaN(r3)) {
                    // Buổi 1: Giới hạn chênh lệch tối đa giữa các lần ngắm ngẫu nhiên là 3.0 mm
                    const measurementData = new Measurement("Số đọc mia cá nhân", r1, r2, r3, 3.0);
                    const avg = measurementData.getAverage();
                    const qc = measurementData.validateQC();

                    if (qc.passed) {
                        DOMUtils.setText("ind_avg_display", `${avg.toFixed(1)} mm`, "text-success font-bold");
                        DOMUtils.hideAlert("validationAlert");
                        document.getElementById("btnSubmitIndividual").disabled = false;
                    } else {
                        DOMUtils.setText("ind_avg_display", "VƯỢT HẠN MỨC", "text-danger font-bold");
                        DOMUtils.showAlert("validationAlert", `⚠️ Sai số thô thực địa: ${qc.message}`, "danger");
                        document.getElementById("btnSubmitIndividual").disabled = true;
                    }
                }
            });
        }
    });

    // =========================================================================
    // 4. THEO DÕI REAL-TIME SỐ LIỆU KHOẢNG CÁCH LƯỢNG CỰ CỦA NHÓM (3 LẦN ĐO)
    // =========================================================================
    const grpInputs = ["grp_ct1", "grp_cd1", "grp_ct2", "grp_cd2", "grp_ct3", "grp_cd3"];
    grpInputs.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
            inputEl.addEventListener("input", () => {
                // Lấy giá trị 3 lần đo
                const ct1 = DOMUtils.getNumberValue("grp_ct1");
                const cd1 = DOMUtils.getNumberValue("grp_cd1");
                const ct2 = DOMUtils.getNumberValue("grp_ct2");
                const cd2 = DOMUtils.getNumberValue("grp_cd2");
                const ct3 = DOMUtils.getNumberValue("grp_ct3");
                const cd3 = DOMUtils.getNumberValue("grp_cd3");

                let d1 = 0, d2 = 0, d3 = 0;
                let validCount = 0;
                let sumD = 0;

                // Công thức tính khoảng cách D (mét): (Chỉ trên_mm - Chỉ dưới_mm) / 10
                const calcD = (t, b) => (t - b) / 10;

                // Xử lý Lần 1
                if (!isNaN(ct1) && !isNaN(cd1)) {
                    if (ct1 <= cd1) {
                        DOMUtils.setText("grp_d1_display", "LỖI MIA", "text-danger font-bold");
                    } else {
                        d1 = calcD(ct1, cd1);
                        DOMUtils.setText("grp_d1_display", `${d1.toFixed(3)} m`, "text-success");
                        sumD += d1; validCount++;
                    }
                } else { DOMUtils.setText("grp_d1_display", "0.000 m", "text-muted"); }

                // Xử lý Lần 2
                if (!isNaN(ct2) && !isNaN(cd2)) {
                    if (ct2 <= cd2) {
                        DOMUtils.setText("grp_d2_display", "LỖI MIA", "text-danger font-bold");
                    } else {
                        d2 = calcD(ct2, cd2);
                        DOMUtils.setText("grp_d2_display", `${d2.toFixed(3)} m`, "text-success");
                        sumD += d2; validCount++;
                    }
                } else { DOMUtils.setText("grp_d2_display", "0.000 m", "text-muted"); }

                // Xử lý Lần 3
                if (!isNaN(ct3) && !isNaN(cd3)) {
                    if (ct3 <= cd3) {
                        DOMUtils.setText("grp_d3_display", "LỖI MIA", "text-danger font-bold");
                    } else {
                        d3 = calcD(ct3, cd3);
                        DOMUtils.setText("grp_d3_display", `${d3.toFixed(3)} m`, "text-success");
                        sumD += d3; validCount++;
                    }
                } else { DOMUtils.setText("grp_d3_display", "0.000 m", "text-muted"); }

                // Đánh giá QC khi đã nhập đủ 3 lần
                if (validCount === 3) {
                    const avgD = sumD / 3;
                    const amplitude = MathUtils.calculateAmplitude([d1, d2, d3]);
                    const tolerance = 0.2; // Cho phép chênh lệch tối đa 0.2m (20cm) giữa các lần đo

                    if (amplitude <= tolerance) {
                        DOMUtils.setText("grp_d_avg", `${avgD.toFixed(3)} m`, "text-success font-bold");
                        DOMUtils.hideAlert("validationAlert");
                        if (document.getElementById("btnSubmitGroup")) document.getElementById("btnSubmitGroup").disabled = false;
                    } else {
                        DOMUtils.setText("grp_d_avg", "VƯỢT HẠN MỨC", "text-danger font-bold");
                        DOMUtils.showAlert("validationAlert", `⚠️ Sai số quá lớn! Độ lệch lớn nhất giữa các lần đo là ${amplitude.toFixed(3)}m (Cho phép $\\le 0.2m$). Yêu cầu đo lại!`, "danger");
                        if (document.getElementById("btnSubmitGroup")) document.getElementById("btnSubmitGroup").disabled = true;
                    }
                } else {
                    DOMUtils.setText("grp_d_avg", "Chưa đủ dữ liệu", "text-muted font-bold");
                    DOMUtils.hideAlert("validationAlert");
                    if (document.getElementById("btnSubmitGroup")) document.getElementById("btnSubmitGroup").disabled = true;
                }
            });
        }
    });

    // 5. XỬ LÝ SỰ KIỆN SUBMIT BIỂU MẪU - ĐỒNG BỘ REAL-TIME LÊN CLOUD DATA
    // =========================================================================
    // LUỒNG XỬ LÝ SỰ KIỆN NÚT IN ẤN CÁ NHÂN
    // =========================================================================
    const btnPrintInd = document.getElementById("btnPrintIndividual");
    if (btnPrintInd) {
        btnPrintInd.addEventListener("click", () => {
            // Kiểm tra điều kiện: Sinh viên phải nhập đủ số liệu mới cho phép in
            const r1 = DOMUtils.getNumberValue("ind_r1");
            const r2 = DOMUtils.getNumberValue("ind_r2");
            const r3 = DOMUtils.getNumberValue("ind_r3");
            const machineType = document.getElementById("indMachineType").value;
            const targetName = document.getElementById("indTargetName").value;

            if (!machineType || !targetName || isNaN(r1) || isNaN(r2) || isNaN(r3)) {
                alert("⚠️ Vui lòng hoàn thành đầy đủ thông tin thiết bị, mục tiêu và 3 lần đọc mia trước khi xuất phiếu in!");
                return;
            }

            // GỌI HÀM XUẤT FILE 
            // Cách 1: Sử dụng lệnh in tiêu chuẩn của trình duyệt (Tận dụng tệp css/a4-print.css đã nhúng sẵn)
            window.print();

            // Cách 2: Nếu file js/utils/pdfExport.js của hệ thống đã định nghĩa một hàm/Class riêng
            // (Ví dụ như: pdfExport.generateIndividualReport() ), bạn hãy mở comment dòng dưới và cấu hình:
            // if (typeof pdfExport !== "undefined") {
            //     pdfExport.exportIndividualForm();
            // }
        });
    }
    // Luồng A: Xử lý nộp dữ liệu CÁ NHÂN
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const r1 = DOMUtils.getNumberValue("ind_r1");
            const r2 = DOMUtils.getNumberValue("ind_r2");
            const r3 = DOMUtils.getNumberValue("ind_r3");
            const comment = document.getElementById("ind_comment") ? document.getElementById("ind_comment").value : "";
            
            // Lấy dữ liệu ảnh Base64 từ vùng preview (nếu có)
            const selfieImg = document.getElementById("indSelfiePreview") ? document.getElementById("indSelfiePreview").src : "";
            const instImg = document.getElementById("indInstPreview") ? document.getElementById("indInstPreview").src : "";

            const measurementData = new Measurement("Số đọc mia cá nhân", r1, r2, r3, 3.0);
            const qcCheck = measurementData.validateQC();
            
            if (!qcCheck.passed) {
                DOMUtils.showAlert("validationAlert", "Lỗi nghiêm trọng: Số liệu hiện tại vi phạm bareme dung sai của Bộ môn. Không thể nộp bài!", "danger");
                return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "⏳ ĐANG ĐỒNG BỘ CLOUD...";
            btn.disabled = true;

            // Đóng gói gói tin chuẩn cấu hình API router phía GAS Server
            const payload = {
                session_name: "1", // Định danh Buổi 1
                submit_type: "Cá nhân",
                student_id: session.profile.mssv_id,
                student_name: session.profile.full_name,
                group_id: session.profile.group_id,
                machine_type: "Máy Thủy Bình / Kinh Vĩ",
                target_name: "Mia thực nghiệm trạm đơn",
                result_avg: { r1, r2, r3, average: measurementData.getAverage() },
                qc_evaluation: `ĐẠT CHUẨN (Biên độ lệch: ${qcCheck.message})`,
                individual_photo_base64: selfieImg.startsWith("data:image") ? selfieImg : "",
                group_photo_base64: instImg.startsWith("data:image") ? instImg : "",
                student_comment: comment
            };

            try {
                const response = await APIConnector.post("SAVE_DATA", payload);
                if (response && response.status === "success") {
                    alert("🎉 Chúc mừng! Kết quả thực tập cá nhân Buổi 1 đã ghi nhận thành công vào Google Sheets.");
                    window.location.href = "../dashboard.html";
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
    // 5B. LUỒNG B: XỬ LÝ NỘP DỮ LIỆU NHÓM LÊN SERVER
    // =========================================================================
    const formGrp = document.getElementById("groupForm");
    if (formGrp) {
        formGrp.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!UserAuth.hasAccess("leader") && !UserAuth.hasAccess("teacher")) {
                alert("⛔ Bạn không có đặc quyền nộp biểu mẫu này!");
                return;
            }

            // Lấy lại giá trị lúc submit
            const ct1 = DOMUtils.getNumberValue("grp_ct1");
            const cd1 = DOMUtils.getNumberValue("grp_cd1");
            const ct2 = DOMUtils.getNumberValue("grp_ct2");
            const cd2 = DOMUtils.getNumberValue("grp_cd2");
            const ct3 = DOMUtils.getNumberValue("grp_ct3");
            const cd3 = DOMUtils.getNumberValue("grp_cd3");

            if (isNaN(ct1) || isNaN(cd1) || isNaN(ct2) || isNaN(cd2) || isNaN(ct3) || isNaN(cd3)) {
                alert("Vui lòng điền đầy đủ dữ liệu chỉ tiêu kỹ thuật đo lượng cự 3 lần!");
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
                session_name: "1",
                submit_type: "Nhóm",
                student_id: session.profile.mssv_id,
                student_name: session.profile.full_name,
                group_id: session.profile.group_id,
                machine_type: "Đo khoảng cách lượng cự ngắm ngang",
                target_name: targetName,
                result_avg: { 
                    d1_m: d1, 
                    d2_m: d2, 
                    d3_m: d3, 
                    khoang_cach_trung_binh_m: avgDistance 
                },
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
