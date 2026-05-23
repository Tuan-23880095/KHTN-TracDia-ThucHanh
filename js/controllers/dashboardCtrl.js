/**
 * ====================================================================
 * TRÌNH ĐIỀU KHIỂN TRUNG TÂM (DASHBOARD CONTROLLER CORE)
 * Vị trí: js/controllers/dashboardCtrl.js
 * Nhiệm vụ: Quét quyền (RBAC), gọi API kéo dữ liệu tiến độ thực tế,
 * rẽ nhánh render Card (Student/Leader) hoặc lập Ma trận Màu (Teacher).
 * ====================================================================
 */

import userAuthInstance from '../core/UserAuth.js';
import apiConnectorInstance from '../core/APIConnector.js';

// CƠ SỞ DỮ LIỆU DANH MỤC 9 BUỔI THỰC TẬP CỐ ĐỊNH
const COURSE_SESSIONS = [
    { id: 1, name: "Buổi 1", title: "Giới thiệu Kinh vĩ & Thủy bình", desc: "Nhận diện cấu tạo máy, thao tác vi động." },
    { id: 2, name: "Buổi 2", title: "Thao tác cân bằng thiết bị", desc: "Định tâm quang học, cân bọt thủy tròn/dài." },
    { id: 3, name: "Buổi 3", title: "Đo góc bằng (Kinh vĩ)", desc: "Phương pháp đo đơn, đo thuận/đảo kính tính 2C." },
    { id: 4, name: "Buổi 4", title: "Đo góc đứng & Tỷ chuẩn", desc: "Xác định góc đứng, tính chỉ số MO bàn độ đứng." },
    { id: 5, name: "Buổi 5", title: "Đo khoảng cách quang học", desc: "Đọc chỉ số lượng cự trên mia, tính khoảng cách trạm." },
    { id: 6, name: "Buổi 6", title: "Đo cao hình học từ giữa", desc: "Thao tác trạm máy thủy bình đọc mia sau/trước." },
    { id: 7, name: "Buổi 7", title: "Dẫn chuyền cao độ tuyến kín", desc: "Phối hợp lập sổ đo vòng khép kín trạm ngoại vi." },
    { id: 8, name: "Buổi 8", title: "Đo vẽ chi tiết bản đồ", desc: "Phối hợp đo tọa độ điểm chi tiết phục vụ địa chất." },
    { id: 9, name: "Buổi 9", title: "Thi Thực Hành Tổng Hợp", desc: "Sát hạch kỹ năng thao tác máy dưới áp lực đồng hồ." }
];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Chặn bảo vệ tuyến đường
    if (!userAuthInstance.requireAuth()) return;
    
    const user = userAuthInstance.getUser();
    
    // 2. Điền thông tin định danh Navbar
    document.getElementById('lblHeaderUserName').textContent = user.full_name || user.user_id;
    const roleTexts = { teacher: 'Giảng viên', leader: 'Nhóm trưởng', student: 'Sinh viên' };
    document.getElementById('lblHeaderUserRole').textContent = roleTexts[user.role] || 'Sinh viên';

    // Xử lý nút Đăng xuất
    document.getElementById('btnLogout').addEventListener('click', () => {
        if (confirm('Bạn muốn đăng xuất khỏi hệ thống thực địa?')) userAuthInstance.logout();
    });

    // 3. ĐIỀU HƯỚNG QUYỀN TRUY CẬP (ROLE-BASED STRUCTURAL ROUTING)
    if (user.role === 'teacher') {
        document.getElementById('sectionTeacherView').classList.remove('hidden');
        await initTeacherDashboard();
    } else {
        document.getElementById('sectionStudentView').classList.remove('hidden');
        // Ráp text Banner cho SV
        document.getElementById('lblBannerName').textContent = user.full_name || user.user_id;
        document.getElementById('lblBannerId').textContent = user.user_id;
        document.getElementById('lblBannerGroup').textContent = user.group_id || 'N/A';
        await initStudentDashboard(user);
    }
});

/**
 * ============================================================================
 * LUỒNG NGHIỆP VỤ KIỂU 1: RENDER CARD CHO SINH VIÊN / NHÓM TRƯỞNG
 * ============================================================================
 */
