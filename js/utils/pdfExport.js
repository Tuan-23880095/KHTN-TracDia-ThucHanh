/**
 * ====================================================================
 * BỘ CÔNG CỤ XUẤT BẢN IN PDF (PDF EXPORT UTILITY)
 * Vị trí: js/utils/pdfExport.js
 * Nhiệm vụ: Kéo dữ liệu từ GAS (hoặc Cache), Đổ vào Template A4, 
 * Tự động sinh bảng biểu (Dynamic Table) và đồng bộ hình ảnh.
 * Áp dụng: URLSearchParams, Dynamic DOM Injection, Async Image Loading
 * ====================================================================
 */

import userAuthInstance from '../core/UserAuth.js';
import apiConnectorInstance from '../core/APIConnector.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. KIỂM TRA BẢO MẬT BẮT BUỘC
    if (!userAuthInstance.requireAuth()) return;

    // 2. PHÂN TÍCH YÊU CẦU IN TỪ URL PARAMETERS
    // Định dạng mong đợi: report-template.html?session=Buổi 1&studentId=22110001
    const urlParams = new URLSearchParams(window.location.search);
    const sessionName = urlParams.get('session');
    const studentId = urlParams.get('studentId');

    if (!sessionName || !studentId) {
        alert("Lỗi: Thiếu tham số in ấn (Session hoặc Student ID).");
        return;
    }

    // 3. TẢI DỮ LIỆU TỪ BACKEND GOOGLE SHEETS
    await loadAndInjectData(sessionName, studentId);
});

/**
 * Hàm điều phối chính: Kéo dữ liệu và Bơm vào giao diện A4
 */
