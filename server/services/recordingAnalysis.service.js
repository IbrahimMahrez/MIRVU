import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const execFileAsync = promisify(execFile);
const analyzerScript = fileURLToPath(new URL('../analysis/analyze_recording.py', import.meta.url));
const ANALYSIS_SCHEMA = z.object({
  voiceFeedback: z.string().min(8),
  visualFeedback: z.string().min(8),
  suggestions: z.array(z.string()).max(4)
});

class RecordingAnalysisService {
  async analyze(recordingPath, language = 'English') {
    const python = process.env.PYTHON_EXECUTABLE || 'python';
    let result;
    try {
      result = await execFileAsync(python, [analyzerScript, recordingPath, language], {
        timeout: 180000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        windowsHide: true
      });
    } catch (error) {
      let detail = error.stderr || error.message;
      let code = 'ANALYSIS_FAILED';
      // Windows may expose the Microsoft Store execution alias as `python.exe`;
      // it exists on PATH but cannot actually start. Treat it like a missing runtime.
      if (
        error.code === 'ENOENT' ||
        /cannot be accessed|cannot access|unable to launch|WindowsApps[\\/]python(?:3)?\.exe|spawn python(?:3)? ENOENT/i.test(
          `${detail} ${error.message || ''} ${python}`
        )
      ) {
        code = 'PYTHON_RUNTIME_MISSING';
        detail = `Python was not found at "${python}". Install Python 3.10 or newer and set PYTHON_EXECUTABLE if needed.`;
      }
      try {
        const pythonError = JSON.parse(error.stdout || '').error;
        if (pythonError) {
          detail = pythonError;
          if (/No module named|ModuleNotFoundError|ImportError/.test(pythonError)) {
            code = 'PYTHON_DEPENDENCIES_MISSING';
            detail = 'Python analysis packages are missing. From server, run npm run setup:analysis.';
          }
        }
      } catch {
        // Keep the process error if Python did not return a JSON error.
      }
      const analysisError = new Error(detail);
      analysisError.code = code;
      throw analysisError;
    }

    try {
      result = JSON.parse(result.stdout.trim());
    } catch {
      throw new Error('The Python media analyzer returned invalid JSON.');
    }
    if (result.error) throw new Error(result.error);
    return ANALYSIS_SCHEMA.parse(result);
  }
}

export const recordingAnalysisService = new RecordingAnalysisService();
