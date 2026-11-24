import { useState, useRef, useEffect, useCallback } from 'react';
import { useInterview } from '../context/InterviewContext';
import { interviewApi } from '../services/api';
import { InterviewLayout } from './InterviewLayout';
import { Card } from './ui';
import { Mic, MicOff, Camera, CameraOff, RefreshCw, Phone, PhoneOff, Bot, Lightbulb } from 'lucide-react';
import { isRtlLanguage, speechLocale, translate } from '../i18n';

let speechRequestId = 0;
let currentSpeechAudio = null;
let currentSpeechUrl = null;

function cancelSpeech() {
  speechRequestId++;
  currentSpeechAudio?.pause();
  currentSpeechAudio = null;
  if (currentSpeechUrl) URL.revokeObjectURL(currentSpeechUrl);
  currentSpeechUrl = null;
  window.speechSynthesis?.cancel();
}

async function speakText(text, locale, onComplete) {
  if (!text) return;
  cancelSpeech();
  const requestId = speechRequestId;

  // Prefer a neural Egyptian voice when the server has Azure Speech configured.
  // The sentence is returned as one audio file, with English technical terms
  // marked for English pronunciation. Fall back to the browser voice otherwise.
  try {
    const response = await interviewApi.synthesizeSpeech(text, locale);
    if (requestId !== speechRequestId) return;
    currentSpeechUrl = URL.createObjectURL(response.data);
    const audio = new Audio(currentSpeechUrl);
    currentSpeechAudio = audio;
    audio.onended = () => {
      cancelSpeech();
      onComplete?.();
    };
    audio.onerror = () => {
      cancelSpeech();
      onComplete?.();
    };
    await audio.play();
    return;
  } catch (error) {
    if (requestId !== speechRequestId) return;
    console.info('Neural speech unavailable; using browser speech synthesis.');
  }

  if (!('speechSynthesis' in window)) {
    onComplete?.();
    return;
  }
  const synthesis = window.speechSynthesis;
  synthesis.cancel();

  // Keep the whole sentence in one utterance and one voice. Splitting out
  // English technical terms caused audible pauses and voice changes.
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = 0.92;
  let hasStarted = false;
  const chooseVoice = () => {
    if (hasStarted) return;
    hasStarted = true;
    const voices = synthesis.getVoices();
    const normalizedLocale = locale.toLowerCase();
    const baseLanguage = normalizedLocale.split('-')[0];
    const voice = voices.find(item => item.lang.toLowerCase() === normalizedLocale)
      || voices.find(item => item.lang.toLowerCase().startsWith(`${baseLanguage}-`));
    if (voice) utterance.voice = voice;
    utterance.onend = () => onComplete?.();
    utterance.onerror = () => onComplete?.();
    synthesis.speak(utterance);
  };

  // Some browsers populate their voice list asynchronously. Wait briefly for
  // that list so Arabic (including ar-EG where available) is selected once.
  if (synthesis.getVoices().length) {
    chooseVoice();
  } else {
    const onVoicesChanged = () => {
      synthesis.removeEventListener?.('voiceschanged', onVoicesChanged);
      chooseVoice();
    };
    synthesis.addEventListener?.('voiceschanged', onVoicesChanged, { once: true });
    window.setTimeout(() => {
      synthesis.removeEventListener?.('voiceschanged', onVoicesChanged);
      chooseVoice();
    }, 500);
  }
}

// Waveform component
function Waveform({ active = false }) {
  return (
    <div className="flex items-center justify-center gap-[2px] h-6">
      {[1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
        <div
          key={i}
          className={`w-[2px] rounded-full bg-[#2563EB] ${active ? 'animate-pulse' : 'opacity-40'}`}
          style={{ 
            height: active ? `${10 + (i % 5) * 6}px` : '8px',
            animationDelay: active ? `${i * 50}ms` : '0ms'
          }}
        />
      ))}
    </div>
  );
}

// SelfView component
function SelfView({ isCameraOn, userVideoRef, isListening, language }) {
  return (
    <div className="absolute bottom-4 right-4 w-[185px] h-[115px] rounded-[14px] border-2 border-white bg-blue-400 overflow-hidden shadow-lg">
      {isCameraOn ? (
        <video ref={userVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-blue-300">
          <svg className="w-10 h-10 text-blue-200" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      )}
      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
        {isListening ? <Mic className="w-3 h-3 text-red-500" /> : <Mic className="w-3 h-3 text-gray-600" />}
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] text-white font-medium bg-black/30 px-1.5 py-0.5 rounded">{translate(language, 'You')}</div>
    </div>
  );
}

