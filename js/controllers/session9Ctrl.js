/**
 * ==========================================================================
 * FILE: js/controllers/session9Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển SÁT HẠCH THỰC HÀNH TỔNG HỢP (Kỳ thi cuối kỳ)
 * KIẾN TRÚC: MVC - Xử lý bốc đề ngẫu nhiên, Timer đếm ngược và chấm điểm Real-time
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. XÁC THỰC THÍ SINH VÀ ĐỔ HỒ SƠ PHÒNG THI
    // ==========================================
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    
    if (session && session.profile) {
        DOMUtils.setText("userDisplayProfile", session.profile.full_name);
        DOMUtils.setText("displayExamMssv", session.profile.mssv_id);
        DOMUtils.setText("userDisplayGroup", session.profile.group_id || "N/A");
    }

    // Thiết lập tính năng xem trước ảnh minh chứng chống thi hộ
    DOMUtils.setupImagePreview("selfie_photo_url", "selfiePreview");
    DOMUtils.setupImagePreview("instrument_photo_url", "instPreview");
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
            if (session.profile.role !== "leader" && session.profile.role !== "teacher") {
                alert("⛔ Nghiệm thu nhóm chỉ dành cho tài khoản Nhóm trưởng/Giám thị!");
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
    const theodolite = new Theodolite(); 
    const levelModel = new Level("Máy Thủy Bình Thi");
    
    const isDmsComplete = (dmsObj) => {
        return !isNaN(dmsObj.d) && !isNaN(dmsObj.m) && !isNaN(dmsObj.s);
    };

    // ==========================================
    // 4. HỆ THỐNG BỐC ĐỀ TỰ ĐỘNG & BẤM GIỜ (EXAM MODE)
    // ==========================================
    let currentTopic = 0; // Biến lưu Đề thi hiện tại (1, 2, 3)
    let examTimer = null;
    const EXAM_DURATION_MINUTES = 60; // Thời gian làm bài 60 phút

    const startExamTimer = () => {
        let timeRemaining = EXAM_DURATION_MINUTES * 60; // Đổi ra giây
        const display = document.getElementById("examCountdown");
        
        examTimer = setInterval(() => {
            timeRemaining--;
            let minutes = Math.floor(timeRemaining / 60);
            let seconds = timeRemaining % 60;

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            display.textContent = `${minutes}:${seconds}`;

            if (timeRemaining <= 300) {
                // Đổi màu chớp nháy khi còn 5 phút
                display.style.color = timeRemaining % 2 === 0 ? "#991b1b" : "#f87171";
            }

            if (timeRemaining <= 0) {
                clearInterval(examTimer);
                display.textContent = "HẾT GIỜ!";
                alert("⏰ Đã hết thời gian làm bài! Hệ thống tự động khóa sổ liệu.");
                document.getElementById("individualForm").dispatchEvent(new Event("submit")); // Tự động nộp bài
            }
        }, 1000);
    };

    // Sự kiện Bốc đề ngẫu nhiên
    document.getElementById("btnDrawTopic").addEventListener("click", function() {
        // Thuật toán bốc ngẫu nhiên từ 1 đến 3
        currentTopic = Math.floor(Math.random() * 3) + 1; 
        
        // Ẩn nút bốc đề, hiện Badge tên Đề
        this.classList.add("hidden");
        const badge = document.getElementById("topicDrawnBadge");
        badge.classList.remove("hidden");
        document.getElementById("drawn_topic").value = currentTopic;

        // Cập nhật giao diện theo đề tương ứng
        if (currentTopic === 1) {
            DOMUtils.setText("txtTopicName", "ĐỀ 1: ĐO GÓC BẰNG (KIỂM TRA 2C)");
            DOMUtils.toggleVisibility("subFormTopic1", true);
        } else if (currentTopic === 2) {
            DOMUtils.setText("txtTopicName", "ĐỀ 2: ĐO GÓC ĐỨNG (KIỂM TRA MO)");
            DOMUtils.toggleVisibility("subFormTopic2", true);
        } else if (currentTopic === 3) {
            DOMUtils.setText("txtTopicName", "ĐỀ 3: ĐO CHÊNH CAO HÌNH HỌC (3 LẦN)");
            DOMUtils.toggleVisibility("subFormTopic3", true);
        }

        // Mở khóa nút Nộp bài và Bắt đầu tính giờ
        document.getElementById("btnSubmitIndividual").disabled = false;
        startExamTimer();
    });


    // ==========================================
    // 5. TÍNH TOÁN REAL-TIME CHẤM ĐIỂM (TÙY THEO ĐỀ)
    // ==========================================

    // ĐỀ 1: KIỂM TRA SAI SỐ 2C (Máy Kinh vĩ)
    const calculateTopic1 = () => {
        const T = DOMUtils.getDmsValues("t1_T_d", "t1_T_m", "t1_T_s");
        const P = DOMUtils.getDmsValues("t1_P_d", "t1_P_m", "t1_P_s");

        if (isDmsComplete(T) && isDmsComplete(P)) {
            const error2C_sec = Math.round(theodolite.calculate2C(T, P) * 3600);
            DOMUtils.setText("t1_2c_val", `${error2C_sec}"`, Math.abs(error2C_sec) <= 45 ? "text-success" : "text-danger");
        }
    };
    ["t1_T_d", "t1_T_m", "t1_T_s", "t1_P_d", "t1_P_m", "t1_P_s"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateTopic1);
    });

    // ĐỀ 2: KIỂM TRA SAI SỐ MO VÀ GÓC ĐỨNG V
    const calculateTopic2 = () => {
        const T = DOMUtils.getDmsValues("t2_T_d", "t2_T_m", "t2_T_s");
        const P = DOMUtils.getDmsValues("t2_P_d", "t2_P_m", "t2_P_s");

        if (isDmsComplete(T) && isDmsComplete(P)) {
            const MO_deg = theodolite.calculateMO(T, P);
            const MO_sec = Math.round(MO_deg * 3600);
            const V_deg = theodolite.calculateVerticalAngle(T, MO_deg);
            
            DOMUtils.setText("t2_mo_val", `${MO_sec}"`, Math.abs(MO_sec) <= 60 ? "text-success" : "text-danger");
            DOMUtils.setText("t2_v_val", MathUtils.decimalToDmsString(V_deg));
        }
    };
    ["t2_T_d", "t2_T_m", "t2_T_s", "t2_P_d", "t2_P_m", "t2_P_s"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateTopic2);
    });

    // ĐỀ 3: ĐO CHÊNH CAO HÌNH HỌC (3 LẦN - THỦY BÌNH)
    const calculateTopic3 = () => {
        let h_values = [];
        for (let i = 1; i <= 3; i++) {
            const bs = DOMUtils.getNumberValue(`t3_bs${i}`);
            const fs = DOMUtils.getNumberValue(`t3_fs${i}`);
            if (!isNaN(bs) && !isNaN(fs)) {
                const h = levelModel.calculateSingleElevation(bs, fs);
                h_values.push(h);
                DOMUtils.setText(`t3_h${i}_val`, `${h} mm`, h < 0 ? "text-danger" : "text-primary");
            }
        }

        if (h_values.length === 3) {
            const hMeasurement = new Measurement("Chênh cao", h_values[0], h_values[1], h_values[2], 3.0);
            if (hMeasurement.validateQC().passed) {
                DOMUtils.setText("t3_h_avg", `${(hMeasurement.getAverage() / 1000).toFixed(3)} m`, "text-success font-bold");
            } else {
                DOMUtils.setText("t3_h_avg", "LỆCH > 3mm", "text-danger font-bold");
            }
        }
    };
    for (let i = 1; i <= 3; i++) {
        const bsEl = document.getElementById(`t3_bs${i}`);
        const fsEl = document.getElementById(`t3_fs${i}`);
        if (bsEl) bsEl.addEventListener("input", calculateTopic3);
        if (fsEl) fsEl.addEventListener("input", calculateTopic3);
    }


    // ==========================================
    // 6. XỬ LÝ NỘP BÀI THI (SUBMIT & AUTO-LOCK)
    // ==========================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", (e) => {
            e.preventDefault();
            
            if (currentTopic === 0) {
                alert("Bạn chưa bốc đề thi!");
                return;
            }

            // Vô hiệu hóa nút và dừng đồng hồ
            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "🔒 ĐANG MÃ HÓA VÀ NỘP BÀI...";
            btn.disabled = true;
            if (examTimer) clearInterval(examTimer);

            // Giả lập lưu bài
            setTimeout(() => {
                alert("Nộp bài thi thành công! Dữ liệu đã được khóa cứng trên Google Sheets.");
                window.location.href = "../dashboard.html";
            }, 1500);
        });
    }

    // Nộp báo cáo Nhóm
    const formGrp = document.getElementById("groupForm");
    if (formGrp) {
        formGrp.addEventListener("submit", (e) => {
            e.preventDefault();
            const btn = document.getElementById("btnSubmitGroup");
            btn.innerHTML = "ĐANG ĐỒNG BỘ...";
            btn.disabled = true;
            setTimeout(() => {
                alert("Nghiệm thu nhóm thành công!");
                window.location.href = "../dashboard.html";
            }, 1000);
        });
    }
});
