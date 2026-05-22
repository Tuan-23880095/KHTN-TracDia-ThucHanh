/**
 * ====================================================================
 * TRÌNH ĐIỀU KHIỂN HOẠT ĐỘNG HIỆN TRƯỜNG (SESSION CONTROLLER)
 * Vị trí: js/controllers/sessionCtrl.js
 * Nhiệm vụ: Quản lý biểu mẫu Buổi 1, Phân quyền UI, Upload Firebase, 
 * Gọi Model toán học kiểm tra QC, Đóng gói dữ liệu gửi lên GAS Server.
 * Áp dụng: OOP, Dependency Injection, Event Delegation, Asynchronous Flow
 * ====================================================================
 */

// 1. NHẬP KHẨU CÁC THÀNH PHẦN LÕI HỆ THỐNG (CORE & UTILS)
import userAuthInstance from '../core/UserAuth.js';
import apiConnectorInstance from '../core/APIConnector.js';
import { uploadImageToFirebase } from '../core/FirebaseConfig.js';
import Measurement from '../models/Measurement.js'; // Có thể đổi thành Theodolite nếu buổi sau dùng góc
import { 
    showMessage, 
    hideMessage, 
    toggleButtonLoading, 
    getInputValue, 
    highlightInputError 
} from '../utils/domUtils.js';

// Khởi chạy khi cây cấu trúc HTML hoàn thành
document.addEventListener('DOMContentLoaded', () => {
    
    // BƯỚC 1: MIDDLEWARE BẢO VỆ TUYẾN ĐƯỜNG
    if (!userAuthInstance.requireAuth()) return;
    const user = userAuthInstance.getUser();

    // Ánh xạ form chính dựa trên spec ID đã chốt ở View
    const sessionForm = document.getElementById('session1Form');
    if (!sessionForm) return;

    // BƯỚC 2: PHÂN QUYỀN VÀ ĐIỀU PHỐI GIAO DIỆN HÌNH HỌC (RBAC UI CONTROL)
    setupRoleBasedUI(user);

    // BƯỚC 3: KÍCH HOẠT TÍNH TOÁN THEO THỜI GIAN THỰC (LIVE COMPUTER)
    setupLiveCalculations();

    // BƯỚC 4: LẮNG NGHE SỰ KIỆN SUBMIT FORM NỘP BÀI
    sessionForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Ngăn trình duyệt tải lại trang (F5)
        
        // Dọn sạch bảng thông báo lỗi cũ
        hideMessage('formErrorMessage');

        // Trích xuất loại hình nộp bài ('Cá nhân' hoặc 'Nhóm')
        const submitType = getInputValue('txtSubmitType', 'string');

        // Khóa nút bấm và bật vòng xoay tải dữ liệu
        toggleButtonLoading('btnSubmitForm', true, 'NỘP BÁO CÁO SỐ LIỆU BUỔI 1');

        try {
            // TUYẾN TRÌNH 1: ĐẨY MINH CHỨNG ẢNH LÊN CLOUD FIREBASE LẤY URL CHUỖI VĂN BẢN
            let uploadedPhotoUrl = "";
            
            if (submitType === "Cá nhân") {
                const fileInput = document.getElementById('fileIndividual');
                if (fileInput && fileInput.files.length > 0) {
                    // Gọi hàm upload đám mây core đã đóng gói ở Giai đoạn 2
                    uploadedPhotoUrl = await uploadImageToFirebase(fileInput.files[0], 'Buoi_1_CaNhan', user.user_id);
                    document.getElementById('txtIndividualPhotoUrl').value = uploadedPhotoUrl;
                }
            } else {
                const fileInput = document.getElementById('fileGroup');
                if (fileInput && fileInput.files.length > 0) {
                    uploadedPhotoUrl = await uploadImageToFirebase(fileInput.files[0], 'Buoi_1_Nhom', user.user_id);
                    document.getElementById('txtGroupPhotoUrl').value = uploadedPhotoUrl;
                }
            }

            // TUYẾN TRÌNH 2: GỌI BỘ MÁY TOÁN HỌC KIỂM TRA QUY PHẠM SAI SỐ (MODEL QC VALIDATION)
            const val1 = getInputValue('txtVal1', 'number');
            const val2 = getInputValue('txtVal2', 'number');
            const val3 = getInputValue('txtVal3', 'number');

            // Khởi tạo đối tượng xử lý số liệu (Sai số cho phép của Buổi 1 là 3 đơn vị đo)
            const measurementModel = new Measurement(val1, val2, val3, 3);
            const qcResult = measurementModel.validate(); // Chạy hàm "Anti-Cheat" chặn sai số thô

            // Nếu phát hiện sinh viên chế số liệu thô thiển ngoài hiện trường, lập tức chặn đứng luồng
            if (!qcResult.isValid) {
                highlightInputError('txtVal1', true);
                highlightInputError('txtVal2', true);
                highlightInputError('txtVal3', true);
                throw new Error(qcResult.message); // Đẩy luồng xuống khối catch xử lý
            }

            // TUYẾN TRÌNH 3: ĐÓNG GÓI GÓI TIN ĐA QUAN HỆ (CHA - CON JSON PAYLOAD)
            
            // 1. Thực thể bảng CHA (SUBMISSIONS Mapping)
            const submissionObj = {
                student_id: user.user_id,
                session_name: getInputValue('txtSessionName', 'string'),
                submit_type: submitType,
                photo_url: uploadedPhotoUrl || "No_Image",
                student_comment: getInputValue('txtStudentComment', 'string')
            };

            // 2. Thực thể mảng bảng CON (MEASUREMENTS Mapping)
            // Buổi 1 lưu trữ thêm thông tin nhận diện 5 bộ phận linh kiện máy
            const measurementsArray = [{
                reading_type: getInputValue('txtReadingType', 'string'),
                val_1: val1,
                val_2: val2,
                val_3: val3,
                val_avg: measurementModel.getAverage(), // Lấy số trung bình sạch từ Model
                parts_json: JSON.stringify({
                    p1: getInputValue('txtPart1', 'string'),
                    p2: getInputValue('txtPart2', 'string'),
                    p3: getInputValue('txtPart3', 'string'),
                    p4: getInputValue('txtPart4', 'string'),
                    p5: getInputValue('txtPart5', 'string'),
                    machine_type: getInputValue('cmbMachineType', 'string'),
                    target_desc: getInputValue('txtTargetDesc', 'string')
                })
            }];

            // TUYẾN TRÌNH 4: PHÁT XUNG GỌI APICONNECTOR ĐẨY VỀ MÁY CHỦ GOOGLE SCRIPT
            const apiResult = await apiConnectorInstance.postSubmission(submissionObj, measurementsArray);

            if (apiResult.success) {
                showMessage('formErrorMessage', '🎉 Nộp báo cáo thành công! Số liệu đã được lưu trữ vĩnh viễn trên hệ thống.', 'success');
                // Khóa form hoàn toàn, tạo độ trễ 1.5s rồi điều hướng về Dashboard
                setTimeout(() => {
                    window.location.replace('../dashboard.html');
                }, 1500);
            } else {
                throw new Error(apiResult.message || "Lỗi không xác định từ phía Google Sheets.");
            }

        } catch (error) {
            console.error("❌ Thất bại tại tiến trình nộp bài:", error);
            // Giải phóng khóa nút bấm để sinh viên chỉnh sửa lại số liệu ngoài hiện trường
            toggleButtonLoading('btnSubmitForm', false, 'NỘP BÁO CÁO SỐ LIỆU BUỔI 1');
            // Hiển thị dải đỏ báo lỗi trực quan
            showMessage('formErrorMessage', error.message, 'error');
        }
    });
});

