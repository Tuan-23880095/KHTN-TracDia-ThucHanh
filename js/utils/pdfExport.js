/**
 * ====================================================================
 * BỘ CÔNG CỤ XUẤT BẢN IN PDF (PDF EXPORT UTILITY)
 * Vị trí: js/utils/pdfExport.js
 * Nhiệm vụ: Kéo dữ liệu từ GAS, đổ vào Template A4, và xuất PDF 
 * bằng thư viện html2pdf.js chống vỡ layout.
 * ====================================================================
 */

import userAuthInstance from '../core/UserAuth.js';
import apiConnectorInstance from '../core/APIConnector.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (!userAuthInstance.requireAuth()) return;

    // 1. Phân tích tham số URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionName = urlParams.get('session');
    const studentId = urlParams.get('studentId');

    if (!sessionName || !studentId) {
        alert("Lỗi: Thiếu tham số in ấn (Session hoặc Student ID).");
        return;
    }

    // 2. Kéo dữ liệu và bơm vào HTML
    await loadAndInjectData(sessionName, studentId);
    
    // 3. Sau khi dữ liệu và ảnh đã lên đủ, kích hoạt nút Bấm Xuất PDF
    PDFExporter.init();
});

async function loadAndInjectData(sessionName, studentId) {
    const contentArea = document.getElementById('reportDynamicContentArea');
    const btnExport = document.getElementById('btnExportPDF');
    
    try {
        const response = await apiConnectorInstance.getFetch(`getSubmissionData&session=${encodeURIComponent(sessionName)}&studentId=${studentId}`);
        
        if (!response.success || !response.data) throw new Error(response.message);

        const reportData = response.data;

        // Bơm dữ liệu Text
        document.getElementById('lblReportSessionTitle').textContent = reportData.submission.session_name.toUpperCase();
        document.getElementById('lblReportStudentName').textContent = reportData.submission.full_name || reportData.submission.student_id;
        document.getElementById('lblReportStudentId').textContent = reportData.submission.student_id;
        document.getElementById('lblReportGroupId').textContent = reportData.submission.group_id || "N/A";
        document.getElementById('lblReportSubmitType').textContent = reportData.submission.submit_type;
        document.getElementById('lblReportStudentComment').textContent = reportData.submission.student_comment || "Không có ghi chú.";
        
        const now = new Date();
        document.getElementById('lblReportPrintTime').textContent = `${now.getHours()}:${now.getMinutes()} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

        // Sinh bảng biểu
        contentArea.innerHTML = generateMeasurementTableHTML(reportData.submission.session_name, reportData.measurements);

        // Chờ tải ảnh Firebase xong
        await injectImages(reportData.submission);

        // Mở khóa nút in
        if(btnExport) {
            btnExport.innerHTML = "🖨️ KẾT XUẤT FILE PDF";
            btnExport.disabled = false;
        }

    } catch (error) {
        contentArea.innerHTML = `<div class="text-red-600 font-bold border-2 border-red-500 p-4">❌ Lỗi: ${error.message}</div>`;
        if(btnExport) btnExport.innerHTML = "LỖI DỮ LIỆU";
    }
}

// ==========================================================================
// CLASS CHUYÊN TRÁCH RENDER PDF (Tích hợp từ code của bạn)
// ==========================================================================
class PDFExporter {
    static generatePDF() {
        // 1. Xác định vùng Canvas (Khung giấy A4) cần xuất
        const element = document.getElementById('a4ReportCanvas');
        if (!element) return;

        // 2. Trích xuất thông tin định danh để tạo tên File chuẩn học vụ
        const studentId = document.getElementById('lblReportStudentId').innerText.trim();
        const sessionRaw = document.getElementById('lblReportSessionTitle').innerText.trim();
        const cleanSession = sessionRaw.replace(/\s+/g, ''); 
        const fileName = `GEO10055_PhieuThucTap_${studentId}_${cleanSession}.pdf`;

        // 3. Cấu hình thông số Engine html2pdf
        const options = {
            margin:       0, 
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // 4. Hiệu ứng UX trên nút bấm báo hiệu tiến trình
        const exportBtn = document.getElementById('btnExportPDF');
        if (exportBtn) {
            exportBtn.innerHTML = "⏳ ĐANG RENDER BẢN IN...";
            exportBtn.disabled = true;
            exportBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        // 5. Kích hoạt xuất file và khôi phục trạng thái nút sau khi hoàn thành
        html2pdf().set(options).from(element).save().then(() => {
            if (exportBtn) {
                exportBtn.innerHTML = "🖨️ KẾT XUẤT FILE PDF";
                exportBtn.disabled = false;
                exportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }).catch(err => {
            console.error("Lỗi xuất PDF: ", err);
            alert("Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.");
            if (exportBtn) {
                exportBtn.innerHTML = "⚠️ THỬ LẠI!";
                exportBtn.disabled = false;
                exportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    static init() {
        const btnExport = document.getElementById('btnExportPDF');
        if (btnExport) {
            btnExport.addEventListener('click', (e) => {
                e.preventDefault();
                const confirmPrint = confirm("Xuất Phiếu thực tập sang PDF (Nên dùng trình duyệt Chrome/Safari)?");
                if (confirmPrint) {
                    this.generatePDF();
                }
            });
        }
    }
}

// ==========================================================================
// CÁC HÀM TIỆN ÍCH DỰNG BẢNG VÀ TẢI ẢNH (Giữ nguyên)
// ==========================================================================
function generateMeasurementTableHTML(sessionName, measurements) {
    if (!measurements || measurements.length === 0) {
        return `<div class="text-center italic border p-4">Không có dữ liệu đo đạc chi tiết.</div>`;
    }
    const data = measurements[0]; 
    if (sessionName.includes("Buổi 1")) {
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
    return `<div class="text-center italic border p-4">Cấu trúc bảng chưa được định nghĩa cho buổi này.</div>`;
}

async function injectImages(submissionData) {
    const imgIndiv = document.getElementById('imgReportIndividual');
    const imgGroup = document.getElementById('imgReportGroup');

    if (submissionData.photo_url && submissionData.photo_url !== "No_Image") {
        await loadImageAsync(imgIndiv, submissionData.photo_url);
    }
    if (submissionData.group_photo_url && submissionData.group_photo_url !== "No_Image") {
        await loadImageAsync(imgGroup, submissionData.group_photo_url);
    }
}

function loadImageAsync(imgElement, src) {
    return new Promise((resolve) => {
        imgElement.onload = () => {
            imgElement.classList.remove('hidden'); 
            resolve();
        };
        imgElement.onerror = () => {
            console.error("Không thể tải ảnh:", src);
            resolve(); 
        };
        // Cross-Origin cực kỳ quan trọng để html2canvas chụp được ảnh từ domain khác (Firebase)
        imgElement.crossOrigin = "Anonymous"; 
        imgElement.src = src;
    });
}
