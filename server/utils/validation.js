export const validateStartInterview = (req, res, next) => {
  const { role, experienceLevel, interviewType, language, mainQuestions } = req.body;
  const errors = [];

  if (!role || typeof role !== 'string') {
    errors.push('Role is required and must be a string');
  }

  if (!experienceLevel || typeof experienceLevel !== 'string') {
    errors.push('Experience level is required and must be a string');
  }

  if (!interviewType || typeof interviewType !== 'string') {
    errors.push('Interview type is required and must be a string');
  }

  if (mainQuestions !== undefined) {
    const num = parseInt(mainQuestions);
    if (isNaN(num) || num < 1 || num > 20) {
      errors.push('Main questions must be a number between 1 and 20');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  req.validatedConfig = {
    role: role.trim(),
    experienceLevel: experienceLevel.trim(),
    interviewType: interviewType.trim(),
    language: language?.trim() || 'English',
    mainQuestions: mainQuestions ? parseInt(mainQuestions) : 5
  };

  next();
};

export const validateAnswer = (req, res, next) => {
  const { answer, sessionId } = req.body;
  const errors = [];

  if (!sessionId || typeof sessionId !== 'string') {
    errors.push('Session ID is required');
  }

  if (answer === undefined || answer === null) {
    errors.push('Answer is required');
  } else if (typeof answer !== 'string') {
    errors.push('Answer must be a string');
  } else if (answer.trim().length === 0) {
    errors.push('Answer cannot be empty');
  } else if (answer.length > 10000) {
    errors.push('Answer too long (max 10000 characters)');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  req.validatedAnswer = answer.trim();
  req.validatedSessionId = sessionId.trim();
  next();
};

export const validateSessionId = (req, res, next) => {
  const sessionId = req.params.sessionId || req.body.sessionId;
  
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ success: false, errors: ['Session ID is required'] });
  }

  req.validatedSessionId = sessionId.trim();
  next();
};