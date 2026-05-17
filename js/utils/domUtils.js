/**
 * ==========================================================================
 * FILE: js/utils/domUtils.js
 * MỤC ĐÍCH: Thư viện các hàm tiện ích thao tác DOM (Giao diện View)
 * CÔNG NGHỆ: Lập trình Hướng đối tượng (Static Class)
 * CHỨC NĂNG:
 * 1. Hiển thị thông báo (Alert) màu sắc đỏ/xanh chuẩn QC.
 * 2. Cập nhật Text/Màu sắc các thẻ kết quả.
 * 3. Render công thức Toán học MathJax thời gian thực.
 * 4. Xử lý hiển thị ảnh Preview (FileReader) trước khi upload.
 * ==========================================================================
 */

class DOMUtils {
    
    // ==========================================
    // 1. CÁC HÀM XỬ LÝ HỘP THÔNG BÁO (ALERTS)
    // ==========================================

    /**
     * Hiển thị hộp thông báo (Alert) với màu sắc tương ứng
     * @param {string} elementId - ID của thẻ div chứa alert (VD: 'validationAlert')
     * @param {string} message - Nội dung thông báo (hỗ trợ HTML và MathJax)
     * @param {string} type - Loại thông báo: 'success' (Xanh), 'danger' (Đỏ), 'warning' (Vàng)
     */
    static showAlert(elementId, message, type = 'danger') {
        const alertEl = document.getElementById(elementId);
        if (!alertEl) return;

        // Xóa các class màu cũ để tránh xung đột giao diện phẳng
        alertEl.classList.remove('alert-success', 'alert-danger', 'alert-warning', 'alert-info', 'hidden');
        
        // Thêm class màu mới tương ứng với trạng thái (đã định nghĩa ở components.css)
        alertEl.classList.add(`alert-${type}`);
        
        // Gắn nội dung thông báo
        alertEl.innerHTML = message;

        // BẮT BUỘC: Render lại MathJax vì nội dung message thường chứa công thức (VD: \le 3mm)
        this.renderMathJax([alertEl]);
    }

    /**
     * Ẩn hộp thông báo khi sinh viên bắt đầu nhập lại số liệu mới
     * @param {string} elementId 
     */
    static hideAlert(elementId) {
        const alertEl = document.getElementById(elementId);
        if (alertEl) {
            alertEl.classList.add('hidden');
            alertEl.innerHTML = '';
        }
    }


    // ==========================================
    // 2. CÁC HÀM XỬ LÝ GIAO DIỆN VÀ RENDER TOÁN HỌC
    // ==========================================

    /**
     * Kích hoạt thư viện MathJax quét và vẽ lại công thức toán học bị ẩn hoặc vừa gen bằng JS
     * @param {Array} elements - Mảng các DOM Elements cần render (Nếu null sẽ quét toàn trang)
     */
    static renderMathJax(elements = null) {
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
            MathJax.typesetPromise(elements).catch((err) => {
                console.error('Lỗi render MathJax:', err.message);
            });
        }
    }

   /**
     * Gắn chuỗi kết quả vào một phần tử và tự động đổi màu chữ đánh giá
     * @param {string} elementId - ID của thẻ (VD: 'ind_h_avg')
     * @param {string} text - Nội dung hiển thị (VD: '1.250 m')
     * @param {string} colorClass - Class màu text (VD: 'text-danger', 'text-success font-bold')
     */
    static setText(elementId, text, colorClass = null) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        el.innerHTML = text;
        
        if (colorClass) {
            // Xóa các class màu văn bản cũ có thể có
            el.classList.remove('text-danger', 'text-success', 'text-primary', 'text-muted', 'text-warning');
            
            // CÁCH SỬA Ở ĐÂY:
            // Cắt chuỗi theo khoảng trắng và thêm từng class vào để tránh lỗi InvalidCharacterError
            const classes = colorClass.split(' ').filter(c => c.trim() !== '');
            el.classList.add(...classes);
        }
    }

    /**
     * Chuyển đổi trạng thái hiển thị (Bật/Tắt) của một khối HTML (Tab / Khối báo cáo)
     * @param {string} elementId 
     * @param {boolean} isVisible - true: Mở, false: Ẩn
     */
    static toggleVisibility(elementId, isVisible) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        if (isVisible) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }


    // ==========================================
    // 3. CÁC HÀM TIỆN ÍCH TRÍCH XUẤT DỮ LIỆU TỪ FORM
    // ==========================================

    /**
     * Lấy giá trị số thực từ ô Input một cách an toàn (trả về NaN nếu rỗng)
     * @param {string} elementId 
     * @returns {number}
     */
    static getNumberValue(elementId) {
        const el = document.getElementById(elementId);
        if (!el || el.value.trim() === '') return NaN;
        return parseFloat(el.value);
    }

    /**
     * Tiện ích trắc địa: Lấy trọn bộ giá trị góc DMS (Độ-Phút-Giây) từ 3 ô Input riêng biệt
     * @param {string} idD - ID ô nhập độ
     * @param {string} idM - ID ô nhập phút
     * @param {string} idS - ID ô nhập giây
     * @returns {Object} { d: number, m: number, s: number }
     */
    static getDmsValues(idD, idM, idS) {
        return {
            d: this.getNumberValue(idD),
            m: this.getNumberValue(idM),
            s: this.getNumberValue(idS)
        };
    }


    // ==========================================
    // 4. TIỆN ÍCH XỬ LÝ ẢNH MINH CHỨNG
    // ==========================================

    /**
     * Đọc file ảnh từ ô `<input type="file">` và hiển thị xem trước lên thẻ `<img>`
     * (Giúp sinh viên kiểm tra xem ảnh Selfie/Máy có rõ nét không trước khi nộp)
     * @param {string} inputId - ID của ô input file
     * @param {string} previewId - ID của thẻ img hiển thị
     */
    static setupImagePreview(inputId, previewId) {
        const inputEl = document.getElementById(inputId);
        const previewEl = document.getElementById(previewId);
        
        if (!inputEl || !previewEl) return;

        inputEl.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                // Kiểm tra sơ bộ loại file
                if (!file.type.startsWith('image/')) {
                    alert('Vui lòng chỉ tải lên tệp định dạng hình ảnh (JPG, PNG)!');
                    this.value = '';
                    previewEl.classList.add('hidden');
                    return;
                }

                // Dùng FileReader của HTML5 để đọc trực tiếp dưới Client (Không tốn băng thông mạng)
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewEl.src = e.target.result;
                    previewEl.classList.remove('hidden');
                }
                reader.readAsDataURL(file);
            } else {
                // Rút ảnh ra nếu sinh viên bấm Cancel
                previewEl.src = "";
                previewEl.classList.add('hidden');
            }
        });
    }
}
