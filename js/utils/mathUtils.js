/**
 * ==========================================================================
 * FILE: js/utils/mathUtils.js
 * MỤC ĐÍCH: Thư viện các hàm tiện ích Toán học & Trắc địa (Làm tròn, Quy đổi góc)
 * CÔNG NGHỆ: Lập trình Hướng đối tượng (Static Class) để gọi ở mọi nơi
 * ==========================================================================
 */

class MathUtils {
    
    // ==========================================
    // 1. CÁC HÀM XỬ LÝ SỐ LIỆU MẢNG
    // ==========================================

    /**
     * Tính giá trị trung bình của một mảng số (Áp dụng cho nguyên tắc đo 3 lần)
     * @param {Array<number>} arr - Mảng chứa các giá trị đo
     * @returns {number} Giá trị trung bình
     */
    static calculateAverage(arr) {
        if (!arr || arr.length === 0) return 0;
        
        // Lọc bỏ các giá trị không hợp lệ (NaN, null, undefined) trước khi tính
        const validValues = arr.filter(val => typeof val === 'number' && !isNaN(val));
        if (validValues.length === 0) return 0;

        const sum = validValues.reduce((acc, val) => acc + val, 0);
        return sum / validValues.length;
    }

    /**
     * Tính biên độ (Khoảng chênh lệch lớn nhất) giữa các lần đo để làm Anti-Cheat (QC)
     * Ví dụ: Đo 3 lần đọc mia chênh cao, độ lệch Max - Min không được vượt quá 3mm
     * @param {Array<number>} arr - Mảng các giá trị đo
     * @returns {number} Độ chênh lệch (Max - Min)
     */
    static calculateAmplitude(arr) {
        if (!arr || arr.length < 2) return 0;
        const max = Math.max(...arr);
        const min = Math.min(...arr);
        return Math.abs(max - min);
    }


    // ==========================================
    // 2. CÁC HÀM LÀM TRÒN SỐ (ROUNDING)
    // ==========================================

    /**
     * Làm tròn số liệu chính xác theo quy tắc trắc địa
     * @param {number} value - Giá trị cần làm tròn
     * @param {number} decimals - Số chữ số thập phân (Mặc định 3: tức là milimet nếu đơn vị là mét)
     * @returns {number} Số đã làm tròn
     */
    static round(value, decimals = 3) {
        // Sử dụng Number.EPSILON để tránh lỗi sai số làm tròn thập phân của Javascript (VD: 1.005 -> 1.00)
        const factor = Math.pow(10, decimals);
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    /**
     * Định dạng số thành chuỗi luôn hiển thị đủ 3 chữ số thập phân (VD: 1.2 -> "1.200")
     * Áp dụng để hiển thị số đọc mm trên mia cho đẹp mắt trên phiếu in A4
     */
    static formatMillimeter(value) {
        return Number(value).toFixed(3);
    }


    // ==========================================
    // 3. CÁC HÀM XỬ LÝ GÓC & LƯỢNG GIÁC TRẮC ĐỊA
    // ==========================================

    /**
     * Chuyển đổi góc từ dạng DMS (Độ, Phút, Giây) sang Độ thập phân (Decimal Degrees)
     * @param {number} degrees - Độ (°)
     * @param {number} minutes - Phút (')
     * @param {number} seconds - Giây (")
     * @returns {number} Độ thập phân
     */
    static dmsToDecimal(degrees, minutes, seconds) {
        // Bắt trường hợp góc âm (thường gặp ở góc đứng V khi ống kính chúi xuống)
        const sign = degrees < 0 ? -1 : 1;
        const absD = Math.abs(degrees);
        const absM = Math.abs(minutes);
        const absS = Math.abs(seconds);

        return sign * (absD + (absM / 60) + (absS / 3600));
    }

    /**
     * Chuyển đổi Độ thập phân sang Radian để tính toán lượng giác trong JS
     * @param {number} decimalDegrees 
     * @returns {number} Radian
     */
    static decimalToRadian(decimalDegrees) {
        return decimalDegrees * (Math.PI / 180);
    }

    /**
     * Chuyển đổi trực tiếp DMS sang Radian (Hàm gộp tiện ích)
     */
    static dmsToRadian(degrees, minutes, seconds) {
        const decimal = this.dmsToDecimal(degrees, minutes, seconds);
        return this.decimalToRadian(decimal);
    }

    /**
     * Chuyển ngược từ Độ thập phân ra chuỗi hiển thị DMS (Độ° Phút' Giây")
     * Áp dụng để hiển thị "Góc ngang trung bình" cho sinh viên xem
     */
    static decimalToDmsString(decimalDegrees) {
        if (isNaN(decimalDegrees)) return "0° 0' 0\"";

        const sign = decimalDegrees < 0 ? "-" : "";
        const absDecimal = Math.abs(decimalDegrees);
        
        let d = Math.floor(absDecimal);
        const mFull = (absDecimal - d) * 60;
        let m = Math.floor(mFull);
        let s = Math.round((mFull - m) * 60);

        // Xử lý trường hợp làm tròn giây bị tràn (VD: 60" -> cộng thành 1', 60' -> cộng thành 1°)
        if (s === 60) {
            s = 0;
            m++;
        }
        if (m === 60) {
            m = 0;
            d++;
        }

        return `${sign}${d}° ${m}' ${s}"`;
    }
}
