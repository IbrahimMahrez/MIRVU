import { useState } from 'react';
import { useInterview } from '../context/InterviewContext';
import { interviewApi } from '../services/api';
import { Button, Input, Select, Card, Badge } from '../components/ui';
import { translate } from '../i18n';

export function SetupScreen() {
  const { state, actions } = useInterview();
  const t = (key) => translate(state.config.language, key);
  const [isStarting, setIsStarting] = useState(false);
  const [configErrors, setConfigErrors] = useState({});

  const validateConfig = () => {
    const errors = {};
    if (!state.config.role) errors.role = 'Role is required';
    if (!state.config.experienceLevel) errors.experienceLevel = 'Experience level is required';
    if (!state.config.interviewType) errors.interviewType = 'Interview type is required';
    if (!state.config.language) errors.language = 'Language is required';
    if (state.config.mainQuestions < 3 || state.config.mainQuestions > 10) {
      errors.mainQuestions = 'Must be between 3 and 10';
    }
    setConfigErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateConfig()) return;
    
    setIsStarting(true);
    actions.clearError();
    
    try {
      const response = await interviewApi.start(state.config);
      if (response.data.success) {
        actions.startInterview({
          sessionId: response.data.sessionId,
          question: response.data.question
        });
        actions.setScreen('interview');
      }
    } catch (error) {
      actions.setError(error.message || 'Failed to start interview');
    } finally {
      setIsStarting(false);
    }
  };

  const configOptions = {
    roles: [
      { value: 'MERN Stack Developer', label: t('MERN Stack Developer') },
      { value: 'Full Stack Developer', label: t('Full Stack Developer') },
      { value: 'Frontend Developer', label: t('Frontend Developer') },
      { value: 'Backend Developer', label: t('Backend Developer') },
    ],
    levels: [
      { value: 'Entry Level', label: t('Entry Level (0-2 years)') },
      { value: 'Mid Level', label: t('Mid Level (2-5 years)') },
      { value: 'Senior Level', label: t('Senior Level (5+ years)') },
    ],
    types: [
      { value: 'Technical Interview', label: t('Technical Interview') },
      { value: 'Behavioral Interview', label: t('Behavioral Interview') },
      { value: 'System Design', label: t('System Design') },
      { value: 'Coding Challenge', label: t('Coding Challenge') },
    ],
    languages: [
      { value: 'English', label: 'English' },
      { value: 'Egyptian Arabic', label: 'Arabic (Egyptian)' },
      { value: 'Spanish', label: 'Spanish' },
      { value: 'French', label: 'French' },
      { value: 'German', label: 'German' },
    ],
  };

  return (
    <div className="min-h-screen layout flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary mx-auto mb-6 shadow-glow-sm">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">{t('AI Interview Simulator')}</h1>
          <p className="text-text-secondary text-lg max-w-md mx-auto">{t('Configure your technical interview session with an AI interviewer that adapts to your responses')}</p>
        </div>

        {/* Main Form Card */}
        <Card variant="elevated" className="animate-slide-up">
          <div className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">{t('Job Role')}</label>
                <Select
                  value={state.config.role}
                  onChange={(e) => actions.setConfig({ role: e.target.value })}
                  options={configOptions.roles}
                  placeholder={t('Select your target role')}
                  error={configErrors.role ? t(configErrors.role) : undefined}
                  className="w-full"
                />
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">{t('Experience Level')}</label>
                <Select
                  value={state.config.experienceLevel}
                  onChange={(e) => actions.setConfig({ experienceLevel: e.target.value })}
                  options={configOptions.levels}
                  placeholder={t('Select experience level')}
                  error={configErrors.experienceLevel ? t(configErrors.experienceLevel) : undefined}
                  className="w-full"
                />
              </div>

              {/* Interview Type */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">{t('Interview Type')}</label>
                <Select
                  value={state.config.interviewType}
                  onChange={(e) => actions.setConfig({ interviewType: e.target.value })}
                  options={configOptions.types}
                  placeholder={t('Select interview type')}
                  error={configErrors.interviewType ? t(configErrors.interviewType) : undefined}
                  className="w-full"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">{t('Language')}</label>
                <Select
                  value={state.config.language}
                  onChange={(e) => actions.setConfig({ language: e.target.value })}
                  options={configOptions.languages}
                  placeholder={t('Select language')}
                  error={configErrors.language ? t(configErrors.language) : undefined}
                  className="w-full"
                />
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3 flex items-center justify-between">
                  <span>{t('Number of Main Questions')}</span>
                  <span className="text-accent-primary font-mono font-bold text-lg">{state.config.mainQuestions}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={state.config.mainQuestions}
                  onChange={(e) => actions.setConfig({ mainQuestions: parseInt(e.target.value) })}
                  className="w-full h-2 bg-bg-input rounded-lg appearance-none cursor-pointer accent-accent-primary"
                  aria-label="Number of main questions"
                />
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>3 {t('questions')}</span>
                  <span>10 {t('questions')}</span>
                </div>
                {configErrors.mainQuestions && (
                  <p className="mt-1.5 text-sm text-status-danger flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {t(configErrors.mainQuestions)}
                  </p>
                )}
              </div>

              {/* Error Display */}
              {state.interview.error && (
                <div className="p-4 rounded-xl bg-status-danger/10 border border-status-danger/30 text-status-danger text-sm flex items-start gap-3 animate-slide-up">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{state.interview.error}</span>
                </div>
              )}

              {/* Start Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isStarting}
                leftIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              >
                {isStarting ? t('Starting Interview...') : t('Start Interview')}
              </Button>
            </form>

            {/* Preview Card */}
            <div className="mt-8 p-5 rounded-xl bg-bg-input border border-border-primary animate-fade-in">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {t('Interview Preview')}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t('Role')}</span>
                    <span className="font-medium text-text-primary">{state.config.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t('Level')}</span>
                    <span className="font-medium text-text-primary">{state.config.experienceLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t('Type')}</span>
                    <span className="font-medium text-text-primary">{state.config.interviewType}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Language</span>
                    <span className="font-medium text-text-primary">{state.config.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t('Questions')}</span>
                    <span className="font-medium text-text-primary">{state.config.mainQuestions} {t('main + follow-ups')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t('Source Mix')}</span>
                    <span className="font-medium text-text-primary">60% Dataset • 40% AI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements Note */}
            <div className="mt-6 p-4 rounded-xl bg-accent-primary/5 border border-accent-primary/20">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-text-primary mb-1">{t('AI Features Require API Key')}</p>
                  <p className="text-text-secondary text-sm">{t('Add your GEMINI_API_KEY to server/.env for dynamic question generation and AI-powered evaluations. Without it, the system uses intelligent fallback behavior.')}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
