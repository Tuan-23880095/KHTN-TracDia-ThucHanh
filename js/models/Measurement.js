/**
 * ==========================================================================
 * FILE: js/models/Measurement.js
 * MỤC ĐÍCH: Lớp cha (Base Class) xử lý quy tắc cốt lõi "Đo 3 lần lấy trung bình"
 * CHỨC NĂNG:
 * 1. Lưu trữ 3 giá trị đo độc lập.
 * 2. Tính toán giá trị trung bình.
 * 3. Đánh giá chất lượng đo (Quality Control / Anti-Cheat) dựa trên biên độ.
 * ==========================================================================
 */

class Measurement {
    /**
     * Khởi tạo một đại lượng đo đạc
     * @param {string} name - Tên đại lượng (VD: "Chênh cao h", "Khoảng cách D")
     * @param {number|string} val1 - Số đọc lần 1
     * @param {number|string} val2 - Số đọc lần 2
     * @param {number|string} val3 - Số đọc lần 3
     * @param {number} tolerance - Sai số cho phép tối đa giữa các lần đo (VD: 3mm)
     */
    constructor(name, val1, val2, val3, tolerance = 3) {
        this.name = name;
        // Sử dụng parseFloat để ép kiểu an toàn từ chuỗi nhập vào sang số thực
        this.val1 = parseFloat(val1);
        this.val2 = parseFloat(val2);
        this.val3 = parseFloat(val3);
        this.tolerance = tolerance;
    }

    /**
     * Lấy danh sách các giá trị hợp lệ (Bỏ qua các ô nhập chữ hoặc bỏ trống)
     * @returns {Array<number>} Mảng chứa các số hợp lệ
     */
    getValidValues() {
        return [this.val1, this.val2, this.val3].filter(v => !isNaN(v));
    }

    /**
     * Kiểm tra xem sinh viên đã nhập đủ 3 lần đo chưa
     * @returns {boolean}
     */
    isComplete() {
        return this.getValidValues().length === 3;
    }

    /**
     * Tính giá trị trung bình của 3 lần đo
     * Kết hợp gọi đến thư viện MathUtils đã tạo để đảm bảo logic tập trung
     * @returns {number} Giá trị trung bình (Chưa làm tròn)
     */
    getAverage() {
        if (!this.isComplete()) return 0;
        
        // Gọi hàm từ class MathUtils ở file mathUtils.js
        return MathUtils.calculateAverage(this.getValidValues());
    }

    /**
     * Tính biên độ dao động (Max - Min) để đánh giá độ chính xác của người đo
     * @returns {number} Khoảng chênh lệch lớn nhất
     */
    getAmplitude() {
        if (!this.isComplete()) return 0;
        return MathUtils.calculateAmplitude(this.getValidValues());
    }

    /**
     * BỘ LỌC ĐÁNH GIÁ CHẤT LƯỢNG (QC VALIDATION & ANTI-CHEAT)
     * Đây là "chốt chặn" không cho phép sinh viên nộp số liệu chế/sai lệch cao
     * @returns {Object} Đối tượng chứa trạng thái { passed: boolean, message: string }
     */
    validateQC() {
        // Lỗi 1: Đo thiếu
        if (!this.isComplete()) {
            return {
                passed: false,
                message: `❌ [${this.name}] Chưa nhập đủ số liệu 3 lần đo.`
            };
        }

        // Lỗi 2: Đo sai số quá lớn
        const amplitude = this.getAmplitude();
        if (amplitude > this.tolerance) {
            return {
                passed: false,
                message: `🚨 [${this.name}] KHÔNG ĐẠT! Độ lệch lớn nhất giữa 3 lần ngắm là ${MathUtils.round(amplitude, 1)} (Hạn mức cho phép: $\\le ${this.tolerance}$). Bắt buộc làm lệch máy và đo lại trạm này!`
            };
        }

        // Hợp lệ
        return {
            passed: true,
            message: `✅ [${this.name}] Đạt chuẩn QC. (Biên độ lệch: ${MathUtils.round(amplitude, 1)})`
        };
    }
}
