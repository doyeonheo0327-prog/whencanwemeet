// ==========================================

// 1. 기본 설정 및 전역 상태

// ==========================================

const calendar = document.getElementById('calendar');

const timeTable = document.getElementById('timeTable');

const monthTitle = document.getElementById('monthTitle');

const utilBar = document.getElementById('util-bar');

const statsContainer = document.getElementById('stats-container');



const dayNames = ['일', '월', '화', '수', '목', '금', '토'];



let currentDate = new Date();

let currentYear = currentDate.getFullYear();

let currentMonth = currentDate.getMonth();



let selectedDates = []; 

let tempSelectedTimes = []; 

let serverData = {};

let totalUsersCount = 0;



let activeUserFilter = null;

let minDurationFilter = 1;

let unanimousTriggered = false;



let isDragging = false;

let isSelecting = true;

let dragType = null;





// ==========================================

// 2. 핵심 렌더링 (달력 & 시간표)

// ==========================================

function renderCalendar(year, month) {

    if (!calendar) return;

    calendar.innerHTML = ''; 

    monthTitle.textContent = `${year}년 ${month + 1}월`;

    

    dayNames.forEach(day => {

        const cell = document.createElement('div');

        cell.textContent = day;

        cell.classList.add('cell', 'header');

        calendar.appendChild(cell);

    });

    

    const firstDay = new Date(year, month, 1).getDay();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    

    for (let i = 0; i < firstDay; i++) {

        const cell = document.createElement('div');

        cell.classList.add('cell', 'empty');

        calendar.appendChild(cell);

    }

    for (let day = 1; day <= daysInMonth; day++) {

        const cell = document.createElement('div');

        cell.textContent = day;

        cell.classList.add('cell', 'date-cell');

        const fullDate = `${year}-${month + 1}-${day}`;

        cell.dataset.fullDate = fullDate; 

        if (selectedDates.includes(fullDate)) cell.classList.add('selected-date');

        calendar.appendChild(cell);

    }

}



function renderTimeTable() {

    

    timeTable.innerHTML = '';

    if (selectedDates.length === 0) {

        timeTable.innerHTML = '<div style="padding: 40px; color: gray;">위 달력에서 날짜를 먼저 선택해주세요!</div>';

        timeTable.style.gridTemplateColumns = '1fr';

        return;

    }



    timeTable.style.gridTemplateColumns = `60px repeat(${selectedDates.length}, 1fr)`;



    const emptyCorner = document.createElement('div');

    emptyCorner.classList.add('tt-cell', 'tt-time-label');

    timeTable.appendChild(emptyCorner);



    selectedDates.forEach(dateStr => {

        const header = document.createElement('div');

        const [y, m, d] = dateStr.split('-');

        const dayOfWeek = new Date(y, m - 1, d).getDay(); 

        header.innerHTML = `<strong>${m}/${d}</strong><br><span style="font-size:10px;">(${dayNames[dayOfWeek]})</span>`;

        header.classList.add('tt-cell', 'tt-day-header');

        timeTable.appendChild(header);

    });



    for (let time = 9; time <= 21; time++) {

        const timeLabel = document.createElement('div');

        timeLabel.textContent = `${time}:00`;

        timeLabel.classList.add('tt-cell', 'tt-time-label');

        timeTable.appendChild(timeLabel);



        selectedDates.forEach(dateStr => {

            const cell = document.createElement('div');

            cell.classList.add('tt-cell', 'selectable');

            cell.dataset.date = dateStr;

            cell.dataset.time = time;

            

            const [y, m, d] = dateStr.split('-');

            cell.dataset.dayOfWeek = new Date(y, m - 1, d).getDay();



            const timeKey = `${dateStr}_${time}`;

            

            if (tempSelectedTimes.includes(timeKey)) cell.classList.add('selected');



            if (serverData[timeKey] && totalUsersCount > 0) {

                const people = serverData[timeKey];

                const count = people.length;

                

                let isUserFilteredOut = activeUserFilter && !people.includes(activeUserFilter);

                let isDurationFilteredOut = false;

                if (minDurationFilter > 1) {

                    let isConsecutive = false;

                    for (let i = 0; i < minDurationFilter; i++) {

                        const nextTimeKey = `${dateStr}_${parseInt(time) + i}`;

                        if (serverData[nextTimeKey] && serverData[nextTimeKey].length > 0) isConsecutive = true;

                        else { isConsecutive = false; break; }

                    }

                    if (!isConsecutive) isDurationFilteredOut = true;

                }



                if (isDurationFilteredOut) {

                    cell.style.background = `repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 10px, #e8e8e8 10px, #e8e8e8 20px)`;

                    cell.style.border = '1px solid #ddd';

                    cell.innerHTML = ''; 

                    cell.title = `조건 미달 (연속 ${minDurationFilter}시간 안 됨)`;

                } 

                else if (isUserFilteredOut) {

                    cell.style.backgroundColor = '#f1f2f6'; 

                    cell.style.border = '1px solid #e1e5ee';

                    cell.innerHTML = `<span style="font-size:10px; filter: grayscale(100%); opacity: 0.3;">${'👤'.repeat(count)}</span>`;

                    cell.title = `${count}명 가능 (단, ${activeUserFilter}님 불참 🥲)`;

                } 

                else {

                    const opacity = 0.2 + (0.8 * (count / totalUsersCount)); 

                    cell.style.backgroundColor = `rgba(108, 92, 231, ${opacity})`; 

                    cell.innerHTML = `<span style="font-size:10px; color:#fff;">${'👤'.repeat(count)}</span>`;

                    

                    if (count === 1) cell.title = `앗.. ${people[0]}님만 되는 외로운 시간 👻`;

                    else cell.title = `${count}명 가능: ${people.join(', ')}`;



                    if (count === totalUsersCount && totalUsersCount > 1) {

                        cell.style.border = '2px solid #FFD700';

                        cell.addEventListener('click', () => {

                            if (!cell.querySelector('.stamp_extra')) {

                                const s = document.createElement('div');

                                s.className = 'stamp_extra';

                                s.innerText = '확정 쾅!🔨';

                                cell.appendChild(s);

                            }

                        });

                    }

                }

            }

            timeTable.appendChild(cell);

        });

    }

}





