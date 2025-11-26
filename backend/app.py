import os
import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)

@app.route('/api/upload', methods=['POST'])
@cross_origin()
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Process video
        try:
            analysis_results = process_video(filepath)
            return jsonify(analysis_results)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

def calculate_angle(p1, p2, p3):
    """Calculate angle between three points (p1-p2-p3) in degrees"""
    a = np.array([p1['x'], p1['y']])
    b = np.array([p2['x'], p2['y']])
    c = np.array([p3['x'], p3['y']])
    
    ba = a - b
    bc = c - b
    
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    
    return np.degrees(angle)

def get_knee_angle(landmarks, side='right'):
    """Calculate knee angle. side: 'right' or 'left'"""
    if side == 'right':
        hip_idx, knee_idx, ankle_idx = 24, 26, 28
    else:
        hip_idx, knee_idx, ankle_idx = 23, 25, 27
    
    if len(landmarks) > ankle_idx:
        return calculate_angle(landmarks[hip_idx], landmarks[knee_idx], landmarks[ankle_idx])
    return None

def get_hip_angle(landmarks, side='right'):
    """Calculate hip angle. side: 'right' or 'left'"""
    if side == 'right':
        shoulder_idx, hip_idx, knee_idx = 12, 24, 26
    else:
        shoulder_idx, hip_idx, knee_idx = 11, 23, 25
    
    if len(landmarks) > knee_idx:
        return calculate_angle(landmarks[shoulder_idx], landmarks[hip_idx], landmarks[knee_idx])
    return None

def get_ankle_angle(landmarks, side='right'):
    """Calculate ankle angle. side: 'right' or 'left'"""
    if side == 'right':
        knee_idx, ankle_idx, foot_idx = 26, 28, 32
    else:
        knee_idx, ankle_idx, foot_idx = 25, 27, 31
    
    if len(landmarks) > foot_idx:
        return calculate_angle(landmarks[knee_idx], landmarks[ankle_idx], landmarks[foot_idx])
    return None

def detect_jump_phases(frames_data):
    """Detect takeoff, peak, and landing frames based on hip vertical position"""
    hip_heights = []
    
    for frame in frames_data:
        if frame['landmarks'] and len(frame['landmarks']) > 24:
            # Average of both hips
            left_hip_y = frame['landmarks'][23]['y']
            right_hip_y = frame['landmarks'][24]['y']
            avg_hip_y = (left_hip_y + right_hip_y) / 2
            hip_heights.append(avg_hip_y)
        else:
            hip_heights.append(None)
    
    # Filter out None values
    valid_heights = [(i, h) for i, h in enumerate(hip_heights) if h is not None]
    if len(valid_heights) < 10:
        return None, None, None
    
    # Find peak (minimum y, since y increases downward)
    peak_frame = min(valid_heights, key=lambda x: x[1])[0]
    
    # Find takeoff (first significant upward movement before peak)
    takeoff_frame = 0
    for i in range(peak_frame - 1, 0, -1):
        if hip_heights[i] is not None and hip_heights[i] > hip_heights[peak_frame] + 0.1:
            takeoff_frame = i
            break
    
    # Find landing (return to similar height as takeoff after peak)
    landing_frame = len(hip_heights) - 1
    takeoff_height = hip_heights[takeoff_frame] if takeoff_frame < len(hip_heights) else None
    if takeoff_height:
        for i in range(peak_frame + 1, len(hip_heights)):
            if hip_heights[i] is not None and abs(hip_heights[i] - takeoff_height) < 0.05:
                landing_frame = i
                break
    
    return takeoff_frame, peak_frame, landing_frame

