/**
 * ====================================================================
 * LỚP CON: ĐỐI TƯỢNG ĐO THỦY BÌNH (LEVELING STATION MODEL)
 * Vị trí: js/models/Level.js
 * Kế thừa: Measurement Class (Lớp Cha)
 * Nhiệm vụ: Quản lý số liệu 3 chỉ (cT, cD, cG) của 2 mia Sau/Trước qua 3 lần đo,
 * tự động tính chênh cao, khoảng cách trạm và kiểm tra quy phạm hình học.
 * Áp dụng: OOP (Inheritance, Polymorphism), Thiết lập Từ điển Biến cố định.
 * ====================================================================
 */

import Measurement from './Measurement.js';
import { roundStandard } from '../utils/mathUtils.js';

export class Level extends Measurement {
    /**
     * Khởi tạo một Trạm đo Thủy bình hoàn chỉnh gồm 3 lần đo (Run 1, 2, 3)
     * @param {Object} run1Data - Số liệu lần 1: { back: {cT, cD, cG}, fore: {cT, cD, cG} }
     * @param {Object} run2Data - Số liệu lần 2: { back: {cT, cD, cG}, fore: {cT, cD, cG} }
     * @param {Object} run3Data - Số liệu lần 3: { back: {cT, cD, cG}, fore: {cT, cD, cG} }
     * @param {number} tolerance - Hạn mức lệch chênh cao giữa 3 lần (Mặc định: 3mm)
     */
    constructor(run1Data, run2Data, run3Data, tolerance = 3) {
        // Lưu trữ cục bộ toàn bộ cấu trúc số liệu thô có cấu trúc (cT, cD, cG)
        this.runs = [run1Data, run2Data, run3Data];

        // Thuật toán bóc tách và tính toán chênh cao của từng lần đo (h1, h2, h3)
        const h1 = Level.calculateSingleDeltaH(run1Data.back.cG, run1Data.fore.cG);
        const h2 = Level.calculateSingleDeltaH(run2Data.back.cG, run2Data.fore.cG);
        const h3 = Level.calculateSingleDeltaH(run3Data.back.cG, run3Data.fore.cG);

        // Gọi hàm khởi tạo của Lớp Cha (super), ném h1, h2, h3 vào để lớp cha lo khâu
        // tính trung bình cộng, kiểm tra độ lệch tối đa và chạy bộ lọc validate()
        super(h1, h2, h3, tolerance);
    }

    /**
     * CÔNG THỨC 1: TÍNH CHÊNH CAO THÔ CỦA MỘT LẦN ĐO ĐƠN LẺ (Static Method)
     * Thuật toán: Chênh cao h = Số đọc Mia Sau (Back) - Số đọc Mia Trước (Fore)
     * @param {number} back_cG - Chỉ giữa mia sau (mm)
     * @param {number} fore_cG - Chỉ giữa mia trước (mm)
     * @returns {number} Chênh cao trạm đo (mm)
     */
    static calculateSingleDeltaH(back_cG, fore_cG) {
        return roundStandard(back_cols_cG - fore_cols_cG, 1); 
    }

    /**
     * CÔNG THỨC 2: TÍNH KHOẢNG CÁCH QUANG HỌC TỪ MÁY ĐẾN MIA (Chỉ lượng cự)
     * Thuật toán: S = (cT - cD) * 100 / 1000 (Chia 1000 để đổi từ mm ra mét)
     * @param {number} cT - Chỉ trên (mm)
     * @param {number} cD - Chỉ dưới (mm)
     * @returns {number} Khoảng cách tính bằng Mét
     */
    static calculateDistance(cT, cD) {
        if (!cT || !cD || cT <= cD) return 0;
        return roundStandard(((cT - cD) * 100) / 1000, 3);
    }

    /**
     * Ghi đè (Override) phương thức validate của lớp cha để bổ sung thêm các quy định
     * kiểm tra chất lượng (QC) đặc thù của máy thủy bình ngoài công trường
     * @returns {Object} Kết quả kiểm tra chất lượng số liệu
     */
    validate() {
        // Bước 1: Gọi hàm validate cơ bản của lớp cha trước (kiểm tra độ lệch h giữa 3 lần)
        const parentValidation = super.validate();
        if (!parentValidation.isValid) return parentValidation;

        // Bước 2: Vòng lặp kiểm tra lỗi logic toán học của từng cây mia (Chỉ trên + Chỉ dưới) / 2 == Chỉ giữa
        for (let i = 0; i < this.runs.length; i++) {
            const run = this.runs[i];
            
            // Kiểm tra Mia Sau
            const backMidCalc = (run.back.cT + run.back.cD) / 2;
            if (Math.abs(run.back.cG - backMidCalc) > 2) { // Vượt quá 2mm
                return { isValid: false, message: `Lỗi đọc mia Sau ở Lần đo ${i+1}! Chỉ giữa thực đo (${run.back.cG}) lệch quá 2mm so với chỉ giữa lý thuyết (${backMidCalc}). Vui lòng kiểm tra lại!` };
            }

            // Kiểm tra Mia Trước
            const foreMidCalc = (run.fore.cT + run.fore.cD) / 2;
            if (Math.abs(run.fore.cG - foreMidCalc) > 2) {
                return { isValid: false, message: `Lỗi đọc mia Trước ở Lần đo ${i+1}! Chỉ giữa thực đo (${run.fore.cG}) lệch quá 2mm so với chỉ giữa lý thuyết (${foreMidCalc}). Vui lòng kiểm tra lại!` };
            }
        }

        // Bước 3: Tính toán khoảng cách trạm trung bình phục vụ ghi nhận dữ liệu
        const r1 = this.runs[0];
        const dBack = Level.calculateDistance(r1.back.cT, r1.back.cD);
        const dFore = Level.calculateDistance(r1.fore.cT, r1.fore.cD);
        const deltaD = roundStandard(Math.abs(dBack - dFore), 3);

        // Quy phạm trắc địa công trình: Chênh lệch khoảng cách từ máy đến 2 mia (sau/trước) không được lệch quá 2 mét để tránh sai số góc i
        if (deltaD > 2.0) {
            return { isValid: false, message: `Cảnh báo QC: Trạm máy đặt không cân! Khoảng cách đến Mia Sau (${dBack}m) và Mia Trước (${dFore}m) lệch nhau ${deltaD}m (Vượt quá giới hạn 2m). Trục ngắm sẽ bị ảnh hưởng bởi sai số góc i, yêu cầu dời lại trạm máy!` };
        }

        return {
            isValid: true,
            message: "Số liệu đo thủy bình hoàn hảo, đạt chuẩn quy phạm hiện trường!",
            dataSummary: { d_back: dBack, d_fore: dFore, total_dist: roundStandard(dBack + dFore, 3) }
        };
    }

    /**
     * ĐÓNG GÓI DỮ LIỆU NO-SQL PAYLOAD (Sẵn sàng đẩy sang gán vào ô raw_payload_json trên Google Sheets)
     */
    getNoSQLPayload() {
        return {
            // Đóng gói mảng raw sạch sẽ dùng đúng bộ tên biến cT, cD, cG làm từ điển cố định
            raw_runs: this.runs,
            h_average: this.getAverage(), // Hàm kế thừa từ lớp cha
            max_h_difference: this.getMaxDifference() // Hàm kế thừa từ lớp cha
        };
    }
}
