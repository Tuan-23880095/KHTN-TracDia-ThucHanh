/**
 * ====================================================================
 * TRÌNH ĐIỀU KHIỂN BẢNG ĐIỀU KHIỂN (DASHBOARD CONTROLLER)
 * Vị trí: js/controllers/dashboardCtrl.js
 * Nhiệm vụ: Đổ dữ liệu định danh, phân quyền giao diện (Giảng viên/Sinh viên), 
 * hiển thị danh sách buổi học động.
 * Áp dụng: MVC, Dynamic DOM Rendering, Role-based Access Control (RBAC)
 * ====================================================================
 */

// 1. Nhập khẩu các lớp Lõi (Core)
import userAuthInstance from '../core/UserAuth.js';
import apiConnectorInstance from '../core/APIConnector.js';

// Khởi chạy khi DOM đã load hoàn chỉnh
document.addEventListener('DOMContentLoaded', async () => {
    
    // BƯỚC 1: XÁC THỰC LẠI BẢO MẬT (Phòng hờ)
    if (!userAuthInstance.requireAuth()) return;

    // Lấy cục dữ liệu User đã được đóng gói từ lúc Đăng nhập
    const currentUser = userAuthInstance.getUser();

    // BƯỚC 2: RÁP DỮ LIỆU CÁ NHÂN HÓA LÊN BANNER (Data Binding)
    document.getElementById('lblHeaderUserName').textContent = currentUser.full_name || currentUser.user_id;
    document.getElementById('lblBannerName').textContent = currentUser.full_name || currentUser.user_id;
    document.getElementById('lblBannerId').textContent = currentUser.user_id;
    
    // Định dạng chức danh
    const roleText = currentUser.role === 'teacher' ? 'Giảng viên' : (currentUser.role === 'leader' ? 'Nhóm trưởng' : 'Sinh viên');
    document.getElementById('lblHeaderUserRole').textContent = roleText;
    
    // Nhóm thực địa (Nếu là GV thì để trống)
    document.getElementById('lblBannerGroup').textContent = currentUser.group_id || 'N/A';

    // BƯỚC 3: XỬ LÝ SỰ KIỆN ĐĂNG XUẤT
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống thực địa?')) {
                userAuthInstance.logout();
            }
        });
    }

    // BƯỚC 4: RENDER GIAO DIỆN THEO QUYỀN (ROLE-BASED UI)
    const gridContainer = document.getElementById('sessionGridContainer');
    
    if (currentUser.role === 'teacher') {
        // UI DÀNH RIÊNG CHO GIẢNG VIÊN
        renderTeacherDashboard(gridContainer);
    } else {
        // UI DÀNH CHO SINH VIÊN / NHÓM TRƯỞNG
        await renderStudentDashboard(gridContainer, currentUser.user_id);
    }
});

/**
 * ============================================================================
 * CÁC HÀM RENDER (RENDER FUNCTIONS)
 * ============================================================================
 */

// MẢNG DỮ LIỆU TĨNH CHỨA LỘ TRÌNH 9 BUỔI (Data Dictionary)
const COURSE_SESSIONS = [
    { id: 1, name: "Buổi 1", title: "Giới thiệu Kinh vĩ & Thủy bình", desc: "Nhận diện máy, làm quen ống điều quang và vi động.", url: "pages/session-1.html", isExam: false },
    { id: 2, name: "Buổi 2", title: "Thao tác cân bằng máy", desc: "Định tâm quang học, cân bọt thủy dài/tròn dưới áp lực thời gian.", url: "pages/session-2.html", isExam: false },
    { id: 3, name: "Buổi 3", title: "Đo góc bằng (Kinh vĩ)", desc: "Đo thuận/đảo kính, tính toán sai số 2C thực tế.", url: "pages/session-3.html", isExam: false },
    { id: 4, name: "Buổi 4", title: "Đo độ cao bằng (Thủy bình)", desc: "Đo độ cao bằng thủy bình, tính toán sai số 2C thực tế.", url: "pages/session-4.html", isExam: false },
    { id: 5, name: "Buổi 5", title: "Đo khoảng cách bằng (Kính vi)", desc: "Đo khoảng cách bằng kính vi, tính toán sai số 2C thực tế.", url: "pages/session-5.html", isExam: false },
    { id: 6, name: "Buổi 6", title: "Đo độ dài bằng (Thủy bình)", desc: "Đo độ dài bằng thủy bình, tính toán sai số 2C thực tế.", url: "pages/session-6.html", isExam: false },
    { id: 7, name: "Buổi 7", title: "Dẫn chuyền cao độ tuyến kín", desc: "Lập sổ đo cao hình học vòng khép kín trạm A-B-C-A.", url: "pages/session-7.html", isExam: false },
    { id: 8, name: "Buổi 8", title: "Thao tác đo độ cao", desc: "Thao tác đo độ cao, tính toán sai số 2C thực tế.", url: "pages/session-8.html", isExam: false },
    { id: 9, name: "Buổi 9", title: "Thi Thực Hành Tổng Hợp", desc: "Bốc đề random, sát hạch kỹ năng thao tác dưới áp lực thời gian.", url: "pages/session-9.html", isExam: true }
];

/**
 * RENDER GIAO DIỆN CHO SINH VIÊN
 */