def generate_insights(metrics):
    """Generate insights based on biomechanical metrics"""
    insights = []
    
    # Knee angle insights
    if metrics['knee_angles']['landing'] < 150:
        insights.append({
            'type': 'warning',
            'metric': 'knee_angle',
            'value': metrics['knee_angles']['landing'],
            'reference': 160,
            'message': f"Ángulo de rodilla en aterrizaje muy cerrado ({metrics['knee_angles']['landing']:.0f}°). Riesgo de lesión. Objetivo: >160°"
        })
    elif metrics['knee_angles']['landing'] >= 160:
        insights.append({
            'type': 'success',
            'metric': 'knee_angle',
            'message': f"Excelente absorción del impacto en aterrizaje ({metrics['knee_angles']['landing']:.0f}°)"
        })
    
    # Hip angle insights
    if metrics['hip_angles']['takeoff'] < 170:
        insights.append({
            'type': 'info',
            'metric': 'hip_angle',
            'value': metrics['hip_angles']['takeoff'],
            'message': f"Mayor extensión de cadera en despegue podría mejorar altura ({metrics['hip_angles']['takeoff']:.0f}°)"
        })
    
    # Max height insight
    if metrics['max_height'] > 0.3:
        insights.append({
            'type': 'success',
            'metric': 'max_height',
            'message': 'Excelente altura de salto alcanzada'
        })
    
    return insights

def process_video(filepath):
    cap = cv2.VideoCapture(filepath)
    frames_data = []
    frame_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Convert to RGB
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process
        results = pose.process(image_rgb)
        
        frame_data = {
            'frame': frame_count,
            'landmarks': []
        }
        
        if results.pose_landmarks:
            for landmark in results.pose_landmarks.landmark:
                frame_data['landmarks'].append({
                    'x': landmark.x,
                    'y': landmark.y,
                    'z': landmark.z,
                    'visibility': landmark.visibility
                })
        
        frames_data.append(frame_data)
        frame_count += 1
        
    cap.release()
    
    # Detect jump phases
    takeoff_frame, peak_frame, landing_frame = detect_jump_phases(frames_data)
    
    # Calculate metrics at key frames
    metrics = {
        'takeoff_frame': takeoff_frame,
        'peak_frame': peak_frame,
        'landing_frame': landing_frame,
        'knee_angles': {},
        'hip_angles': {},
        'ankle_angles': {},
        'max_height': 0
    }
    
    # Calculate angles at key frames
    if takeoff_frame is not None and frames_data[takeoff_frame]['landmarks']:
        landmarks = frames_data[takeoff_frame]['landmarks']
        metrics['knee_angles']['takeoff'] = get_knee_angle(landmarks, 'right')
        metrics['hip_angles']['takeoff'] = get_hip_angle(landmarks, 'right')
        metrics['ankle_angles']['takeoff'] = get_ankle_angle(landmarks, 'right')
    
    if peak_frame is not None and frames_data[peak_frame]['landmarks']:
        landmarks = frames_data[peak_frame]['landmarks']
        metrics['knee_angles']['peak'] = get_knee_angle(landmarks, 'right')
        metrics['hip_angles']['peak'] = get_hip_angle(landmarks, 'right')
        metrics['ankle_angles']['peak'] = get_ankle_angle(landmarks, 'right')
        
        # Calculate max height (approximate based on hip position change)
        if takeoff_frame is not None:
            takeoff_hip_y = (frames_data[takeoff_frame]['landmarks'][23]['y'] + 
                           frames_data[takeoff_frame]['landmarks'][24]['y']) / 2
            peak_hip_y = (landmarks[23]['y'] + landmarks[24]['y']) / 2
            metrics['max_height'] = abs(takeoff_hip_y - peak_hip_y)
    
    if landing_frame is not None and frames_data[landing_frame]['landmarks']:
        landmarks = frames_data[landing_frame]['landmarks']
        metrics['knee_angles']['landing'] = get_knee_angle(landmarks, 'right')
        metrics['hip_angles']['landing'] = get_hip_angle(landmarks, 'right')
        metrics['ankle_angles']['landing'] = get_ankle_angle(landmarks, 'right')
    
    # Generate insights
    insights = generate_insights(metrics)
    
    return {
        'frames': frames_data,
        'total_frames': frame_count,
        'metrics': metrics,
        'insights': insights
    }

if __name__ == '__main__':
    app.run(debug=True, port=5001)
