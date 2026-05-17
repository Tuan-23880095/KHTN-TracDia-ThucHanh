/**
 * ==========================================================================
 * FILE: js/models/Theodolite.js
 * MỤC ĐÍCH: Lớp xử lý dữ liệu chuyên biệt cho Máy Kinh Vĩ Điện Tử
 * CÔNG NGHỆ: Kế thừa lớp cha Measurement (OOP Inheritance)
 * CHỨC NĂNG:
 * 1. Tính toán góc bằng trung bình và sai số bàn độ ngang (2C).
 * 2. Tính toán sai số chỉ số bàn độ đứng (MO) và góc đứng (V).
 * 3. Tính khoảng cách quang học (D) và chênh cao lượng giác (h).
 * ==========================================================================
 */

class Theodolite extends Measurement {
    /**
     * Khởi tạo đối tượng trạm đo máy kinh vĩ
     * @param {Object} stationInfo - Thông tin trạm máy (inst_height, station_O...)
     */
    constructor(stationInfo = {}) {
        // Gọi constructor của lớp cha với các giá trị mặc định để khởi tạo cấu trúc nền
        super("Máy Kinh Vĩ", null, null, null, 0);
        this.instHeight = parseFloat(stationInfo.inst_height) || 0; // Chiều cao máy (i) tính bằng mét
        this.K = 100; // Hằng số nhân khoảng cách của máy quang học cơ bản
    }

    /**
     * Hàm hỗ trợ: Chuẩn hóa góc về khoảng [0, 360) độ để tránh góc âm khi trừ trị số bàn độ
     */
    normalizeAngle(angle) {
        while (angle < 0) angle += 360;
        return angle % 360;
    }

    // ==========================================
    // 1. PHÂN HỆ XỬ LÝ BÀN ĐỘ NGANG (GÓC BẰNG & 2C)
    // ==========================================

    /**
     * Tính toán sai số vị trí bàn độ ngang 2C (Collimation Error)
     * Công thức: 2C = T - P ± 180° (T: Thuận kính, P: Đảo kính)
     * @param {Object} T_dms - {d, m, s} của số đọc Thuận kính
     * @param {Object} P_dms - {d, m, s} của số đọc Đảo kính
     * @returns {number} Trị số 2C tính bằng Độ thập phân
     */
    calculate2C(T_dms, P_dms) {
        const T_deg = MathUtils.dmsToDecimal(T_dms.d, T_dms.m, T_dms.s);
        const P_deg = MathUtils.dmsToDecimal(P_dms.d, P_dms.m, P_dms.s);
        
        let diff = T_deg - P_deg;
        let diffNormalized = this.normalizeAngle(diff);
        
        // Sai số khép trị tuyệt đối quanh trục 180 độ
        let error2C = diffNormalized - 180;
        if (error2C > 180) error2C -= 360;
        
        return error2C;
    }

    /**
     * Tính toán hướng bằng đã triệt tiêu sai số 2C
     * Công thức: Hướng bằng = [T + (P ± 180°)] / 2
     */
    calculateCorrectedDirection(T_dms, P_dms) {
        const T_deg = MathUtils.dmsToDecimal(T_dms.d, T_dms.m, T_dms.s);
        const P_deg = MathUtils.dmsToDecimal(P_dms.d, P_dms.m, P_dms.s);
        
        let P_adjusted = this.normalizeAngle(P_deg + 180);
        
        // Nếu góc nhảy qua vạch 0/360 độ, chuẩn hóa để lấy trung bình chính xác
        if (Math.abs(T_deg - P_adjusted) > 180) {
            if (T_deg < P_adjusted) P_adjusted -= 360;
            else P_adjusted += 360;
        }
        
        return this.normalizeAngle((T_deg + P_adjusted) / 2);
    }


    // ==========================================
    // 2. PHÂN HỆ XỬ LÝ BÀN ĐỘ ĐỨNG (GÓC ĐỨNG V & MO)
    // ==========================================

    /**
     * Tính chỉ số MO (Index Error) của bàn độ đứng độc lập từng lần đo
     * Công thức máy thông thường: MO = (T + P - 360°) / 2
     * @param {Object} T_vert - {d, m, s} Thuận kính bàn độ đứng
     * @param {Object} P_vert - {d, m, s} Đảo kính bàn độ đứng
     * @returns {number} Trị số MO tính bằng Độ thập phân
     */
    calculateMO(T_vert, P_vert) {
        const T_deg = MathUtils.dmsToDecimal(T_vert.d, T_vert.m, T_vert.s);
        const P_deg = MathUtils.dmsToDecimal(P_vert.d, P_vert.m, P_vert.s);
        
        let sum = T_deg + P_deg;
        return (sum - 360) / 2;
    }

    /**
     * Tính góc đứng V thực tế sau khi đã cấu trúc triệt tiêu sai số MO
     * Công thức: V = T - MO = 180° - P - MO
     * @returns {number} Góc đứng V tính bằng Độ thập phân
     */
    calculateVerticalAngle(T_vert, MO) {
        const T_deg = MathUtils.dmsToDecimal(T_vert.d, T_vert.m, T_vert.s);
        return T_deg - MO;
    }


    // ==========================================
    // 3. PHÂN HỆ ĐO KHOẢNG CÁCH VÀ CAO ĐỘ (XỬ LÝ MIA)
    // ==========================================

    /**
     * Tính khoảng cách nằm ngang từ máy đến mia bằng phương pháp lượng cự quang học
     * Công thức: D = K * n * cos²(V) (Với n = Chỉ trên - Chỉ dưới)
     * @param {number} cT - Số đọc chỉ trên trên mia (đơn vị: mm)
     * @param {number} cD - Số đọc chỉ dưới trên mia (đơn vị: mm)
     * @param {number} V_deg - Góc đứng bàn độ đứng (Độ thập phân)
     * @returns {number} Khoảng cách nằm ngang D (đơn vị: mét)
     */
    calculateHorizontalDistance(cT, cD, V_deg) {
        // Đổi khoảng cách đọc trên mia từ milimet sang mét để tính toán kỹ sư
        const n_meter = (cT - cD) / 1000; 
        const V_rad = MathUtils.decimalToRadian(V_deg);
        
        // D = K * n * cos²(V)
        const cosV = Math.cos(V_rad);
        const D = this.K * n_meter * Math.pow(cosV, 2);
        
        return MathUtils.round(D, 3);
    }

    /**
     * Tính chênh cao lượng giác giữa tâm máy và điểm đặt mia
     * Công thức hình học lượng giác toàn diện: h = D * tan(V) + i - v
     * Hoặc tính trực tiếp qua số đọc mia: h = (1/2) * K * n * sin(2V) + i - v
     * @param {number} D_meter - Khoảng cách nằm ngang đã tính ở hàm trên (mét)
     * @param {number} V_deg - Góc đứng bàn độ đứng (Độ thập phân)
     * @param {number} cG - Số đọc chỉ giữa trên mia (đơn vị: mm)
     * @returns {number} Chênh cao lượng giác h (đơn vị: mét)
     */
    calculateTrigonometricLeveling(D_meter, V_deg, cG) {
        const V_rad = MathUtils.decimalToRadian(V_deg);
        const v_meter = cG / 1000; // Đổi số đọc chỉ giữa từ mm ra mét
        
        // h = D * tan(V) + i - v
        const h = (D_meter * Math.tan(V_rad)) + this.instHeight - v_meter;
        
        return MathUtils.round(h, 3);
    }
}