async function initStudentDashboard(user) {
    const gridContainer = document.getElementById('sessionGridContainer');
    gridContainer.innerHTML = `<div class="col-span-full text-center py-6 font-bold animate-pulse text-gray-400">Đang kiểm tra dữ liệu nộp bài trên Google Sheets...</div>`;

    try {
        // Gọi API kéo danh sách lịch sử nộp bài sạch từ Google Sheets về
        const response = await apiConnectorInstance.getFetch(`getStudentProgress&studentId=${user.user_id}&groupId=${user.group_id}`);
        
        // Cấu trúc data mong đợi từ Server: { individualLog: ["Buổi 1", "Buổi 2"], groupLog: ["Buổi 1"] }
        const progress = response.success ? response.data : { individualLog: [], groupLog: [] };
        
        document.getElementById('lblProgressCount').textContent = progress.individualLog.length;
        gridContainer.innerHTML = ''; // Dọn sạch khay

        // Duyệt qua lộ trình 9 buổi học để nặn nút bấm theo thuật toán của bạn
        COURSE_SESSIONS.forEach(session => {
            const hasIndividualData = progress.individualLog.includes(session.name);
            const hasGroupData = progress.groupLog.includes(session.name);

            let actionButtonsHTML = '';

            // ---- NHÁNH RẼ CHÍNH 1: TÀI KHOẢN LÀ SINH VIÊN THƯỜNG (STUDENT) ----
            if (user.role === 'student') {
                if (!hasIndividualData) {
                    // Nếu chưa có bài cá nhân: Mở nút Làm bài cá nhân, Khóa cứng nút làm bài nhóm
                    actionButtonsHTML = `
                        <a href="pages/session-${session.id}.html" class="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-3 px-2 rounded-xl shadow uppercase tracking-wide">
                            📝 Xem bài cá nhân
                        </a>
                        <button class="flex-1 bg-gray-200 text-gray-400 text-xs font-black py-3 px-2 rounded-xl uppercase tracking-wide cursor-not-allowed" disabled title="Chức năng nộp bài nhóm bị khóa do chưa hoàn thành phần cá nhân">
                            🔒 Xem bài nhóm
                        </button>
                    `;
                } else {
                    // Nếu đã có bài cá nhân: Biến đổi thành nút Xuất Báo Cáo ngay lập tức
                    actionButtonsHTML = `
                        <a href="pages/report-template.html?session=${encodeURIComponent(session.name)}&studentId=${user.user_id}" class="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 px-4 rounded-xl shadow uppercase tracking-wider flex items-center justify-center gap-1">
                            🖨️ Xuất báo cáo cá nhân
                        </a>
                    `;
                }
            } 
            // ---- NHÁNH RẼ CHÍNH 2: TÀI KHOẢN LÀ NHÓM TRƯỞNG (LEADER) ----
            else if (user.role === 'leader') {
                // Xử lý nút số 1: Khối Cá nhân
                let btnIndivHTML = !hasIndividualData
                    ? `<a href="pages/session-${session.id}.html" class="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black py-3 px-1 rounded-xl shadow uppercase">📝 Xem bài cá nhân</a>`
                    : `<a href="pages/report-template.html?session=${encodeURIComponent(session.name)}&studentId=${user.user_id}" class="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black py-3 px-1 rounded-xl shadow uppercase">🖨️ BC cá nhân</a>`;

                // Xử lý nút số 2: Khối Nhóm
                let btnGroupHTML = !hasGroupData
                    ? `<a href="pages/session-${session.id}.html?tab=group" class="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black py-3 px-1 rounded-xl shadow uppercase">👥 Xem bài nhóm</a>`
                    : `<a href="pages/report-template.html?session=${encodeURIComponent(session.name)}&groupId=${user.group_id}" class="flex-1 text-center bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-black py-3 px-1 rounded-xl shadow uppercase">🖨️ BC Nhóm</a>`;

                actionButtonsHTML = `<div class="flex gap-2 w-full">${btnIndivHTML}${btnGroupHTML}</div>`;
            }

            // Bơm ngược khối hộp Card hoàn chỉnh vào Grid
            const cardHTML = `
                <div class="card-anti-glare flex flex-col justify-between hover:shadow-md border border-gray-150 transition-all">
                    <div class="space-y-2">
                        <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest block">${session.name}</span>
                        <h3 class="text-sm font-black text-gray-900 leading-snug">${session.title}</h3>
                        <p class="text-xs text-gray-500 font-medium">${session.desc}</p>
                    </div>
                    <div class="pt-4 border-t border-gray-100 mt-4 flex items-center gap-2">
                        ${actionButtonsHTML}
                    </div>
                </div>
            `;
            gridContainer.insertAdjacentHTML('beforeend', cardHTML);
        });

    } catch (error) {
        gridContainer.innerHTML = `<div class="col-span-full text-center py-6 text-red-500 font-bold">Lỗi truy xuất tiến độ CSDL: ${error.message}</div>`;
    }
}

