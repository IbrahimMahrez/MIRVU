import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const GENERATED_QUESTION_SCHEMA = z.object({
  id: z.string(),
  role: z.string(),
  category: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  type: z.enum(['technical', 'behavioral', 'situational']),
  question: z.string().min(10),
  expectedConcepts: z.array(z.string()).min(1),
  source: z.literal('AI_GENERATED')
});

const ANSWER_EVALUATION_SCHEMA = z.object({
  score: z.number().min(0).max(100),
  technicalAccuracy: z.number().min(0).max(40),
  completeness: z.number().min(0).max(25),
  relevance: z.number().min(0).max(20),
  clarity: z.number().min(0).max(15),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  feedback: z.string().min(10),
  suggestedImprovedAnswer: z.string().min(20)
});

const FOLLOW_UP_DECISION_SCHEMA = z.object({
  shouldAskFollowUp: z.boolean(),
  followUpQuestion: z.string().optional(),
  followUpReasoning: z.string().optional()
});

const FINAL_RECOMMENDATIONS_SCHEMA = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendedStudyTopics: z.array(z.string()),
  improvedSampleAnswers: z.array(z.object({
    questionId: z.string(),
    improvedAnswer: z.string()
  }))
});


function cleanSpokenQuestion(value) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s*(?:question|السؤال)\s*\d*\s*[:：-]\s*/gim, '')
    .replace(/[*_`#\[\]{}()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([،,؛;:؟?!])/g, '$1')
    .trim();
}

function isQuotaError(error) {
  return error?.status === 429 || /429|rate limit|quota|no credits|credits remaining|credit balance/i.test(error?.message || '');
}

function transientRetryDelay(error, fallbackMs = 3000) {
  const message = error?.message || '';
  const retrySeconds = message.match(/try again in\s+([\d.]+)\s*s/i);
  if (retrySeconds) return Math.min(45000, Math.ceil(Number(retrySeconds[1]) * 1000) + 500);
  return /\b503\b|temporarily|high demand|overloaded|rate limit|quota|\b429\b/i.test(message)
    ? fallbackMs
    : 0;
}

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export class LLMService {
  constructor() {
    this.provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
    this.providers = [...new Set([this.provider, 'gemini', 'groq'])];
    this.genAI = null;
    this.openaiApiKey = null;
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.groqApiKey = null;
    this.groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    this.modelCandidates = [
      process.env.GEMINI_MODEL,
      'gemini-flash-latest',
      'gemini-flash-lite-latest'
    ].filter(Boolean);
    this.videoModelCandidates = [...new Set([
      process.env.GEMINI_VIDEO_MODEL || 'gemini-3.8-flash',
      ...this.modelCandidates
    ])];
    this.activeModel = null;
    this.initialized = false;
    this.quotaBlockedUntil = 0;
    this.providerBlockedUntil = new Map();
    this.initialize();
  }

  initialize() {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(geminiKey);
      console.log(`Gemini API enabled (${this.modelCandidates.join(' → ')}).`);
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKey !== 'your_groq_api_key_here') {
      this.groqApiKey = groqKey;
      console.log(`Groq API enabled (${this.groqModel}).`);
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey !== 'your_openai_api_key_here') this.openaiApiKey = openaiKey;
    this.initialized = Boolean(this.genAI || this.groqApiKey || this.openaiApiKey);
    if (!this.initialized) console.warn('No LLM provider API key configured; using fallback behavior.');
  }

  ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.initialized;
  }

  isAvailable() {
    return this.ensureInitialized() && this.providers.some(provider => this.isProviderReady(provider));
  }

  isProviderReady(provider) {
    if (Date.now() < (this.providerBlockedUntil.get(provider) || 0)) return false;
    if (provider === 'groq') return Boolean(this.groqApiKey);
    if (provider === 'openai') return Boolean(this.openaiApiKey);
    return provider === 'gemini' && Boolean(this.genAI) && Date.now() >= this.quotaBlockedUntil;
  }

  translationUnavailableError(language) {
    if (this.provider === 'groq' && !this.groqApiKey) {
      return new Error(`Question translation into ${language} requires a valid GROQ_API_KEY in server/.env. Restart the server after changing it.`);
    }
    if (this.provider === 'openai' && !this.openaiApiKey) {
      return new Error(`Question translation into ${language} requires a valid OPENAI_API_KEY in server/.env. Restart the server after changing it.`);
    }
    if (!this.genAI) {
      return new Error(`Question translation into ${language} requires a valid GEMINI_API_KEY in server/.env. Restart the server after changing it.`);
    }
    if (Date.now() < this.quotaBlockedUntil) {
      return new Error(`Gemini quota is exhausted. Wait for the quota reset or use an API key from a project with available quota to translate questions into ${language}.`);
    }
    return new Error(`Gemini is temporarily unavailable. Try again shortly to translate questions into ${language}.`);
  }

  async generateContent(candidatePrompt, generationConfig) {
    const providers = this.providers.filter(provider => this.isProviderReady(provider));
    const failures = [];
    for (const provider of providers) {
      try {
        return await this.generateWithProvider(provider, candidatePrompt, generationConfig);
      } catch (error) {
        failures.push(`${provider}: ${error.message}`);
        const cooldown = transientRetryDelay(error, 12000);
        if (cooldown) this.providerBlockedUntil.set(provider, Date.now() + cooldown);
        console.warn(`${provider} request failed; trying the next configured provider.`);
      }
    }
    throw new Error(failures.length ? `All configured LLM providers failed: ${failures.join(' | ')}` : 'No configured LLM provider is available.');
  }

  async generateWithProvider(provider, candidatePrompt, generationConfig) {
    if (provider === 'groq') {
      if (!this.groqApiKey) throw new Error('GROQ_API_KEY is not configured.');
      const payload = {
        model: this.groqModel,
        messages: [{ role: 'user', content: candidatePrompt }],
        max_tokens: generationConfig?.maxOutputTokens || 1024
      };
      if (generationConfig?.temperature !== undefined) payload.temperature = generationConfig.temperature;
      if (generationConfig?.topP !== undefined) payload.top_p = generationConfig.topP;
      if (generationConfig?.responseMimeType === 'application/json') payload.response_format = { type: 'json_object' };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000)
      });
      const result = await response.json();
      if (!response.ok) {
        const apiError = new Error(`Groq API ${response.status}: ${result.error?.message || 'Request failed.'}`);
        apiError.status = response.status;
        apiError.code = result.error?.code;
        throw apiError;
      }
      const output = result.choices?.[0]?.message?.content;
      if (!output) throw new Error('Groq returned an empty response.');
      return output;
    }

    if (provider === 'openai') {
      if (!this.openaiApiKey) throw new Error('OPENAI_API_KEY is not configured.');
      const payload = {
        model: this.openaiModel,
        input: candidatePrompt
      };
      if (generationConfig?.maxOutputTokens) payload.max_output_tokens = generationConfig.maxOutputTokens;
      if (generationConfig?.temperature !== undefined) payload.temperature = generationConfig.temperature;
      if (generationConfig?.topP !== undefined) payload.top_p = generationConfig.topP;

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000)
      });
      const result = await response.json();
      if (!response.ok) {
        const apiError = new Error(`OpenAI API ${response.status}: ${result.error?.message || 'Request failed.'}`);
        apiError.status = response.status;
        apiError.code = result.error?.code;
        throw apiError;
      }
      const output = result.output_text || result.output?.flatMap(item => item.content || [])
        .filter(item => item.type === 'output_text').map(item => item.text).join('\n');
      if (!output) throw new Error('OpenAI returned an empty response.');
      return output;
    }

    if (Date.now() < this.quotaBlockedUntil) {
      throw new Error('Gemini quota is temporarily exhausted; using local fallback.');
    }
    const tried = [];
    const ordered = this.activeModel
      ? [this.activeModel, ...this.modelCandidates.filter(m => m !== this.activeModel)]
      : [...this.modelCandidates];

    for (const modelName of ordered) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: candidatePrompt }] }],
          generationConfig
        });
        this.activeModel = modelName;
        return result.response.text();
      } catch (error) {
        tried.push(`${modelName}: ${error.message}`);
        // Trying several model aliases after a project-wide quota error only
        // adds seconds to the interview; it cannot restore the exhausted quota.
        if (error.message.includes('429') || /quota|rate limit|per day/i.test(error.message)) {
          const retry = error.message.match(/retry in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i);
          const retryMs = retry
            ? ((Number(retry[1] || 0) * 3600) + (Number(retry[2] || 0) * 60) + Number(retry[3] || 0)) * 1000
            : 8 * 60 * 60 * 1000;
          this.quotaBlockedUntil = Date.now() + retryMs + 60000;
          throw new Error(`Gemini quota exhausted. Local evaluation will be used until the quota resets. ${error.message}`);
        }
      }
    }
    throw new Error(`All model candidates failed -> ${tried.join(' | ')}`);
  }

  async generateQuestion(config, usedQuestions = []) {
    if (!this.isAvailable()) {
      return null;
    }

    const usedTopics = (usedQuestions || [])
      .filter(q => q && typeof q === 'object')
      .map(q => `${q.category || 'General'}:${(q.question || '').substring(0, 50)}`).join('; ');
    
    const prompt = `You are an expert technical interviewer for a ${config.role} position at ${config.experienceLevel} level.
Generate ONE unique, realistic technical interview question that has NOT been asked before.

Interview Configuration:
- Role: ${config.role}
- Experience Level: ${config.experienceLevel}
- Interview Type: ${config.interviewType}
- Language: ${config.language}
${config.language !== 'English' ? 'Return the canonical interview question and category in English. Its localized display and spoken version will be generated separately. Keep expected technical concepts in English.' : ''}

Previously asked questions/topics: ${usedTopics || 'None'}

Requirements:
1. Question must be appropriate for ${config.experienceLevel} level
2. Must be relevant to ${config.role}
3. Must be a ${config.interviewType} question
4. Must NOT repeat any previous topic
5. Include 3-5 expected concepts the candidate should mention
6. Return ONLY valid JSON matching the schema

Return JSON with these exact fields:
{
  "id": "ai-gen-${Date.now()}",
  "role": "${config.role}",
  "category": "<category>",
  "difficulty": "<easy|medium|hard>",
  "type": "technical",
  "question": "<the question text>",
  "expectedConcepts": ["concept1", "concept2", "concept3"],
  "source": "AI_GENERATED"
}`;

    try {
      const response = await this.generateContent(prompt, {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      });
      const parsed = JSON.parse(response);
      return GENERATED_QUESTION_SCHEMA.parse(parsed);
    } catch (error) {
      console.error('LLM generateQuestion error:', error.message);
      return null;
    }
  }

  async localizeQuestion(question, config) {
    if (config.language === 'English') return question;
    if (!this.isAvailable()) {
      throw this.translationUnavailableError(config.language);
    }

    const arabicInstruction = config.language === 'Egyptian Arabic'
      ? 'Rewrite as a question a friendly Egyptian would naturally say out loud in a real interview. Use everyday Egyptian Arabic (Masri), never formal Arabic or a literal translation. Keep it direct and conversational, using phrasing like "طب، إيه رأيك في...؟" or "ممكن تشرحلي...؟" when it fits. Preserve programming names and identifiers in English. Do not say or write the names of punctuation marks; treat commas and brackets in the source as pauses, not words.'
      : `Translate into natural ${config.language}. Keep programming terms and identifiers in English.`;
    const prompt = `${arabicInstruction} Translate only the question below for the interviewer to say out loud. Do not return JSON, labels, quotes, or the original English sentence. Return only the translated question in ${config.language}.\nQuestion: ${question.question}`;
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const retryPrompt = attempt === 0 ? prompt : `${prompt}\nImportant: The result must be written in ${config.language}. For Egyptian Arabic, write Egyptian colloquial dialect, not formal Arabic.`;
        let response = await this.generateContent(retryPrompt, { temperature: 0.1, maxOutputTokens: 512 });
        response = response.trim().replace(/^```(?:json|text)?\s*|\s*```$/g, '').trim();
        if (response.startsWith('{')) {
          try {
            const parsed = JSON.parse(response);
            response = parsed.spokenText || parsed.translation || response;
          } catch {
            // Accept plain text if the model adds non-JSON formatting.
          }
        }
        const spokenText = cleanSpokenQuestion(response.trim().replace(/^['"“”]+|['"“”]+$/g, ''));
        if (spokenText.length > 0 && (config.language !== 'Egyptian Arabic' || /\p{Script=Arabic}/u.test(spokenText))) {
          return { ...question, spokenText };
        }
        lastError = new Error('The translation model returned text without Arabic script.');
      } catch (error) {
        lastError = error;
        if (isQuotaError(error)) break;
      }
    }
    console.error(`Question localization failed for ${question.id || 'question'} (${config.language}):`, lastError?.message);
    throw new Error(lastError?.message || `Could not translate the question into ${config.language}. Please try again.`);
  }
  async localizeQuestions(questions, config) {
    if (config.language === 'English') return questions;
    if (!this.isAvailable()) {
      throw this.translationUnavailableError(config.language);
    }

    const style = config.language === 'Egyptian Arabic'
      ? 'Rewrite each interview question as something a friendly Egyptian interviewer would naturally say out loud to a candidate. Use real everyday Egyptian colloquial Arabic (Masri), never Modern Standard Arabic, formal news Arabic, or literal translation. Make it direct and conversational, with short spoken sentences and natural phrasing such as "طب، إيه رأيك في...؟" or "ممكن تشرحلي...؟" when appropriate. Keep programming product names and identifiers in English. Explain code operators in spoken words when needed. Never say punctuation names such as comma, colon, bracket, or parenthesis. Punctuation in the source means a pause only. Do not add an intro, answer, or explanation.'
      : `Translate into natural ${config.language}. Keep every programming term, acronym, and code identifier in English.`;
    const list = questions.map((item, index) => `[[Q${index + 1}]] ${item.question}`).join('\n');
    const prompt = `${style} Translate each question for speech. Return each translation between the same markers, one per question, in the original order. Include every marker exactly once. No JSON, explanations, or English original.\n${list}`;
    let lastError;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.generateContent(
          attempt === 0 ? prompt : `${prompt}\nThe response must include all ${questions.length} marked translations.`,
          { temperature: 0.1, maxOutputTokens: Math.max(700, questions.length * 220) }
        );
        const translations = questions.map((_, index) => {
          const marker = `[[Q${index + 1}]]`;
          const start = response.indexOf(marker);
          if (start < 0) return '';
          const contentStart = start + marker.length;
          const nextStart = index + 1 < questions.length ? response.indexOf(`[[Q${index + 2}]]`, contentStart) : response.length;
          return cleanSpokenQuestion(response.slice(contentStart, nextStart < 0 ? response.length : nextStart).trim());
        });
        if (translations.every(text => text && (config.language !== 'Egyptian Arabic' || /\p{Script=Arabic}/u.test(text)))) {
          return questions.map((item, index) => ({ ...item, spokenText: translations[index] }));
        }
        lastError = new Error('The translation response was incomplete.');
      } catch (error) {
        lastError = error;
        if (isQuotaError(error)) break;
      }
    }

    console.error(`Question batch localization failed (${config.language}):`, lastError?.message);
    if (isQuotaError(lastError) && this.provider === 'openai') {
      throw new Error('OpenAI API credits are exhausted. Add API credits at https://platform.openai.com/settings/organization/billing/, then start a new interview.');
    }
    if (isQuotaError(lastError) && this.provider === 'gemini') {
      throw new Error('Gemini API quota is exhausted. Wait for it to reset or use a Gemini project with available quota, then start a new interview.');
    }
    if (isQuotaError(lastError) && this.provider === 'groq') {
      throw new Error('The Groq API limit for this model has been reached. Check your model limits in the Groq Console and retry after they reset.');
    }
    throw new Error(`Could not translate the questions into ${config.language}. ${lastError?.message || 'Check the selected AI provider and try again.'}`);
  }

  async evaluateAnswer(question, answer, context = {}) {
    if (!this.isAvailable()) {
      return this.fallbackEvaluation(question, answer, context);
    }

    const previousQA = context.previousQA || [];
    const history = previousQA.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n');

    const prompt = `You are an expert technical interviewer evaluating a candidate's answer.
${context.language && context.language !== 'English' ? `Write all feedback and the suggested answer in ${context.language}. For Egyptian Arabic, use everyday Egyptian colloquial speech, never Modern Standard Arabic. Preserve programming terms and identifiers in English.` : ''}

Current Question: ${question.question}
Expected Concepts: ${question.expectedConcepts.join(', ')}
Candidate's Answer: ${answer}

Previous Q&A Context:
${history || 'None'}

Interview Config:
- Role: ${context.role}
- Experience Level: ${context.experienceLevel}

Evaluate the answer using this rubric (total 100 points):
- Technical Accuracy (40 pts): Is the answer technically correct?
- Completeness (25 pts): Does it cover the expected concepts adequately?
- Relevance (20 pts): Does it directly answer the question asked?
- Clarity (15 pts): Is it well-structured and clearly communicated?

Consider the candidate's experience level (${context.experienceLevel}) when scoring.
Be fair but rigorous. An entry-level candidate should not be penalized for not knowing advanced nuances.

Return ONLY valid JSON matching this schema:
{
  "score": <0-100>,
  "technicalAccuracy": <0-40>,
  "completeness": <0-25>,
  "relevance": <0-20>,
  "clarity": <0-15>,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "missingConcepts": ["concept1", "concept2"],
  "feedback": "<constructive feedback paragraph>",
  "suggestedImprovedAnswer": "<a model answer demonstrating expected concepts>"
}`;

    try {
      const response = await this.generateContent(prompt, {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 1536,
        responseMimeType: 'application/json'
      });
      const parsed = JSON.parse(response);
      
      // Validate scores add up
      const evalResult = ANSWER_EVALUATION_SCHEMA.parse(parsed);
      const sum = evalResult.technicalAccuracy + evalResult.completeness + evalResult.relevance + evalResult.clarity;
      if (sum !== evalResult.score) {
        console.warn(`Score mismatch: components sum to ${sum}, total is ${evalResult.score}. Adjusting.`);
        evalResult.score = sum;
      }
      
      return evalResult;
    } catch (error) {
      console.warn('Gemini answer evaluation unavailable; using local evaluation.');
      return this.fallbackEvaluation(question, answer, context);
    }
  }

  async decideFollowUp(question, answer, evaluation, context = {}) {
    if (!this.isAvailable()) {
      return this.fallbackFollowUpDecision(evaluation, context);
    }

    const followUpCount = context.followUpCount || 0;
    const maxFollowUps = context.maxFollowUps || 2;

    if (followUpCount >= maxFollowUps) {
      return { shouldAskFollowUp: false };
    }

    const prompt = `You are an expert technical interviewer deciding whether to ask a follow-up question.

Current Question: ${question.question}
Candidate's Answer: ${answer}
Evaluation Score: ${evaluation.score}/100
Weaknesses: ${evaluation.weaknesses.join(', ') || 'None'}
Missing Concepts: ${evaluation.missingConcepts.join(', ') || 'None'}
Follow-up Questions Asked So Far: ${followUpCount}/${maxFollowUps}

Decide if a follow-up question is appropriate. Good reasons for follow-up:
- Answer was incomplete but showed some understanding
- Answer had a specific misconception worth clarifying
- Candidate mentioned an interesting related concept worth exploring
- Answer was vague and needs concrete example

Bad reasons for follow-up:
- Answer was completely wrong (move on)
- Answer was excellent (move on)
- Already asked ${maxFollowUps} follow-ups

${context.language && context.language !== 'English' ? `Write the follow-up question and reasoning in ${context.language}. For Egyptian Arabic, use everyday Egyptian colloquial speech, never Modern Standard Arabic. Keep programming terms in English.` : 'Write the follow-up question and reasoning in English.'} Return ONLY valid JSON:
{
  "shouldAskFollowUp": <true|false>,
  "followUpQuestion": "<specific contextual follow-up question, or empty string>",
  "followUpReasoning": "<brief reason for decision>"
}`;

    try {
      const response = await this.generateContent(prompt, {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 512,
        responseMimeType: 'application/json'
      });
      const parsed = JSON.parse(response);
      return FOLLOW_UP_DECISION_SCHEMA.parse(parsed);
    } catch (error) {
      console.warn('Gemini follow-up decision unavailable; using local decision.');
      return this.fallbackFollowUpDecision(evaluation, context);
    }
  }

  async generateFinalRecommendations(sessionData) {
    if (!this.isAvailable()) {
      return this.fallbackRecommendations(sessionData);
    }

    const evaluations = sessionData.evaluations || [];
    const avgScore = evaluations.length > 0 
      ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length 
      : 0;

    const prompt = `You are an expert technical interviewer writing a final evaluation report.
${sessionData.config.language && sessionData.config.language !== 'English' ? `Write all recommendations and sample answers in ${sessionData.config.language}. For Egyptian Arabic, use everyday Egyptian colloquial speech, never Modern Standard Arabic. Keep technical terms in English.` : ''}

Interview Summary:
- Role: ${sessionData.config.role}
- Experience Level: ${sessionData.config.experienceLevel}
- Main Questions Answered: ${evaluations.length}
- Follow-up Questions Asked: ${sessionData.followUpCount || 0}
- Average Score: ${avgScore.toFixed(1)}/100

Per-Question Scores:
${evaluations.map((e, i) => `${i+1}. ${e.questionId}: ${e.score}/100 (Accuracy: ${e.technicalAccuracy}, Completeness: ${e.completeness}, Relevance: ${e.relevance}, Clarity: ${e.clarity})`).join('\n')}

Strengths from evaluations: ${evaluations.flatMap(e => e.strengths).join(', ') || 'None identified'}
Weaknesses from evaluations: ${evaluations.flatMap(e => e.weaknesses).join(', ') || 'None identified'}
Missing concepts: ${evaluations.flatMap(e => e.missingConcepts).join(', ') || 'None identified'}

Generate qualitative recommendations for the candidate. Return ONLY valid JSON:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendedStudyTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "improvedSampleAnswers": [
    {"questionId": "<id>", "improvedAnswer": "<model answer>"},
    {"questionId": "<id>", "improvedAnswer": "<model answer>"}
  ]
}`;

    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.generateContent(prompt, {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        });
        const parsed = JSON.parse(response);
        return FINAL_RECOMMENDATIONS_SCHEMA.parse(parsed);
      } catch (error) {
        lastError = error;
        const delay = transientRetryDelay(error);
        if (attempt === 0 && delay) {
          console.warn(`Final recommendations temporarily unavailable; retrying in ${Math.ceil(delay / 1000)}s.`);
          await pause(delay);
          continue;
        }
        break;
      }
    }
    console.warn('AI final recommendations unavailable; using local recommendations:', lastError?.message);
    return this.fallbackRecommendations(sessionData);
  }

  fallbackEvaluation(question, answer, context = {}) {
    const hasContent = answer && answer.trim().length > 20;
    const mentionsConcepts = question.expectedConcepts.some(c => 
      answer.toLowerCase().includes(c.toLowerCase())
    );
    
    let score = 0;
    let technicalAccuracy = 0;
    let completeness = 0;
    let relevance = 0;
    let clarity = 0;
    
    if (!hasContent) {
      score = 10;
      technicalAccuracy = 0;
      completeness = 5;
      relevance = 5;
      clarity = 0;
    } else if (mentionsConcepts) {
      score = 65;
      technicalAccuracy = 25;
      completeness = 15;
      relevance = 15;
      clarity = 10;
    } else {
      score = 35;
      technicalAccuracy = 10;
      completeness = 10;
      relevance = 10;
      clarity = 5;
    }

    return {
      score,
      technicalAccuracy,
      completeness,
      relevance,
      clarity,
      strengths: hasContent ? ['Attempted to answer'] : [],
      weaknesses: hasContent ? ['Limited technical depth', 'Missing key concepts'] : ['No substantive answer provided'],
      missingConcepts: question.expectedConcepts,
      feedback: context.language === 'Egyptian Arabic'
        ? (hasContent ? 'إجابتك لمست الموضوع، بس محتاجة تفاصيل ومفاهيم تقنية أساسية أكتر. راجع المفاهيم المطلوبة وحاول ترتب إجابتك مع مثال.' : 'الإجابة محتاجة محتوى أكتر. حاول تشرح الفكرة بخطوات وتدي مثال عملي.')
        : hasContent 
        ? 'Your answer touches on the topic but lacks depth and key technical concepts. Consider studying the expected concepts for this question.'
        : 'No meaningful answer was provided. Please review the topic and try to provide a structured response.',
      suggestedImprovedAnswer: context.language === 'Egyptian Arabic'
        ? `الإجابة القوية المفروض توضح: ${question.expectedConcepts.join(', ')}، مع شرح كل نقطة ومثال عملي.`
        : `A strong answer would cover: ${question.expectedConcepts.join(', ')}. For example: [This would be a comprehensive answer explaining each concept with examples.]`
    };
  }

  fallbackFollowUpDecision(evaluation, context = {}) {
    if (evaluation.score >= 70 || evaluation.score < 25) {
      return { shouldAskFollowUp: false };
    }
    return {
      shouldAskFollowUp: true,
      followUpQuestion: `Can you elaborate on ${evaluation.missingConcepts[0] || 'that concept'} with a practical example?`,
      followUpReasoning: context.language === 'Egyptian Arabic' ? 'الإجابة فيها فهم جزئي وعايزين نعرف تفاصيل أكتر' : 'Answer shows partial understanding; follow-up to assess depth'
    };
  }

  fallbackRecommendations(sessionData) {
    const evaluations = sessionData.evaluations || [];
    const allMissing = evaluations.flatMap(e => e.missingConcepts);
    const uniqueMissing = [...new Set(allMissing)];
    
    const isEgyptianArabic = sessionData.config.language === 'Egyptian Arabic';
    return {
      strengths: [isEgyptianArabic ? 'شاركت في المقابلة وحاولت تجاوب على الأسئلة' : 'Participated in the interview process'],
      weaknesses: uniqueMissing.slice(0, 3).length > 0 ? uniqueMissing.slice(0, 3) : [isEgyptianArabic ? 'محتاج تتعمق أكتر في التفاصيل التقنية' : 'Need more technical depth'],
      recommendedStudyTopics: uniqueMissing.slice(0, 5).length > 0 ? uniqueMissing.slice(0, 5) : ['JavaScript fundamentals', 'React hooks', 'Node.js async patterns', 'Database design', 'API security'],
      improvedSampleAnswers: evaluations.slice(0, 3).map(e => ({
        questionId: e.questionId,
        improvedAnswer: isEgyptianArabic ? `الإجابة المتكاملة توضح النقاط دي: ${e.missingConcepts.join(', ')}.` : `A comprehensive answer would address: ${e.missingConcepts.join(', ')}.`
      }))
    };
  }
}

export const llmService = new LLMService();
