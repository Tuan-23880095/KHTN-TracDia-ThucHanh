/**
 * ==========================================================================
 * FILE: js/controllers/session2Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 2 (Thao tác cân bằng & định tâm)
 * KIẾN TRÚC: MVC - Xử lý logic đồng hồ bấm giờ, bắt sự kiện gõ số và QC tự động.
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
    // 3. MODULE ĐỒNG HỒ BẤM GIỜ THỰC ĐỊA (STOPWATCH)
    // ==========================================
    let startTime, updatedTime, difference = 0, tInterval, running = false;
    const stopwatchDisplay = document.getElementById("stopwatchDisplay");
    
    document.getElementById("btnTimerStart").addEventListener("click", () => {
        if (!running) {
            startTime = new Date().getTime() - difference;
            tInterval = setInterval(updateTime, 10); // Cập nhật mỗi 10ms
            running = true;
            DOMUtils.setText("stopwatchDisplay", "00:00.0", "text-danger"); // Hiện màu đỏ khi đang chạy
        }
    });

    document.getElementById("btnTimerStop").addEventListener("click", () => {
        if (running) {
            clearInterval(tInterval);
            running = false;
            stopwatchDisplay.classList.remove("text-danger");
            stopwatchDisplay.style.color = "#b45309"; // Trả về màu cam ban đầu
            
            // TÍNH NĂNG THÔNG MINH: Tự động điền số giây vào ô trống đầu tiên
            autoFillEmptyTimeSlot(difference / 1000);
        }
    });

    document.getElementById("btnTimerReset").addEventListener("click", () => {
        clearInterval(tInterval);
        running = false;
        difference = 0;
        stopwatchDisplay.innerHTML = "00:00.0";
        stopwatchDisplay.style.color = "#b45309";
    });

    function updateTime() {
        updatedTime = new Date().getTime();
        difference = updatedTime - startTime;
        
        let minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((difference % (1000 * 60)) / 1000);
        let milliseconds = Math.floor((difference % 1000) / 100); // Lấy 1 chữ số thập phân
        
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;
        
        stopwatchDisplay.innerHTML = `${minutes}:${seconds}.${milliseconds}`;
    }

    function autoFillEmptyTimeSlot(totalSeconds) {
        // Tự động tìm ô t1, t2, t3 xem ô nào trống thì nhét kết quả bấm giờ vào
        for (let i = 1; i <= 3; i++) {
            const inputEl = document.getElementById(`ind_t${i}`);
            if (inputEl && inputEl.value === "") {
                inputEl.value = MathUtils.round(totalSeconds, 1);
                // Kích hoạt sự kiện 'input' để module tự động chạy hàm tính trung bình bên dưới
                inputEl.dispatchEvent(new Event('input'));
                break;
            }
        }
    }


    // ==========================================
    // 4. TÍNH TOÁN REAL-TIME: PHẦN CÁ NHÂN (THỜI GIAN & ĐỘ LỆCH TÂM)
    // ==========================================
    const indInputs = [
        "ind_t1", "ind_t2", "ind_t3", 
        "ind_e1", "ind_e2", "ind_e3"
    ].map(id => document.getElementById(id));

    indInputs.forEach(input => {
        if (!input) return;
        input.addEventListener("input", () => {
            const t1 = DOMUtils.getNumberValue("ind_t1");
            const t2 = DOMUtils.getNumberValue("ind_t2");
            const t3 = DOMUtils.getNumberValue("ind_t3");
            const e1 = DOMUtils.getNumberValue("ind_e1");
            const e2 = DOMUtils.getNumberValue("ind_e2");
            const e3 = DOMUtils.getNumberValue("ind_e3");

            let isError = false;
            let errorMsg = "";

            // Tính trung bình thời gian
            const validT = [t1, t2, t3].filter(v => !isNaN(v));
            if (validT.length > 0) {
                const avgT = MathUtils.calculateAverage(validT);
                DOMUtils.setText("ind_t_avg", `${avgT.toFixed(1)} giây`, "text-primary font-bold");
            } else {
                DOMUtils.setText("ind_t_avg", "0.0 giây");
            }

            // Tính trung bình độ lệch tâm và RÀNG BUỘC QC (e <= 2mm)
            const validE = [e1, e2, e3].filter(v => !isNaN(v));
            if (validE.length > 0) {
                const avgE = MathUtils.calculateAverage(validE);
                DOMUtils.setText("ind_e_avg", `${avgE.toFixed(1)} mm`, "text-primary font-bold");
                
                // Kiểm định độ lệch tâm của từng lần (Anti-Cheat / Quality Control)
                validE.forEach((e_val, index) => {
                    if (e_val > 2.0) {
                        isError = true;
                        errorMsg = `🚨 Lỗi Lần đo ${index + 1}: Độ lệch tâm $e = ${e_val}mm$ vượt quá hạn mức cho phép ($\\le 2mm$). Yêu cầu làm lệch máy và cân lại!`;
                    }
                });
            } else {
                DOMUtils.setText("ind_e_avg", "0.0 mm");
            }

            // Hiển thị hộp thông báo
            if (isError) {
                DOMUtils.showAlert("validationAlert", errorMsg, "danger");
            } else {
                DOMUtils.hideAlert("validationAlert");
            }
        });
    });


    // ==========================================
    // 5. TÍNH TOÁN REAL-TIME: PHẦN NHÓM (KPI SÂN ĐO)
    // ==========================================
    const grpTime = document.getElementById("grpBestTime");
    const grpEccentricity = document.getElementById("grpMaxEccentricity");

    const validateGroup = () => {
        const bestTime = DOMUtils.getNumberValue("grpBestTime");
        const maxE = DOMUtils.getNumberValue("grpMaxEccentricity");
        
        let msg = [];
        if (!isNaN(bestTime) && bestTime > 120) {
            msg.push(`⚠️ Thời gian tốt nhất của nhóm (${bestTime}s) chưa đạt chuẩn kỹ sư giỏi ($< 120$s).`);
        }
        if (!isNaN(maxE) && maxE > 2.0) {
            msg.push(`🚨 Có thành viên vi phạm quy chuẩn định tâm (Lệch tâm lớn nhất $= ${maxE}mm > 2.0mm$). Bắt buộc huấn luyện lại.`);
        }

        if (msg.length > 0) {
            // Thể hiện thông báo dạng list nếu có nhiều lỗi
            DOMUtils.showAlert("validationAlert", msg.join("<br>"), "danger");
        } else if (!isNaN(bestTime) && !isNaN(maxE)) {
            DOMUtils.showAlert("validationAlert", `✅ Nhóm đạt chuẩn nghiệm thu sân đo Buổi 2.`, "success");
        } else {
            DOMUtils.hideAlert("validationAlert");
        }
    };

    if (grpTime) grpTime.addEventListener("input", validateGroup);
    if (grpEccentricity) grpEccentricity.addEventListener("input", validateGroup);


    // ==========================================
    // 6. XỬ LÝ SỰ KIỆN SUBMIT (CÁ NHÂN)
    // ==========================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Re-validate dữ liệu trước khi nộp
            const e1 = DOMUtils.getNumberValue("ind_e1");
            const e2 = DOMUtils.getNumberValue("ind_e2");
            const e3 = DOMUtils.getNumberValue("ind_e3");
            const validE = [e1, e2, e3].filter(v => !isNaN(v));
            
            if (validE.length < 3) {
                DOMUtils.showAlert("validationAlert", "Lỗi: Bạn chưa thực hiện đủ 3 lần đo thời gian và độ lệch tâm.", "danger");
                return;
            }

            const isFailed = validE.some(val => val > 2.0);
            if (isFailed) {
                DOMUtils.showAlert("validationAlert", "Không thể nộp bài! Độ lệch tâm của bạn đang vượt quá tiêu chuẩn $2.0mm$.", "danger");
                return;
            }

            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "ĐANG ĐỒNG BỘ DỮ LIỆU...";
            btn.disabled = true;

            setTimeout(() => {
                alert("Nộp dữ liệu thành công! Trí nhớ cơ bắp của bạn đã được ghi nhận.");
                window.location.href = "../dashboard.html";
            }, 1000);
        });
    }
});