// ==========================================

// 3. 드래그 로직

// ==========================================

function toggleDateCell(target, forceSelect) {

    const fullDate = target.dataset.fullDate;

    if (!fullDate) return;

    target.classList.toggle('selected-date', forceSelect);

    if (forceSelect && !selectedDates.includes(fullDate)) selectedDates.push(fullDate);

    else if (!forceSelect) selectedDates = selectedDates.filter(d => d !== fullDate);

    selectedDates.sort((a, b) => new Date(a) - new Date(b));

}



function toggleTimeCell(target, forceSelect) {

    const timeKey = `${target.dataset.date}_${target.dataset.time}`;

    target.classList.toggle('selected', forceSelect);

    

    if (forceSelect && !tempSelectedTimes.includes(timeKey)) tempSelectedTimes.push(timeKey);

    else if (!forceSelect) tempSelectedTimes = tempSelectedTimes.filter(k => k !== timeKey);



    if (document.getElementById('repeatToggle').checked) {

        const { dayOfWeek, time } = target.dataset;

        document.querySelectorAll(`.selectable[data-day-of-week="${dayOfWeek}"][data-time="${time}"]`)

                .forEach(c => {

                    const cKey = `${c.dataset.date}_${c.dataset.time}`;

                    c.classList.toggle('selected', forceSelect);

                    if (forceSelect && !tempSelectedTimes.includes(cKey)) tempSelectedTimes.push(cKey);

                    else if (!forceSelect) tempSelectedTimes = tempSelectedTimes.filter(k => k !== cKey);

                });

    }

}



document.addEventListener('mousedown', (e) => {

    const dateTarget = e.target.closest('.date-cell');

    const timeTarget = e.target.closest('.selectable');

    if (dateTarget && dateTarget.textContent !== '') {

        isDragging = true; dragType = 'date';

        isSelecting = !dateTarget.classList.contains('selected-date');

        toggleDateCell(dateTarget, isSelecting);

    } else if (timeTarget) {

        isDragging = true; dragType = 'time';

        isSelecting = !timeTarget.classList.contains('selected');

        toggleTimeCell(timeTarget, isSelecting);

    }

});



