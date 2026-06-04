from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
import os

app = Flask(__name__)

# [중요] 몽고DB 연결 주소 
# 예: "mongodb+srv://아이디:비밀번호@cluster0.abc.mongodb.net/?retryWrites=true&w=majority"
MONGO_URI = "mongodb+srv://doyeonheo_db_user:doyeon0327!@cluster0.jhsxpfm.mongodb.net/?appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client['timetable_db']  
rooms = db['rooms']         

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    data = request.json
    room_name = data.get('room', 'main')
    nickname = data.get('nickname')
    times = data.get('times')

    if not nickname:
        return jsonify({"status": "error", "message": "이름을 꼭 입력해주세요!"}), 400

    room_data = rooms.find_one({"room_name": room_name})
    if not room_data:
        room_data = {"room_name": room_name, "meeting_data": {}, "total_users": []}

    total_users = set(room_data['total_users'])
    total_users.add(nickname)
    
    meeting_data = room_data['meeting_data']
    for t in list(meeting_data.keys()):
        if nickname in meeting_data[t]:
            meeting_data[t].remove(nickname)
            if not meeting_data[t]:
                del meeting_data[t]

    for t in times:
        if t not in meeting_data:
            meeting_data[t] = []
        if nickname not in meeting_data[t]:
            meeting_data[t].append(nickname)

    rooms.update_one(
        {"room_name": room_name},
        {"$set": {"meeting_data": meeting_data, "total_users": list(total_users)}},
        upsert=True
    )

    return jsonify({"status": "success"})

@app.route('/get_data', methods=['GET'])
def get_data():
    room_name = request.args.get('room', 'main')
    room_data = rooms.find_one({"room_name": room_name})
    
    if not room_data:
        return jsonify({"meeting_data": {}, "total_users": []})
    
    return jsonify({
        "meeting_data": room_data['meeting_data'],
        "total_users": room_data['total_users']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
