/**
 * ==========================================================================
 * FILE: js/utils/pdfExport.js
 * MỤC ĐÍCH: Tiện ích xuất biểu mẫu HTML thành file PDF khổ A4 chuẩn
 * THƯ VIỆN ĐÒI HỎI: html2pdf.js (Cần nhúng CDN vào file HTML)
 * KIẾN TRÚC: Kế thừa DOMUtils, trích xuất dữ liệu thẻ để đặt tên file động
 * ==========================================================================
 */

class PDFExporter {
    
    /**
     * Hàm cấu hình và kích hoạt tiến trình xuất PDF
     */
    static generatePDF() {
        // 1. Xác định vùng Canvas (Khung giấy A4) cần xuất
        const element = document.getElementById('a4ReportCanvas');
        if (!element) {
            console.error("Không tìm thấy vùng dữ liệu a4ReportCanvas để xuất PDF.");
            return;
        }

        // 2. Trích xuất thông tin định danh để tạo tên File chuẩn học vụ
        // Ví dụ: GEO10055_PhieuThucTap_22110XXX_Buoi1.pdf
        const studentId = document.getElementById('rptStudentId')?.innerText.trim() || 'Unknown_MSSV';
        const sessionRaw = document.getElementById('rptSessionName')?.innerText.trim() || 'Buoi_X';
        
        // Cắt lấy chữ "BUỔI 1" từ chuỗi "BUỔI 1: GIỚI THIỆU..." và bỏ khoảng trắng
        const cleanSession = sessionRaw.split(':')[0].replace(/\s+/g, ''); 
        
        const fileName = `GEO10055_PhieuThucTap_${studentId}_${cleanSession}.pdf`;

        // 3. Cấu hình thông số Engine html2pdf
        const options = {
            margin:       0, // Set 0 vì lề (padding) đã được căn chỉnh cứng ở CSS a4-print.css
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            
            // Cấu hình html2canvas: 
            // scale: 2 (Tăng độ nét gấp đôi cho hình ảnh/chữ)
            // useCORS: Cho phép load ảnh minh chứng từ Google Drive sang PDF mà không bị lỗi bảo mật
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            
            // Cấu hình jsPDF: Đảm bảo xuất đúng khổ A4 dọc
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // 4. Hiệu ứng UX trên nút bấm báo hiệu tiến trình
        const exportBtn = document.getElementById('btnExportPDF');
        const originalBtnText = exportBtn ? exportBtn.innerHTML : '';
        
        if (exportBtn) {
            exportBtn.innerHTML = "⏳ HỆ THỐNG ĐANG RENDER BẢN IN...";
            exportBtn.disabled = true;
            exportBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        // 5. Kích hoạt xuất file và khôi phục trạng thái nút sau khi hoàn thành
        html2pdf().set(options).from(element).save().then(() => {
            if (exportBtn) {
                exportBtn.innerHTML = originalBtnText;
                exportBtn.disabled = false;
                exportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            console.log(`[PDF Export] Đã xuất thành công tài liệu: ${fileName}`);
        }).catch(err => {
            console.error("Lỗi trong quá trình xuất PDF: ", err);
            alert("Có lỗi xảy ra khi tạo PDF. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.");
            if (exportBtn) {
                exportBtn.innerHTML = "⚠️ LỖI XUẤT FILE. THỬ LẠI!";
                exportBtn.disabled = false;
                exportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    /**
     * Hàm khởi tạo: Lắng nghe sự kiện click trên nút xuất PDF
     */
    static init() {
        // Nút xuất PDF cần được gán ID 'btnExportPDF' trên HTML
        const btnExport = document.getElementById('btnExportPDF');
        
        if (btnExport) {
            btnExport.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Cảnh báo xác nhận trước khi render để tránh bấm nhầm
                const confirmPrint = confirm("Bạn có chắc chắn muốn kết xuất Phiếu thực tập sang định dạng PDF?");
                if (confirmPrint) {
                    this.generatePDF();
                }
            });
        }
    }
}

// Tự động khởi tạo bộ lắng nghe sự kiện ngay khi DOM load xong
document.addEventListener("DOMContentLoaded", () => {
    PDFExporter.init();
});