document.addEventListener('mouseover', (e) => {

    if (!isDragging) return;

    if (dragType === 'date') {

        const target = e.target.closest('.date-cell');

        if (target && target.textContent !== '') toggleDateCell(target, isSelecting);

    } else if (dragType === 'time') {

        const target = e.target.closest('.selectable');

        if (target) toggleTimeCell(target, isSelecting);

    }

});



document.addEventListener('mouseup', () => {

    if (isDragging && dragType === 'date') renderTimeTable(); 

    isDragging = false; dragType = null;

});



// 터치 이벤트

document.addEventListener('touchstart', (e) => {

    const touch = e.touches[0];

    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    const dateTarget = target?.closest('.date-cell');

    const timeTarget = target?.closest('.selectable');



    if (dateTarget && dateTarget.textContent !== '') {

        isDragging = true; dragType = 'date';

        isSelecting = !dateTarget.classList.contains('selected-date');

        toggleDateCell(dateTarget, isSelecting);

        e.preventDefault(); 

    } else if (timeTarget) {

        isDragging = true; dragType = 'time';

        isSelecting = !timeTarget.classList.contains('selected');

        toggleTimeCell(timeTarget, isSelecting);

        e.preventDefault();

    }

}, { passive: false });



document.addEventListener('touchmove', (e) => {

    if (!isDragging) return;

    const touch = e.touches[0];

    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    

    if (dragType === 'date') {

        const dateTarget = target?.closest('.date-cell');

        if (dateTarget && dateTarget.textContent !== '') toggleDateCell(dateTarget, isSelecting);

    } else if (dragType === 'time') {

        const timeTarget = target?.closest('.selectable');

        if (timeTarget) toggleTimeCell(timeTarget, isSelecting);

    }

    e.preventDefault();

}, { passive: false });



document.addEventListener('touchend', () => { 

    if (isDragging && dragType === 'date') renderTimeTable();

    isDragging = false; dragType = null;

});





// ==========================================

// 4. 부가 기능 (랭킹, 필터, 폭죽)

// ==========================================

function showToast(msg) {

    let t = document.createElement('div');

    t.innerText = msg;

    t.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#2d3436;color:white;padding:15px 25px;border-radius:30px;z-index:9999;box-shadow:0 4px 10px rgba(0,0,0,0.2);font-weight:bold;";

    document.body.appendChild(t);

    setTimeout(() => t.remove(), 3000);

}



function fireFireworks() {

    const canvas = document.createElement('canvas');

    canvas.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:9998;";

    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth; canvas.height = window.innerHeight;

    for (let i = 0; i < 150; i++) {

        ctx.fillStyle = ['#FFC312', '#C4E538', '#12CBC4', '#FDA7DF', '#ED4C67'][Math.floor(Math.random() * 5)];

        ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, Math.random()*6+2, Math.random()*6+2);

    }

    setTimeout(() => canvas.remove(), 800);

}



function checkUnanimous() {

    let found = Object.keys(serverData).some(key => serverData[key].length === totalUsersCount && totalUsersCount > 1);

    if (found && !unanimousTriggered) {

        showToast(`🎉 기적 발생! ${totalUsersCount}명 전원 만장일치! ⏰`);

        fireFireworks();

        unanimousTriggered = true;

    } else if (!found) { unanimousTriggered = false; }

}



