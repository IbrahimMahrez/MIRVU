import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import interviewQuestions from '../data/interviewQuestions.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class QuestionService {
  constructor() {
    this.questions = interviewQuestions;
    this.config = {
      targetDatasetRatio: parseFloat(process.env.DATASET_QUESTION_RATIO) || 0.6,
      defaultMainQuestions: parseInt(process.env.DEFAULT_MAIN_QUESTIONS) || 5,
      maxFollowUpQuestions: parseInt(process.env.MAX_FOLLOW_UP_QUESTIONS) || 2
    };
  }

  getQuestionsByRole(role, experienceLevel = 'Entry Level', interviewType = 'Technical Interview') {
    const experienceQuestions = this.questions.filter(q =>
      q.difficulty === 'easy' || q.difficulty === 'medium'
    );
    const exactRoleQuestions = experienceQuestions.filter(q => q.role === role);
    if (exactRoleQuestions.length) return exactRoleQuestions;

    // The bundled bank currently contains MERN questions only. Keep the
    // interview running for the other web roles when both AI providers fail.
    const normalizedRole = String(role || '').toLowerCase();
    const categoryHints = normalizedRole.includes('front')
      ? ['javascript', 'react', 'html', 'css', 'frontend']
      : normalizedRole.includes('back')
        ? ['node', 'api', 'database', 'security', 'backend', 'javascript']
        : ['javascript', 'react', 'node', 'database', 'api', 'security', 'web'];
    const relevantQuestions = experienceQuestions.filter(q =>
      categoryHints.some(hint => `${q.category} ${q.question}`.toLowerCase().includes(hint))
    );
    return relevantQuestions.length ? relevantQuestions : experienceQuestions;
  }

  getAllCategories(role) {
    const roleQuestions = this.questions.filter(q => q.role === role);
    return [...new Set(roleQuestions.map(q => q.category))];
  }

  selectDatasetQuestions(config, count, excludeIds = []) {
    const eligible = this.getQuestionsByRole(config.role, config.experienceLevel, config.interviewType)
      .filter(q => !excludeIds.includes(q.id));
    const selected = [...eligible].sort(() => Math.random() - 0.5).slice(0, count);
    if (selected.length < count) {
      const selectedIds = new Set([...excludeIds, ...selected.map(question => question.id)]);
      const remaining = this.questions
        .filter(q => (q.difficulty === 'easy' || q.difficulty === 'medium') && !selectedIds.has(q.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, count - selected.length);
      selected.push(...remaining);
    }
    return selected.map(question => question.role === config.role
      ? question
      : { ...question, role: config.role });
  }

  calculateDatasetQuestionCount(totalMainQuestions) {
    const target = Math.round(totalMainQuestions * this.config.targetDatasetRatio);
    return Math.min(target, totalMainQuestions);
  }

  async selectHybridQuestions(config, llmService, usedQuestionIds = []) {
    const totalMainQuestions = config.mainQuestions || this.config.defaultMainQuestions;
    const datasetCount = this.calculateDatasetQuestionCount(totalMainQuestions);
    const aiCount = totalMainQuestions - datasetCount;

    // Select dataset questions
    const datasetQuestions = this.selectDatasetQuestions(config, datasetCount, usedQuestionIds);
    const selectedQuestions = [...datasetQuestions];
    const selectedIds = [...usedQuestionIds, ...datasetQuestions.map(q => q.id)];

    // Generate AI questions (pass real question objects, not IDs)
    const aiQuestions = [];
    for (let i = 0; i < aiCount; i++) {
      try {
        const contextQuestions = selectedQuestions.map(q => ({ category: q.category, question: q.question }));
        const generated = await llmService.generateQuestion(config, contextQuestions);
        if (generated) {
          aiQuestions.push(generated);
          selectedQuestions.push(generated);
          selectedIds.push(generated.id);
        } else {
          console.warn(`⚠️  AI question generation failed (${i + 1}/${aiCount})`);
        }
      } catch (genError) {
        console.warn(`⚠️  AI generation threw: ${genError.message}`);
      }
    }

    // If AI generation failed, fill with dataset questions (correctly labeled)
    if (aiQuestions.length < aiCount) {
      const needed = aiCount - aiQuestions.length;
      const fallback = this.selectDatasetQuestions(config, needed, selectedIds);
      fallback.forEach(q => {
        aiQuestions.push({ ...q, source: 'DATASET' });
        selectedQuestions.push(q);
        selectedIds.push(q.id);
      });
      if (needed > 0) {
        console.warn(`⚠️  Fallback: ${needed} extra dataset question(s) used in place of AI questions`);
      }
    }

    // Combine and shuffle while maintaining source labels
    const allQuestions = [
      ...datasetQuestions.map(q => ({ ...q, source: 'DATASET' })),
      ...aiQuestions.map(q => ({ ...q, source: q.source === 'DATASET' ? 'DATASET' : 'AI_GENERATED' }))
    ];

    if (config.language !== 'English') {
      try {
        const localized = await llmService.localizeQuestions(allQuestions, config);
        if (localized?.length === allQuestions.length) return localized.sort(() => Math.random() - 0.5);
      } catch (error) {
        console.warn(`Question translation unavailable; continuing with dataset language: ${error.message}`);
      }
    }

    // Shuffle but keep track of original order for fairness
    return allQuestions.sort(() => Math.random() - 0.5);
  }

  getQuestionById(id) {
    return this.questions.find(q => q.id === id);
  }
}

export const questionService = new QuestionService();
