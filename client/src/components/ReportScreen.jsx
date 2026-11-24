import { useInterview } from '../context/InterviewContext';
import { Button, Card, CardHeader, CardContent, Badge, CircularProgress, ProgressBar } from '../components/ui';
import { InterviewLayout } from './InterviewLayout';
import { translate } from '../i18n';

export function ReportScreen() {
  const { state, actions } = useInterview();
  const t = (key) => translate(state.config.language, key);
  const isArabic = state.config.language === 'Egyptian Arabic';
  const report = state.report;

  console.log('[ReportScreen] Report state:', report);

  if (!report) {
    return (
      <InterviewLayout
        topBarProps={{ 
          title: 'Generating Report', 
          timeElapsed: 0,
          currentStep: 1,
          totalSteps: 1,
        }}
      >
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-border-primary border-t-accent-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">{t('Generating your detailed report...')}</p>
          </div>
        </div>
      </InterviewLayout>
    );
  }

  const overallScore = report.overallScore ?? 0;
  const scoreVariant = overallScore >= 70 ? 'success' : overallScore >= 40 ? 'warning' : 'danger';
  const scoreLabel = t(overallScore >= 70 ? 'Excellent' : overallScore >= 40 ? 'Good' : 'Needs Improvement');

  const perQuestionScores = report.perQuestionScores || [];
  const strengths = report.strengths || [];
  const weaknesses = report.weaknesses || [];
  const recommendedStudyTopics = report.recommendedStudyTopics || [];
  const improvedSampleAnswers = report.improvedSampleAnswers || [];
  const communicationAnalysis = report.communicationAnalysis;

  const avgTechnicalAccuracy = report.averageTechnicalAccuracy ?? 0;
  const avgCompleteness = report.averageCompleteness ?? 0;
  const avgRelevance = report.averageRelevance ?? 0;
  const avgClarity = report.averageClarity ?? 0;
  const mainQuestionsAnswered = report.mainQuestionsAnswered ?? 0;
  const followUpQuestionsAsked = report.followUpQuestionsAsked ?? 0;
  const totalSteps = mainQuestionsAnswered || 1;

  return (
    <InterviewLayout
      topBarProps={{ 
      title: t('Interview Report'), 
        subtitle: `${state.config.role} • ${state.config.experienceLevel}`,
        timeElapsed: 0,
        currentStep: mainQuestionsAnswered,
        totalSteps: totalSteps,
      }}
      rightSidebarOpen={false}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header Card */}
        <Card variant="elevated">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-glow-sm">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{t('Interview Report')}</h1>
                  <p className="text-text-secondary mt-1">{t(state.config.role)} • {t(state.config.experienceLevel)}</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => { actions.reset(); actions.setScreen('setup'); }}
                leftIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
              >
                {t('New Interview')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Overall Score Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Score */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center md:text-left">
                  <div className="relative inline-flex items-center justify-center mb-4 md:mb-0">
                    <CircularProgress 
                      value={overallScore} 
                      size={160} 
                      strokeWidth={10}
                      label={overallScore}
                      subLabel={`${t('out of 100')} • ${scoreLabel}`}
                      variant={scoreVariant}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-accent-primary/15 to-accent-secondary/15 animate-pulse-slow" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
                  <div className="p-4 rounded-xl bg-bg-input border border-border-primary">
                    <div className="text-3xl font-bold text-text-primary">{mainQuestionsAnswered}</div>
                    <div className="text-xs text-text-muted mt-1">{t('Main Questions')}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-bg-input border border-border-primary">
                    <div className="text-3xl font-bold text-text-primary">{followUpQuestionsAsked}</div>
                    <div className="text-xs text-text-muted mt-1">{t('Follow-ups')}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-bg-input border border-border-primary">
                    <div className="text-3xl font-bold text-accent-primary">{avgTechnicalAccuracy}</div>
                    <div className="text-xs text-text-muted mt-1">{t('Avg Accuracy /40')}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-bg-input border border-border-primary">
                    <div className="text-3xl font-bold text-accent-secondary">{avgCompleteness}</div>
                    <div className="text-xs text-text-muted mt-1">{t('Avg Complete /25')}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card variant="elevated">
            <CardHeader>
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {t('Score Breakdown')}
              </h3>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <ProgressBar 
                      label={t('Technical Accuracy')}
                value={avgTechnicalAccuracy} 
                max={40} 
                weight="40%" 
                variant="default"
                size="sm"
              />
              <ProgressBar 
                      label={t('Complete')}
                value={avgCompleteness} 
                max={25} 
                weight="25%" 
                variant="cyan"
                size="sm"
              />
              <ProgressBar 
                label={t('Relevance')}
                value={avgRelevance} 
                max={20} 
                weight="20%" 
                variant="success"
                size="sm"
              />
              <ProgressBar 
                      label={t('Clarity')}
                value={avgClarity} 
                max={15} 
                weight="15%" 
                variant="warning"
                size="sm"
              />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card variant="elevated">
            <CardHeader>
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 4v8m0-4l-8 8-4-4-6 6" />
                </svg>
                {t('Quick Stats')}
              </h3>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-input border border-border-primary">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-status-success/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  <span className="text-text-secondary">{t('Score Range')}</span>
                  </div>
                  <span className={`font-mono font-bold text-lg ${overallScore >= 70 ? 'text-status-success' : overallScore >= 40 ? 'text-status-warning' : 'text-status-danger'}`}>
                    {overallScore >= 70 ? '70-100' : overallScore >= 40 ? '40-69' : '0-39'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-input border border-border-primary">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  <span className="text-text-secondary">{t('Duration')}</span>
                  </div>
                  <span className="font-mono font-bold text-text-primary">~{Math.round(mainQuestionsAnswered * 3 + followUpQuestionsAsked * 2)} min</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-input border border-border-primary">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-secondary/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-accent-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                  <span className="text-text-secondary">{t('Dataset / AI')}</span>
                  </div>
                  <span className="font-mono font-bold text-text-primary">60% / 40%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {communicationAnalysis && (
          <Card variant="elevated">
            <CardHeader>
              <h3 className="font-semibold text-text-primary">{isArabic ? 'تحليل التواصل' : 'Communication Analysis'}</h3>
              <p className="text-sm text-text-muted">{isArabic ? 'ملاحظات تدريبية من الصوت والكاميرا.' : 'Coaching observations from your voice and camera recording.'}</p>
            </CardHeader>
            {communicationAnalysis.unavailable ? (
              <CardContent className="text-sm text-text-secondary">
                {communicationAnalysis.reason === 'PYTHON_RUNTIME_MISSING'
                  ? (isArabic
                    ? 'Python مش متثبت أو مساره مش مضبوط. ثبّت Python 3.10 أو أحدث، وبعدها اضبط PYTHON_EXECUTABLE في server/.env لو لزم.'
                    : 'Python is not installed or its path is not configured. Install Python 3.10 or newer, then set PYTHON_EXECUTABLE in server/.env if needed.')
                  : communicationAnalysis.reason === 'PYTHON_DEPENDENCIES_MISSING'
                    ? (isArabic
                      ? 'مكتبات التحليل ناقصة. من مجلد server شغّل: npm run setup:analysis، وبعدها أعد تشغيل السيرفر.'
                      : 'Python analysis packages are missing. From server, run npm run setup:analysis, then restart the server.')
                    : communicationAnalysis.reason === 'RECORDING_UNAVAILABLE'
                      ? (isArabic
                        ? 'ملف التسجيل لم يصل إلى السيرفر، رغم أن معاينة الكاميرا والمايك قد تعمل. أعد تشغيل الواجهة والسيرفر، وتأكد من ظهور طلب رفع التسجيل في أدوات المطور.'
                        : 'The recording did not reach the server. Camera preview can still work. Restart the client and server, then check the browser Network tab for the recording upload request.')
                    : isArabic
                      ? 'فشل محلل Python أثناء معالجة التسجيل. راجع نافذة تشغيل server وابحث عن Communication analysis unavailable لمعرفة الخطأ، ثم تأكد من Python ومكتبات التحليل وأعد تشغيل السيرفر.'
                      : 'The Python analyzer failed while processing the recording. Check the server terminal for “Communication analysis unavailable” and its error details, confirm Python and its packages are installed, then restart the server.'}
              </CardContent>
            ) : <CardContent className="grid gap-5 md:grid-cols-2">
              <section>
                <h4 className="font-medium text-text-primary mb-2">{isArabic ? 'الصوت' : 'Voice'}</h4>
                <p className="text-sm text-text-secondary leading-6">{communicationAnalysis.voiceFeedback}</p>
              </section>
              <section>
                <h4 className="font-medium text-text-primary mb-2">{isArabic ? 'قدام الكاميرا' : 'On camera'}</h4>
                <p className="text-sm text-text-secondary leading-6">{communicationAnalysis.visualFeedback}</p>
              </section>
              {communicationAnalysis.suggestions?.length > 0 && (
                <section className="md:col-span-2">
                  <h4 className="font-medium text-text-primary mb-2">{isArabic ? 'نصايح' : 'Suggestions'}</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
                    {communicationAnalysis.suggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}
                  </ul>
                </section>
              )}
              <p className="md:col-span-2 text-xs text-text-muted">
                {isArabic
                  ? 'دي ملاحظات للتدريب على التواصل، مش تقييم للمشاعر أو الشخصية. التسجيل بيتخزن مؤقتًا وبيتحذف تلقائيًا بعد 12 ساعة.'
                  : 'This is communication coaching, not an assessment of emotion or personality. The temporary recording is deleted automatically after 12 hours.'}
              </p>
            </CardContent>}
          </Card>
        )}

        {/* Per-Question Scores */}
        <Card variant="elevated">
          <CardHeader>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
                {t('Per-Question Scores')}
            </h3>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {perQuestionScores.length > 0 ? (
                perQuestionScores.map((qq, index) => {
                  const safeQ = {
                    ...qq,
                    strengths: qq.strengths || [],
                    weaknesses: qq.weaknesses || [],
                    missingConcepts: qq.missingConcepts || [],
                    feedback: qq.feedback || 'No feedback available',
                    suggestedImprovedAnswer: qq.suggestedImprovedAnswer || 'Not available',
                    score: qq.score ?? 0,
                  };
                  return (
                  <div key={safeQ.questionId || index} className="group">
                    <div className="p-4 rounded-xl bg-bg-input border border-border-primary hover:border-border-active transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-text-primary">Q{index + 1}</span>
                            <Badge 
                              variant={safeQ.source === 'DATASET' ? 'dataset' : safeQ.source === 'AI_GENERATED' ? 'ai' : 'followup'}
                              className="text-xs"
                            >
                              {safeQ.source || 'UNKNOWN'}
                            </Badge>
                          </div>
                          <p className="text-text-secondary line-clamp-2">{safeQ.question}</p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <CircularProgress 
                            value={safeQ.score} 
                            size={56} 
                            strokeWidth={5}
                            label={safeQ.score}
                            variant={safeQ.score >= 70 ? 'success' : safeQ.score >= 40 ? 'warning' : 'danger'}
                            showBackground
                          />
                        </div>
                      </div>

                      <details className="group">
                        <summary className="text-sm text-accent-primary hover:text-accent-secondary cursor-pointer font-medium flex items-center gap-1">
                          {t('View detailed breakdown')}
                          <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="mt-4 p-4 bg-bg-card rounded-lg border border-border-primary space-y-4 animate-fade-in">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-3 rounded-lg bg-bg-input">
                              <div className="text-xl font-bold text-text-primary">{safeQ.technicalAccuracy}</div>
                              <div className="text-xs text-text-muted">/40 {t('Accuracy')}</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-bg-input">
                              <div className="text-xl font-bold text-text-primary">{safeQ.completeness}</div>
                              <div className="text-xs text-text-muted">/25 {t('Complete')}</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-bg-input">
                              <div className="text-xl font-bold text-text-primary">{safeQ.relevance}</div>
                              <div className="text-xs text-text-muted">/20 {t('Relevant')}</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-bg-input">
                              <div className="text-xl font-bold text-text-primary">{safeQ.clarity}</div>
                              <div className="text-xs text-text-muted">/15 {t('Clarity')}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {safeQ.strengths.length > 0 && (
                              <div>
                                <h5 className="font-medium text-status-success flex items-center gap-1 mb-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  Strengths
                                </h5>
                                <ul className="space-y-1">
                                  {safeQ.strengths.map((s, i) => (
                                    <li key={i} className="text-sm text-text-secondary flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {safeQ.weaknesses.length > 0 && (
                              <div>
                                <h5 className="font-medium text-status-danger flex items-center gap-1 mb-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                  Areas for Improvement
                                </h5>
                                <ul className="space-y-1">
                                  {safeQ.weaknesses.map((w, i) => (
                                    <li key={i} className="text-sm text-text-secondary flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-status-danger" />
                                      {w}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {safeQ.missingConcepts.length > 0 && (
                            <div>
                              <h5 className="font-medium text-status-warning flex items-center gap-1 mb-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                {t('Missing Concepts')}
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {safeQ.missingConcepts.map((c, i) => (
                                  <Badge key={i} variant="muted" className="text-xs">{c}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="pt-4 border-t border-border-primary">
                            <h5 className="font-medium text-text-secondary mb-2">{t('Feedback')}</h5>
                            <p className="text-text-muted">{safeQ.feedback}</p>
                          </div>

                          <div>
                            <h5 className="font-medium text-text-secondary mb-2">{t('Improved Answer')}</h5>
                            <p className="text-text-muted bg-bg-input p-3 rounded border border-border-primary text-sm whitespace-pre-wrap">{safeQ.suggestedImprovedAnswer}</p>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <p className="text-text-muted">{t('No question data available')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card variant="elevated">
            <CardHeader>
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <svg className="w-5 h-5 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('Strengths')}
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3">
                {strengths.length > 0 ? (
                  strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-input border border-border-primary">
                      <div className="w-8 h-8 rounded-full bg-status-success/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-status-success" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-text-primary">{s}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-text-muted text-center py-8">{t('No specific strengths identified')}</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <svg className="w-5 h-5 text-status-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {t('Areas for Improvement')}
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3">
                {weaknesses.length > 0 ? (
                  weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-input border border-border-primary">
                      <div className="w-8 h-8 rounded-full bg-status-danger/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-status-danger" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-text-primary">{w}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-text-muted text-center py-8">{t('No specific weaknesses identified')}</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Recommended Study Topics */}
        <Card variant="elevated">
          <CardHeader>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {t('Recommended Study Topics')}
            </h3>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {recommendedStudyTopics.length > 0 ? (
                recommendedStudyTopics.map((topic, i) => (
                  <Badge key={i} variant="primary" className="text-sm px-3 py-1.5">
                    {topic}
                  </Badge>
                ))
              ) : (
                <span className="text-text-muted text-sm">{t('No specific topics recommended')}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Improved Sample Answers */}
        {improvedSampleAnswers && improvedSampleAnswers.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 000 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 010-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
                {t('Improved Sample Answers')}
              </h3>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {improvedSampleAnswers.map((item, index) => (
                  <details key={index} className="group">
                    <summary className="cursor-pointer p-4 rounded-xl bg-bg-input border border-border-primary flex items-center justify-between hover:border-border-active transition-colors">
                      <span className="font-medium text-text-primary">{t('Question')} {index + 1} - {t('Improved Answer')}</span>
                      <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="p-4 bg-bg-card rounded-xl border border-border-primary animate-fade-in">
                      <p className="text-text-secondary whitespace-pre-wrap">{item.improvedAnswer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-border-primary">
          <p className="text-text-muted text-sm">
            {t('Report generated by AI Interview Simulator')} • {new Date().toLocaleDateString(({ 'Egyptian Arabic': 'ar-EG', Spanish: 'es-ES', French: 'fr-FR', German: 'de-DE' })[state.config.language] || 'en-US')}
          </p>
        </div>
      </div>
    </InterviewLayout>
  );
}
