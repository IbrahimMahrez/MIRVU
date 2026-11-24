import { v4 as uuidv4 } from 'uuid';
import { unlink } from 'fs/promises';
import { questionService } from '../services/question.service.js';
import { evaluationService } from '../services/evaluation.service.js';
import { llmService } from '../services/llm.service.js';
import { recordingAnalysisService } from '../services/recordingAnalysis.service.js';

const sessions = new Map();
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MS) || 1800000;

export class InterviewController {
  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60000);
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.updatedAt > SESSION_TIMEOUT) {
        sessions.delete(id);
      }
    }
  }

  createSession(config) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      config: {
        role: config.role || 'MERN Stack Developer',
        experienceLevel: config.experienceLevel || 'Entry Level',
        interviewType: config.interviewType || 'Technical Interview',
        language: config.language || 'English',
        mainQuestions: config.mainQuestions || 5
      },
      status: 'initialized',
      currentMainQuestionIndex: -1,
      mainQuestions: [],
      followUpQuestions: [],
      answers: [],
      evaluations: [],
      followUpCount: 0,
      maxFollowUps: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      startedAt: null,
      completedAt: null
    };
    
    sessions.set(sessionId, session);
    return session;
  }

  async startInterview(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.status !== 'initialized') {
      throw new Error('Interview already started');
    }

    // Select hybrid questions
    session.mainQuestions = await questionService.selectHybridQuestions(
      session.config,
      llmService
    );
    const requiredQuestions = session.config.mainQuestions || 5;
    if (session.mainQuestions.length < requiredQuestions) {
      const existingIds = session.mainQuestions.map(question => question.id);
      const extraQuestions = questionService.selectDatasetQuestions(
        session.config,
        requiredQuestions - session.mainQuestions.length,
        existingIds
      );
      session.mainQuestions.push(...extraQuestions.map(question => ({ ...question, source: 'DATASET' })));
    }
    if (session.mainQuestions.length < requiredQuestions) {
      throw new Error('Not enough local questions are available to start this interview.');
    }
    
    session.status = 'in_progress';
    session.startedAt = Date.now();
    session.currentMainQuestionIndex = 0;
    session.updatedAt = Date.now();
    
    return this.getCurrentQuestion(session);
  }

  getCurrentQuestion(session) {
    if (session.currentMainQuestionIndex >= session.mainQuestions.length) {
      return { finished: true };
    }
    
    const question = session.mainQuestions[session.currentMainQuestionIndex];
    return {
      finished: false,
      question: {
        id: question.id,
        text: question.spokenText || question.question,
        speechText: question.spokenText || question.question,
        category: question.category,
        difficulty: question.difficulty,
        source: question.source,
        mainQuestionNumber: session.currentMainQuestionIndex + 1,
        totalMainQuestions: session.mainQuestions.length
      },
      isFollowUp: false
    };
  }

  async submitAnswer(sessionId, answerText) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.status !== 'in_progress') {
      throw new Error('Interview not in progress');
    }

    const currentQuestion = session.mainQuestions[session.currentMainQuestionIndex];
    if (!currentQuestion) {
      throw new Error('No current question');
    }

    // Check for duplicate submission
    const existingAnswer = session.answers.find(a => a.questionId === currentQuestion.id && !a.isFollowUp);
    if (existingAnswer) {
      throw new Error('Answer already submitted for this question');
    }

    // Evaluate answer
    const context = {
      role: session.config.role,
      experienceLevel: session.config.experienceLevel,
      language: session.config.language,
      previousQA: session.answers.map((a, i) => ({
        question: a.questionText,
        answer: a.answerText
      })).slice(-3), // Last 3 Q&A for context
      followUpCount: session.followUpCount,
      maxFollowUps: session.maxFollowUps
    };

    const evaluation = await llmService.evaluateAnswer(currentQuestion, answerText, context);
    const sanitizedEvaluation = evaluationService.sanitizeEvaluation(evaluation);

    // Store answer and evaluation
    const answerRecord = {
      id: uuidv4(),
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      answerText: answerText,
      isFollowUp: false,
      source: currentQuestion.source,
      evaluation: sanitizedEvaluation,
      timestamp: Date.now()
    };

    session.answers.push(answerRecord);
    session.evaluations.push({
      ...sanitizedEvaluation,
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      displayQuestion: currentQuestion.spokenText || currentQuestion.question,
      source: currentQuestion.source,
      isFollowUp: false
    });

    session.updatedAt = Date.now();

    // Decide on follow-up
    // Keep the answer-to-next-question path to one model call. A second decision
    // and translation round trip made every answer slow and could strand the
    // interview when Gemini was rate-limited. Continue straight to the next item.
    const followUpDecision = { shouldAskFollowUp: false };

    if (followUpDecision.shouldAskFollowUp &&
        typeof followUpDecision.followUpQuestion === 'string' &&
        followUpDecision.followUpQuestion.trim() &&
        session.followUpCount < session.maxFollowUps) {
      session.followUpCount++;
      const followUpForSpeech = await llmService.localizeQuestion(
        { question: followUpDecision.followUpQuestion, category: currentQuestion.category },
        session.config
      );
      const followUpQuestion = {
        id: uuidv4(),
        text: followUpForSpeech.spokenText || followUpDecision.followUpQuestion,
        isFollowUp: true,
        parentQuestionId: currentQuestion.id,
        reasoning: followUpDecision.followUpReasoning
      };
      session.followUpQuestions.push(followUpQuestion);
      session.updatedAt = Date.now();
      
      return {
        action: 'follow_up',
        followUpQuestion: {
          id: followUpQuestion.id,
          text: followUpQuestion.text,
          speechText: followUpForSpeech.spokenText || followUpQuestion.text,
          mainQuestionNumber: session.currentMainQuestionIndex + 1,
          totalMainQuestions: session.mainQuestions.length
        },
        evaluation: sanitizedEvaluation
      };
    }

    // Move to next main question
    session.currentMainQuestionIndex++;
    session.followUpCount = 0; // Reset follow-up count for next main question
    session.updatedAt = Date.now();

    const nextQuestion = this.getCurrentQuestion(session);
    
    if (nextQuestion.finished) {
      session.status = 'completed';
      session.completedAt = Date.now();
      return {
        action: 'complete',
        evaluation: sanitizedEvaluation,
        message: 'All questions answered. Interview complete.'
      };
    }

    return {
      action: 'next_question',
      question: nextQuestion.question,
      evaluation: sanitizedEvaluation
    };
  }

  async submitFollowUpAnswer(sessionId, answerText) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.status !== 'in_progress') {
      throw new Error('Interview not in progress');
    }

    const followUpQuestion = session.followUpQuestions[session.followUpQuestions.length - 1];
    if (!followUpQuestion) {
      throw new Error('No active follow-up question');
    }

    const parentQuestion = session.mainQuestions.find(q => q.id === followUpQuestion.parentQuestionId);
    
    const context = {
      role: session.config.role,
      experienceLevel: session.config.experienceLevel,
      language: session.config.language,
      previousQA: session.answers.map(a => ({
        question: a.questionText,
        answer: a.answerText
      })).slice(-3),
      followUpCount: session.followUpCount,
      maxFollowUps: session.maxFollowUps
    };

    const evaluation = await llmService.evaluateAnswer(
      { ...parentQuestion, question: followUpQuestion.text, expectedConcepts: [] },
      answerText,
      context
    );
    const sanitizedEvaluation = evaluationService.sanitizeEvaluation(evaluation);

    const answerRecord = {
      id: uuidv4(),
      questionId: followUpQuestion.id,
      questionText: followUpQuestion.text,
      answerText: answerText,
      isFollowUp: true,
      parentQuestionId: followUpQuestion.parentQuestionId,
      evaluation: sanitizedEvaluation,
      timestamp: Date.now()
    };

    session.answers.push(answerRecord);
    session.evaluations.push({
      ...sanitizedEvaluation,
      questionId: followUpQuestion.id,
      question: followUpQuestion.text,
      displayQuestion: followUpQuestion.text,
      source: 'FOLLOW_UP',
      isFollowUp: true
    });

    session.followUpCount = 0; 
    session.updatedAt = Date.now();

    // Move to next main question
    session.currentMainQuestionIndex++;
    session.updatedAt = Date.now();

    const nextQuestion = this.getCurrentQuestion(session);
    
    if (nextQuestion.finished) {
      session.status = 'completed';
      session.completedAt = Date.now();
      return {
        action: 'complete',
        evaluation: sanitizedEvaluation,
        message: 'All questions answered. Interview complete.'
      };
    }

    return {
      action: 'next_question',
      question: nextQuestion.question,
      evaluation: sanitizedEvaluation
    };
  }

  finishInterview(sessionId, { recordingUnavailable = false } = {}) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.status !== 'completed' && session.status !== 'in_progress') {
      throw new Error('Interview not eligible for completion');
    }

    session.status = 'completed';
    session.completedAt = Date.now();
    session.updatedAt = Date.now();

    const report = evaluationService.generateReport(session);
    const recordingPath = session.recordingPath;

    return Promise.all([
      llmService.generateFinalRecommendations(session),
      recordingPath
        ? recordingAnalysisService.analyze(recordingPath, session.config?.language).catch(error => {
            console.warn('Communication analysis unavailable:', error.message);
            return { unavailable: true, reason: error.code || 'ANALYSIS_FAILED' };
          })
        : Promise.resolve(recordingUnavailable ? { unavailable: true, reason: 'RECORDING_UNAVAILABLE' } : null)
    ]).then(([recommendations, communicationAnalysis]) => ({
      ...report,
      ...recommendations,
      ...(communicationAnalysis ? { communicationAnalysis } : {})
    }));
  }

  async attachRecording(sessionId, recordingPath, recordingMimeType) {
    const session = sessions.get(sessionId);
    if (!session) {
      await unlink(recordingPath).catch(() => {});
      throw new Error('Session not found');
    }
    if (session.recordingPath) await unlink(session.recordingPath).catch(() => {});
    session.recordingPath = recordingPath;
    session.recordingMimeType = recordingMimeType;
    session.recordingExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
    session.updatedAt = Date.now();
  }

  async saveVideo(sessionId, videoPath) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    session.videoPath = videoPath;
    session.updatedAt = Date.now();
    return { videoPath };
  }

  cancelInterview(sessionId) {
    const session = sessions.get(sessionId);
    if (session?.recordingPath) unlink(session.recordingPath).catch(() => {});
    return sessions.delete(sessionId);
  }

  getSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }
    
    // Return safe session data (no internal implementation details)
    return {
      id: session.id,
      config: session.config,
      status: session.status,
      currentMainQuestionIndex: session.currentMainQuestionIndex,
      totalMainQuestions: session.mainQuestions.length,
      answersCount: session.answers.length,
      followUpCount: session.followUpCount,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt
    };
  }

  getSessionForResume(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }
    
    return {
      id: session.id,
      config: session.config,
      status: session.status,
      currentMainQuestionIndex: session.currentMainQuestionIndex,
      mainQuestions: session.mainQuestions.map(q => ({
        id: q.id,
        text: q.question,
        category: q.category,
        difficulty: q.difficulty,
        source: q.source
      })),
      answers: session.answers.map(a => ({
        id: a.id,
        questionId: a.questionId,
        questionText: a.questionText,
        answerText: a.answerText,
        isFollowUp: a.isFollowUp,
        evaluation: a.evaluation,
        timestamp: a.timestamp
      })),
      followUpQuestions: session.followUpQuestions,
      followUpCount: session.followUpCount,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt
    };
  }
}

export const interviewController = new InterviewController();
