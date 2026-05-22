/**
 * ====================================================================
 * LỚP KẾT NỐI VÀ XỬ LÝ LƯU TRỮ ĐÁM MÂY (FIREBASE STORAGE)
 * Vị trí: js/core/FirebaseConfig.js
 * Nhiệm vụ: Khởi tạo Firebase và Đóng gói logic đẩy ảnh minh chứng
 * ====================================================================
 */

// Import trực tiếp từ CDN của Google (Dành cho web tĩnh GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// 1. CẤU HÌNH API LẤY TỪ FIREBASE CONSOLE CỦA BẠN
const firebaseConfig = {
    apiKey: "AIzaSyBNU5ILwVP3bUeMnD7RmYFsVUXIxU2U6d0",
    authDomain: "link-anh-web.firebaseapp.com",
    projectId: "link-anh-web",
    storageBucket: "link-anh-web.firebasestorage.app",
    messagingSenderId: "541489679303",
    appId: "1:541489679303:web:f48c80bfd4b574872fa7e2",
    measurementId: "G-H1M11P4R1N"
};

// 2. KHỞI TẠO ỨNG DỤNG VÀ DỊCH VỤ STORAGE
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

/**
 * 3. HÀM ĐÓNG GÓI CHUYÊN DỤNG ĐỂ UPLOAD ẢNH (Wrapper Function)
 * Xử lý toàn bộ logic tạo tên file, đẩy lên bucket và lấy link URL trả về.
 * * @param {File} file - Đối tượng file ảnh lấy từ thẻ <input type="file">
 * @param {string} sessionName - Tên buổi học để phân loại thư mục (VD: 'Buoi_1')
 * @param {string} studentId - MSSV để gắn vào tên file tránh trùng lặp
 * @returns {Promise<string|null>} - Trả về URL của ảnh hoặc null nếu thất bại
 */
export async function uploadImageToFirebase(file, sessionName = "General", studentId = "Unknown") {
    if (!file) return null;

    try {
        // Tạo tên file độc nhất (Unique ID) bằng Timestamp + MSSV
        const timestamp = new Date().getTime();
        // Giữ lại phần mở rộng gốc của ảnh (VD: .jpg, .png)
        const fileExtension = file.name.split('.').pop(); 
        const uniqueFileName = `${sessionName}_${studentId}_${timestamp}.${fileExtension}`;

        // Chỉ định đường dẫn thư mục lưu trên Firebase Bucket
        // Cấu trúc: TracDia / Buoi_1 / Buoi_1_2120001_1715420000.jpg
        const storageReference = ref(storage, `TracDia/${sessionName}/${uniqueFileName}`);

        // Thực hiện lệnh đẩy byte dữ liệu lên Firebase
        const snapshot = await uploadBytes(storageReference, file);

        // Lấy đường dẫn URL công khai (Download URL) để ghi vào Google Sheets
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;

    } catch (error) {
        console.error(" Lỗi khi Upload ảnh lên Firebase:", error);
        throw new Error("Không thể tải ảnh minh chứng lên máy chủ. Vui lòng kiểm tra lại mạng!");
    }
}
