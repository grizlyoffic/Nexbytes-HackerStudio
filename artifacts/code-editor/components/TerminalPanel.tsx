import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useIDE } from "@/context/IDEContext";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const WS_URL = DOMAIN
  ? `wss://${DOMAIN}/api/terminal`
  : "ws://localhost:8080/api/terminal";

function stripAnsi(str: string): string {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g,
    "",
  );
}

function parseAnsiColor(str: string): TermLine[] {
  const lines: TermLine[] = [];
  const segments = str.split(/\r?\n/);
  for (const seg of segments) {
    if (seg === "") {
      lines.push({ id: Math.random().toString(), text: "", color: "default" });
      continue;
    }
    let color: TermLine["color"] = "default";
    if (/\x1b\[1;31m/.test(seg) || /\x1b\[31m/.test(seg)) color = "red";
    else if (/\x1b\[1;32m/.test(seg) || /\x1b\[32m/.test(seg)) color = "green";
    else if (/\x1b\[1;33m/.test(seg) || /\x1b\[33m/.test(seg)) color = "yellow";
    else if (/\x1b\[1;34m/.test(seg) || /\x1b\[34m/.test(seg)) color = "blue";
    else if (/\x1b\[90m/.test(seg)) color = "muted";
    lines.push({
      id: Math.random().toString(),
      text: stripAnsi(seg),
      color,
    });
  }
  return lines;
}

interface TermLine {
  id: string;
  text: string;
  color: "default" | "red" | "green" | "yellow" | "blue" | "muted";
}

type WsStatus = "connecting" | "connected" | "disconnected" | "error";

export default function TerminalPanel() {
  const { colors, fontSize, toggleTerminal, activeFile } = useIDE();
  const [lines, setLines] = useState<TermLine[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const bufferRef = useRef("");

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 80);
  }, []);

  const appendLines = useCallback(
    (newLines: TermLine[]) => {
      setLines((prev) => [...prev, ...newLines].slice(-500));
      scrollToEnd();
    },
    [scrollToEnd],
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus("connecting");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onmessage = (e) => {
      const raw: string = typeof e.data === "string" ? e.data : "";
      bufferRef.current += raw;
      const chunks = bufferRef.current.split("\r\n");
      bufferRef.current = chunks.pop() ?? "";
      const all = chunks.join("\n");
      if (all) appendLines(parseAnsiColor(all));
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
    };
  }, [appendLines]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    if (bufferRef.current) {
      appendLines(parseAnsiColor(bufferRef.current));
      bufferRef.current = "";
    }
  }, [appendLines]);

  const sendInput = useCallback(
    (text: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(text);
      }
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const cmd = input.trim();
    if (!cmd) {
      sendInput("\n");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (cmd === "clear" || cmd === "cls") {
      setLines([]);
      setInput("");
      sendInput("clear\n");
      return;
    }

    appendLines([
      { id: Math.random().toString(), text: `$ ${cmd}`, color: "green" },
    ]);
    sendInput(cmd + "\n");
    setCmdHistory((prev) => [cmd, ...prev.slice(0, 99)]);
    setHistIdx(-1);
    setInput("");
    scrollToEnd();
  }, [input, sendInput, appendLines, scrollToEnd]);

  const handleRunFile = useCallback(() => {
    if (!activeFile) return;
    const ext = activeFile.name.split(".").pop()?.toLowerCase() ?? "";
    let cmd = "";
    if (["py", "python"].includes(ext)) cmd = `python3 -c '${activeFile.content.replace(/'/g, "\\'")}'`;
    else if (["js", "mjs"].includes(ext)) cmd = `node -e '${activeFile.content.replace(/'/g, "\\'")}'`;
    else if (ext === "sh") cmd = `bash -c '${activeFile.content.replace(/'/g, "\\'")}'`;
    else {
      appendLines([{ id: Math.random().toString(), text: `Cannot run .${ext} files directly`, color: "red" }]);
      return;
    }
    appendLines([{ id: Math.random().toString(), text: `▶ Running ${activeFile.name}...`, color: "yellow" }]);
    sendInput(cmd + "\n");
    scrollToEnd();
  }, [activeFile, sendInput, appendLines, scrollToEnd]);

  const historyUp = useCallback(() => {
    const ni = Math.min(histIdx + 1, cmdHistory.length - 1);
    if (ni >= 0) { setHistIdx(ni); setInput(cmdHistory[ni] ?? ""); }
  }, [histIdx, cmdHistory]);

  const historyDown = useCallback(() => {
    const ni = histIdx - 1;
    if (ni < 0) { setHistIdx(-1); setInput(""); }
    else { setHistIdx(ni); setInput(cmdHistory[ni] ?? ""); }
  }, [histIdx, cmdHistory]);

  const lineColor = (c: TermLine["color"]) => {
    switch (c) {
      case "red":    return colors.terminalError ?? "#ff5555";
      case "green":  return colors.terminalPrompt ?? "#50fa7b";
      case "yellow": return colors.terminalWarning ?? "#f1fa8c";
      case "blue":   return "#8be9fd";
      case "muted":  return colors.mutedText ?? "#6272a4";
      default:       return colors.terminalText ?? "#f8f8f2";
    }
  };

  const statusColor =
    status === "connected" ? "#50fa7b"
    : status === "connecting" ? "#f1fa8c"
    : "#ff5555";

  const statusLabel =
    status === "connected" ? "● Connected"
    : status === "connecting" ? "◌ Connecting..."
    : status === "error" ? "✕ Error"
    : "○ Disconnected";

  return (
    <View style={[styles.container, { backgroundColor: colors.terminalBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.dot, { backgroundColor: "#ff5f57" }]} />
          <View style={[styles.dot, { backgroundColor: "#ffbd2e" }]} />
          <View style={[styles.dot, { backgroundColor: "#27c93f" }]} />
          <Text style={[styles.headerTitle, { color: colors.mutedText }]}>
            {" "}BASH SHELL{" "}
          </Text>
          <TouchableOpacity
            onPress={status === "disconnected" || status === "error" ? connect : undefined}
          >
            <Text style={[styles.statusBadge, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          {activeFile && (
            <TouchableOpacity
              style={[styles.runBtn, { backgroundColor: colors.success + "22" }]}
              onPress={handleRunFile}
            >
              <Feather name="play" size={12} color={colors.success} />
              <Text style={[styles.runBtnText, { color: colors.success }]}>
                Run {activeFile.name}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setLines([])} style={styles.iconBtn}>
            <Feather name="trash-2" size={14} color={colors.mutedText} />
          </TouchableOpacity>
          {(status === "disconnected" || status === "error") && (
            <TouchableOpacity onPress={connect} style={styles.iconBtn}>
              <Feather name="refresh-cw" size={14} color={colors.accent} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleTerminal} style={styles.iconBtn}>
            <Feather name="x" size={14} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Output */}
      <FlatList
        ref={listRef}
        data={lines}
        keyExtractor={(item) => item.id}
        style={styles.output}
        contentContainerStyle={styles.outputContent}
        renderItem={({ item }) => (
          <Text
            selectable
            style={[
              styles.termLine,
              { fontSize: fontSize - 2, color: lineColor(item.color) },
            ]}
          >
            {item.text}
          </Text>
        )}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd?.({ animated: false })
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            {status === "connecting"
              ? "Connecting to bash shell..."
              : status === "disconnected" || status === "error"
              ? "Not connected. Tap ↺ to reconnect."
              : "Shell ready."}
          </Text>
        }
      />

      {/* Shortcut bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.shortcuts, { borderTopColor: colors.border + "44" }]}
        contentContainerStyle={styles.shortcutsContent}
      >
        {["Tab", "Ctrl+C", "↑", "↓", "ls", "pwd", "cd ~", "git status", "clear"].map(
          (key) => (
            <TouchableOpacity
              key={key}
              style={[styles.shortcutBtn, { backgroundColor: colors.surface ?? "#21222c" }]}
              onPress={() => {
                if (key === "↑") { historyUp(); return; }
                if (key === "↓") { historyDown(); return; }
                if (key === "Tab") { sendInput("\t"); return; }
                if (key === "Ctrl+C") { sendInput("\x03"); return; }
                if (key === "clear") { setLines([]); sendInput("clear\n"); return; }
                setInput((prev) => (prev ? prev + " " + key : key));
                inputRef.current?.focus();
              }}
            >
              <Text style={[styles.shortcutText, { color: colors.mutedText }]}>
                {key}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </ScrollView>

      {/* Input row */}
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0}>
        <View
          style={[
            styles.inputRow,
            { borderTopColor: colors.border, backgroundColor: colors.terminalBg },
          ]}
        >
          <Text style={[styles.prompt, { color: colors.terminalPrompt ?? "#50fa7b" }]}>
            $
          </Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { color: colors.terminalText ?? "#f8f8f2", fontSize: fontSize - 1 },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Enter command..."
            placeholderTextColor={(colors.mutedText ?? "#6272a4") + "88"}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            onSubmitEditing={handleSubmit}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={historyUp} style={styles.iconBtn}>
            <Feather name="chevron-up" size={16} color={colors.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={status !== "connected"}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  status === "connected" ? colors.accent : colors.muted ?? "#44475a",
              },
            ]}
          >
            <Feather name="send" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  headerTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  statusBadge: { fontSize: 10, fontFamily: "Inter_500Medium", marginLeft: 6 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  runBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  runBtnText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  iconBtn: { padding: 4 },
  output: { flex: 1 },
  outputContent: { padding: 10, paddingBottom: 4, gap: 1 },
  termLine: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 20,
    paddingVertical: 1,
  },
  emptyText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    padding: 12,
    opacity: 0.6,
  },
  shortcuts: {
    maxHeight: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shortcutsContent: {
    paddingHorizontal: 8,
    gap: 6,
    alignItems: "center",
    paddingVertical: 4,
  },
  shortcutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  shortcutText: { fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  prompt: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    paddingVertical: 2,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
