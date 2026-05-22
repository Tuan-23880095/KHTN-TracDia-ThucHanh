/**
 * ==========================================================================
 * FILE: js/controllers/reportCtrl.js
 * MỤC ĐÍCH: Bộ điều khiển dữ liệu ngược (Reverse Data-Binding) cho phiếu báo cáo
 * CHỨC NĂNG:
 * 1. Đọc tham số URL (Ví dụ: report-template.html?session=1&mssv=24270025)
 * 2. Gọi API hậu đài (GAS) kéo bản ghi đã khóa từ "Processed_Data" & "Raw_Data_Log"
 * 3. Điền phẳng số liệu thô và mảng tính toán trung bình lên phôi giấy A4 tĩnh.
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. KIỂM TRA BẢO MẬT PHIÊN LÀM VIỆC
    UserAuth.protectPage();
    const session = UserAuth.getSession();
    if (!session || !session.profile) return;

    // 2. PHÂN TÍCH THAM SỐ ĐƯỜNG DẪN URL (Query Parameters)
    // Giúp phân biệt đang in báo cáo của Buổi nào và của Sinh viên nào
    const urlParams = new URLSearchParams(window.location.search);
    const sessionNum = urlParams.get("session") || "1"; 
    const targetMssv = urlParams.get("mssv") || session.profile.mssv_id; 

    // 3. THIẾT LẬP HIỆU ỨNG LOADING TRÊN PHÔI
    DOMUtils.setText("rptSessionName", `ĐANG TẢI DỮ LIỆU BUỔI ${sessionNum}...`, "text-muted animate-pulse");

    // 4. GỌI API HẬU ĐÀI KÉO DỮ LIỆU ĐÃ NỘP THÀNH CÔNG
    try {
        const response = await APIConnector.post("GET_SUBMISSION", {
            mssv_id: targetMssv,
            session_name: sessionNum
        });

        if (!response || response.status !== "success" || !response.found) {
            alert(`🚨 Hệ thống thông báo: Không tìm thấy số liệu hoàn công của tài khoản [${targetMssv}] tại Buổi ${sessionNum}. Hoặc phiên làm việc chưa từng được nộp thành công!`);
            window.location.href = "../dashboard.html";
            return;
        }

        // Phân rã mảng bản ghi thô từ Google Sheets
        const pData = response.processedData; // Dữ liệu từ bảng Processed_Data
        const rData = response.rawData;       // Dữ liệu từ bảng Raw_Data_Log

        // 5. DATA BINDING: ĐỔ DỮ LIỆU HÀNH CHÍNH PHẲNG
        DOMUtils.setText("rptSessionName", `BUỔI ${sessionNum}: ${getAcademicSessionName(sessionNum)}`);
        DOMUtils.setText("rptStudentName", pData.student_name);
        DOMUtils.setText("rptStudentId", pData.student_id);
        DOMUtils.setText("rptGroupId", pData.group_id || "Chưa phân nhóm");
        
        // Định dạng ngày giờ chuẩn VN từ chuỗi Timestamp của Google
        const dateFormatted = new Date(pData.access_datetime).toLocaleString("vi-VN");
        DOMUtils.setText("rptDateTime", dateFormatted);
        DOMUtils.setText("rptMachineType", pData.machine_type || "Máy Trắc Địa Bộ Môn");
        DOMUtils.setText("rptTargetName", pData.target_name || "Mốc hiện trường");
        
        const commentData = pData.student_comment || pData.student_coment || "Không có ghi chú thêm.";
        DOMUtils.setText("rptComment", commentData);
        
        // Gắn Link Ảnh Minh Chứng từ Google Drive vào thẻ đại diện
        // 5. Gắn Ảnh Minh Chứng (Ưu tiên Base64 để chống lỗi CORS khi xuất PDF)
        
        // Xử lý ảnh Selfie / Trạm máy
        if (pData.individual_photo_base64) {
            document.getElementById("rptImgSelfie").src = pData.individual_photo_base64;
        } else if (pData.individual_photo_url) {
            // Dự phòng nếu server xử lý base64 thất bại
            document.getElementById("rptImgSelfie").src = pData.individual_photo_url;
        } else {
            document.getElementById("rptImgSelfie").style.display = "none";
        }

        // Xử lý ảnh Kính ngắm / Thiết bị
        if (pData.group_photo_base64) {
            document.getElementById("rptImgInstrument").src = pData.group_photo_base64;
        } else if (pData.group_photo_url) {
            document.getElementById("rptImgInstrument").src = pData.group_photo_url;
        } else {
            document.getElementById("rptImgInstrument").style.display = "none";
        }

        // Cấu hình nhãn Quality Control đạt chuẩn hành chính
        const badgeEl = document.getElementById("rptQcBadge");
        if (badgeEl) {
            if (pData.qc_evaluation.toUpperCase().includes("LỖI") || pData.qc_evaluation.toUpperCase().includes("VƯỢT")) {
                badgeEl.innerHTML = `<span class="flat-badge badge-danger">${pData.qc_evaluation}</span>`;
            } else {
                badgeEl.innerHTML = `<span class="flat-badge badge-success">${pData.qc_evaluation || "ĐẠT CHUẨN"}</span>`;
            }
        }

        // 6. MA TRẬN TOÁN HỌC: ĐỔ ĐỘNG BẢNG SỐ LIỆU THEO BUỔI (REVERSE MATRIX RENDER)
        renderDynamicTableData(sessionNum, pData, rData);

        // Tự động kích hoạt lại MathJax nếu có công thức toán học chèn thêm
        if (window.MathJax && window.MathJax.typeset) {
            window.MathJax.typeset();
        }

    } catch (error) {
        console.error("Lỗi xuất báo cáo:", error);
        alert("Lỗi kết nối máy chủ khi tải dữ liệu báo cáo.");
    }
});

/**
 * Hàm phụ trợ dịch danh mục tên buổi học chuẩn giáo trình
 */
