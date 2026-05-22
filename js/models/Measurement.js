/**
 * ====================================================================
 * LỚP CHA: ĐỐI TƯỢNG ĐO ĐẠC NỀN TẢNG (BASE MEASUREMENT CLASS)
 * Vị trí: js/models/Measurement.js
 * Nhiệm vụ: Xử lý quy tắc đo 3 lần, tính trung bình, kiểm soát sai số thô
 * Áp dụng: OOP (Inheritance, Encapsulation), Tách biệt Logic & UI
 * ====================================================================
 */

// Import các hàm toán học chuyên dụng đã viết ở Giai đoạn 2
import { calculateAverage, roundStandard } from '../utils/mathUtils.js'; 

export default class Measurement {
    /**
     * Khởi tạo đối tượng đo đạc với 3 lần đo
     * @param {number} val1 - Giá trị đo lần 1
     * @param {number} val2 - Giá trị đo lần 2
     * @param {number} val3 - Giá trị đo lần 3
     * @param {number} tolerance - Sai số/Độ lệch tối đa cho phép (Mặc định là 3mm hoặc 3 giây)
     */
    constructor(val1 = 0, val2 = 0, val3 = 0, tolerance = 3) {
        // Đóng gói dữ liệu thô vào mảng
        this.rawValues = [val1, val2, val3];
        this.tolerance = tolerance;
    }

    /**
     * Cập nhật lại số liệu đo (Dùng khi sinh viên sửa số trên form)
     */
    setValues(val1, val2, val3) {
        this.rawValues = [val1, val2, val3];
    }

    /**
     * Cập nhật hạn mức sai số cho phép (Tùy theo yêu cầu của từng buổi/bài toán)
     */
    setTolerance(newTolerance) {
        this.tolerance = newTolerance;
    }

    /**
     * Lọc lấy các giá trị hợp lệ (Bỏ qua null, NaN nếu có)
     * @returns {Array<number>}
     */
    getValidValues() {
        return this.rawValues.filter(v => typeof v === 'number' && !isNaN(v));
    }

    /**
     * 1. HÀM TÍNH TRUNG BÌNH CỦA 3 LẦN ĐO
     * @param {number} decimals - Số chữ số làm tròn (Mặc định 3 số lẻ)
     * @returns {number}
     */
    getAverage(decimals = 3) {
        const validValues = this.getValidValues();
        return calculateAverage(validValues, decimals);
    }

    /**
     * 2. HÀM TÍNH ĐỘ LỆCH (BIÊN ĐỘ MAX - MIN) CỦA CÁC LẦN ĐO
     * Phục vụ cho việc kiểm tra chất lượng đo đạc ngoài thực địa
     * @returns {number} Khoảng chênh lệch lớn nhất
     */
    getMaxDifference() {
        const validValues = this.getValidValues();
        if (validValues.length < 2) return 0; // Nếu chưa nhập đủ 2 số thì độ lệch bằng 0

        const maxVal = Math.max(...validValues);
        const minVal = Math.min(...validValues);
        
        return roundStandard(maxVal - minVal, 3);
    }

    /**
     * 3. HÀM KIỂM SOÁT CHẤT LƯỢNG (QUALITY CONTROL - QC VALIDATION)
     * Đây là "Trái tim" chống gian lận của hệ thống. Kiểm tra độ lệch có vượt mức cho phép không
     * @returns {Object} Đối tượng chứa trạng thái hợp lệ và thông điệp báo lỗi
     */
    validate() {
        // Ràng buộc 1: Bắt buộc phải nhập đủ 3 lần đo
        const validValues = this.getValidValues();
        if (validValues.length < 3) {
            return {
                isValid: false,
                maxDiff: null,
                message: "Vui lòng nhập đầy đủ số liệu cho cả 3 lần đo."
            };
        }

        // Ràng buộc 2: Độ chênh lệch giữa các lần đo không được vượt quá tolerance
        const maxDiff = this.getMaxDifference();
        if (maxDiff > this.tolerance) {
            return {
                isValid: false,
                maxDiff: maxDiff,
                message: `Lỗi sai số thô! Độ lệch giữa 3 lần đo là ${maxDiff}, vượt quá mức cho phép (${this.tolerance}). Yêu cầu thực hiện đo lại!`
            };
        }

        // Nếu qua hết các vòng kiểm tra
        return {
            isValid: true,
            maxDiff: maxDiff,
            message: "Số liệu đo ổn định, đạt chuẩn!"
        };
    }

    /**
     * 4. HÀM ĐÓNG GÓI JSON PAYLOAD CHO BACKEND (Serialization)
     * Trả về cục Object chứa dữ liệu thô để Controller ném qua APIConnector
     */
    getPayloadData() {
        return {
            r1: this.rawValues[0],
            r2: this.rawValues[1],
            r3: this.rawValues[2],
            avg: this.getAverage(),
            diff: this.getMaxDifference()
        };
    }
}
