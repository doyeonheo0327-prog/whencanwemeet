from flask import Flask, render_template, request, jsonify
import json, os

app = Flask(__name__)

DATA_FILE = 'data.json'

# 데이터 구조가 바뀝니다! { "방이름": { "meeting_data": {}, "total_users": [] } }
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

# 서버 켤 때 모든 방의 데이터를 한 번에 불러옴
all_rooms_data = load_data()

# [핵심 로직] 방 데이터가 없으면 새로 만들어주는 헬퍼 함수
def get_room_data(room_name):
    if room_name not in all_rooms_data:
        all_rooms_data[room_name] = {"meeting_data": {}, "total_users": []}
    return all_rooms_data[room_name]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    data = request.json
    room_name = data.get('room', 'main') # JS가 보내준 방 이름 받기 (없으면 'main' 방)
    nickname = data.get('nickname')
    times = data.get('times')

    if not nickname:
        return jsonify({"status": "error", "message": "이름을 꼭 입력해주세요!"}), 400
    
    # 해당 방의 바구니만 쏙 가져오기
    room_data = get_room_data(room_name)
    meeting_data = room_data['meeting_data']
    total_users = set(room_data['total_users'])

    total_users.add(nickname)
    room_data['total_users'] = list(total_users)

    # 기존 데이터에서 내 이름 지우기 (해당 방 안에서만)
    for t in list(meeting_data.keys()):
        if nickname in meeting_data[t]:
            meeting_data[t].remove(nickname)
            if not meeting_data[t]:
                del meeting_data[t]

    # 새로운 시간 추가하기
    for t in times:
        if t not in meeting_data:
            meeting_data[t] = []
        if nickname not in meeting_data[t]:
            meeting_data[t].append(nickname)
            
    save_data(all_rooms_data) # 전체 데이터를 파일에 저장
    return jsonify({"status": "success"})

@app.route('/get_data', methods=['GET'])
def get_data():
    room_name = request.args.get('room', 'main') # 주소 뒤에 붙은 방 이름 확인
    room_data = get_room_data(room_name)
    
    return jsonify({
        "meeting_data": room_data['meeting_data'],
        "total_users": room_data['total_users']
    })

if __name__ == '__main__':
    app.run(debug=True)