function updateStatsAndRanking() {

    if (!statsContainer || totalUsersCount === 0) return;

    

    let dayStats = {}; let timeStats = {};

    let slotsWithDetails = [];



    Object.keys(serverData).forEach(key => {

        const people = serverData[key];

        const count = people.length;

        if (count === 0) return;



        const [dateStr, timeStr] = key.split('_');

        const time = parseInt(timeStr);

        const d = new Date(dateStr).getDay();



        dayStats[d] = (dayStats[d]||0) + count;

        timeStats[time] = (timeStats[time]||0) + count;



        slotsWithDetails.push({ key, date: dateStr, time, count, people });

    });



    if (slotsWithDetails.length === 0) return;



    let bestDay = Object.keys(dayStats).reduce((a,b)=>dayStats[a]>dayStats[b]?a:b);

    let bestTime = Object.keys(timeStats).reduce((a,b)=>timeStats[a]>timeStats[b]?a:b);



    slotsWithDetails.sort((a, b) => {

        if (a.date !== b.date) return new Date(a.date) - new Date(b.date);

        return a.time - b.time;

    });



    let blocks = [];

    slotsWithDetails.forEach(slot => {

        if (blocks.length === 0) {

            blocks.push({ ...slot, startTime: slot.time, endTime: slot.time });

            return;

        }

        let lastBlock = blocks[blocks.length - 1];

        let samePeople = lastBlock.people.length === slot.people.length && lastBlock.people.every(p => slot.people.includes(p));



        if (lastBlock.date === slot.date && samePeople && lastBlock.endTime + 1 === slot.time) {

            lastBlock.endTime = slot.time; 

        } else {

            blocks.push({ ...slot, startTime: slot.time, endTime: slot.time }); 

        }

    });



    blocks.sort((a, b) => {

        if (b.count !== a.count) return b.count - a.count;

        return (b.endTime - b.startTime) - (a.endTime - a.startTime);

    });



    const allUsers = [...new Set(Object.values(serverData).flat())];



    const formatBlock = (b) => {

        const dateObj = new Date(b.date);

        const dayName = dayNames[dateObj.getDay()];

        const duration = (b.endTime - b.startTime) + 1;

        

        let text = `${dateObj.getMonth()+1}/${dateObj.getDate()}(${dayName}) ${b.startTime}:00 ~ ${b.endTime + 1}:00 <span style="font-size:12px; color:#636e72;">(${duration}시간)</span>`;



        if (b.count < totalUsersCount && totalUsersCount > 1) {

            const missing = allUsers.filter(u => !b.people.includes(u));

            text += `<br><span style="font-size:12px; color:#e17055;">🥲 ${missing.join(', ')} 님 불참</span>`;

        }

        return text;

    };



    let rankingHTML = "";

    const unanimousBlocks = blocks.filter(b => b.count === totalUsersCount && totalUsersCount > 1);

    

    if (unanimousBlocks.length > 0) {

        rankingHTML = `<h3 style="color:#00b894; margin-top:0;">🎉 전원 가능 시간!</h3>` + 

                      unanimousBlocks.map(b => `<div style="margin-bottom:8px;">${formatBlock(b)}</div>`).join("");

    } else {

        const top3 = blocks.slice(0, 3);

        rankingHTML = `<h3 style="margin-top:0;">🏆 베스트 시간 TOP 3</h3>` + 

                      top3.map((b, i) => `<div style="margin-bottom:12px;"><b>${i+1}위 (${b.count}명)</b><br>${formatBlock(b)}</div>`).join("");

    }



    statsContainer.innerHTML = `

        <div class="info-box" style="display:flex; gap:20px; text-align:left; background:#fff; border:1px solid #ddd; padding:20px; border-radius:12px; margin-bottom:20px; line-height:1.6;">

            <div style="flex:1;">

                ${rankingHTML}

            </div>

            <div style="flex:1; border-left:1px solid #eee; padding-left:20px;">

                <h3 style="color:#e17055; margin-top:0;">📊 우리 그룹 팩폭 통계</h3>

                🔥 제일 핫한 요일: <b>${dayNames[bestDay]}요일</b><br>

                🤝 다들 좋아하는 시간: <b>${bestTime}시</b>

            </div>

        </div>

    `;

}



function renderUtilBar() {

    if (!utilBar) return;

    utilBar.innerHTML = '';

    

    const userSelect = document.createElement('select');

    userSelect.style.cssText = "padding:8px; border-radius:5px;";

    userSelect.innerHTML = `<option value="">👥 전체 보기</option>`;

    const users = [...new Set(Object.values(serverData).flat())];

    users.forEach(u => userSelect.innerHTML += `<option value="${u}">${u}님 제외 일정 흐리게</option>`);

    userSelect.onchange = (e) => { activeUserFilter = e.target.value; renderTimeTable(); };



    const durationSelect = document.createElement('select');

    durationSelect.style.cssText = "padding:8px; border-radius:5px; margin-left:10px;";

    durationSelect.innerHTML = `<option value="1">⏳ 1시간도 OK</option><option value="2">2시간 이상 연속만</option><option value="3">3시간 이상 연속만</option>`;

    durationSelect.onchange = (e) => { minDurationFilter = parseInt(e.target.value); renderTimeTable(); };



    const copyBtn = document.createElement('button');

    copyBtn.innerText = "🔗 링크 복사";

    copyBtn.className = "nav-btn";

    copyBtn.style.marginLeft = "auto";

    copyBtn.onclick = () => { navigator.clipboard.writeText(location.href); showToast("🔗 링크가 복사되었습니다!"); };



    utilBar.appendChild(userSelect);

    utilBar.appendChild(durationSelect);

    utilBar.appendChild(copyBtn);

}





