/**
 * ==========================================================================
 * FILE: js/utils/firebaseUploader.js
 * MỤC ĐÍCH: Nén ảnh (Crop 4x6 / 6x4) tại Client và Upload lên Firebase Storage
 * ==========================================================================
 */

class FirebaseUploader {
    static isInitialized = false;
    static scriptsLoaded = false;

    // Hàm tải script an toàn, không dùng document.write bị Chrome chặn
    static loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Khởi tạo Firebase
    static async init() {
        if (!this.scriptsLoaded) {
            await this.loadScript("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
            await this.loadScript("https://www.gstatic.com/firebasejs/10.8.0/firebase-storage-compat.js");
            this.scriptsLoaded = true;
        }

        if (!this.isInitialized) {
            const firebaseConfig = {
                apiKey: "AIzaSyBNU5ILwVP3bUeMnD7RmYFsVUXIxU2U6d0",
                authDomain: "link-anh-web.firebaseapp.com",
                projectId: "link-anh-web",
                storageBucket: "link-anh-web.firebasestorage.app",
                messagingSenderId: "541489679303",
                appId: "1:541489679303:web:f48c80bfd4b574872fa7e2"
            };
            firebase.initializeApp(firebaseConfig);
            this.isInitialized = true;
        }
    }

    /**
     * Thuật toán Nén, Crop (4x6 hoặc 6x4) và Upload
     */
    static async processAndUpload(file, fileName) {
        await this.init(); // Chờ Firebase tải xong mới chạy
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = async () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    
                    let targetWidth, targetHeight;
                    const isLandscape = img.width > img.height; 
                    const MAX_SIZE = 1200;

                    if (isLandscape) {
                        targetWidth = MAX_SIZE;
                        targetHeight = MAX_SIZE * (2 / 3);
                    } else {
                        targetHeight = MAX_SIZE;
                        targetWidth = MAX_SIZE * (2 / 3);
                    }

                    canvas.width = targetWidth;
                    canvas.height = targetHeight;

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

                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, targetWidth, targetHeight);
                    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

                    canvas.toBlob(async (blob) => {
                        try {
                            const storageRef = firebase.storage().ref();
                            const fileRef = storageRef.child(`TracDia/${fileName}_${Date.now()}.jpg`);
                            await fileRef.put(blob);
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
