export class EvaluationService {
  constructor() {
    this.rubric = {
      technicalAccuracy: { max: 40, weight: 0.4 },
      completeness: { max: 25, weight: 0.25 },
      relevance: { max: 20, weight: 0.2 },
      clarity: { max: 15, weight: 0.15 }
    };
  }

  validateEvaluation(evaluation) {
    const errors = [];
    
    if (typeof evaluation.score !== 'number' || evaluation.score < 0 || evaluation.score > 100) {
      errors.push('Total score must be a number between 0 and 100');
    }
    
    if (typeof evaluation.technicalAccuracy !== 'number' || evaluation.technicalAccuracy < 0 || evaluation.technicalAccuracy > 40) {
      errors.push('Technical accuracy must be a number between 0 and 40');
    }
    
    if (typeof evaluation.completeness !== 'number' || evaluation.completeness < 0 || evaluation.completeness > 25) {
      errors.push('Completeness must be a number between 0 and 25');
    }
    
    if (typeof evaluation.relevance !== 'number' || evaluation.relevance < 0 || evaluation.relevance > 20) {
      errors.push('Relevance must be a number between 0 and 20');
    }
    
    if (typeof evaluation.clarity !== 'number' || evaluation.clarity < 0 || evaluation.clarity > 15) {
      errors.push('Clarity must be a number between 0 and 15');
    }
    
    const componentSum = evaluation.technicalAccuracy + evaluation.completeness + evaluation.relevance + evaluation.clarity;
    if (componentSum !== evaluation.score) {
      errors.push(`Component scores sum to ${componentSum} but total score is ${evaluation.score}`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  sanitizeEvaluation(evaluation) {
    return {
      score: Math.max(0, Math.min(100, Math.round(evaluation.score))),
      technicalAccuracy: Math.max(0, Math.min(40, Math.round(evaluation.technicalAccuracy))),
      completeness: Math.max(0, Math.min(25, Math.round(evaluation.completeness))),
      relevance: Math.max(0, Math.min(20, Math.round(evaluation.relevance))),
      clarity: Math.max(0, Math.min(15, Math.round(evaluation.clarity))),
      strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths.filter(s => typeof s === 'string') : [],
      weaknesses: Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses.filter(s => typeof s === 'string') : [],
      missingConcepts: Array.isArray(evaluation.missingConcepts) ? evaluation.missingConcepts.filter(s => typeof s === 'string') : [],
      feedback: typeof evaluation.feedback === 'string' ? evaluation.feedback : 'No feedback provided',
      suggestedImprovedAnswer: typeof evaluation.suggestedImprovedAnswer === 'string' ? evaluation.suggestedImprovedAnswer : 'No improved answer provided'
    };
  }

  calculateOverallScore(evaluations) {
    if (!evaluations || evaluations.length === 0) return 0;
    
    const mainQuestionEvals = evaluations.filter(e => !e.isFollowUp);
    if (mainQuestionEvals.length === 0) return 0;
    
    const sum = mainQuestionEvals.reduce((acc, e) => acc + e.score, 0);
    return Math.round(sum / mainQuestionEvals.length);
  }

  calculateAverages(evaluations) {
    const mainQuestionEvals = evaluations.filter(e => !e.isFollowUp);
    if (mainQuestionEvals.length === 0) {
      return { technicalAccuracy: 0, completeness: 0, relevance: 0, clarity: 0 };
    }
    
    return {
      technicalAccuracy: Math.round(mainQuestionEvals.reduce((acc, e) => acc + e.technicalAccuracy, 0) / mainQuestionEvals.length),
      completeness: Math.round(mainQuestionEvals.reduce((acc, e) => acc + e.completeness, 0) / mainQuestionEvals.length),
      relevance: Math.round(mainQuestionEvals.reduce((acc, e) => acc + e.relevance, 0) / mainQuestionEvals.length),
      clarity: Math.round(mainQuestionEvals.reduce((acc, e) => acc + e.clarity, 0) / mainQuestionEvals.length)
    };
  }

  generateReport(sessionData) {
    const evaluations = sessionData.evaluations || [];
    const mainQuestionEvals = evaluations.filter(e => !e.isFollowUp);
    const followUpEvals = evaluations.filter(e => e.isFollowUp);
    
    const overallScore = this.calculateOverallScore(evaluations);
    const averages = this.calculateAverages(evaluations);
    
    // Collect all strengths/weaknesses/missing concepts
    const allStrengths = [...new Set(mainQuestionEvals.flatMap(e => e.strengths))];
    const allWeaknesses = [...new Set(mainQuestionEvals.flatMap(e => e.weaknesses))];
    const allMissingConcepts = [...new Set(mainQuestionEvals.flatMap(e => e.missingConcepts))];
    
    return {
      overallScore,
      mainQuestionsAnswered: mainQuestionEvals.length,
      followUpQuestionsAsked: followUpEvals.length,
      perQuestionScores: mainQuestionEvals.map(e => ({
        questionId: e.questionId,
        question: e.displayQuestion || e.question,
        source: e.source,
        score: e.score,
        technicalAccuracy: e.technicalAccuracy,
        completeness: e.completeness,
        relevance: e.relevance,
        clarity: e.clarity,
        strengths: e.strengths,
        weaknesses: e.weaknesses,
        missingConcepts: e.missingConcepts,
        feedback: e.feedback,
        suggestedImprovedAnswer: e.suggestedImprovedAnswer
      })),
      averageTechnicalAccuracy: averages.technicalAccuracy,
      averageCompleteness: averages.completeness,
      averageRelevance: averages.relevance,
      averageClarity: averages.clarity,
      strengths: allStrengths,
      weaknesses: allWeaknesses,
      recommendedStudyTopics: allMissingConcepts,
      improvedSampleAnswers: mainQuestionEvals.map(e => ({
        questionId: e.questionId,
        improvedAnswer: e.suggestedImprovedAnswer
      }))
    };
  }
}

export const evaluationService = new EvaluationService();
