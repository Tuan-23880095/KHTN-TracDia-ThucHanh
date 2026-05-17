/**
 * ==========================================================================
 * FILE: js/models/Level.js
 * MỤC ĐÍCH: Lớp xử lý dữ liệu chuyên biệt cho Máy Thủy Bình (Hình học tự động)
 * CÔNG NGHỆ: Kế thừa lớp cha Measurement (OOP - Inheritance)
 * CHỨC NĂNG:
 * 1. Tính toán chênh cao hình học giữa trạm máy sau và trước (mm/m).
 * 2. Tính toán sai số tuyến tính và sai số góc i phục vụ Buổi 6.
 * 3. Hậu kiểm đạt chuẩn QC tự động phục vụ các bài toán dẫn chuyền tuyến kín.
 * ==========================================================================
 */

class Level extends Measurement {
    /**
     * Khởi tạo đối tượng xử lý máy thủy bình
     * @param {string} name - Tên phân đoạn hoặc tên trạm máy thủy bình
     */
    constructor(name = "Máy Thủy Bình") {
        // Gọi lại cấu trúc khởi tạo của lớp cha Measurement
        super(name, null, null, null, 3); // Hạn mức sai số mặc định giữa các lần ngắm là 3mm
    }

    // ==========================================
    // 1. PHÂN HỆ TÍNH TOÁN CHÊNH CAO HÌNH HỌC
    // ==========================================

    /**
     * Tính chênh cao hình học thô của một lần đo đơn lẻ
     * Công thức hình học: h = Sau (Backsight) - Trước (Foresight)
     * @param {number} backsight - Số đọc chỉ giữa mia sau (mm)
     * @param {number} foresight - Số đọc chỉ giữa mia trước (mm)
     * @returns {number} Chênh cao hình học của lần đo đó (mm)
     */
    calculateSingleElevation(backsight, foresight) {
        return parseFloat(backsight) - parseFloat(foresight);
    }

    /**
     * Tính toán chênh cao trung bình từ mảng dữ liệu 3 lần đo (Đơn vị: Mét)
     * Áp dụng cho nguyên tắc đo 3 lần dịch máy hoặc thay đổi chiều cao máy
     * @param {Array<number>} backsightArr - Mảng 3 số đọc chỉ giữa mia sau (mm)
     * @param {Array<number>} foresightArr - Mảng 3 số đọc chỉ giữa mia trước (mm)
     * @returns {number} Chênh cao trung bình đã quy đổi sang đơn vị mét (m)
     */
    calculateAverageElevation(backsightArr, foresightArr) {
        if (backsightArr.length !== 3 || foresightArr.length !== 3) return 0;

        // Tính mảng chênh cao của 3 lần đo độc lập bằng mm
        const singleElevations = [];
        for (let i = 0; i < 3; i++) {
            singleElevations.push(this.layoutSingleElevation(backsightArr[i], foresightArr[i]));
        }

        // Tạo một instance tạm thời của Measurement để kiểm tra biên độ chênh cao 3 lần
        const tempMeasurement = new Measurement("Chênh cao trạm", singleElevations[0], singleElevations[1], singleElevations[2], this.tolerance);
        
        // Gọi hàm tính trung bình từ lớp cha và quy đổi từ mm sang mét (m)
        const avgMm = tempMeasurement.getAverage();
        return MathUtils.round(avgMm / 1000, 3); // Làm tròn đến 3 chữ số thập phân (mm)
    }


    // ==========================================
    // 2. PHÂN HỆ KIỂM ĐỊNH SAI SỐ GÓC I (Buổi 6)
    // ==========================================

    /**
     * Tính toán sai số hình học góc i theo phương pháp đo từ giữa và đo lệch tâm
     * @param {Object} station1 - Số đọc trạm 1 (máy ở giữa mốc A, B): { sau_A: mm, truoc_B: mm }
     * @param {Object} station2 - Số đọc trạm 2 (máy đặt sát mốc B): { xa_A: mm, gan_B: mm }
     * @param {number} distance_D - Khoảng cách từ trạm máy 2 đến mia xa A (đơn vị: mét)
     * @returns {Object} Kết quả kiểm định chi tiết gồm sai số tuyến tính (x) và góc i (giây)
     */
    checkAngleI(station1, station2, distance_D) {
        const a1 = parseFloat(station1.sau_A);   // Số đọc mia sau tại trạm giữa
        const b1 = parseFloat(station1.truoc_B); // Số đọc mia trước tại trạm giữa
        const a2 = parseFloat(station2.xa_A);    // Số đọc mia xa tại trạm lệch tâm
        const b2 = parseFloat(station2.gan_B);   // Số đọc mia gần tại trạm lệch tâm
        const D = parseFloat(distance_D);        // Khoảng cách trạm 2 đến mia xa (m)

        // 1. Tính chênh cao đúng khi máy đặt ở chính giữa (triệt tiêu được sai số góc i)
        const h0 = a1 - b1; // đơn vị mm

        // 2. Tính số đọc lý thuyết phải có trên mia xa A tại trạm 2 nếu máy hoàn hảo
        const a2_theoretical = b2 + h0;

        // 3. Tính sai số tuyến tính x (độ lệch giữa số đọc thực tế và lý thuyết)
        const x_mm = a2 - a2_theoretical;

        // 4. Quy đổi sai số tuyến tính x sang sai số góc đứng i tính bằng Giây (")
        // Công thức: i" = (x / D) * rho" (với rho" = 206265, đổi D m sang mm)
        let angleI_seconds = 0;
        if (D > 0) {
            angleI_seconds = (x_mm / (D * 1000)) * 206265;
        }

        // Lấy trị tuyệt đối của góc i để hậu kiểm chất lượng theo hạn mức trắc địa
        const isPassed = Math.abs(x_mm) <= 3.0; // Tiêu chuẩn kỹ sư: độ lệch tuyến tính không vượt quá 3mm

        return {
            linearErrorMm: MathUtils.round(x_mm, 1),
            angleISeconds: MathUtils.round(angleI_seconds, 1),
            passed: isPassed,
            message: isPassed 
                ? `✅ ĐẠT CHUẨN KIỂM ĐỊNH! Sai số tuyến tính x = ${MathUtils.round(x_mm, 1)} mm (Hạn mức: $\\le \\pm 3mm$). Góc i = ${MathUtils.round(angleI_seconds, 1)}". Máy đủ điều kiện dẫn tuyến.`
                : `🚨 KHÔNG ĐẠT TIÊU CHUẨN! Sai số tuyến tính x = ${MathUtils.round(x_mm, 1)} mm đã vượt hạn mức $\\le \\pm 3mm$. Góc i quá lớn (${MathUtils.round(angleI_seconds, 1)}"). Sinh viên cần hiệu chỉnh lại vít bọt thủy hoặc điều quang ống ngắm.`
        };
    }
}