// ControlBar component
function ControlBar({ isMicOn, isCameraOn, onToggleMic, onToggleCamera, onEndCall, language }) {
  const t = (key) => translate(language, key);
  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <button onClick={onToggleMic} aria-label={t(isMicOn ? 'Mute microphone' : 'Unmute microphone')} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-[#0B2A5B] text-white hover:bg-[#1a3a6e]' : 'bg-gray-600 text-white'}`}>
        {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>
      <button onClick={onToggleCamera} aria-label={t(isCameraOn ? 'Turn off camera' : 'Turn on camera')} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCameraOn ? 'bg-[#0B2A5B] text-white hover:bg-[#1a3a6e]' : 'bg-gray-600 text-white'}`}>
        {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
      </button>
      <button aria-label="Flip camera" className="w-12 h-12 rounded-full bg-[#0B2A5B] text-white flex items-center justify-center hover:bg-[#1a3a6e] transition-all">
        <RefreshCw className="w-5 h-5" />
      </button>
      <button onClick={onEndCall} aria-label="End call" className="w-14 h-14 rounded-full bg-[#DC2626] text-white flex items-center justify-center hover:bg-red-700 transition-all shadow-lg">
        <PhoneOff className="w-6 h-6" />
      </button>
    </div>
  );
}

// VideoStage component
function VideoStage({ interviewerName, isRecording, aiState, isMicOn, isCameraOn, onToggleMic, onToggleCamera, onEndCall, userVideoRef, language }) {
  const t = (key) => translate(language, key);
  return (
    <div className="rounded-[24px] bg-gradient-to-br from-blue-500 to-[#0B2A5B] h-[350px] relative overflow-hidden shadow-lg">
      {/* Top-left chip */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur text-white text-xs">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
        <span>{interviewerName || 'Aria'}</span>
        <span className="text-white/70">{t('AI Interviewer')}</span>
        {aiState === 'speaking' && (
          <div className="flex items-center gap-[2px] ml-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-[2px] bg-white rounded-full animate-pulse" style={{ height: `${6 + (i%3)*3}px`, animationDelay: `${i*100}ms` }} />
            ))}
          </div>
        )}
      </div>
      {/* Top-right chip */}
      {isRecording && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur text-white text-xs">
          <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse"></span>
          <span>{t('Recording')}</span>
        </div>
      )}
      {/* Center: AI illustration placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-40 h-40 rounded-full bg-blue-300/30 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-blue-200/40 flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-amber-100 to-orange-200 mx-auto flex items-center justify-center shadow-inner" aria-label={`${interviewerName || 'Aria'} animated avatar`}>
                <span className="absolute top-[31px] left-[23px] w-1.5 h-2 rounded-full bg-[#0B2A5B]" />
                <span className="absolute top-[31px] right-[23px] w-1.5 h-2 rounded-full bg-[#0B2A5B]" />
                <span className={`absolute top-[48px] left-1/2 -translate-x-1/2 w-4 rounded-full bg-rose-500 ${aiState === 'speaking' ? 'h-3 animate-pulse' : 'h-1.5'}`} />
                <span className="absolute -top-1 w-16 h-7 rounded-t-full bg-[#3B2A24]" />
              </div>
              <p className="text-white text-xs mt-2 font-medium">{interviewerName || 'Aria'}</p>
            </div>
          </div>
        </div>
      </div>
      {/* ControlBar */}
      <div className="absolute bottom-20 left-0 right-0">
        <ControlBar 
          isMicOn={isMicOn} 
          isCameraOn={isCameraOn} 
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
          onEndCall={onEndCall}
          language={language}
        />
      </div>
      {/* SelfView */}
      <SelfView isCameraOn={isCameraOn} userVideoRef={userVideoRef} isListening={false} language={language} />
    </div>
  );
}

// QuestionCard component
function QuestionCard({ question, answer, onAnswerChange, onSubmit, aiState, interviewerName, isSubmitting, isDictating, onToggleDictation, speechSupported, language }) {
  const q = question || { number: 1, totalEstimate: 5, topic: 'General', text: 'Loading question...', tip: '' };
  const t = (key) => translate(language, key);
  
  return (
    <div dir={isRtlLanguage(language) ? 'rtl' : 'ltr'} className="bg-white rounded-[20px] border-2 border-[#2563EB] shadow-[0_4px_20px_rgba(37,99,235,0.1)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#2563EB]" />
          </div>
          <span className="text-xs font-bold text-[#2563EB] uppercase">{t('AI Question')} {q.number || 1}</span>
          {q.topic && <span className="px-2 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-medium">{q.topic}</span>}
        </div>
        <div className="text-right">
          <div className="text-xs text-[#5B6B8C]">{t('Question')} {q.number || 1} {t('of about')} {q.totalEstimate || 5}</div>
          <div className="w-32 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${((q.number || 1) / (q.totalEstimate || 5)) * 100}%` }} />
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="p-6">
        <h2 className="text-[26px] font-bold text-[#0B1F4D] leading-tight mb-6">{q.text || 'Loading...'}</h2>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-bold text-[#0B1F4D]">{t('Your answer')}</label>
            <span className="text-xs text-[#5B6B8C]">{t('Speak or write your answer. Press Enter to send.')}</span>
          </div>
          <form onSubmit={onSubmit}>
            <textarea
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder={t('Write your answer here...')}
              rows={4}
              className="w-full h-[90px] bg-blue-50 border border-blue-200 rounded-[14px] px-4 py-3 text-[#0B1F4D] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse"></span>
                <span className="text-sm text-[#2563EB] font-medium">
                  {aiState === 'speaking' ? `${interviewerName || 'Aria'}...` : t('Ready for your answer')}
                </span>
              </div>
              <div className="flex items-center gap-2">
              {speechSupported && <button type="button" onClick={onToggleDictation} disabled={isSubmitting} className={`px-4 py-2.5 rounded-full font-medium text-sm border ${isDictating ? 'bg-red-50 text-red-600 border-red-300' : 'bg-white text-[#2563EB] border-blue-200 hover:bg-blue-50'}`}>
                {isDictating ? t('Stop recording') : t('Speak')}
              </button>}
              <button
                type="submit"
                disabled={!answer.trim() || isSubmitting}
                className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
                  answer.trim() && !isSubmitting
                    ? 'bg-[#2563EB] text-white hover:bg-blue-700'
                    : 'bg-blue-100 text-blue-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? t('Submitting...') : t('Finish answer')}
              </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// AiTipBar component
function AiTipBar({ tip, language }) {
  const t = (key) => translate(language, key);
  return (
    <div className="bg-white rounded-[16px] border border-gray-200 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-[#2563EB]" />
        </div>
        <p className="text-sm text-[#0B1F4D]">
          <span className="font-bold">{t('AI tip:')}</span> {tip || t('Start with a short definition, then explain how it works, and finish with an example from your own projects.')}
        </p>
      </div>
      <p className="text-[11px] text-[#5B6B8C] text-right max-w-[280px] hidden md:block">
        {language === 'Egyptian Arabic'
          ? 'التقرير ممكن يديك ملاحظات على الكلام والكادر، ومش بيحكم على التوتر أو الشخصية.'
          : 'Your report may give feedback on speech and camera framing, not on emotion or personality.'}
      </p>
    </div>
  );
}

// EndInterviewDialog component
function EndInterviewDialog({ open, onClose, onConfirm, language }) {
  const t = (key) => translate(language, key);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-[#0B1F4D] mb-2">{t('End interview?')}</h3>
        <p className="text-sm text-[#5B6B8C] mb-6">{t('Are you sure you want to end this interview? Your progress will be saved.')}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-[#5B6B8C] hover:bg-gray-50">{t('Cancel')}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-[#DC2626] text-white hover:bg-red-700">{t('End interview')}</button>
        </div>
      </div>
    </div>
  );
}

export default function InterviewScreen() {
  const { state, actions } = useInterview();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [mediaError, setMediaError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTransfer, setRecordingTransfer] = useState(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [aiState, setAiState] = useState('listening'); // 'speaking' | 'listening'
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isGreetingListening, setIsGreetingListening] = useState(false);
  const [greetingAnswer, setGreetingAnswer] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const userVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const language = state.config?.language || 'English';
  const speechLanguage = speechLocale(language);
  const t = (key) => translate(language, key);
  const speechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Get user data from state or use defaults
  const user = state.config ? {
    fullName: 'Candidate',
    initials: 'C',
    roleTitle: state.config.role || 'Developer'
  } : { fullName: 'Candidate', initials: 'C', roleTitle: '' };

  // Get session data
  const session = {
    interviewType: 'Technical',
    topic: state.config?.role || '',
    level: state.config?.experienceLevel || '',
    language: state.config?.language || 'English',
    interviewerName: 'Aria',
    isRecording
  };

  // Calculate time left (20 min countdown from elapsed)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const timeLeft = formatTime(Math.max(0, 20 * 60 - elapsedSeconds));

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Keep one stream for the whole interview so recording does not split when
  // the candidate mutes the mic or turns off the camera.
  useEffect(() => {
    let cancelled = false;
    let stream;
    async function initMedia() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera and microphone require a secure connection (localhost or HTTPS).');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 20 } },
          audio: true
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        mediaStreamRef.current = stream;
        setMediaError('');
        stream.getVideoTracks().forEach(track => { track.enabled = isCameraOn; });
        stream.getAudioTracks().forEach(track => { track.enabled = isMicOn; });
        if (window.MediaRecorder) {
          const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
            .find(type => MediaRecorder.isTypeSupported(type));
          const recorder = new MediaRecorder(stream, {
            ...(mimeType ? { mimeType } : {}),
            videoBitsPerSecond: 500000,
            audioBitsPerSecond: 64000
          });
          recorder.ondataavailable = event => {
            if (event.data?.size) recordingChunksRef.current.push(event.data);
          };
          recorder.start(1000);
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
        } else {
          setMediaError('This browser cannot record this interview, so communication analysis will be unavailable.');
        }
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
          await userVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Media access denied:', err.message);
        if (!cancelled) setMediaError(err.message || 'Camera or microphone permission was denied.');
      }
    }
    initMedia();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    const video = userVideoRef.current;
    if (video && mediaStreamRef.current) {
      video.srcObject = mediaStreamRef.current;
      video.play().catch(() => {});
    }
  }, [hasGreeted, mediaError]);

  const toggleMic = () => {
    setIsMicOn(prev => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => t.enabled = !prev);
      }
      return !prev;
    });
  };

  const toggleCamera = () => {
    setIsCameraOn(prev => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach(t => t.enabled = !prev);
      }
      return !prev;
    });
  };

  const stopRecording = () => new Promise(resolve => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      resolve(null);
      return;
    }
    recorder.addEventListener('stop', () => {
      const blob = recordingChunksRef.current.length
        ? new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'video/webm' })
        : null;
      recordingChunksRef.current = [];
      mediaRecorderRef.current = null;
      setIsRecording(false);
      resolve(blob);
    }, { once: true });
    recorder.stop();
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || state.interview.status === 'completed') return;
    const answer = state.interview.currentAnswer?.trim();
    if (!answer) return;
    setIsSubmitting(true);
    actions.clearError();
    try {
      let response;
      if (state.interview.isFollowUp) {
        response = await interviewApi.followUpAnswer(state.sessionId, answer);
      } else {
        response = await interviewApi.answer(state.sessionId, answer);
      }
      const data = response.data;
      if (data.action === 'follow_up') {
        actions.receiveEvaluation(data.evaluation);
        actions.setFollowUp(data.followUpQuestion);
      } else if (data.action === 'next_question') {
        actions.receiveEvaluation(data.evaluation);
        actions.nextQuestion(data.question);
      } else if (data.action === 'complete') {
        actions.receiveEvaluation(data.evaluation);
        actions.setLoading(true);
        try {
          const recording = await stopRecording();
          let recordingUnavailable = !recording;
          if (recording && state.sessionId) {
            setRecordingTransfer({ sizeMb: (recording.size / (1024 * 1024)).toFixed(1), progress: 0, stage: 'uploading' });
            const formData = new FormData();
            formData.append('recording', recording, `interview-${state.sessionId}.webm`);
            try {
              await interviewApi.uploadRecording(state.sessionId, formData, event => {
                const total = event.total || recording.size;
                setRecordingTransfer({
                  sizeMb: (recording.size / (1024 * 1024)).toFixed(1),
                  progress: Math.round((event.loaded / total) * 100),
                  stage: 'uploading'
                });
              });
              setRecordingTransfer({ sizeMb: (recording.size / (1024 * 1024)).toFixed(1), progress: 100, stage: 'analyzing' });
            } catch (uploadError) {
              recordingUnavailable = true;
              setRecordingTransfer({
                sizeMb: (recording.size / (1024 * 1024)).toFixed(1),
                progress: 0,
                stage: 'unavailable',
                error: uploadError.message
              });
              console.warn('Could not upload recording for communication analysis:', uploadError.message);
            }
          }
          const finishResponse = await interviewApi.finish(state.sessionId, { recordingUnavailable });
          if (finishResponse.data.success && finishResponse.data.report) {
            setRecordingTransfer(null);
            if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
            actions.completeInterview(finishResponse.data.report);
            actions.setScreen('report');
          } else {
            throw new Error('Invalid finish response');
          }
        } catch (e) {
          setRecordingTransfer(null);
          if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
          actions.setError('Failed to generate final report: ' + (e.response?.data?.error || e.message));
          actions.setLoading(false);
        }
      } else {
        actions.setError('Could not load the next interview question. Please try submitting your answer again.');
      }
    } catch (error) {
      actions.setError(error.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndInterview = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    recordingChunksRef.current = [];
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    recognitionRef.current?.stop();
    cancelSpeech();
    if (state.sessionId) interviewApi.cancel(state.sessionId).catch(() => {});
    actions.returnToSetup();
    setShowEndDialog(false);
  };

  const currentQ = state.interview.currentQuestion;
  useEffect(() => {
    if (!currentQ?.text || hasGreeted) return;
    speakText(t('How are you? Is everything okay? Ready to start the interview?'), speechLanguage);
    return cancelSpeech;
  }, [currentQ?.id, hasGreeted, speechLanguage]);

  useEffect(() => {
    if (!currentQ?.text || !hasGreeted) return;
    setAiState('speaking');
    speakText(currentQ.speechText || currentQ.text, speechLanguage, () => setAiState('listening'));
    return cancelSpeech;
  }, [currentQ?.id, currentQ?.text, currentQ?.speechText, hasGreeted, speechLanguage]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    cancelSpeech();
  }, []);

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = speechLanguage;
    recognition.continuous = true;
    recognition.interimResults = true;
    const answerBeforeDictation = state.interview.currentAnswer || '';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
      actions.setCurrentAnswer([answerBeforeDictation, transcript].filter(Boolean).join(' ').trim());
    };
    recognition.onerror = () => setIsDictating(false);
    recognition.onend = () => setIsDictating(false);
    recognitionRef.current = recognition;
    cancelSpeech();
    recognition.start();
    setIsDictating(true);
  };

  const startGreetingListening = () => {
    if (isGreetingListening) {
      recognitionRef.current?.stop();
      setIsGreetingListening(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = speechLanguage;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ').trim();
      setGreetingAnswer(transcript);
      const readyWords = language === 'Egyptian Arabic'
        ? /جاهز|جاهزة|تمام|ماشي|ايوه|أيوه|يلا/i
        : language === 'Spanish' ? /sí|si|listo|lista|vale/i
          : language === 'French' ? /oui|prêt|prête|d'accord|ok/i
            : language === 'German' ? /ja|bereit|okay/i
              : /yes|ready|sure|okay/i;
      if (readyWords.test(transcript)) {
        recognition.stop();
        setIsGreetingListening(false);
        setHasGreeted(true);
      }
    };
    recognition.onerror = () => setIsGreetingListening(false);
    recognition.onend = () => setIsGreetingListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsGreetingListening(true);
  };

  const beginInterview = () => {
    recognitionRef.current?.stop();
    setIsGreetingListening(false);
    setHasGreeted(true);
  };
  const progress = state.interview.progress || { current: 1, total: 5 };

  // Build question data for QuestionCard
  const questionData = currentQ ? {
    number: progress.current,
    totalEstimate: progress.total,
    topic: currentQ.category || 'General',
    text: currentQ.text || '',
    tip: currentQ.tip || ''
  } : null;

  if (currentQ && !hasGreeted) {
    return (
      <InterviewLayout user={user} session={session} timeLeft={timeLeft} onEndInterview={() => setShowEndDialog(true)}>
        <div dir={isRtlLanguage(language) ? 'rtl' : 'ltr'} className="min-h-[65vh] flex items-center justify-center">
          <Card variant="elevated" className="w-full max-w-xl text-center">
            <div className="p-8 md:p-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-[#2563EB] mx-auto mb-6 flex items-center justify-center"><Bot className="w-8 h-8" /></div>
              <h1 className="text-2xl font-bold text-[#0B1F4D] mb-4">{t('How are you? Is everything okay? Ready to start the interview?')}</h1>
              <p className="text-[#5B6B8C] mb-6">{t("Please answer the interviewer, then continue when you're ready.")}</p>
              {greetingAnswer && <p className="mb-4 text-sm text-[#2563EB]">{greetingAnswer}</p>}
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                {speechSupported && <button onClick={startGreetingListening} className="px-5 py-3 rounded-xl border border-blue-200 text-[#2563EB] hover:bg-blue-50">{isGreetingListening ? t('Stop recording') : t('Respond by voice')}</button>}
                <button onClick={beginInterview} className="px-5 py-3 rounded-xl bg-[#2563EB] text-white font-semibold hover:bg-blue-700">{t("I'm ready")}</button>
              </div>
            </div>
          </Card>
        </div>
      </InterviewLayout>
    );
  }

  if (!currentQ && state.interview.status !== 'completed') {
    return (
      <InterviewLayout user={user} session={session} timeLeft={timeLeft} onEndInterview={() => setShowEndDialog(true)}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#5B6B8C]">Preparing your interview...</p>
          </div>
        </div>
      </InterviewLayout>
    );
  }

  if (state.interview.status === 'completed') {
    return (
      <InterviewLayout user={user} session={session} timeLeft={timeLeft} onEndInterview={() => {}}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#0B1F4D] mb-2">{t('Interview Complete')}</h2>
            <p className="text-[#5B6B8C]">{t('Generating your detailed report...')}</p>
          </div>
        </div>
      </InterviewLayout>
    );
  }

  return (
    <InterviewLayout user={user} session={session} timeLeft={timeLeft} onEndInterview={() => setShowEndDialog(true)}>
      <div className="space-y-4">
        <VideoStage
          interviewerName={session.interviewerName}
          isRecording={session.isRecording}
          aiState={aiState}
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onEndCall={() => setShowEndDialog(true)}
          userVideoRef={userVideoRef}
          language={language}
        />
        {recordingTransfer && <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status">
          <div className="flex justify-between gap-3">
            <span>{language === 'Egyptian Arabic'
              ? recordingTransfer.stage === 'uploading' ? `جاري رفع التسجيل (${recordingTransfer.sizeMb} ميجا)`
                : recordingTransfer.stage === 'analyzing' ? `جاري تحليل التسجيل (${recordingTransfer.sizeMb} ميجا)`
                  : `تعذر رفع التسجيل (${recordingTransfer.sizeMb} ميجا)`
              : recordingTransfer.stage === 'uploading' ? `Uploading recording (${recordingTransfer.sizeMb} MB)`
                : recordingTransfer.stage === 'analyzing' ? `Analyzing recording (${recordingTransfer.sizeMb} MB)`
                  : `Could not upload recording (${recordingTransfer.sizeMb} MB)`}</span>
            {recordingTransfer.stage === 'uploading' && <span>{recordingTransfer.progress}%</span>}
          </div>
          {recordingTransfer.stage === 'uploading' && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full bg-[#2563EB] transition-all" style={{ width: `${recordingTransfer.progress}%` }} />
          </div>}
          {recordingTransfer.stage === 'unavailable' && recordingTransfer.error && (
            <p className="mt-1 text-xs text-red-700">{recordingTransfer.error}</p>
          )}
        </div>}
        {isRecording && <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {language === 'Egyptian Arabic'
            ? 'الجلسة بتتسجل عشان تحليل التواصل. التسجيل بيتخزن مؤقتًا في مجلد خاص ويتحذف تلقائيًا بعد 12 ساعة. لو أنهيت المقابلة بدري، التسجيل بيتلغى.'
            : 'This session is recorded for communication feedback. The private temporary recording is deleted automatically after 12 hours. Ending early discards it.'}
        </div>}
        {mediaError && <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">{mediaError}</div>}
        {state.interview.error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {state.interview.error}
          </div>
        )}
        <QuestionCard
          question={questionData}
          answer={state.interview.currentAnswer || ''}
          onAnswerChange={actions.setCurrentAnswer}
          onSubmit={handleSubmit}
          aiState={aiState}
          interviewerName={session.interviewerName}
          isSubmitting={isSubmitting}
          language={state.config?.language || 'English'}
          speechSupported={speechSupported}
          isDictating={isDictating}
          onToggleDictation={toggleDictation}
        />
        <AiTipBar tip={currentQ?.tip} language={language} />
      </div>
      <EndInterviewDialog open={showEndDialog} onClose={() => setShowEndDialog(false)} onConfirm={handleEndInterview} language={language} />
    </InterviewLayout>
  );
}
