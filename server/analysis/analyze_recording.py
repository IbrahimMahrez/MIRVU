import json
import sys

import av
import cv2
import numpy as np


SAMPLE_RATE = 16000
VIDEO_SAMPLE_SECONDS = 1.5


def analyze_recording(file_path, language):
    container = av.open(file_path)
    video_stream = next((stream for stream in container.streams if stream.type == "video"), None)
    audio_stream = next((stream for stream in container.streams if stream.type == "audio"), None)
    if video_stream is None or audio_stream is None:
        raise ValueError("The recording must contain both video and audio tracks.")

    face_detector = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if face_detector.empty():
        raise RuntimeError("OpenCV could not load its face detection model.")
    audio_resampler = av.AudioResampler(format="fltp", layout="mono", rate=SAMPLE_RATE)
    audio_samples = []
    brightness_values = []
    face_seen = []
    face_offsets = []
    next_video_sample = 0.0

    for packet in container.demux(video_stream, audio_stream):
        for frame in packet.decode():
            if packet.stream.type == "audio":
                for resampled in audio_resampler.resample(frame):
                    audio_samples.append(resampled.to_ndarray().astype(np.float32).reshape(-1))
                continue

            timestamp = float(frame.time or 0.0)
            if timestamp + 0.001 < next_video_sample:
                continue
            next_video_sample = timestamp + VIDEO_SAMPLE_SECONDS

            image = frame.to_ndarray(format="bgr24")
            height, width = image.shape[:2]
            if width > 480:
                scale = 480 / width
                image = cv2.resize(image, (480, max(1, round(height * scale))))
                height, width = image.shape[:2]

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            brightness_values.append(float(np.mean(gray)))
            faces = face_detector.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(24, 24)
            )
            if len(faces):
                x, y, face_width, face_height = max(faces, key=lambda box: box[2] * box[3])
                center_x = (x + face_width / 2) / width
                center_y = (y + face_height / 2) / height
                face_seen.append(True)
                face_offsets.append((abs(center_x - 0.5), abs(center_y - 0.5)))
            else:
                face_seen.append(False)

    container.close()
    if not audio_samples:
        raise ValueError("No usable audio was found in the recording.")

    samples = np.concatenate(audio_samples)
    voice_feedback, voice_suggestions = analyze_audio(samples, language)
    visual_feedback, visual_suggestions = analyze_video(
        brightness_values, face_seen, face_offsets, language
    )

    return {
        "voiceFeedback": voice_feedback,
        "visualFeedback": visual_feedback,
        "suggestions": (voice_suggestions + visual_suggestions)[:4],
    }