async function renderStudentDashboard(container, studentId) {
    // 1. Tạm thời hiển thị loading cho Grid
    container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 font-bold animate-pulse">Đang tải tiến độ thực tập từ hệ thống...</div>`;

    try {
        // 2. Fetch tiến độ từ Backend (Mock data trước, bạn sẽ thay bằng API lấy từ Google Sheets)
        // const progressResponse = await apiConnectorInstance.getFetch(`getProgress&userId=${studentId}`);
        // Giả lập dữ liệu trả về từ server: Sinh viên đã làm Buổi 1 và Buổi 2
        const completedSessions = [1, 2]; 

        // Cập nhật thẻ đếm tiến độ trên Banner
        document.getElementById('lblProgressCount').textContent = completedSessions.length;

        // 3. Quét vòng lặp đổ dữ liệu (Xóa rỗng grid trước khi đổ)
        container.innerHTML = '';
        
        COURSE_SESSIONS.forEach(session => {
            const isCompleted = completedSessions.includes(session.id);
            // Truyền thêm biến studentId vào để cấy vào link PDF
            const cardHTML = generateSessionCard(session, isCompleted, studentId); 
            container.insertAdjacentHTML('beforeend', cardHTML);
        });

    } catch (error) {
        console.error("Lỗi khi tải tiến độ:", error);
        container.innerHTML = `<div class="col-span-full text-center py-10 text-red-500 font-bold">Lỗi mạng lưới: Không thể tải tiến độ. Hãy thử F5 lại trang!</div>`;
    }
}

/**
 * HÀM SINH MÃ HTML CHO TỪNG THẺ (Card Generator)
 * Trả về chuỗi Template Literal đã cấy biến
 */
function generateSessionCard(session, isCompleted, studentId) {
    // Nếu là Buổi thi (Buổi 9)
    if (session.isExam) {
        return `
        <div class="card-anti-glare !bg-amber-50 border-2 border-amber-400 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-amber-500 text-white px-3 py-1 text-[9px] font-black uppercase rounded-bl-xl tracking-wider animate-pulse">
                Sát Hạch
            </div>
            <div class="space-y-2 pr-12">
                <span class="text-[10px] font-black text-amber-700 uppercase tracking-widest block">${session.name}</span>
                <h3 class="text-sm font-black text-amber-900 leading-snug">${session.title}</h3>
                <p class="text-xs text-amber-800 font-medium">${session.desc}</p>
            </div>
            <div class="pt-4 border-t border-amber-200 mt-4 flex items-center justify-end">
                <a href="${session.url}" class="w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md transition-all uppercase tracking-wider">
                    Bắt đầu thi
                </a>
            </div>
        </div>`;
    }

    // Nếu là Buổi đã hoàn thành (Màu xanh)
    if (isCompleted) {
        return `
        <div class="card-anti-glare border-2 border-emerald-500 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 text-[9px] font-black uppercase rounded-bl-xl tracking-wider">
                Đã nộp bài
            </div>
            <div class="space-y-2 pr-16">
                <span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">${session.name}</span>
                <h3 class="text-sm font-black text-gray-900 leading-snug">${session.title}</h3>
                <p class="text-xs text-gray-500 font-medium">${session.desc}</p>
            </div>
            <div class="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between gap-2">
                <div class="text-emerald-600 text-xs font-extrabold">✅ ĐẠT CHUẨN</div>
                
                <a href="pages/report-template.html?session=${encodeURIComponent(session.name)}&studentId=${studentId}" 
                   class="px-4 py-2 text-xs font-black rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all border border-emerald-200 flex items-center gap-1">
                    🖨️ Xuất PDF
                </a>
            </div>
        </div>`;
    }

    // Nếu là Buổi chưa làm (Màu trắng viền xanh)
    return `
    <div class="card-anti-glare flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all">
        <div class="space-y-2">
            <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest block">${session.name}</span>
            <h3 class="text-sm font-black text-gray-900 leading-snug">${session.title}</h3>
            <p class="text-xs text-gray-500 font-medium">${session.desc}</p>
        </div>
        <div class="pt-4 border-t border-gray-100 mt-4 flex items-center justify-end">
            <a href="${session.url}" class="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md transition-all uppercase tracking-wider">
                Vào thực hành
            </a>
        </div>
    </div>`;
}

/**
 * RENDER GIAO DIỆN DÀNH RIÊNG CHO GIẢNG VIÊN (Admin Panel)
 */
function renderTeacherDashboard(container) {
    // Ẩn thanh đo tiến độ cá nhân vì GV không đi thực tập
    const progressBlock = document.getElementById('lblProgressCount').parentElement.parentElement;
    if(progressBlock) progressBlock.style.display = 'none';

    // Đổ các nút công cụ quản lý thay vì đổ danh sách 9 buổi
    container.innerHTML = `
        <div class="card-anti-glare border-2 border-purple-500 flex flex-col justify-between">
            <div class="space-y-2">
                <span class="text-[10px] font-black text-purple-600 uppercase tracking-widest block">ADMIN TÍNH NĂNG</span>
                <h3 class="text-sm font-black text-gray-900 leading-snug">Quản lý Bảng điểm (Live)</h3>
                <p class="text-xs text-gray-500 font-medium">Theo dõi dữ liệu đo đạc thực tế của 180 sinh viên đang đổ về hệ thống theo thời gian thực.</p>
            </div>
            <div class="pt-4 border-t border-gray-100 mt-4">
                <a href="pages/admin-monitor.html" class="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md transition-all">
                    VÀO TRANG QUẢN TRỊ
                </a>
            </div>
        </div>
    `;
}
