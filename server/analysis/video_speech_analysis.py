import sys
import json

def analyze_video(video_path):
    # Placeholder analysis - replace with actual video analysis
    return {
        "eye_contact": 0.75,
        "engagement": 0.8,
        "stress_level": 0.3
    }

def analyze_speech(video_path):
    # Placeholder analysis - replace with actual speech analysis
    return {
        "speech_rate": 150,  # words per minute
        "filler_words": 5,
        "tone": "confident"
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video file provided"}))
        sys.exit(1)

    video_path = sys.argv[1]
    
    try:
        video_analysis = analyze_video(video_path)
        speech_analysis = analyze_speech(video_path)
        
        results = {
            "video_analysis": video_analysis,
            "speech_analysis": speech_analysis
        }
        
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)