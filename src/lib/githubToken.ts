const GITHUB_KEY = 'okf-plan-browser:github-token';
const GITLAB_KEY = 'okf-plan-browser:gitlab-token';

function read(key: string): string {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}

function write(key: string, token: string): void {
  try {
    const value = token.trim();
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch { /* quota / private mode */ }
}

export const getGithubToken = () => read(GITHUB_KEY);
export const setGithubToken = (token: string) => write(GITHUB_KEY, token);
export const getGitlabToken = () => read(GITLAB_KEY);
export const setGitlabToken = (token: string) => write(GITLAB_KEY, token);
