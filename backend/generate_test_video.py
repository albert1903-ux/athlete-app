import cv2
import numpy as np

def create_test_video(filename='test_video.mp4', duration=2, fps=30):
    height, width = 480, 640
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, fps, (width, height))
    
    for i in range(duration * fps):
        # Create a black image
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Draw a moving circle (simulating a "person")
        x = int(width / 2 + 100 * np.sin(i / 10))
        y = int(height / 2 + 100 * np.cos(i / 10))
        cv2.circle(frame, (x, y), 50, (0, 255, 0), -1)
        
        out.write(frame)
    
    out.release()
    print(f"Video {filename} created successfully.")

if __name__ == "__main__":
    create_test_video()
