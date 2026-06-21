import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { THEMES, type IDEColors, type ThemeType } from "@/constants/colors";
export type { ThemeType } from "@/constants/colors";

export type SupportedLanguage =
  | "python" | "javascript" | "typescript" | "java"
  | "bash" | "html" | "css" | "json" | "cpp" | "rust" | "go" | "text";

export const LANGUAGE_EXTENSIONS: Record<SupportedLanguage, string> = {
  python: ".py", javascript: ".js", typescript: ".ts", java: ".java",
  bash: ".sh", html: ".html", css: ".css", json: ".json",
  cpp: ".cpp", rust: ".rs", go: ".go", text: ".txt",
};

export const LANGUAGE_FROM_EXT: Record<string, SupportedLanguage> = {
  ".py": "python", ".js": "javascript", ".ts": "typescript",
  ".tsx": "typescript", ".jsx": "javascript", ".java": "java",
  ".sh": "bash", ".bash": "bash", ".html": "html", ".css": "css",
  ".json": "json", ".cpp": "cpp", ".cc": "cpp", ".c": "cpp",
  ".rs": "rust", ".go": "go", ".txt": "text", ".md": "text",
  ".kt": "text", ".swift": "text", ".dart": "text", ".rb": "text",
};

export function detectLanguage(name: string): SupportedLanguage {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "text";
  return LANGUAGE_FROM_EXT[name.slice(idx).toLowerCase()] ?? "text";
}

export interface FileItem {
  id: string;
  name: string;
  content: string;
  language: SupportedLanguage;
  path: string;
  modified: boolean;
  folderId?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId?: string;
}

export interface Project {
  id: string;
  name: string;
  files: FileItem[];
  folders: FolderItem[];
  createdAt: number;
}

export type ActivePanel = "files" | "device" | "editor" | "terminal" | "git" | "ai" | "settings";
export type AiProvider = "gemini" | "openai" | "openrouter" | "custom";

export interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "info" | "warning";
  text: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const STORAGE_KEYS = {
  PROJECTS: "hs_projects",
  CURRENT_PROJECT: "hs_current_project",
  THEME: "hs_theme",
  GITHUB_TOKEN: "hs_github_token",
  GITHUB_USERNAME: "hs_github_username",
  FONT_SIZE: "hs_font_size",
  AI_PROVIDER: "hs_ai_provider",
  AI_API_KEY: "hs_ai_api_key",
  AI_BASE_URL: "hs_ai_base_url",
  AI_MODEL: "hs_ai_model",
  WORD_WRAP: "hs_word_wrap",
  LINE_NUMBERS: "hs_line_numbers",
  AUTO_COMPLETE: "hs_auto_complete",
  TAB_SIZE: "hs_tab_size",
  MINIMAP: "hs_minimap",
};

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

interface IDEContextType {
  projects: Project[];
  currentProject: Project | null;
  openFiles: FileItem[];
  activeFile: FileItem | null;
  activePanel: ActivePanel;
  sidebarOpen: boolean;
  terminalOpen: boolean;
  terminalHistory: TerminalLine[];
  theme: ThemeType;
  colors: IDEColors;
  githubToken: string;
  githubUsername: string;
  fontSize: number;
  loading: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoComplete: boolean;
  tabSize: number;
  minimap: boolean;
  aiProvider: AiProvider;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  aiMessages: AiMessage[];
  aiLoading: boolean;
  clipboardFile: FileItem | null;

  createProject: (name: string) => void;
  deleteProject: (id: string) => void;
  selectProject: (project: Project) => void;
  importFolderAsProject: (folderName: string, files: { name: string; content: string; path: string }[]) => void;

  createFile: (name: string, language: SupportedLanguage, folderId?: string) => FileItem | null;
  deleteFile: (id: string) => void;
  openFile: (file: FileItem) => void;
  closeFile: (id: string) => void;
  setActiveFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  saveFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  duplicateFile: (id: string) => void;
  copyFile: (file: FileItem) => void;
  pasteFile: () => void;

  createFolder: (name: string, parentId?: string) => FolderItem | null;
  deleteFolder: (id: string) => void;
  renameFolder: (id: string, newName: string) => void;

