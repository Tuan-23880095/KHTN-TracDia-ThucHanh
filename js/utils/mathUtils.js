/**
 * ====================================================================
 * BỘ CÔNG CỤ TOÁN HỌC TRẮC ĐỊA (MATH UTILITIES)
 * Vị trí: js/utils/mathUtils.js
 * Nhiệm vụ: Xử lý quy đổi góc, làm tròn số và các phép tính lượng giác
 * ====================================================================
 */

/**
 * 1. QUY ĐỔI GÓC NHẬP LẠI (DMS) SANG ĐỘ THẬP PHÂN (DECIMAL DEGREES)
 * Phục vụ mẹo nhập liệu: 125.3015 -> 125 độ 30 phút 15 giây
 * @param {number|string} dmsFloat - Góc nhập dạng số thập phân liên tục
 * @returns {number} Góc tính bằng độ thập phân để dùng cho toán học
 */
export function dmsToDecimal(dmsFloat) {
    if (!dmsFloat || isNaN(dmsFloat)) return 0;
    
    const value = parseFloat(dmsFloat);
    const degrees = Math.trunc(value); // Lấy phần nguyên (Độ)
    
    // Xử lý cẩn thận lỗi dấu phẩy động (Floating-point precision) của JS
    const remainder = Math.abs(value - degrees);
    const minutes = Math.trunc(remainder * 100);
    const seconds = Math.round((remainder * 100 - minutes) * 100);
    
    // Dấu của kết quả phụ thuộc vào dấu của góc ban đầu (hỗ trợ góc âm)
    const sign = value < 0 ? -1 : 1;
    
    return sign * (Math.abs(degrees) + (minutes / 60) + (seconds / 3600));
}

/**
 * 2. QUY ĐỔI ĐỘ THẬP PHÂN SANG CHUỖI HIỂN THỊ DMS (In ra báo cáo PDF)
 * @param {number} decimalDegrees - Độ thập phân
 * @returns {string} Chuỗi định dạng chuẩn "125° 30' 15\""
 */
export function decimalToDMSString(decimalDegrees) {
    if (isNaN(decimalDegrees)) return "0° 00' 00\"";

    const absolute = Math.abs(decimalDegrees);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60);

    const sign = decimalDegrees < 0 ? "-" : "";
    
    // Đệm số 0 ở trước nếu phút/giây < 10 (vd: 05')
    const padMins = minutes.toString().padStart(2, '0');
    const padSecs = seconds.toString().padStart(2, '0');

    return `${sign}${degrees}° ${padMins}' ${padSecs}"`;
}

/**
 * 3. HÀM QUY ĐỔI ĐỘ SANG RADIAN (Dùng cho Math.cos, Math.tan)
 * @param {number} degrees - Độ thập phân
 * @returns {number} Radian
 */
export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * 4. HÀM LÀM TRÒN SỐ CHUẨN XÁC
 * @param {number} value - Giá trị cần làm tròn
 * @param {number} decimals - Số chữ số thập phân (mặc định là 3 để lấy đến mm)
 * @returns {number} Giá trị đã làm tròn
 */
export function roundStandard(value, decimals = 3) {
    const factor = Math.pow(10, decimals);
    // Sử dụng Number.EPSILON để tránh lỗi làm tròn của hệ thống nhị phân JS
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * 5. HÀM TÍNH TRUNG BÌNH CỘNG CỦA MỘT MẢNG SỐ (Quy tắc đo 3 lần)
 * @param {Array<number>} values - Mảng chứa 3 lần đo
 * @param {number} decimals - Số chữ số thập phân cần làm tròn
 * @returns {number} Giá trị trung bình
 */
export function calculateAverage(values, decimals = 3) {
    if (!values || values.length === 0) return 0;
    const validValues = values.filter(v => !isNaN(v) && v !== null);
    if (validValues.length === 0) return 0;
    
    const sum = validValues.reduce((a, b) => a + b, 0);
    return roundStandard(sum / validValues.length, decimals);
}

/**
 * 6. HÀM CHUẨN HÓA GÓC (Đưa góc về phạm vi 0 -> 360 độ)
 * Dùng khi cộng/trừ góc hoặc tính MO, 2C có thể sinh ra góc âm hoặc > 360
 * @param {number} decimalDegrees - Góc đầu vào
 * @returns {number} Góc chuẩn từ 0 đến 360
 */
export function normalizeAngle(decimalDegrees) {
    let angle = decimalDegrees % 360;
    if (angle < 0) {
        angle += 360;
    }
    return angle;
}
