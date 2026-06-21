import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { type SupportedLanguage, useIDE } from "@/context/IDEContext";

// ─── Tokenizer ─────────────────────────────────────────────────────────────

type TT = "keyword" | "string" | "comment" | "number" | "func" | "type" | "operator" | "variable" | "default";

interface Token { text: string; type: TT; }

const KEYWORDS: Record<string, Set<string>> = {
  python: new Set(["def","class","import","from","return","if","elif","else","for","while",
    "in","not","and","or","True","False","None","try","except","finally","with","as",
    "lambda","pass","break","continue","yield","async","await","global","nonlocal",
    "del","raise","assert","is","print","len","range","int","str","float","list",
    "dict","tuple","set","bool","type","super","self","__init__"]),
  javascript: new Set(["function","const","let","var","return","if","else","for","while","in",
    "of","import","export","default","class","extends","new","this","typeof","instanceof",
    "try","catch","finally","throw","async","await","true","false","null","undefined",
    "void","delete","switch","case","break","continue","yield","from","static","get","set",
    "console","Promise","Array","Object","String","Number","Boolean","Math","JSON","Error"]),
};
KEYWORDS["typescript"] = KEYWORDS["javascript"];
KEYWORDS["jsx"] = KEYWORDS["javascript"];
KEYWORDS["tsx"] = KEYWORDS["typescript"];

function tokenizeLine(line: string, lang: SupportedLanguage): Token[] {
  const tokens: Token[] = [];
  const kws = KEYWORDS[lang] ?? new Set();
  let i = 0;
  while (i < line.length) {
    // Python/bash comment
    if ((lang === "python" || lang === "bash") && line[i] === "#") {
      tokens.push({ text: line.slice(i), type: "comment" }); break;
    }
    // JS/TS comment
    if ((lang === "javascript" || lang === "typescript") && line[i] === "/" && line[i + 1] === "/") {
      tokens.push({ text: line.slice(i), type: "comment" }); break;
    }
    // CSS/JSON comment-like
    if (lang === "css" && line[i] === "/" && line[i + 1] === "*") {
      const end = line.indexOf("*/", i + 2);
      const endIdx = end >= 0 ? end + 2 : line.length;
      tokens.push({ text: line.slice(i, endIdx), type: "comment" });
      i = endIdx; continue;
    }
    // String
    if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
      const q = line[i]; let j = i + 1;
      while (j < line.length && line[j] !== q) { if (line[j] === "\\") j++; j++; }
      tokens.push({ text: line.slice(i, Math.min(j + 1, line.length)), type: "string" });
      i = Math.min(j + 1, line.length); continue;
    }
    // Number
    if (/[0-9]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[0-9._xXbBoO]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), type: "number" }); i = j; continue;
    }
    // Word
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const after = line.slice(j).trimStart();
      let tt: TT;
      if (kws.has(word)) tt = "keyword";
      else if (after.startsWith("(")) tt = "func";
      else if (/^[A-Z]/.test(word)) tt = "type";
      else tt = "default";
      tokens.push({ text: word, type: tt }); i = j; continue;
    }
    tokens.push({ text: line[i], type: "operator" }); i++;
  }
  return tokens;
}

function tokenColor(t: TT, c: any): string {
  switch (t) {
    case "keyword": return c.keyword;
    case "string": return c.string;
    case "comment": return c.comment;
    case "number": return c.number;
    case "func": return c.func;
    case "type": return c.type;
    case "operator": return c.operator;
    case "variable": return c.variable;
    default: return c.text;
  }
}

// ─── IntelliSense ──────────────────────────────────────────────────────────