  setActivePanel: (panel: ActivePanel) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTerminal: () => void;

  addTerminalLine: (line: Omit<TerminalLine, "id">) => void;
  clearTerminal: () => void;

  setTheme: (theme: ThemeType) => void;
  setGithubToken: (token: string) => void;
  setGithubUsername: (username: string) => void;
  setFontSize: (size: number) => void;
  setWordWrap: (v: boolean) => void;
  setLineNumbers: (v: boolean) => void;
  setAutoComplete: (v: boolean) => void;
  setTabSize: (v: number) => void;
  setMinimap: (v: boolean) => void;

  setAiProvider: (p: AiProvider) => void;
  setAiApiKey: (k: string) => void;
  setAiBaseUrl: (u: string) => void;
  setAiModel: (m: string) => void;
  sendAiMessage: (content: string) => Promise<void>;
  clearAiMessages: () => void;
}

const IDEContext = createContext<IDEContextType | null>(null);

export function IDEProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [openFiles, setOpenFiles] = useState<FileItem[]>([]);
  const [activeFile, setActiveFileState] = useState<FileItem | null>(null);
  const [activePanel, setActivePanelState] = useState<ActivePanel>("files");
  const [sidebarOpen, setSidebarOpenState] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([
    { id: "1", type: "info", text: "HackerStudio Terminal — Ready" },
    { id: "2", type: "info", text: "Type 'help' for available commands." },
  ]);
  const [theme, setThemeState] = useState<ThemeType>("dark");
  const [githubToken, setGithubTokenState] = useState("");
  const [githubUsername, setGithubUsernameState] = useState("");
  const [fontSize, setFontSizeState] = useState(14);
  const [loading, setLoading] = useState(true);
  const [wordWrap, setWordWrapState] = useState(false);
  const [lineNumbers, setLineNumbersState] = useState(true);
  const [autoComplete, setAutoCompleteState] = useState(true);
  const [tabSize, setTabSizeState] = useState(4);
  const [minimap, setMinimapState] = useState(true);
  const [aiProvider, setAiProviderState] = useState<AiProvider>("gemini");
  const [aiApiKey, setAiApiKeyState] = useState("");
  const [aiBaseUrl, setAiBaseUrlState] = useState("");
  const [aiModel, setAiModelState] = useState("");
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [clipboardFile, setClipboardFile] = useState<FileItem | null>(null);

  const colors = THEMES[theme];

  useEffect(() => {
    const load = async () => {
      try {
        const keys = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
        const map: Record<string, string> = {};
        keys.forEach(([k, v]) => { if (v) map[k] = v; });

        let loadedProjects: Project[] = [];
        if (map[STORAGE_KEYS.PROJECTS]) {
          const parsed = JSON.parse(map[STORAGE_KEYS.PROJECTS]);
          loadedProjects = parsed.map((p: any) => ({ ...p, folders: p.folders ?? [] }));
          setProjects(loadedProjects);
        }
        if (map[STORAGE_KEYS.CURRENT_PROJECT] && loadedProjects.length > 0) {
          const proj = loadedProjects.find(p => p.id === map[STORAGE_KEYS.CURRENT_PROJECT]);
          if (proj) setCurrentProject(proj);
        }
        if (map[STORAGE_KEYS.THEME]) setThemeState(map[STORAGE_KEYS.THEME] as ThemeType);
        if (map[STORAGE_KEYS.GITHUB_TOKEN]) setGithubTokenState(map[STORAGE_KEYS.GITHUB_TOKEN]);
        if (map[STORAGE_KEYS.GITHUB_USERNAME]) setGithubUsernameState(map[STORAGE_KEYS.GITHUB_USERNAME]);
        if (map[STORAGE_KEYS.FONT_SIZE]) setFontSizeState(Number(map[STORAGE_KEYS.FONT_SIZE]));
        if (map[STORAGE_KEYS.AI_PROVIDER]) setAiProviderState(map[STORAGE_KEYS.AI_PROVIDER] as AiProvider);
        if (map[STORAGE_KEYS.AI_API_KEY]) setAiApiKeyState(map[STORAGE_KEYS.AI_API_KEY]);
        if (map[STORAGE_KEYS.AI_BASE_URL]) setAiBaseUrlState(map[STORAGE_KEYS.AI_BASE_URL]);
        if (map[STORAGE_KEYS.AI_MODEL]) setAiModelState(map[STORAGE_KEYS.AI_MODEL]);
        if (map[STORAGE_KEYS.WORD_WRAP]) setWordWrapState(map[STORAGE_KEYS.WORD_WRAP] === "true");
        if (map[STORAGE_KEYS.LINE_NUMBERS] === "false") setLineNumbersState(false);
        if (map[STORAGE_KEYS.AUTO_COMPLETE] === "false") setAutoCompleteState(false);
        if (map[STORAGE_KEYS.TAB_SIZE]) setTabSizeState(Number(map[STORAGE_KEYS.TAB_SIZE]));
        if (map[STORAGE_KEYS.MINIMAP] === "false") setMinimapState(false);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  const persistProjects = useCallback(async (updated: Project[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
  }, []);

  const createProject = useCallback((name: string) => {
    const project: Project = { id: genId(), name, files: [], folders: [], createdAt: Date.now() };
    const updated = [...projects, project];
    setProjects(updated);
    setCurrentProject(project);
    setOpenFiles([]);
    setActiveFileState(null);
    persistProjects(updated);
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, project.id);
  }, [projects, persistProjects]);

  const deleteProject = useCallback((id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (currentProject?.id === id) {
      setCurrentProject(updated[0] ?? null);
      setOpenFiles([]);
      setActiveFileState(null);
    }
    persistProjects(updated);
  }, [projects, currentProject, persistProjects]);

  const selectProject = useCallback((project: Project) => {
    setCurrentProject(project);
    setOpenFiles([]);
    setActiveFileState(null);
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, project.id);
  }, []);

  const importFolderAsProject = useCallback((folderName: string, files: { name: string; content: string; path: string }[]) => {
    const project: Project = {
      id: genId(),
      name: folderName,
      folders: [],
      files: files.map(f => ({
        id: genId(),
        name: f.name,
        content: f.content,
        language: detectLanguage(f.name),
        path: f.path,
        modified: false,
      })),
      createdAt: Date.now(),
    };
    const updated = [...projects, project];
    setProjects(updated);
    setCurrentProject(project);
    setOpenFiles([]);
    setActiveFileState(null);
    persistProjects(updated);
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, project.id);
  }, [projects, persistProjects]);

  const createFile = useCallback((name: string, language: SupportedLanguage, folderId?: string): FileItem | null => {
    if (!currentProject) return null;
    const ext = language !== "text" ? LANGUAGE_EXTENSIONS[language] : "";
    const finalName = name.includes(".") ? name : name + ext;
    const file: FileItem = {
      id: genId(), name: finalName,
      content: getFileTemplate(language, finalName),
      language, path: `/${currentProject.name}/${finalName}`,
      modified: false,
      folderId,
    };
    const updatedProject = { ...currentProject, files: [...currentProject.files, file] };
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setCurrentProject(updatedProject);
    setProjects(updatedProjects);
    persistProjects(updatedProjects);
    return file;
  }, [currentProject, projects, persistProjects]);

  const deleteFile = useCallback((id: string) => {
    if (!currentProject) return;
    const updatedProject = { ...currentProject, files: currentProject.files.filter(f => f.id !== id) };
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setCurrentProject(updatedProject);
    setProjects(updatedProjects);
    setOpenFiles(prev => prev.filter(f => f.id !== id));
    setActiveFileState(prev => (prev?.id === id ? null : prev));
    persistProjects(updatedProjects);
  }, [currentProject, projects, persistProjects]);

  const openFile = useCallback((file: FileItem) => {
    setOpenFiles(prev => {
      if (prev.find(f => f.id === file.id)) return prev;
      return [...prev, file];
    });
    setActiveFileState(file);
    setActivePanelState("editor");
  }, []);

  const closeFile = useCallback((id: string) => {
    setOpenFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      return filtered;
    });
    setActiveFileState(prev => {
      if (prev?.id !== id) return prev;
      const remaining = openFiles.filter(f => f.id !== id);
      return remaining[remaining.length - 1] ?? null;
    });
  }, [openFiles]);

  const setActiveFile = useCallback((id: string) => {
    const file = openFiles.find(f => f.id === id);
    if (file) setActiveFileState(file);
  }, [openFiles]);

  const updateFileContent = useCallback((id: string, content: string) => {
    setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, content, modified: true } : f));
    setActiveFileState(prev => prev?.id === id ? { ...prev, content, modified: true } : prev);
  }, []);

  const saveFile = useCallback((id: string) => {
    if (!currentProject) return;
    const file = openFiles.find(f => f.id === id);
    if (!file) return;
    const savedFile = { ...file, modified: false };
    setOpenFiles(prev => prev.map(f => f.id === id ? savedFile : f));
    setActiveFileState(prev => prev?.id === id ? savedFile : prev);
    const updatedProject = { ...currentProject, files: currentProject.files.map(f => f.id === id ? savedFile : f) };
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setCurrentProject(updatedProject);
    setProjects(updatedProjects);
    persistProjects(updatedProjects);
  }, [currentProject, openFiles, projects, persistProjects]);

  const renameFile = useCallback((id: string, newName: string) => {
    if (!currentProject) return;
    const updatedProject = { ...currentProject, files: currentProject.files.map(f => f.id === id ? { ...f, name: newName } : f) };
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setCurrentProject(updatedProject);
    setProjects(updatedProjects);
    setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    setActiveFileState(prev => prev?.id === id ? { ...prev, name: newName } : prev);
    persistProjects(updatedProjects);
  }, [currentProject, projects, persistProjects]);

  const duplicateFile = useCallback((id: string) => {
    if (!currentProject) return;
    const original = currentProject.files.find(f => f.id === id);
    if (!original) return;
    const nameParts = original.name.split(".");
    const ext = nameParts.length > 1 ? "." + nameParts.pop() : "";
    const baseName = nameParts.join(".");
    const newFile: FileItem = { ...original, id: genId(), name: `${baseName}_copy${ext}`, modified: false };
    const updatedProject = { ...currentProject, files: [...currentProject.files, newFile] };
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setCurrentProject(updatedProject);
    setProjects(updatedProjects);
    persistProjects(updatedProjects);
  }, [currentProject, projects, persistProjects]);

  const copyFile = useCallback((file: FileItem) => { setClipboardFile(file); }, []);

  const pasteFile = useCallback(() => {
    if (!clipboardFile || !currentProject) return;
    const nameParts = clipboardFile.name.split(".");
    const ext = nameParts.length > 1 ? "." + nameParts.pop() : "";
    const baseName = nameParts.join(".");
    const newFile: FileItem = { ...clipboardFile, id: genId(), name: `${baseName}_copy${ext}`, modified: false };
    const updatedProject = { ...currentProject, files: [...currentProject.files, newFile] };
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setCurrentProject(updatedProject);
    setProjects(updatedProjects);
    persistProjects(updatedProjects);
  }, [clipboardFile, currentProject, projects, persistProjects]);

  const createFolder = useCallback((name: string, parentId?: string): FolderItem | null => {
    if (!currentProject) return null;
    const folder: FolderItem = { id: genId(), name, parentId };
    const updatedProject = { ...currentProject, folders: [...(currentProject.folders ?? []), folder] };
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setCurrentProject(updatedProject);
    setProjects(updatedProjects);
    persistProjects(updatedProjects);
    return folder;
  }, [currentProject, projects, persistProjects]);

  const deleteFolder = useCallback((id: string) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      folders: (currentProject.folders ?? []).filter(f => f.id !== id),
      files: currentProject.files.filter(f => f.folderId !== id),
    };
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setCurrentProject(updatedProject);
    setProjects(updatedProjects);
    persistProjects(updatedProjects);
  }, [currentProject, projects, persistProjects]);

  const renameFolder = useCallback((id: string, newName: string) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      folders: (currentProject.folders ?? []).map(f => f.id === id ? { ...f, name: newName } : f),
    };
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setCurrentProject(updatedProject);
    setProjects(updatedProjects);
    persistProjects(updatedProjects);
  }, [currentProject, projects, persistProjects]);

  const setActivePanel = useCallback((panel: ActivePanel) => {
    setActivePanelState(panel);
    if (panel !== "editor") setSidebarOpenState(true);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpenState(prev => !prev), []);
  const setSidebarOpen = useCallback((open: boolean) => setSidebarOpenState(open), []);
  const toggleTerminal = useCallback(() => setTerminalOpen(prev => !prev), []);

  const addTerminalLine = useCallback((line: Omit<TerminalLine, "id">) => {
    setTerminalHistory(prev => [...prev, { ...line, id: genId() }]);
  }, []);

  const clearTerminal = useCallback(() => {
    setTerminalHistory([{ id: genId(), type: "info", text: "Terminal cleared." }]);
  }, []);

  const setTheme = useCallback((t: ThemeType) => { setThemeState(t); AsyncStorage.setItem(STORAGE_KEYS.THEME, t); }, []);
  const setGithubToken = useCallback((token: string) => { setGithubTokenState(token); AsyncStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, token); }, []);
  const setGithubUsername = useCallback((username: string) => { setGithubUsernameState(username); AsyncStorage.setItem(STORAGE_KEYS.GITHUB_USERNAME, username); }, []);
  const setFontSize = useCallback((size: number) => { setFontSizeState(size); AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, String(size)); }, []);
  const setWordWrap = useCallback((v: boolean) => { setWordWrapState(v); AsyncStorage.setItem(STORAGE_KEYS.WORD_WRAP, String(v)); }, []);
  const setLineNumbers = useCallback((v: boolean) => { setLineNumbersState(v); AsyncStorage.setItem(STORAGE_KEYS.LINE_NUMBERS, String(v)); }, []);
  const setAutoComplete = useCallback((v: boolean) => { setAutoCompleteState(v); AsyncStorage.setItem(STORAGE_KEYS.AUTO_COMPLETE, String(v)); }, []);
  const setTabSize = useCallback((v: number) => { setTabSizeState(v); AsyncStorage.setItem(STORAGE_KEYS.TAB_SIZE, String(v)); }, []);
  const setMinimap = useCallback((v: boolean) => { setMinimapState(v); AsyncStorage.setItem(STORAGE_KEYS.MINIMAP, String(v)); }, []);
  const setAiProvider = useCallback((p: AiProvider) => { setAiProviderState(p); AsyncStorage.setItem(STORAGE_KEYS.AI_PROVIDER, p); }, []);
  const setAiApiKey = useCallback((k: string) => { setAiApiKeyState(k); AsyncStorage.setItem(STORAGE_KEYS.AI_API_KEY, k); }, []);
  const setAiBaseUrl = useCallback((u: string) => { setAiBaseUrlState(u); AsyncStorage.setItem(STORAGE_KEYS.AI_BASE_URL, u); }, []);
  const setAiModel = useCallback((m: string) => { setAiModelState(m); AsyncStorage.setItem(STORAGE_KEYS.AI_MODEL, m); }, []);

  const sendAiMessage = useCallback(async (content: string) => {
    if (!aiApiKey && !aiBaseUrl) return;
    const userMsg: AiMessage = { id: genId(), role: "user", content, timestamp: Date.now() };
    setAiMessages(prev => [...prev, userMsg]);
    setAiLoading(true);
    try {
      let reply = "";
      const systemPrompt = activeFile
        ? `You are an expert coding assistant in HackerStudio IDE. The user has this file open:\nFilename: ${activeFile.name}\nLanguage: ${activeFile.language}\nContent:\n\`\`\`\n${activeFile.content.slice(0, 3000)}\n\`\`\`\nAnswer concisely about this code.`
        : "You are an expert coding assistant in HackerStudio IDE. Help the user with programming questions. Be concise and helpful.";

      if (aiProvider === "gemini") {
        const model = aiModel || "gemini-2.0-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiApiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...aiMessages.map(m => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content }],
              })),
              { role: "user", parts: [{ text: content }] },
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const errMsg = data?.error?.message || JSON.stringify(data);
          reply = `❌ Gemini Error (${res.status}): ${errMsg}\n\nCheck your API key in Settings. Make sure it's a valid Gemini API key from Google AI Studio.`;
        } else if (data?.promptFeedback?.blockReason) {
          reply = `⚠️ Request was blocked: ${data.promptFeedback.blockReason}`;
        } else {
          reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response received from Gemini.";
        }
      } else {
        const baseUrl = aiProvider === "openai"
          ? "https://api.openai.com"
          : aiProvider === "openrouter"
            ? "https://openrouter.ai/api"
            : aiBaseUrl || "https://api.openai.com";
        const model2 = aiModel || (aiProvider === "openai" ? "gpt-4o-mini" : "openai/gpt-4o-mini");
        const res = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model: model2,
            messages: [
              { role: "system", content: systemPrompt },
              ...aiMessages.map(m => ({ role: m.role, content: m.content })),
              { role: "user", content },
            ],
            max_tokens: 2048,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          reply = `❌ API Error (${res.status}): ${data?.error?.message || JSON.stringify(data)}`;
        } else {
          reply = data?.choices?.[0]?.message?.content || "No response received.";
        }
      }
      const assistantMsg: AiMessage = { id: genId(), role: "assistant", content: reply, timestamp: Date.now() };
      setAiMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      const errMsg: AiMessage = {
        id: genId(), role: "assistant",
        content: `❌ Connection Error: ${e?.message || "Failed to connect to AI"}\n\nCheck your internet connection and API key.`,
        timestamp: Date.now(),
      };
      setAiMessages(prev => [...prev, errMsg]);
    } finally {
      setAiLoading(false);
    }
  }, [aiApiKey, aiBaseUrl, aiProvider, aiModel, aiMessages, activeFile]);

  const clearAiMessages = useCallback(() => setAiMessages([]), []);

  return (
    <IDEContext.Provider value={{
      projects, currentProject, openFiles, activeFile, activePanel,
      sidebarOpen, terminalOpen, terminalHistory, theme, colors,
      githubToken, githubUsername, fontSize, loading,
      wordWrap, lineNumbers, autoComplete, tabSize, minimap,
      aiProvider, aiApiKey, aiBaseUrl, aiModel, aiMessages, aiLoading,
      clipboardFile,
      createProject, deleteProject, selectProject, importFolderAsProject,
      createFile, deleteFile, openFile, closeFile, setActiveFile,
      updateFileContent, saveFile, renameFile, duplicateFile, copyFile, pasteFile,
      createFolder, deleteFolder, renameFolder,
      setActivePanel, toggleSidebar, setSidebarOpen, toggleTerminal,
      addTerminalLine, clearTerminal,
      setTheme, setGithubToken, setGithubUsername, setFontSize,
      setWordWrap, setLineNumbers, setAutoComplete, setTabSize, setMinimap,
      setAiProvider, setAiApiKey, setAiBaseUrl, setAiModel,
      sendAiMessage, clearAiMessages,
    }}>
      {children}
    </IDEContext.Provider>
  );
}

export function useIDE() {
  const ctx = useContext(IDEContext);
  if (!ctx) throw new Error("useIDE must be used within IDEProvider");
  return ctx;
}

function getFileTemplate(language: SupportedLanguage, name: string): string {
  switch (language) {
    case "python":
      return `# ${name}\n\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n`;
    case "javascript":
      return `// ${name}\n\nfunction main() {\n  console.log("Hello, World!");\n}\n\nmain();\n`;
    case "typescript":
      return `// ${name}\n\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);\n`;
    case "java": {
      const className = name.replace(".java", "");
      return `public class ${className} {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`;
    }
    case "html":
      return `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${name}</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>\n`;
    case "css":
      return `/* ${name} */\n\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: sans-serif; }\n`;
    case "json":
      return `{\n  "name": "project",\n  "version": "1.0.0"\n}\n`;
    case "bash":
      return `#!/bin/bash\n# ${name}\n\necho "Hello, World!"\n`;
    case "cpp":
      return `// ${name}\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n`;
    case "rust":
      return `// ${name}\nfn main() {\n    println!("Hello, World!");\n}\n`;
    case "go":
      return `// ${name}\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n`;
    default:
      return `# ${name}\n`;
  }
}
