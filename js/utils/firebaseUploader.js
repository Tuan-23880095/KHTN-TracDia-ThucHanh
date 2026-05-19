/**
 * ==========================================================================
 * FILE: js/utils/firebaseUploader.js
 * MỤC ĐÍCH: Nén ảnh (Crop 4x6 / 6x4) tại Client và Upload lên Firebase Storage
 * ==========================================================================
 */

// Tích hợp Firebase SDK (Bản Compat CDN dành cho Vanilla JS)
document.write('<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>');
document.write('<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-storage-compat.js"></script>');

class FirebaseUploader {
    static isInitialized = false;

    // Khởi tạo Firebase (Thầy thay bằng Config lấy từ Console Firebase của thầy)
    static init() {
        if (!this.isInitialized) {
            const firebaseConfig = {
                // THẦY COPY TỪ MỤC PROJECT SETTINGS CỦA FIREBASE DÁN VÀO ĐÂY:
                apiKey: "AIzaSy_YOUR_API_KEY",
                authDomain: "link-anh-web.firebaseapp.com",
                projectId: "link-anh-web",
                storageBucket: "link-anh-web.firebasestorage.app",
                messagingSenderId: "YOUR_SENDER_ID",
                appId: "YOUR_APP_ID"
            };
            firebase.initializeApp(firebaseConfig);
            this.isInitialized = true;
        }
    }

    /**
     * Thuật toán Nén, Crop (4x6 hoặc 6x4) và Upload
     * @param {File} file - File ảnh lấy từ thẻ <input type="file">
     * @param {string} fileName - Tên file muốn lưu (VD: 24270025_Buoi1_Selfie)
     * @returns {Promise<string>} - Trả về Link URL công khai của Firebase
     */
    static async processAndUpload(file, fileName) {
        this.init();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = async () => {
                    // 1. THUẬT TOÁN CROP TỶ LỆ 4x6 / 6x4
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    
                    let targetWidth, targetHeight;
                    const isLandscape = img.width > img.height; // Xác định ảnh ngang hay dọc

                    // Khống chế kích thước tối đa (VD: Cạnh dài nhất là 1200px để giữ nét chữ số)
                    const MAX_SIZE = 1200;

                    if (isLandscape) {
                        // Ảnh ngang (Khuôn 6x4 tức tỷ lệ 3:2)
                        targetWidth = MAX_SIZE;
                        targetHeight = MAX_SIZE * (2 / 3);
                    } else {
                        // Ảnh dọc (Khuôn 4x6 tức tỷ lệ 2:3)
                        targetHeight = MAX_SIZE;
                        targetWidth = MAX_SIZE * (2 / 3);
                    }

                    canvas.width = targetWidth;
                    canvas.height = targetHeight;

                    // Tính toán khung crop để lấy tâm bức ảnh (Center Crop)
                    const imgRatio = img.width / img.height;
                    const targetRatio = targetWidth / targetHeight;
                    let cropWidth, cropHeight, cropX, cropY;

                    if (imgRatio > targetRatio) {
                        cropHeight = img.height;
                        cropWidth = img.height * targetRatio;
                        cropX = (img.width - cropWidth) / 2;
                        cropY = 0;
                    } else {
                        cropWidth = img.width;
                        cropHeight = img.width / targetRatio;
                        cropX = 0;
                        cropY = (img.height - cropHeight) / 2;
                    }

                    // Vẽ ảnh đã crop và nén lên Canvas
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, targetWidth, targetHeight);
                    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

                    // 2. XUẤT RA BLOB (Chuẩn nén JPEG 80%) VÀ BẮN LÊN FIREBASE
                    canvas.toBlob(async (blob) => {
                        try {
                            const storageRef = firebase.storage().ref();
                            // Lưu vào thư mục /TracDia/ như thầy mong muốn
                            const fileRef = storageRef.child(`TracDia/${fileName}_${Date.now()}.jpg`);
                            
                            // Tiến hành Upload
                            await fileRef.put(blob);
                            
                            // Lấy Link URL công khai trả về
                            const downloadURL = await fileRef.getDownloadURL();
                            resolve(downloadURL);
                        } catch (error) {
                            reject("Lỗi Upload Firebase: " + error.message);
                        }
                    }, "image/jpeg", 0.8);
                };
            };
        });
    }
}
