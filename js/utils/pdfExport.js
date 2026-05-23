/**
 * ====================================================================
 * BỘ CÔNG CỤ XUẤT BẢN IN PDF (PDF EXPORT UTILITY)
 * Vị trí: js/utils/pdfExport.js
 * Nhiệm vụ: Kéo dữ liệu -> Bơm vào HTML -> Đợi Render -> Bật nút Xuất PDF
 * ====================================================================
 */

import userAuthInstance from '../core/UserAuth.js';
import apiConnectorInstance from '../core/APIConnector.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Kiểm tra bảo mật
    if (!userAuthInstance.requireAuth()) return;

    // 2. Lấy tham số in từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionName = urlParams.get('session');
    const studentId = urlParams.get('studentId');
    const groupId = urlParams.get('groupId'); // Hỗ trợ in theo nhóm nếu có

    if (!sessionName || (!studentId && !groupId)) {
        alert("Lỗi: Thiếu tham số in ấn (Session hoặc ID).");
        return;
    }

    // 3. Khóa và ẩn nút In PDF trước khi dữ liệu tải xong
    const btnExport = document.getElementById('btnExportPDF');
    if (btnExport) {
        btnExport.classList.add('hidden');
        btnExport.disabled = true;
    }

    // 4. Bắt đầu tiến trình tải và đổ dữ liệu
    await loadAndInjectData(sessionName, studentId, groupId);
});

/**
 * ====================================================================
 * QUY TRÌNH KÉO DỮ LIỆU VÀ BƠM VÀO DOM
 * ====================================================================
 */