/**
 * ============================================================================
 * LUỒNG NGHIỆP VỤ KIỂU 2: RENDER HAI MA TRẬN MÀU CHO GIẢNG VIÊN (TEACHER VIEW)
 * ============================================================================
 */
async function initTeacherDashboard() {
    const tblIndivBody = document.getElementById('tblIndividualMatrixBody');
    const tblGroupBody = document.getElementById('tblGroupMatrixBody');
    
    tblIndivBody.innerHTML = `<tr><td colspan="11" class="p-4 text-gray-400 italic">Đang đồng bộ ma trận lớp học...</td></tr>`;

    try {
        // Gọi API quét toàn bộ kho dữ liệu lớn từ Server
        const response = await apiConnectorInstance.getFetch('getTeacherMatrixSummary');
        if (!response.success) throw new Error(response.message);

        const serverData = response.data; 
        /* Cấu trúc nhận về mong đợi:
           {
              stats: { currentStudentDone: 120, totalStudent: 180, currentGroupDone: 6, totalGroup: 8 },
              individualMatrix: [ { student_id: "24270001", full_name: "Nguyễn Văn A", logs: {"Buổi 1": true, "Buổi 2": false...} } ],
              groupMatrix: [ { group_id: "N01", logs: {"Buổi 1": true, "Buổi 2": true...} } ]
           }
        */

        // 1. Gắn số liệu tổng quan lên thẻ thống kê
        document.getElementById('lblStatsStudent').textContent = `${serverData.stats.currentStudentDone} / ${serverData.stats.totalStudent}`;
        document.getElementById('lblStatsGroup').textContent = `${serverData.stats.currentGroupDone} / ${serverData.stats.totalGroup}`;

        // 2. ĐỔ DỮ LIỆU MA TRẬN 1: BÀI CÁ NHÂN SINH VIÊN
        tblIndivBody.innerHTML = '';
        serverData.individualMatrix.forEach(row => {
            let cellsHTML = '';
            
            // Chạy vòng lặp kiểm tra trạng thái màu xanh/đỏ cho 9 buổi học
            COURSE_SESSIONS.forEach(session => {
                const hasData = row.logs[session.name] === true;
                
                // Thuật toán: Nếu xanh (có số liệu) -> Cho phép bấm click ăn link URL điều hướng, nếu đỏ -> Hiện chữ X tĩnh
                cellsHTML += hasData 
                    ? `<td class="border p-1 bg-emerald-500 text-white font-bold cursor-pointer matrix-cell" onclick="window.location.href='pages/report-template.html?session=${encodeURIComponent(session.name)}&studentId=${row.student_id}'" title="Click để xem bài nộp ${session.name}">Đạt</td>`
                    : `<td class="border p-1 bg-red-100 text-red-400 font-normal select-none">✕</td>`;
            });

            const rowHTML = `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="p-3 border font-mono text-left">${row.student_id}</td>
                    <td class="p-3 border text-left font-bold text-blue-900">${row.full_name}</td>
                    ${cellsHTML}
                </tr>
            `;
            tblIndivBody.insertAdjacentHTML('beforeend', rowHTML);
        });

        // 3. ĐỔ DỮ LIỆU MA TRẬN 2: BÀI NHÓM TỔ ĐỘI
        tblGroupBody.innerHTML = '';
        serverData.groupMatrix.forEach(row => {
            let cellsHTML = '';
            
            COURSE_SESSIONS.forEach(session => {
                const hasData = row.logs[session.name] === true;
                
                cellsHTML += hasData 
                    ? `<td class="border p-1 bg-teal-500 text-white font-bold cursor-pointer matrix-cell" onclick="window.location.href='pages/report-template.html?session=${encodeURIComponent(session.name)}&groupId=${row.group_id}'" title="Click xem báo cáo nhóm ${session.name}">Đạt</td>`
                    : `<td class="border p-1 bg-red-100 text-red-400 font-normal select-none">✕</td>`;
            });

            const rowHTML = `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="p-3 border text-left font-bold text-indigo-900">Nhóm tổ đội: ${row.group_id}</td>
                    ${cellsHTML}
                </tr>
            `;
            tblGroupBody.insertAdjacentHTML('beforeend', rowHTML);
        });

    } catch (error) {
        tblIndivBody.innerHTML = `<tr><td colspan="11" class="p-4 text-red-500 font-bold">Lỗi không thể nạp ma trận tổng quan: ${error.message}</td></tr>`;
    }
}