function getCompletions(word: string, lang: SupportedLanguage, content: string): string[] {
  if (word.length < 2) return [];
  const langKws = KEYWORDS[lang] ?? new Set<string>();
  const candidates = new Set<string>([...langKws]);
  // Extract identifiers from content
  const matches = content.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) ?? [];
  matches.forEach(m => candidates.add(m));
  const lower = word.toLowerCase();
  return [...candidates]
    .filter(c => c.toLowerCase().startsWith(lower) && c !== word)
    .slice(0, 6);
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function EditorTabs() {
  const { openFiles, activeFile, closeFile, setActiveFile, colors, fontSize } = useIDE();
  if (openFiles.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsBar, { backgroundColor: colors.tab }]}>
      {openFiles.map(f => {
        const isActive = activeFile?.id === f.id;
        return (
          <TouchableOpacity
            key={f.id}
            style={[styles.tab, {
              backgroundColor: isActive ? colors.activeTab : colors.tab,
              borderBottomColor: isActive ? colors.activeTabBorder : "transparent",
              borderBottomWidth: 2,
            }]}
            onPress={() => setActiveFile(f.id)}
          >
            <Text style={[styles.tabName, { color: isActive ? colors.text : colors.mutedText, fontSize: 12 }]} numberOfLines={1}>
              {f.modified ? "● " : ""}{f.name}
            </Text>
            <TouchableOpacity onPress={() => closeFile(f.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={11} color={isActive ? colors.mutedText : "transparent"} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Breadcrumb ────────────────────────────────────────────────────────────

function Breadcrumb({ file }: { file: any }) {
  const { currentProject, colors } = useIDE();
  return (
    <View style={[styles.breadcrumb, { backgroundColor: colors.titleBar, borderBottomColor: colors.border }]}>
      <Text style={[styles.breadText, { color: colors.mutedText }]}>{currentProject?.name ?? "no-project"}</Text>
      <Feather name="chevron-right" size={11} color={colors.mutedText} />
      <Text style={[styles.breadText, { color: colors.text }]}>{file.name}</Text>
      <View style={[styles.langBadge, { backgroundColor: colors.muted }]}>
        <Text style={[styles.langText, { color: colors.mutedText }]}>{file.language}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CodeEditor() {
  const { activeFile, colors, fontSize, updateFileContent, saveFile,
    toggleTerminal, lineNumbers, wordWrap, autoComplete, minimap, tabSize } = useIDE();
  const [isEditing, setIsEditing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [cursorWord, setCursorWord] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const handleSave = useCallback(() => {
    if (!activeFile) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveFile(activeFile.id);
    setIsEditing(false);
    setSuggestions([]);
  }, [activeFile, saveFile]);

  const handleTextChange = useCallback((text: string) => {
    if (!activeFile) return;
    updateFileContent(activeFile.id, text);
    if (autoComplete) {
      const lines = text.split("\n");
      const lastLine = lines[lines.length - 1] ?? "";
      const wordMatch = lastLine.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
      const word = wordMatch?.[0] ?? "";
      setCursorWord(word);
      if (word.length >= 2) {
        setSuggestions(getCompletions(word, activeFile.language, text));
      } else {
        setSuggestions([]);
      }
    }
  }, [activeFile, updateFileContent, autoComplete]);

  const applySuggestion = useCallback((suggestion: string) => {
    if (!activeFile) return;
    const content = activeFile.content;
    const newContent = content.replace(new RegExp(cursorWord + "$", "m"),
      (m, offset) => content.slice(0, content.length - cursorWord.length) + suggestion
        ? suggestion
        : m
    );
    const idx = content.lastIndexOf(cursorWord);
    if (idx >= 0) {
      const updated = content.slice(0, idx) + suggestion + content.slice(idx + cursorWord.length);
      updateFileContent(activeFile.id, updated);
    }
    setSuggestions([]);
    setCursorWord("");
  }, [activeFile, cursorWord, updateFileContent]);

  const tokenized = useMemo(() => {
    if (!activeFile) return [];
    const lines = activeFile.content.split("\n");
    return lines.map(line => tokenizeLine(line, activeFile.language));
  }, [activeFile?.content, activeFile?.language]);

  const lineCount = useMemo(() => (activeFile?.content.split("\n").length ?? 0), [activeFile?.content]);

  if (!activeFile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EditorTabs />
        <View style={styles.welcome}>
          <Text style={[styles.welcomeApp, { color: colors.accent }]}>{"{ }"}</Text>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>HackerStudio</Text>
          <Text style={[styles.welcomeSub, { color: colors.mutedText }]}>
            Open a file from the Explorer to start coding
          </Text>
          <View style={styles.welcomeGrid}>
            {[
              { icon: "copy", label: "Explorer", hint: "Ctrl+Shift+E" },
              { icon: "cpu", label: "AI Agent", hint: "Ask AI" },
              { icon: "terminal", label: "Terminal", hint: "Ctrl+`" },
              { icon: "git-branch", label: "Source Control", hint: "Ctrl+Shift+G" },
            ].map(item => (
              <View key={item.label} style={[styles.welcomeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name={item.icon as any} size={18} color={colors.accent} />
                <Text style={[styles.welcomeCardLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.welcomeCardHint, { color: colors.mutedText }]}>{item.hint}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <EditorTabs />
      <Breadcrumb file={activeFile} />

      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.titleBar, borderBottomColor: colors.border }]}>
        <View style={styles.toolbarLeft}>
          {isEditing ? (
            <TouchableOpacity style={[styles.toolBtn, { backgroundColor: colors.success + "22" }]} onPress={handleSave}>
              <Feather name="save" size={13} color={colors.success} />
              <Text style={[styles.toolBtnText, { color: colors.success }]}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.toolBtn, { backgroundColor: colors.accent + "22" }]} onPress={() => setIsEditing(true)}>
              <Feather name="edit-2" size={13} color={colors.accent} />
              <Text style={[styles.toolBtnText, { color: colors.accent }]}>Edit</Text>
            </TouchableOpacity>
          )}
          {isEditing && (
            <TouchableOpacity style={[styles.toolBtn]} onPress={() => { setIsEditing(false); setSuggestions([]); }}>
              <Feather name="x" size={13} color={colors.mutedText} />
              <Text style={[styles.toolBtnText, { color: colors.mutedText }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.toolbarRight}>
          <TouchableOpacity style={styles.toolIcon} onPress={toggleTerminal}>
            <Feather name="terminal" size={15} color={colors.mutedText} />
          </TouchableOpacity>
          {isEditing && (
            <Text style={[styles.insertBadge, { color: colors.warning }]}>INSERT</Text>
          )}
        </View>
      </View>

      {/* IntelliSense popup */}
      {isEditing && suggestions.length > 0 && (
        <View style={[styles.suggestions, { backgroundColor: colors.suggestionBg, borderColor: colors.suggestionBorder }]}>
          {suggestions.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.suggestionItem]}
              onPress={() => applySuggestion(s)}
            >
              <Feather name="code" size={11} color={colors.suggestionType} />
              <Text style={[styles.suggestionText, { color: colors.suggestionText }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Editor body */}
      {isEditing ? (
        <View style={styles.editArea}>
          <TextInput
            style={[styles.editInput, {
              color: colors.text, fontSize,
              backgroundColor: colors.background,
            }]}
            value={activeFile.content}
            onChangeText={handleTextChange}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            textAlignVertical="top"
            scrollEnabled
          />
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <ScrollView ref={scrollRef} style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.codeBody}>
                {lineNumbers && (
                  <View style={[styles.gutter, { borderRightColor: colors.border }]}>
                    {tokenized.map((_, i) => (
                      <Text key={i} style={[styles.lineNum, { color: colors.lineNumber, fontSize: fontSize - 2 }]}>
                        {i + 1}
                      </Text>
                    ))}
                  </View>
                )}
                <View style={styles.codeLines}>
                  {tokenized.map((lineTokens, i) => (
                    <View key={i} style={[styles.codeLine, { minHeight: fontSize * 1.65 }]}>
                      {lineTokens.map((tok, j) => (
                        <Text key={j} style={{ color: tokenColor(tok.type, colors), fontSize, fontFamily: "monospace", lineHeight: fontSize * 1.65 }}>
                          {tok.text}
                        </Text>
                      ))}
                      {lineTokens.length === 0 && <Text style={{ fontSize, lineHeight: fontSize * 1.65 }}>{" "}</Text>}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </ScrollView>

          {/* Minimap */}
          {minimap && activeFile.content.length > 0 && (
            <View style={[styles.minimap, { backgroundColor: colors.minimapBg, borderLeftColor: colors.border }]}>
              {activeFile.content.split("\n").slice(0, 80).map((line, i) => (
                <View key={i} style={styles.minimapLine}>
                  <View style={[styles.minimapContent, {
                    backgroundColor: line.trim() ? colors.mutedText + "40" : "transparent",
                    width: Math.min(line.length * 0.7, 50),
                  }]} />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: colors.statusBar }]}>
        <View style={styles.statusLeft}>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.statusText}>
              {isEditing ? "✎ EDITING" : "○ READ"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.statusText}>│ {activeFile.language.toUpperCase()}</Text>
          <Text style={styles.statusText}>│ Ln {lineCount}</Text>
        </View>
        <View style={styles.statusRight}>
          {activeFile.modified && <Text style={[styles.statusText, { color: "#ffd700" }]}>● Modified</Text>}
          <Text style={styles.statusText}>UTF-8</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsBar: { maxHeight: 36, minHeight: 36 },
  tab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 0, gap: 8, height: 36, minWidth: 80,
  },
  tabName: { fontFamily: "Inter_400Regular", maxWidth: 100 },
  breadcrumb: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 5, gap: 6, borderBottomWidth: 1,
  },
  breadText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  langBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginLeft: 4 },
  langText: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" },
  toolbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: 1,
  },
  toolbarLeft: { flexDirection: "row", gap: 6 },
  toolbarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  toolBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
  },
  toolBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  toolIcon: { padding: 5 },
  insertBadge: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  suggestions: {
    position: "absolute", top: 36 + 30 + 34 + 28, left: 60, right: 16, zIndex: 100,
    borderRadius: 6, borderWidth: 1, maxHeight: 180, overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  suggestionText: { fontSize: 13, fontFamily: "monospace" },
  editArea: { flex: 1 },
  editInput: {
    flex: 1, fontFamily: "monospace", padding: 12,
    textAlignVertical: "top", lineHeight: 22,
  },
  codeBody: { flexDirection: "row", minWidth: "100%" },
  gutter: {
    paddingVertical: 8, paddingRight: 10, paddingLeft: 6,
    alignItems: "flex-end", borderRightWidth: 1, minWidth: 44,
  },
  lineNum: { fontFamily: "monospace" },
  codeLines: { padding: 8, flex: 1 },
  codeLine: { flexDirection: "row", flexWrap: "nowrap" },
  minimap: {
    width: 60, borderLeftWidth: 1, paddingTop: 8, paddingHorizontal: 4,
    overflow: "hidden",
  },
  minimapLine: { height: 3, marginBottom: 1, justifyContent: "center" },
  minimapContent: { height: 2, borderRadius: 1 },
  statusBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 3,
  },
  statusLeft: { flexDirection: "row", gap: 8, alignItems: "center" },
  statusRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  statusText: { color: "#ffffff", fontSize: 11, fontFamily: "Inter_400Regular" },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  welcomeApp: { fontSize: 40, fontFamily: "Inter_700Bold" },
  welcomeTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  welcomeSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8 },
  welcomeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  welcomeCard: {
    width: 130, alignItems: "center", padding: 14, borderRadius: 8,
    gap: 6, borderWidth: 1,
  },
  welcomeCardLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  welcomeCardHint: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
});