async function loadAndInjectData(sessionName, studentId) {
    const contentArea = document.getElementById('reportDynamicContentArea');
    contentArea.innerHTML = '<div class="text-center py-10 font-bold animate-pulse">Đang truy xuất dữ liệu từ Hệ thống máy chủ...</div>';

    try {
        // Gọi API lên Google Sheets (Yêu cầu Backend Code.gs phải có hàm getSubmissionData)
        const response = await apiConnectorInstance.getFetch(`getSubmissionData&session=${encodeURIComponent(sessionName)}&studentId=${studentId}`);
        
        if (!response.success || !response.data) {
            throw new Error(response.message || "Không tìm thấy dữ liệu báo cáo cho sinh viên này.");
        }

        const reportData = response.data; // { submission: {...}, measurements: [...] }

        // BƯỚC 1: BƠM DỮ LIỆU ĐỊNH DANH (HEADER)
        document.getElementById('lblReportSessionTitle').textContent = reportData.submission.session_name.toUpperCase();
        document.getElementById('lblReportStudentName').textContent = reportData.submission.full_name || reportData.submission.student_id;
        document.getElementById('lblReportStudentId').textContent = reportData.submission.student_id;
        document.getElementById('lblReportGroupId').textContent = reportData.submission.group_id || "N/A";
        document.getElementById('lblReportSubmitType').textContent = reportData.submission.submit_type;
        document.getElementById('lblReportStudentComment').textContent = reportData.submission.student_comment || "Không có ghi chú nào.";
        
        // Đóng dấu thời gian xuất bản in
        const now = new Date();
        document.getElementById('lblReportPrintTime').textContent = `${now.getHours()}:${now.getMinutes()} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

        // BƯỚC 2: RENDER BẢNG SỐ LIỆU ĐỘNG (DYNAMIC TABLE GENERATION)
        contentArea.innerHTML = generateMeasurementTableHTML(reportData.submission.session_name, reportData.measurements);

        // BƯỚC 3: XỬ LÝ HÌNH ẢNH (BẤT ĐỒNG BỘ)
        await injectImages(reportData.submission);

        // Đã tải xong mọi thứ, sẵn sàng in
        console.log("✅ PDF Render Engine: Dữ liệu đã sẵn sàng!");

    } catch (error) {
        console.error("Lỗi Export PDF:", error);
        contentArea.innerHTML = `<div class="text-red-600 font-bold border-2 border-red-500 p-4">❌ Lỗi truy xuất: ${error.message}</div>`;
    }
}

/**
 * Hàm Sinh HTML Bảng Biểu (Factory Function)
 * Tùy thuộc vào Buổi học, cấu trúc bảng trên giấy A4 sẽ khác nhau
 */
function generateMeasurementTableHTML(sessionName, measurements) {
    // Nếu mảng rỗng
    if (!measurements || measurements.length === 0) {
        return `<div class="text-center italic border p-4">Không có dữ liệu đo đạc chi tiết.</div>`;
    }

    // Lấy object đầu tiên làm mẫu (Vì kiến trúc chúng ta lưu mỗi lần đo là 1 row hoặc 1 JSON array)
    const data = measurements[0]; 

    // CHUYÊN MỤC DÀNH CHO BUỔI 1 (Nhận diện thiết bị & Đọc số cơ bản)
    if (sessionName.includes("Buổi 1")) {
        // Phục hồi JSON cấu tạo máy đã nén lúc gửi
        let parts = {};
        try { parts = JSON.parse(data.parts_json); } catch(e) {}

        return `
        <table class="w-full text-sm border-collapse border border-black text-left mt-2">
            <tbody>
                <tr>
                    <td class="border border-black p-2 font-bold bg-gray-100" colspan="2">A. NHẬN DIỆN CẤU TẠO MÁY: ${parts.machine_type || ''}</td>
                </tr>
                <tr>
                    <td class="border border-black p-2 w-1/2">1. Ống ngắm sơ bộ: <span class="font-bold">${parts.p1 || ''}</span></td>
                    <td class="border border-black p-2 w-1/2">2. Vòng điều quang: <span class="font-bold">${parts.p2 || ''}</span></td>
                </tr>
                <tr>
                    <td class="border border-black p-2">3. Ốc vi động: <span class="font-bold">${parts.p3 || ''}</span></td>
                    <td class="border border-black p-2">4. Ốc cân bằng: <span class="font-bold">${parts.p4 || ''}</span></td>
                </tr>
                
                <tr>
                    <td class="border border-black p-2 font-bold bg-gray-100 mt-4" colspan="2">B. KẾT QUẢ ĐỌC SỐ LẦN (${data.reading_type || 'Giá trị'})</td>
                </tr>
                <tr>
                    <td class="border border-black p-0" colspan="2">
                        <div class="grid grid-cols-3 text-center">
                            <div class="border-r border-black p-2">Lần 1: <br><span class="font-bold text-lg">${data.val_1 || 0}</span></div>
                            <div class="border-r border-black p-2">Lần 2: <br><span class="font-bold text-lg">${data.val_2 || 0}</span></div>
                            <div class="p-2">Lần 3: <br><span class="font-bold text-lg">${data.val_3 || 0}</span></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="border border-black p-3 text-center bg-gray-50" colspan="2">
                        TRỊ SỐ TRUNG BÌNH CỘNG: <span class="font-black text-xl ml-4">${data.val_avg || 0}</span>
                    </td>
                </tr>
            </tbody>
        </table>`;
    }

    // NẾU LÀ BUỔI KHÁC (VD: Đo chênh cao Thủy bình)...
    // Bạn có thể mở rộng khối if-else này cho các buổi 3, 5, 7 dựa trên cấu trúc Data Dictionary.
    return `
    <table class="w-full text-sm border-collapse border border-black text-center mt-2">
        <thead class="bg-gray-100 font-bold">
            <tr>
                <td class="border border-black p-2">Lần đo 1</td>
                <td class="border border-black p-2">Lần đo 2</td>
                <td class="border border-black p-2">Lần đo 3</td>
                <td class="border border-black p-2 uppercase">Trung bình</td>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="border border-black p-3 font-bold">${data.val_1}</td>
                <td class="border border-black p-3 font-bold">${data.val_2}</td>
                <td class="border border-black p-3 font-bold">${data.val_3}</td>
                <td class="border border-black p-3 font-black text-lg bg-gray-50">${data.val_avg}</td>
            </tr>
        </tbody>
    </table>`;
}

/**
 * Hàm Tải Hình Ảnh An Toàn (Đảm bảo ảnh lên hết giấy mới cho in)
 */
async function injectImages(submissionData) {
    const imgIndiv = document.getElementById('imgReportIndividual');
    const imgGroup = document.getElementById('imgReportGroup');

    // Chèn ảnh cá nhân
    if (submissionData.photo_url && submissionData.photo_url !== "No_Image") {
        await loadImageAsync(imgIndiv, submissionData.photo_url);
    }

    // Chèn ảnh nhóm (Nếu có lưu trong JSON)
    // Lưu ý: Tùy thiết kế backend, ảnh nhóm có thể nằm ở cột khác hoặc payload khác
    if (submissionData.group_photo_url && submissionData.group_photo_url !== "No_Image") {
        await loadImageAsync(imgGroup, submissionData.group_photo_url);
    }
}

/**
 * Promise Helper: Đợi ảnh tải xong (Tránh lỗi in ra PDF bị ô vuông trắng)
 */
function loadImageAsync(imgElement, src) {
    return new Promise((resolve) => {
        imgElement.onload = () => {
            imgElement.classList.remove('hidden'); // Hiển thị khi tải xong
            resolve();
        };
        imgElement.onerror = () => {
            console.error("Không thể tải ảnh minh chứng từ Firebase:", src);
            resolve(); // Vẫn resolve để không chặn luồng in ấn
        };
        imgElement.src = src;
    });
}
