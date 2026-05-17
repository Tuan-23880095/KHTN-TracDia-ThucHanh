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
    const sectionInd = document.getElementById("sectionIndividual");
    const sectionGrp = document.getElementById("sectionGroup");

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
                    const avg = measurementData.calculateAverage();
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

    // 4. THEO DÕI REAL-TIME SỐ LIỆU KHOẢNG CÁCH LƯỢNG CỰ CỦA NHÓM
    const grpInputs = ["grp_top", "grp_bottom"];
    grpInputs.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
            inputEl.addEventListener("input", () => {
                const top = DOMUtils.getNumberValue("grp_top"); // Chỉ số trên
                const bottom = DOMUtils.getNumberValue("grp_bottom"); // Chỉ số dưới

                if (!isNaN(top) && !isNaN(bottom)) {
                    if (top < bottom) {
                        DOMUtils.setText("grp_d_avg", "LỖI MIA", "text-danger font-bold");
                        DOMUtils.showAlert("validationAlert", "Lỗi: Chỉ số trên không thể nhỏ hơn chỉ số dưới!", "danger");
                        return;
                    }
                    // Công thức lượng cự ngắm ngang hình học: D = (Chỉ trên - Chỉ dưới) * 100
                    const distance = (top - bottom) * 100;
                    DOMUtils.setText("grp_d_avg", `${distance.toFixed(2)} m`, "text-success font-bold");
                    DOMUtils.hideAlert("validationAlert");
                }
            });
        }
    });

    // 5. XỬ LÝ SỰ KIỆN SUBMIT BIỂU MẪU - ĐỒNG BỘ REAL-TIME LÊN CLOUD DATA
    
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
                result_avg: { r1, r2, r3, average: measurementData.calculateAverage() },
                qc_evaluation: `ĐẠT CHUẨN (Biên độ lệch: ${qcCheck.message})`,
                individual_photo_base64: selfieImg.startsWith("data:image") ? selfieImg : "",
                group_photo_base64: instImg.startsWith("data:image") ? instImg : "",
                student_comment: comment
            };

            try {
                const response = await APIConnector.post("SAVE_DATA", payload);
                if (response && response.status === "success") {
                    alert("🎉 Chúc mừng! Kết quả thực tập cá nhân Buổi 1 đã ghi nhận thành công vào Google Sheets.");
                    window.location.href = "dashboard.html";
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

    // Luồng B: Xử lý nộp dữ liệu NHÓM
    const formGrp = document.getElementById("groupForm");
    if (formGrp) {
        formGrp.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!UserAuth.hasAccess("leader")) {
                alert("⛔ Bạn không có đặc quyền nộp biểu mẫu này!");
                return;
            }

            const top = DOMUtils.getNumberValue("grp_top");
            const bottom = DOMUtils.getNumberValue("grp_bottom");
            const comment = document.getElementById("grp_comment") ? document.getElementById("grp_comment").value : "";
            const grpImg = document.getElementById("grpPhotoPreview") ? document.getElementById("grpPhotoPreview").src : "";

            if (isNaN(top) || !top || isNaN(bottom) || !bottom) {
                alert("Vui lòng điền đầy đủ dữ liệu chỉ tiêu kỹ thuật đo lượng cự!");
                return;
            }

            const btn = document.getElementById("btnSubmitGroup");
            btn.innerHTML = "⏳ ĐANG ĐỒNG BỘ SỔ ĐO NHÓM...";
            btn.disabled = true;

            const calculatedDistance = (top - bottom) * 100;

            const payload = {
                session_name: "1",
                submit_type: "Nhóm",
                student_id: session.profile.mssv_id, // MSSV của nhóm trưởng đại diện nộp
                student_name: session.profile.full_name,
                group_id: session.profile.group_id,
                machine_type: "Đo khoảng cách lượng cự ngắm ngang",
                target_name: "Tuyến đo thực địa nội khu",
                result_avg: { chỉ_trên: top, chỉ_dưới: bottom, khoảng_cách_m: calculatedDistance },
                qc_evaluation: "ĐẠT CHUẨN HÌNH HỌC",
                individual_photo_base64: "",
                group_photo_base64: grpImg.startsWith("data:image") ? grpImg : "",
                student_comment: `Báo cáo tập thể nhóm. ${comment}`
            };

            try {
                const response = await APIConnector.post("SAVE_DATA", payload);
                if (response && response.status === "success") {
                    alert("🎉 Sổ đo ngoại nghiệp tập thể Nhóm đã được nộp và lưu trữ thành công!");
                    window.location.href = "dashboard.html";
                } else {
                    alert(`⛔ Lỗi: ${response.message}`);
                    btn.innerHTML = "NỘP BÁO CÁO NHÓM ➜";
                    btn.disabled = false;
                }
            } catch (err) {
                alert("🚨 Thất bại: Đường truyền kết nối API lên Cloud bị ngắt quãng!");
                btn.innerHTML = "NỘP BÁO CÁO NHÓM ➜";
                btn.disabled = false;
            }
        });
    }
});
