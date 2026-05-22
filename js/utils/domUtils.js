/**
 * ====================================================================
 * BỘ CÔNG CỤ TƯƠNG TÁC GIAO DIỆN (DOM UTILITIES)
 * Vị trí: js/utils/domUtils.js
 * Nhiệm vụ: Tương tác an toàn với HTML, hiển thị thông báo, quản lý trạng thái
 * ====================================================================
 */

/**
 * 1. HIỂN THỊ THÔNG BÁO TRẠNG THÁI FORM (Alert Message)
 * Chuyên dùng để hiển thị lỗi Validation hoặc thành công ngay trên Form
 * @param {string} containerId - ID của thẻ div chứa thông báo (VD: 'formErrorMessage')
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại thông báo: 'error', 'success', 'warning'
 */
export function showMessage(containerId, message, type = 'error') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Reset các class màu sắc cũ của Tailwind
    container.className = 'p-4 text-xs font-bold rounded-xl mb-4 transition-all duration-300';

    // Cấu hình màu sắc theo loại thông báo
    if (type === 'error') {
        container.classList.add('bg-red-50', 'border', 'border-red-200', 'text-red-600');
    } else if (type === 'success') {
        container.classList.add('bg-emerald-50', 'border', 'border-emerald-200', 'text-emerald-700');
    } else if (type === 'warning') {
        container.classList.add('bg-amber-50', 'border', 'border-amber-200', 'text-amber-700');
    }

    container.innerHTML = message;
    container.classList.remove('hidden'); // Hiển thị
}

/**
 * 2. ẨN THÔNG BÁO TRẠNG THÁI
 * @param {string} containerId - ID của thẻ div chứa thông báo
 */
export function hideMessage(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
}

/**
 * 3. BẬT/TẮT TRẠNG THÁI LOADING (Spinner) CHO NÚT BẤM
 * Dùng khi sinh viên bấm "Nộp bài", tránh việc bấm đúp nhiều lần gửi rác lên Sheets
 * @param {string} buttonId - ID của nút bấm (VD: 'btnSubmitForm')
 * @param {boolean} isLoading - Trạng thái: true (đang tải), false (dừng tải)
 * @param {string} originalText - Chữ gốc của nút (VD: 'NỘP BÁO CÁO')
 */
export function toggleButtonLoading(buttonId, isLoading, originalText = 'ĐANG XỬ LÝ...') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    // Giả định cấu trúc nút có chứa span text và span spinner
    const textSpan = btn.querySelector('span:not(.animate-spin)');
    const spinnerSpan = btn.querySelector('.animate-spin');

    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('opacity-75', 'cursor-not-allowed');
        if (textSpan) textSpan.textContent = 'ĐANG XỬ LÝ...';
        if (spinnerSpan) spinnerSpan.classList.remove('hidden');
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        if (textSpan) textSpan.textContent = originalText;
        if (spinnerSpan) spinnerSpan.classList.add('hidden');
    }
}

/**
 * 4. LẤY GIÁ TRỊ TỪ INPUT AN TOÀN (Safe Getter)
 * Ép kiểu dữ liệu để tránh lỗi tính toán (Toán học JS rất nhạy cảm với chuỗi rỗng)
 * @param {string} inputId - ID của ô input
 * @param {string} type - Kiểu dữ liệu mong muốn: 'number', 'string'
 * @returns {number|string}
 */
export function getInputValue(inputId, type = 'string') {
    const input = document.getElementById(inputId);
    if (!input) return type === 'number' ? 0 : '';

    const value = input.value.trim();
    
    if (type === 'number') {
        return value === '' ? 0 : parseFloat(value);
    }
    return value;
}

/**
 * 5. HIGHLIGHT Ô NHẬP LIỆU BỊ LỖI (Bôi đỏ Input)
 * Áp dụng khi Validation phát hiện sinh viên nhập sai nguyên tắc
 * @param {string} inputId - ID của ô input bị lỗi
 * @param {boolean} isError - Trạng thái lỗi (true) hoặc bình thường (false)
 */
export function highlightInputError(inputId, isError) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (isError) {
        input.classList.remove('border-gray-200', 'focus:border-blue-500');
        input.classList.add('border-red-500', 'bg-red-50', 'text-red-700');
    } else {
        input.classList.add('border-gray-200', 'focus:border-blue-500');
        input.classList.remove('border-red-500', 'bg-red-50', 'text-red-700');
    }
}