def analyze_audio(samples, language):
    frame_size = int(SAMPLE_RATE * 0.02)
    usable_length = (len(samples) // frame_size) * frame_size
    if usable_length == 0:
        return localized(language, "The recording was too short for audio analysis.", "التسجيل قصير جدًا لتحليل الصوت."), []

    frames = samples[:usable_length].reshape(-1, frame_size)
    rms = np.sqrt(np.mean(np.square(frames, dtype=np.float64), axis=1) + 1e-12)
    decibels = 20 * np.log10(rms + 1e-9)
    noise_floor = float(np.percentile(decibels, 20))
    active = decibels > max(noise_floor + 10, -42)
    active_indices = np.flatnonzero(active)

    if not len(active_indices):
        return localized(language, "No clear speech was detected. Check the microphone and try again.", "ماقدرناش نحدد كلام واضح. اتأكد من المايك وجرب تاني."), [
            localized(language, "Check the microphone input level and keep the mic unobstructed.", "اتأكد من مستوى صوت المايك وخليه بعيد عن أي حاجة تغطيه.")
        ]

    active_levels = decibels[active]
    level_spread = float(np.percentile(active_levels, 90) - np.percentile(active_levels, 10))
    active_percent = round(float(np.mean(active)) * 100)

    if language == "Egyptian Arabic":
        level_note = "محدود" if level_spread < 12 else "ملحوظ"
        feedback = f"رصد المايك نشاطًا صوتيًا في حوالي {active_percent}% من التسجيل. تذبذب مستوى التسجيل كان {level_note}. النسبة بتتأثر بفترات الاستماع وصوت المحاور، ومش مقياس لسرعة الكلام أو التوتر أو الثقة."
    else:
        level_note = "limited" if level_spread < 12 else "noticeable"
        feedback = f"Microphone activity was detected in about {active_percent}% of the recording. Recording loudness variation was {level_note}. This ratio is affected by listening periods and interviewer audio; it is not a speech-rate or emotion measurement."

    suggestions = []
    if active_percent < 20:
        suggestions.append(localized(language, "Check that your microphone is enabled and close enough.", "اتأكد إن المايك شغال وقريب منك بدرجة مناسبة."))
    if level_spread >= 18:
        suggestions.append(localized(language, "Keep a consistent distance from the microphone while answering.", "حاول تحافظ على مسافة ثابتة من المايك وإنت بتجاوب."))
    return feedback, suggestions


def analyze_video(brightness_values, face_seen, face_offsets, language):
    if not brightness_values:
        return localized(language, "No usable video frames were found.", "ما لقيناش لقطات فيديو صالحة للتحليل."), []

    brightness = float(np.median(brightness_values))
    face_ratio = float(np.mean(face_seen)) if face_seen else 0.0
    if face_offsets:
        horizontal_offset = float(np.median([offset[0] for offset in face_offsets]))
        vertical_offset = float(np.median([offset[1] for offset in face_offsets]))
    else:
        horizontal_offset = vertical_offset = 0.0

    suggestions = []
    if brightness < 65:
        visual_feedback = localized(language, "The sampled frames were dim; adding light in front of you may make the image clearer.", "الإضاءة في اللقطات كانت ضعيفة؛ إضافة ضوء أمامك ممكن توضح الصورة." )
        suggestions.append(localized(language, "Place a light source in front of you rather than behind you.", "خلي مصدر الإضاءة قدامك بدل ما يكون وراك."))
    elif face_ratio < 0.45:
        visual_feedback = localized(language, "A face was detected inconsistently in the sampled frames. Check the camera angle and keep your face within the frame.", "اكتشاف الوجه كان متقطعًا في اللقطات؛ راجع زاوية الكاميرا وخلي وجهك ظاهر داخل الإطار." )
        suggestions.append(localized(language, "Adjust the camera so your face remains clearly inside the frame.", "ظبط الكاميرا بحيث وجهك يفضل ظاهر بوضوح داخل الإطار."))
    elif horizontal_offset > 0.18 or vertical_offset > 0.2:
        visual_feedback = localized(language, "Your face was visible in most sampled frames but was off-center. Repositioning the camera may make the framing steadier.", "وجهك كان ظاهرًا في أغلب اللقطات لكنه بعيد عن المنتصف؛ تعديل مكان الكاميرا ممكن يظبط الكادر." )
        suggestions.append(localized(language, "Center the camera near eye level.", "حط الكاميرا في مستوى العين وخلي الكادر في المنتصف."))
    else:
        visual_feedback = localized(language, "Your face was detected consistently and the framing was generally centered in the sampled frames.", "الوجه كان ظاهرًا باستمرار والكادر كان في المنتصف تقريبًا في اللقطات." )

    return visual_feedback, suggestions


def localized(language, english, arabic):
    return arabic if language == "Egyptian Arabic" else english


if __name__ == "__main__":
    try:
        result = analyze_recording(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "English")
        # Keep subprocess output ASCII-only so Windows console encodings cannot
        # corrupt Arabic text before Node parses the JSON.
        print(json.dumps(result, ensure_ascii=True))
    except Exception as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=True))
        sys.exit(1)