/**
 * ============================================================================
 * CÁC HÀM TIỆN ÍCH HOẠT ĐỘNG (INTERNALS)
 * ============================================================================
 */

/**
 * 1. Hàm phân quyền chi tiết Giao diện (RBAC View Control)
 */
function setupRoleBasedUI(user) {
    // Tự động điền dữ liệu định danh của SV từ bộ nhớ cache vào các ô Read-Only
    document.getElementById('txtStudentId').value = user.user_id;
    document.getElementById('txtStudentName').value = user.full_name || 'Sinh viên hiện trường';
    document.getElementById('txtGroupId').value = user.group_id || 'N/A';

    const tabNhom = document.getElementById('tabNhom');
    const btnSubmit = document.getElementById('btnSubmitForm');

    // Luật 1: Nếu là Sinh viên thường ('student') -> Ẩn biến mất nút Tab nhóm
    if (user.role === 'student') {
        if (tabNhom) tabNhom.style.display = 'none';
    }

    // Luật 2: Nếu là Giảng viên ('teacher') -> Khóa toàn bộ ô nhập liệu, ẩn luôn nút Nộp bài
    if (user.role === 'teacher') {
        if (btnSubmit) btnSubmit.style.display = 'none';
        // Quét tìm tất cả input, select, textarea bọc trong form để disable cứng
        const formElements = document.querySelectorAll('#session1Form input, #session1Form select, #session1Form textarea');
        formElements.forEach(el => el.disabled = true);
        showMessage('formErrorMessage', '💡 Chế độ Giảng viên: Bạn đang xem số liệu thực tập của sinh viên này ở chế độ Đọc (Read-only).', 'warning');
    }
}

/**
 * 2. Hàm lắng nghe gõ phím tính Toán Trung Bình Cộng Live (Real-time average listener)
 */
function setupLiveCalculations() {
    const valInputs = ['txtVal1', 'txtVal2', 'txtVal3'];
    
    valInputs.forEach(id => {
        const inputEl = document.getElementById(id);
        if (!inputEl) return;

        // Bắt sự kiện 'input' (Kích hoạt ngay khi sinh viên vừa gõ xong một chữ số ngoài nắng)
        inputEl.addEventListener('input', () => {
            const v1 = getInputValue('txtVal1', 'number');
            const v2 = getInputValue('txtVal2', 'number');
            const v3 = getInputValue('txtVal3', 'number');

            // Xóa bôi đỏ lỗi cũ khi sinh viên có ý thức tự sửa số
            highlightInputError(id, false);

            // Chỉ tính trung bình nếu cả 3 ô đã được điền số khác 0
            if (v1 > 0 && v2 > 0 && v3 > 0) {
                const liveModel = new Measurement(v1, v2, v3);
                // Gán trị số trung bình tự động vào ô txtValAvg để sinh viên nhìn thấy trực quan
                document.getElementById('txtValAvg').value = liveModel.getAverage();
            } else {
                document.getElementById('txtValAvg').value = '';
            }
        });
    });
}
