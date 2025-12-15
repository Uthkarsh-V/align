from flask import Flask, request, jsonify
from ultralytics import YOLO
import cv2
import numpy as np
import base64

# Initialize the Flask app
app = Flask(__name__)

# Load the YOLOv8-Pose model
# 'yolov8n-pose.pt' is the smallest and fastest model
model = YOLO('yolov8n-pose.pt') 

@app.route('/process', methods=['POST'])
def process_frame():
    try:
        # Get the image data from the website
        data = request.json['image']
        
        # Decode the base64 image
        # (Remove the 'data:image/jpeg;base64,' header)
        img_data = base64.b64decode(data.split(',')[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Run the YOLO model on the image
        results = model(img)

        # Extract keypoints
        # We'll just send back the keypoints for the first person detected
        if len(results[0].keypoints.xy) > 0:
            keypoints = results[0].keypoints.xy[0].cpu().numpy() # Get (x, y) coordinates
            # Convert to a format that JSON can handle (list of lists)
            keypoints_list = keypoints.tolist()
            return jsonify({'keypoints': keypoints_list})
        else:
            return jsonify({'keypoints': []}) # Send empty list if no person

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run the server. 
    # '0.0.0.0' makes it accessible on your network
    app.run(host='0.0.0.0', port=5000)