function getAcademicSessionName(num) {
    const names = {
        "1": "GIỚI THIỆU VỀ MÁY KINH VĨ VÀ MÁY THỦY BÌNH",
        "2": "THAO TÁC ĐỊNH TÂM VÀ CÂN BẰNG MÁY",
        "3": "PHƯƠNG PHÁP ĐO GÓC BẰNG",
        "4": "ĐO GÓC ĐỨNG VÀ CAO LƯỢNG GIÁC",
        "5": "ĐO DÀI BẰNG CHỈ LƯỢNG CỰ LƯỢNG GIÁC",
        "6": "ĐO CAO HÌNH HỌC VÀ KIỂM ĐỊNH GÓC I",
        "7": "DẪN CHUYỀN CAO ĐỘ KỸ THUẬT TUYẾN KÍN",
        "8": "TÍNH TOÁN NỘI NGHIỆP BÌNH SAI LƯỚI ĐƯỜNG CHUYỀN",
        "9": "SÁT HẠCH KỸ NĂNG THỰC HÀNH TỔNG HỢP"
    };
    return names[num] || "THỰC HÀNH TRẮC ĐỊA";
}

/**
 * Lõi phân tích cấu trúc JSON ngược từ Google Sheets để dựng lại bảng số liệu A4
 */
function renderDynamicTableData(sessionNum, pData, rData) {
    const container = document.getElementById("rptDynamicTableContainer");
    if (!container) return;

    // Giải mã chuỗi JSON được bọc trong Google Sheets
    let r1 = {}, r2 = {}, r3 = {}, avg = {};
    try { r1 = JSON.parse(rData.r1_data || "{}"); } catch(e){}
    try { r2 = JSON.parse(rData.r2_data || "{}"); } catch(e){}
    try { r3 = JSON.parse(rData.r3_data || "{}"); } catch(e){}
    try { avg = JSON.parse(pData.result_avg || "{}"); } catch(e){}

    let htmlMarkup = "";

    // Tùy biến cấu trúc bảng biểu hoàn công khớp theo từng buổi học chuyên môn
    switch(sessionNum.toString()) {
        case "1":
            htmlMarkup = `
                <table class="flat-table">
                    <thead>
                        <tr>
                            <th>Yếu tố kỹ thuật</th>
                            <th>Lần đo 1</th>
                            <th>Lần đo 2</th>
                            <th>Lần đo 3</th>
                            <th>Kết quả Trung bình</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Số đọc Mia thô (mm)</strong></td>
                            <td>${r1.reading || "---"}</td>
                            <td>${r2.reading || "---"}</td>
                            <td>${r3.reading || "---"}</td>
                            <td class="col-highlight">${avg.average ? (avg.average / 1000).toFixed(3) + " m" : "---"}</td>
                        </tr>
                    </tbody>
                </table>`;
            break;

        case "2":
            htmlMarkup = `
                <table class="flat-table">
                    <thead>
                        <tr>
                            <th>Thông số huấn luyện cơ bắp</th>
                            <th>Lần thử 1</th>
                            <th>Lần thử 2</th>
                            <th>Lần thử 3</th>
                            <th>Trị trung bình thực tế</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Thời gian cân bằng máy (giây)</strong></td>
                            <td>${r1.time || "---"} s</td>
                            <td>${r2.time || "---"} s</td>
                            <td>${r3.time || "---"} s</td>
                            <td class="col-highlight">${avg.avg_time ? avg.avg_time.toFixed(1) + " s" : "---"}</td>
                        </tr>
                        <tr>
                            <td><strong>Độ lệch tâm vòng tiêu e (mm)</strong></td>
                            <td>${r1.eccentricity || "---"} mm</td>
                            <td>${r2.eccentricity || "---"} mm</td>
                            <td>${r3.eccentricity || "---"} mm</td>
                            <td class="col-highlight">${avg.avg_eccentricity ? avg.avg_eccentricity.toFixed(1) + " mm" : "---"}</td>
                        </tr>
                    </tbody>
                </table>`;
            break;

        // Bổ sung các case khác tương tự cho các Buổi 3, 4, 5, 6, 7...
        default:
            // Khung biểu mẫu dự phòng tổng quát cho các buổi chưa định nghĩa HTML tĩnh
            htmlMarkup = `
                <div class="highlight-box">
                    <p><strong>Số liệu tổng hợp phân tích nội nghiệp:</strong></p>
                    <pre style="background:#f1f5f9; padding:10px; font-size:10pt; white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(avg, null, 2)}</pre>
                </div>`;
            break;
    }

    container.innerHTML = htmlMarkup;
}
