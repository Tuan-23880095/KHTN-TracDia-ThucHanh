/**
 * ==========================================================================
 * FILE: js/controllers/session8Ctrl.js
 * MỤC ĐÍCH: Bộ điều khiển chuyên biệt cho BUỔI 8 (Bình sai lưới đường chuyền)
 * KIẾN TRÚC: MVC - Xử lý tính toán phân bổ sai số khép (vi) và kiểm tra khép cao độ
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. KIỂM TRA BẢO MẬT & TẢI HỒ SƠ TÀI KHOẢN
    // ==========================================
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    
    if (session && session.profile) {
        DOMUtils.setText("userDisplayProfile", `${session.profile.full_name} (${session.profile.mssv_id})`);
        DOMUtils.setText("userDisplayGroup", session.profile.group_id || "Chưa phân nhóm");
    }

    // Thiết lập tính năng xem trước ảnh minh chứng
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
            if (session.profile.role !== "leader" && session.profile.role !== "teacher") {
                alert("⛔ Trình điều khiển báo cáo Nhóm chỉ dành cho tài khoản Nhóm trưởng!");
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
    // 3. TÍNH TOÁN REAL-TIME: PHẦN CÁ NHÂN (SỐ HIỆU CHỈNH ĐOẠN TUYẾN)
    // ==========================================
    // Lắng nghe sự kiện từ các ô nhập thông số đoạn tuyến
    const indInputIds = ["indFh", "indSumD", "ind_Di", "ind_hi"];
    
    const calculateSegmentCorrection = () => {
        const fh = DOMUtils.getNumberValue("indFh");         // Sai số khép toàn tuyến (mm)
        const sumD = DOMUtils.getNumberValue("indSumD");     // Tổng chiều dài toàn tuyến (m)
        const di = DOMUtils.getNumberValue("ind_Di");        // Chiều dài đoạn đang xét (m)
        const hi = DOMUtils.getNumberValue("ind_hi");        // Chênh cao thực đo đoạn đang xét (mm)

        if (!isNaN(fh) && !isNaN(sumD) && sumD > 0 && !isNaN(di) && !isNaN(hi)) {
            
            // Tính số hiệu chỉnh v_i = -f_h * (D_i / \sum D)
            // Lưu ý: Kết quả thường là số lẻ, cần làm tròn đến mm (0 chữ số thập phân)
            const vi_raw = -fh * (di / sumD);
            const vi_rounded = Math.round(vi_raw);
            
            // Tính chênh cao bình sai: h_i_bs = h_i + v_i
            const hi_bs = hi + vi_rounded;

            // Hiển thị kèm dấu (VD: +2 mm)
            const vi_sign = vi_rounded > 0 ? "+" : "";
            DOMUtils.setText("ind_vi_display", `${vi_sign}${vi_rounded} mm`, vi_rounded < 0 ? "text-danger" : "text-success");
            
            const hi_sign = hi_bs > 0 ? "+" : "";
            DOMUtils.setText("ind_hi_bs_display", `${hi_sign}${hi_bs} mm`, hi_bs < 0 ? "text-danger" : "text-primary");

        } else {
            DOMUtils.setText("ind_vi_display", "0 mm", "text-muted");
            DOMUtils.setText("ind_hi_bs_display", "0 mm", "text-muted");
        }
    };

    indInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateSegmentCorrection);
    });


    // ==========================================
    // 4. TÍNH TOÁN REAL-TIME: PHẦN NHÓM (KIỂM ĐỊNH BÌNH SAI TOÀN LƯỚI)
    // ==========================================
    const grpInputIds = ["grpBenchmarkElev", "grpSumFh", "grpSumVi", "grpFinalElev"];

    const validateAdjustmentQC = () => {
        const hGoc = DOMUtils.getNumberValue("grpBenchmarkElev"); // Cao độ gốc (m)
        const fh = DOMUtils.getNumberValue("grpSumFh");           // Sai số khép (mm)
        const sumVi = DOMUtils.getNumberValue("grpSumVi");        // Tổng số hiệu chỉnh đã phân bổ (mm)
        const hCuoi = DOMUtils.getNumberValue("grpFinalElev");    // Cao độ điểm cuối (m)

        let isPassed = true;
        let msgArray = [];

        if (!isNaN(fh) && !isNaN(sumVi)) {
            // Điều kiện 1: Tổng số hiệu chỉnh phải bằng và ngược dấu với sai số khép
            const sumVi_theory = -fh;
            if (sumVi === sumVi_theory) {
                DOMUtils.setText("qc_cond1", `1. Điều kiện hiệu chỉnh ($\sum v_i = ${sumVi} = -f_h$): <strong class="text-success">ĐẠT</strong>`);
            } else {
                isPassed = false;
                DOMUtils.setText("qc_cond1", `1. Điều kiện hiệu chỉnh ($\sum v_i = ${sumVi} \neq -f_h$): <strong class="text-danger">LỖI LÀM TRÒN</strong>`);
                msgArray.push(`Tổng $v_i$ (${sumVi}mm) chưa triệt tiêu hết $f_h$ (${fh}mm). Cần phân bổ lại phần dư/thiếu.`);
            }
        } else {
            DOMUtils.setText("qc_cond1", `1. Điều kiện hiệu chỉnh $\sum v_i = -f_h$: <strong class="text-muted">Đang chờ...</strong>`);
            isPassed = false;
        }

        if (!isNaN(hGoc) && !isNaN(hCuoi)) {
            // Điều kiện 2: Tuyến kín nên Cao độ cuối phải khớp tuyệt đối với Cao độ gốc (Chênh lệch = 0.000m)
            // Fix lỗi sai số dấu phẩy động của JS bằng cách ép về 3 chữ số thập phân trước khi so sánh
            const hGoc_fixed = parseFloat(hGoc.toFixed(3));
            const hCuoi_fixed = parseFloat(hCuoi.toFixed(3));
            
            if (hGoc_fixed === hCuoi_fixed) {
                DOMUtils.setText("qc_cond2", `2. Điều kiện khép cao độ ($H_{cuối} == H_{gốc}$): <strong class="text-success">KHỚP TUYỆT ĐỐI</strong>`);
            } else {
                isPassed = false;
                DOMUtils.setText("qc_cond2", `2. Điều kiện khép cao độ ($H_{cuối} \neq H_{gốc}$): <strong class="text-danger">LỆCH CAO ĐỘ</strong>`);
                const diff_m = Math.abs(hCuoi_fixed - hGoc_fixed);
                msgArray.push(`Cao độ cuối ($H_{cuối} = ${hCuoi_fixed}m$) chưa khép về gốc. Lệch $${diff_m.toFixed(3)}m$. Bạn đã cộng sai ở đoạn nào đó!`);
            }
        } else {
            DOMUtils.setText("qc_cond2", `2. Điều kiện khép cao độ $H_{cuối} == H_{gốc}$: <strong class="text-muted">Đang chờ...</strong>`);
            isPassed = false;
        }

        // ĐÁNH GIÁ CHUNG VÀ CẬP NHẬT GIAO DIỆN
        const evalBadge = document.getElementById("grp_eval_msg");
        
        // Chỉ chạy QC nếu nhập đủ cả 4 ô
        if (!isNaN(fh) && !isNaN(sumVi) && !isNaN(hGoc) && !isNaN(hCuoi)) {
            if (isPassed) {
                evalBadge.className = "flat-badge badge-success font-bold";
                evalBadge.innerHTML = "✅ BẢNG BÌNH SAI TOÁN HỌC KHÉP KÍN HOÀN HẢO";
                DOMUtils.hideAlert("validationAlert");
            } else {
                evalBadge.className = "flat-badge badge-danger font-bold";
                evalBadge.innerHTML = "🚨 SAI ĐIỀU KIỆN BÌNH SAI (Cần kiểm tra lại sổ)";
                DOMUtils.showAlert("validationAlert", `<strong>PHÂN TÍCH LỖI NỘI NGHIỆP:</strong><br>${msgArray.join("<br>")}`, "danger");
            }
        } else {
            evalBadge.className = "flat-badge text-light";
            evalBadge.innerHTML = "Chưa đủ dữ liệu đánh giá";
            DOMUtils.hideAlert("validationAlert");
        }
    };

    grpInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", validateAdjustmentQC);
    });


    // ==========================================
    // 5. XỬ LÝ SỰ KIỆN NỘP BÀI (SUBMIT)
    // ==========================================
    const formInd = document.getElementById("individualForm");
    if (formInd) {
        formInd.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const btn = document.getElementById("btnSubmitIndividual");
            btn.innerHTML = "ĐANG ĐỒNG BỘ DỮ LIỆU...";
            btn.disabled = true;

            setTimeout(() => {
                alert("Nộp số liệu tính toán thành công! Sổ nháp của bạn đã được ghi nhận.");
                window.location.href = "../dashboard.html";
            }, 1000);
        });
    }
});
