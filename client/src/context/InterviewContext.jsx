import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const InterviewContext = createContext(null);

const initialState = {
  currentScreen: 'setup', // setup, interview, report
  sessionId: null,
  config: {
    role: 'MERN Stack Developer',
    experienceLevel: 'Entry Level',
    interviewType: 'Technical Interview',
    language: 'English',
    mainQuestions: 5
  },
  interview: {
    status: 'idle',
    currentQuestion: null,
    questionHistory: [],
    currentAnswer: '',
    isLoading: false,
    error: null,
    progress: {
      current: 0,
      total: 5
    },
    isFollowUp: false,
    followUpQuestion: null
  },
  report: null
};

function interviewReducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    
    case 'START_INTERVIEW':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        interview: {
          ...state.interview,
          status: 'in_progress',
          currentQuestion: action.payload.question,
          questionHistory: [],
          progress: {
            current: action.payload.question?.mainQuestionNumber || 1,
            total: action.payload.question?.totalMainQuestions || state.config.mainQuestions
          },
          isFollowUp: false,
          followUpQuestion: null,
          error: null
        }
      };
    
    case 'SET_LOADING':
      return { ...state, interview: { ...state.interview, isLoading: action.payload } };
    
    case 'SET_ERROR':
      return { ...state, interview: { ...state.interview, error: action.payload, isLoading: false } };
    
    case 'CLEAR_ERROR':
      return { ...state, interview: { ...state.interview, error: null } };
    
    case 'SET_CURRENT_ANSWER':
      return { ...state, interview: { ...state.interview, currentAnswer: action.payload } };
    
    case 'RECEIVE_EVALUATION':
      return {
        ...state,
        interview: {
          ...state.interview,
          isLoading: false,
          questionHistory: [
            ...state.interview.questionHistory,
            {
              question: state.interview.currentQuestion,
              answer: state.interview.currentAnswer,
              evaluation: action.payload.evaluation,
              isFollowUp: state.interview.isFollowUp
            }
          ],
          currentAnswer: ''
        }
      };
    
    case 'SET_FOLLOW_UP':
      return {
        ...state,
        interview: {
          ...state.interview,
          isLoading: false,
          isFollowUp: true,
          followUpQuestion: action.payload.followUpQuestion,
          currentQuestion: {
            ...action.payload.followUpQuestion,
            isFollowUp: true
          }
        }
      };
    
    case 'NEXT_QUESTION':
      return {
        ...state,
        interview: {
          ...state.interview,
          isLoading: false,
          currentQuestion: action.payload.question,
          isFollowUp: false,
          followUpQuestion: null,
          progress: {
            ...state.interview.progress,
            current: action.payload.question?.mainQuestionNumber || state.interview.progress.current + 1
          }
        }
      };
    
    case 'COMPLETE_INTERVIEW':
      return {
        ...state,
        interview: {
          ...state.interview,
          status: 'completed',
          isLoading: false,
          currentQuestion: null
        },
        report: action.payload
      };
    
    case 'SET_REPORT':
      return { ...state, report: action.payload };
    
    case 'RESUME_SESSION':
      return {
        ...state,
        sessionId: action.payload.id,
        config: action.payload.config,
        interview: {
          ...state.interview,
          status: action.payload.status,
          currentQuestion: action.payload.currentQuestion,
          questionHistory: action.payload.answers?.map(a => ({
            question: a.questionText,
            answer: a.answerText,
            evaluation: a.evaluation,
            isFollowUp: a.isFollowUp
          })) || [],
          progress: {
            current: action.payload.currentMainQuestionIndex + 1,
            total: action.payload.mainQuestions?.length || state.config.mainQuestions
          }
        }
      };
    
    case 'RESET':
      return initialState;

    case 'RETURN_TO_SETUP':
      return { ...initialState, config: state.config };
    
    default:
      return state;
  }
}

export function InterviewProvider({ children }) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);
  useEffect(() => {
    const arabic = state.config.language === 'Egyptian Arabic';
    document.documentElement.lang = arabic ? 'ar' : ({ Spanish: 'es', French: 'fr', German: 'de' })[state.config.language] || 'en';
    document.documentElement.dir = arabic ? 'rtl' : 'ltr';
  }, [state.config.language]);

  const actions = {
    setScreen: useCallback((screen) => dispatch({ type: 'SET_SCREEN', payload: screen }), []),
    setConfig: useCallback((config) => dispatch({ type: 'SET_CONFIG', payload: config }), []),
    startInterview: useCallback((data) => dispatch({ type: 'START_INTERVIEW', payload: data }), []),
    setLoading: useCallback((loading) => dispatch({ type: 'SET_LOADING', payload: loading }), []),
    setError: useCallback((error) => dispatch({ type: 'SET_ERROR', payload: error }), []),
    clearError: useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []),
    setCurrentAnswer: useCallback((answer) => dispatch({ type: 'SET_CURRENT_ANSWER', payload: answer }), []),
    receiveEvaluation: useCallback((evaluation) => dispatch({ type: 'RECEIVE_EVALUATION', payload: evaluation }), []),
    setFollowUp: useCallback((followUpQuestion) => dispatch({ type: 'SET_FOLLOW_UP', payload: { followUpQuestion } }), []),
    nextQuestion: useCallback((question) => dispatch({ type: 'NEXT_QUESTION', payload: { question } }), []),
    completeInterview: useCallback((report) => dispatch({ type: 'COMPLETE_INTERVIEW', payload: report }), []),
    setReport: useCallback((report) => dispatch({ type: 'SET_REPORT', payload: report }), []),
    resumeSession: useCallback((data) => dispatch({ type: 'RESUME_SESSION', payload: data }), []),
    reset: useCallback(() => dispatch({ type: 'RESET' }), []),
    returnToSetup: useCallback(() => dispatch({ type: 'RETURN_TO_SETUP' }), [])
  };

  return (
    <InterviewContext.Provider value={{ state, actions }}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
}
