# Local recording analysis

The Node server runs `analyze_recording.py` at report time. The analyzer uses PyAV to read the WebM audio/video, NumPy for short-time audio measurements, and OpenCV's bundled frontal-face cascade for coarse face visibility and framing checks. It does not send the recording to an AI provider.

From the `server` directory, install the Python packages with:

```powershell
npm run setup:analysis
```

Python 3.10 or newer and pip must be installed. If `python` is not on `PATH`, set `PYTHON_EXECUTABLE` in `server/.env` to the full path of `python.exe`.

The server stores recordings privately under `server/tmp/recordings`, outside the static file server, with a 300 MB upload limit. It keeps each recording for up to 12 hours after upload and deletes expired files hourly and at server startup. The report keeps only the resulting text observations.
