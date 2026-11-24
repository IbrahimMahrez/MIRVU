import express from 'express';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
import { readdir, stat, unlink } from 'fs/promises';
import { interviewController } from '../controllers/interview.controller.js';
import { validateStartInterview, validateAnswer, validateSessionId } from '../utils/validation.js';

const router = express.Router();
const recordingDir = path.join(process.cwd(), 'tmp', 'recordings');
mkdirSync(recordingDir, { recursive: true });
const cleanupAbandonedRecordings = async () => {
  const expiry = Date.now() - 12 * 60 * 60 * 1000;
  const files = await readdir(recordingDir).catch(() => []);
  await Promise.all(files.map(async file => {
    const filePath = path.join(recordingDir, file);
    const metadata = await stat(filePath).catch(() => null);
    if (metadata?.isFile() && metadata.mtimeMs < expiry) await unlink(filePath).catch(() => {});
  }));
};
cleanupAbandonedRecordings();
setInterval(cleanupAbandonedRecordings, 60 * 60 * 1000).unref();

const speechVoices = {
  'ar-EG': 'ar-EG-SalmaNeural',
  'en-US': 'en-US-JennyNeural',
  'es-ES': 'es-ES-ElviraNeural',
  'fr-FR': 'fr-FR-DeniseNeural',
  'de-DE': 'de-DE-KatjaNeural'
};

const escapeXml = value => value.replace(/[<>&'\"]/g, character => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '\"': '&quot;'
}[character]));

router.post('/speech', async (req, res) => {
  const { text, locale = 'ar-EG' } = req.body || {};
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  const voice = speechVoices[locale];
  if (!key || !region) {
    return res.status(503).json({ success: false, error: 'Egyptian neural speech is not configured.' });
  }
  if (typeof text !== 'string' || !text.trim() || text.length > 1500 || !voice) {
    return res.status(400).json({ success: false, error: 'Invalid speech text or language.' });
  }

  try {
    // Keep a single Egyptian voice throughout, while explicitly marking
    // Latin technical names for English pronunciation inside the same audio.
    const content = escapeXml(text.trim()).replace(/\b[A-Za-z][A-Za-z0-9+#._/-]*\b/g,
      term => `<lang xml:lang="en-US">${term}</lang>`);
    const ssml = `<speak version="1.0" xml:lang="${locale}"><voice name="${voice}">${content}</voice></speak>`;
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'MirvuInterviewSimulator'
      },
      body: ssml,
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      console.error(`Azure speech synthesis failed (${response.status}):`, (await response.text()).slice(0, 300));
      return res.status(502).json({ success: false, error: 'Speech synthesis is temporarily unavailable.' });
    }
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Azure speech synthesis error:', error.message);
    res.status(502).json({ success: false, error: 'Speech synthesis is temporarily unavailable.' });
  }
});

// Video upload storage
const uploadDir = path.join(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB
const recordingUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, recordingDir),
    filename: (req, _file, cb) => cb(null, `${req.params.sessionId}-${Date.now()}.webm`)
  }),
  limits: { fileSize: 300 * 1024 * 1024 }
});

router.post('/start', validateStartInterview, async (req, res) => {
  try {
    const session = interviewController.createSession(req.validatedConfig);
    const result = await interviewController.startInterview(session.id);
    
    res.status(201).json({
      success: true,
      sessionId: session.id,
      question: result.question,
      finished: result.finished,
      message: result.finished ? 'Interview completed (no questions available)' : 'Interview started'
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to start interview' });
  }
});

router.post('/answer', validateAnswer, async (req, res) => {
  try {
    const { validatedSessionId, validatedAnswer } = req;
    const result = await interviewController.submitAnswer(validatedSessionId, validatedAnswer);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('already submitted') ? 409 :
                   error.message.includes('not in progress') ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.post('/follow-up-answer', validateAnswer, async (req, res) => {
  try {
    const { validatedSessionId, validatedAnswer } = req;
    const result = await interviewController.submitFollowUpAnswer(validatedSessionId, validatedAnswer);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Submit follow-up answer error:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('not in progress') ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.post('/finish', validateSessionId, async (req, res) => {
  try {
    const report = await interviewController.finishInterview(req.validatedSessionId, {
      recordingUnavailable: req.body?.recordingUnavailable === true
    });
    res.json({ success: true, report });
  } catch (error) {
    console.error('Finish interview error:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('not eligible') ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.delete('/:sessionId', validateSessionId, (req, res) => {
  interviewController.cancelInterview(req.validatedSessionId);
  res.json({ success: true });
});

const handleRecordingUpload = (req, res, next) => {
  recordingUpload.single('recording')(req, res, error => {
    if (!error) return next();
    console.error('Temporary recording upload failed:', error);
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({
        success: false,
        error: tooLarge
          ? 'Recording exceeds the 300 MB upload limit.'
          : `Recording upload rejected (${error.code}).`
      });
    }
    return res.status(500).json({ success: false, error: 'Could not receive the recording. Check server storage and logs.' });
  });
};

router.post('/:sessionId/recording', validateSessionId, handleRecordingUpload, async (req, res) => {
  try {
    if (!req.file) {
      console.warn('Recording upload contained no file:', {
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length']
      });
      return res.status(400).json({ success: false, error: 'No recording file was received. Check the multipart field name and boundary.' });
    }
    await interviewController.attachRecording(req.validatedSessionId, req.file.path, req.file.mimetype);
    res.json({ success: true });
  } catch (error) {
    console.error('Temporary recording upload failed:', error);
    res.status(500).json({ success: false, error: 'Could not save the temporary recording.' });
  }
});

router.post('/:sessionId/video', validateSessionId, upload.single('video'), async (req, res) => {
  try {
    const videoPath = req.file ? req.file.path : null;
    await interviewController.saveVideo(req.validatedSessionId, videoPath);
    res.json({ success: true, videoPath });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload video' });
  }
});

router.get('/:sessionId', validateSessionId, (req, res) => {
  try {
    const session = interviewController.getSession(req.validatedSessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve session' });
  }
});

router.get('/:sessionId/resume', validateSessionId, (req, res) => {
  try {
    const session = interviewController.getSessionForResume(req.validatedSessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (error) {
    console.error('Get session for resume error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve session' });
  }
});

export default router;