// ==========================================

// 5. 서버 통신 및 초기화 (방 분리 기능 추가!)

// ==========================================



// 🚀 URL에서 방 이름 파악하기 (주소 뒤에 ?room=폴짝 안 쓰면 기본 'main' 방)

const urlParams = new URLSearchParams(window.location.search);

const currentRoom = urlParams.get('room') || 'main';



// 센스: 방 이름이 있으면 페이지 제목(h1)에 방 이름 달아주기

if (currentRoom !== 'main') {

    const mainTitle = document.querySelector('h1');

    if (mainTitle) mainTitle.innerHTML = `🕒 [${currentRoom}] 우리 도대체 언제 만나? 🤷‍♀️`;

}



async function fetchServerData(isInitialLoad = false) {

    try {

        // 서버에 "이 방 데이터 주세요!" 라고 방 이름 붙여서 요청

        const response = await fetch(`/get_data?room=${currentRoom}`);

        const data = await response.json();

        serverData = data.meeting_data || {};

        totalUsersCount = data.total_users ? data.total_users.length : 0;

        

        if (isInitialLoad) {

            // ⭐ 방마다 닉네임을 따로 기억하도록 업그레이드! (폴짝방 이름 다르고, 과외방 이름 다를 수 있으니까)

            const savedName = localStorage.getItem(`myNickname_${currentRoom}`);

            if (savedName && totalUsersCount > 0) {

                document.getElementById('nickname').value = savedName;

                tempSelectedTimes = [];

                

                Object.keys(serverData).forEach(key => {

                    if (serverData[key].includes(savedName)) {

                        tempSelectedTimes.push(key);

                        const dateStr = key.split('_')[0];

                        if (!selectedDates.includes(dateStr)) selectedDates.push(dateStr);

                    }

                });

                if (tempSelectedTimes.length > 0) {

                    showToast(`👋 환영합니다, ${savedName}님! [${currentRoom}] 일정을 불러왔어요.`);

                }

            }

        }



        renderCalendar(currentYear, currentMonth);

        renderTimeTable();

        updateStatsAndRanking();

        renderUtilBar();

        checkUnanimous();

    } catch(e) { console.log("데이터 로드 중..", e); }

}



document.addEventListener('DOMContentLoaded', () => {

    fetchServerData(true);

    setInterval(() => fetchServerData(), 30000); // 30초마다 남들이 쓴 거 자동 새로고침!



    document.getElementById('prevBtn').onclick = () => { currentMonth--; if(currentMonth < 0){currentMonth=11; currentYear--;} renderCalendar(currentYear, currentMonth); };

    document.getElementById('nextBtn').onclick = () => { currentMonth++; if(currentMonth > 11){currentMonth=0; currentYear++;} renderCalendar(currentYear, currentMonth); };

    

    document.getElementById('clearBtn').onclick = () => {

        tempSelectedTimes = [];

        document.querySelectorAll('.selectable.selected').forEach(c => c.classList.remove('selected'));

    };



    document.getElementById('submitBtn').onclick = async () => {

        const nickname = document.getElementById('nickname').value;

        if (!nickname) { alert("이름을 입력해주세요!"); return; }

        if (tempSelectedTimes.length === 0) { alert("시간을 선택해주세요!"); return; }



        // 이 방에 쓴 내 이름 기억하기

        localStorage.setItem(`myNickname_${currentRoom}`, nickname);



        await fetch('/submit', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            // ⭐ 서버에 저장할 때 방 이름(currentRoom)도 같이 쏴줌!

            body: JSON.stringify({ room: currentRoom, nickname, times: tempSelectedTimes })

        });

        showToast("제출 완료! 🎉 (이제 언제든 다시 접속해서 수정할 수 있어요)");

        fetchServerData(); 

    };

});