async function loadAndInjectData(sessionName, studentId, groupId) {
    const contentArea = document.getElementById('reportDynamicContentArea');
    contentArea.innerHTML = '<div class="text-center py-10 font-bold animate-pulse text-gray-500">Đang truy xuất dữ liệu từ hệ thống...</div>';

    try {
        // Cấu hình URL API tùy theo việc in Cá nhân hay in Nhóm
        let apiUrl = `getSubmissionData&session=${encodeURIComponent(sessionName)}`;
        if (studentId) apiUrl += `&studentId=${studentId}`;
        else if (groupId) apiUrl += `&groupId=${groupId}`;

        // Gọi API kéo dữ liệu
        const response = await apiConnectorInstance.getFetch(apiUrl);
        if (!response.success || !response.data) {
            throw new Error(response.message || "Không tìm thấy dữ liệu báo cáo trong hệ thống.");
        }

        const reportData = response.data; 
        const subData = reportData.submission;

        // BƯỚC 1: Bơm dữ liệu Text định danh
        document.getElementById('lblReportSessionTitle').textContent = subData.session_name.toUpperCase();
        document.getElementById('lblReportStudentName').textContent = subData.full_name || subData.student_id || "Chưa cập nhật";
        document.getElementById('lblReportStudentId').textContent = subData.student_id || "N/A";
        document.getElementById('lblReportGroupId').textContent = subData.group_id || "N/A";
        document.getElementById('lblReportSubmitType').textContent = subData.submit_type || "N/A";
        document.getElementById('lblReportStudentComment').textContent = subData.student_comment || "Không có ghi chú nào.";
        
        const now = new Date();
        document.getElementById('lblReportPrintTime').textContent = `${now.getHours()}:${now.getMinutes()} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

        // BƯỚC 2: Sinh bảng số liệu động
        contentArea.innerHTML = generateMeasurementTableHTML(subData.session_name, reportData.measurements);

        // BƯỚC 3: Đồng bộ tải hình ảnh từ Firebase (Rất quan trọng)
        await injectImages(subData);

        // BƯỚC 4: HOÀN TẤT RENDER -> BẬT NÚT XUẤT PDF
        const btnExport = document.getElementById('btnExportPDF');
        if (btnExport) {
            btnExport.classList.remove('hidden'); // Hiện nút
            btnExport.disabled = false;           // Mở khóa nút
            btnExport.innerHTML = "🖨️ KẾT XUẤT FILE PDF";
            
            // Gắn sự kiện in ấn (Truyền ID vùng giấy A4 và Tên file)
            const cleanSession = subData.session_name.replace(/\s+/g, '');
            const idToSave = studentId || groupId;
            const fileName = `PhieuThucTap_${cleanSession}_${idToSave}.pdf`;

            btnExport.onclick = (e) => {
                e.preventDefault();
                PDFExporter.generatePDF('a4ReportCanvas', fileName, btnExport);
            };
        }

    } catch (error) {
        console.error("Lỗi Export PDF:", error);
        contentArea.innerHTML = `<div class="text-red-600 font-bold border-2 border-red-500 p-4 bg-red-50 rounded-xl">❌ Lỗi: ${error.message}</div>`;
    }
}

/**
 * ====================================================================
 * CỖ MÁY CHỤP ẢNH CANVAS VÀ XUẤT PDF (html2pdf wrapper)
 * ====================================================================
 */
class PDFExporter {
    static generatePDF(elementId, fileName, btnElement) {
        const element = document.getElementById(elementId);
        if (!element) {
            alert("Không tìm thấy khung A4 để kết xuất.");
            return;
        }

        // Cấu hình engine chụp ảnh và nén PDF
        const options = {
            margin:       0, 
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            // scale: 2 (tăng độ nét gấp đôi), useCORS: true (cho phép chụp ảnh Firebase)
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Đổi trạng thái UI báo cho người dùng biết máy đang xử lý
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = "⏳ ĐANG XỬ LÝ ẢNH BẢN IN...";
        btnElement.disabled = true;
        btnElement.classList.add('opacity-75', 'cursor-wait');

        // Thực thi lệnh xuất PDF
        html2pdf().set(options).from(element).save().then(() => {
            // Khôi phục trạng thái nút
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
            btnElement.classList.remove('opacity-75', 'cursor-wait');
        }).catch(err => {
            console.error("Lỗi quá trình html2pdf:", err);
            alert("Quá trình xuất PDF gặp sự cố. Vui lòng thử lại!");
            btnElement.innerHTML = "⚠️ LỖI. THỬ LẠI!";
            btnElement.disabled = false;
            btnElement.classList.remove('opacity-75', 'cursor-wait');
        });
    }
}

/**
 * ====================================================================
 * CÁC HÀM TIỆN ÍCH DỰNG GIAO DIỆN (INTERNAL UTILS)
 * ====================================================================
 */
function generateMeasurementTableHTML(sessionName, measurements) {
    if (!measurements || measurements.length === 0) {
        return `<div class="text-center italic border p-4">Hệ thống chưa ghi nhận số liệu đo chi tiết.</div>`;
    }
    const data = measurements[0]; 

    if (sessionName.includes("Buổi 1")) {
        let parts = {};
        try { parts = JSON.parse(data.parts_json); } catch(e) {}
        return `
        <table class="w-full text-sm border-collapse border border-black text-left mt-2">
            <tbody>
                <tr><td class="border border-black p-2 font-bold bg-gray-100" colspan="2">A. THÔNG TIN THIẾT BỊ: ${parts.machine_type || ''}</td></tr>
                <tr>
                    <td class="border border-black p-2 w-1/2">1. Ống ngắm: <span class="font-bold">${parts.p1 || ''}</span></td>
                    <td class="border border-black p-2 w-1/2">2. Điều quang: <span class="font-bold">${parts.p2 || ''}</span></td>
                </tr>
                <tr>
                    <td class="border border-black p-2">3. Vi động: <span class="font-bold">${parts.p3 || ''}</span></td>
                    <td class="border border-black p-2">4. Cân bằng: <span class="font-bold">${parts.p4 || ''}</span></td>
                </tr>
                <tr><td class="border border-black p-2 font-bold bg-gray-100 mt-4" colspan="2">B. KẾT QUẢ ĐỌC SỐ: ${data.reading_type || ''}</td></tr>
                <tr>
                    <td class="border border-black p-0" colspan="2">
                        <div class="grid grid-cols-3 text-center">
                            <div class="border-r border-black p-2">Lần 1: <br><span class="font-bold text-lg">${data.val_1 || 0}</span></div>
                            <div class="border-r border-black p-2">Lần 2: <br><span class="font-bold text-lg">${data.val_2 || 0}</span></div>
                            <div class="p-2">Lần 3: <br><span class="font-bold text-lg">${data.val_3 || 0}</span></div>
                        </div>
                    </td>
                </tr>
                <tr><td class="border border-black p-3 text-center bg-gray-50" colspan="2">TRUNG BÌNH CỘNG: <span class="font-black text-xl ml-4">${data.val_avg || 0}</span></td></tr>
            </tbody>
        </table>`;
    }
    return `<div class="text-center italic border p-4">Cấu trúc bảng chưa định nghĩa cho buổi này.</div>`;
}

async function injectImages(submissionData) {
    const imgIndiv = document.getElementById('imgReportIndividual');
    const imgGroup = document.getElementById('imgReportGroup');

    // Chèn ảnh cá nhân
    if (submissionData.photo_url && submissionData.photo_url !== "No_Image" && imgIndiv) {
        await loadImageAsync(imgIndiv, submissionData.photo_url);
    }
    // Chèn ảnh nhóm
    if (submissionData.group_photo_url && submissionData.group_photo_url !== "No_Image" && imgGroup) {
        await loadImageAsync(imgGroup, submissionData.group_photo_url);
    }
}

function loadImageAsync(imgElement, src) {
    return new Promise((resolve) => {
        // Thuộc tính cốt lõi để html2canvas không bị chặn CORS khi vẽ lại ảnh Firebase
        imgElement.crossOrigin = "Anonymous"; 
        
        imgElement.onload = () => {
            imgElement.classList.remove('hidden'); 
            resolve();
        };
        imgElement.onerror = () => {
            console.error("Không thể tải ảnh minh chứng từ Firebase:", src);
            resolve(); // Dù lỗi ảnh vẫn resolve để luồng PDF không bị kẹt cứng
        };
        
        imgElement.src = src;
    });
}
