import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useIDE } from "@/context/IDEContext";

export default function AIPanel() {
  const { colors, aiMessages, aiLoading, sendAiMessage, clearAiMessages, aiApiKey, aiProvider, activeFile, setActivePanel } = useIDE();
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || aiLoading) return;
    setInput("");
    await sendAiMessage(msg);
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
  };

  const QUICK_PROMPTS = [
    { label: "Explain code", prompt: "Explain what this code does" },
    { label: "Fix bugs", prompt: "Find and fix bugs in this code" },
    { label: "Optimize", prompt: "How can I optimize this code?" },
    { label: "Add comments", prompt: "Add helpful comments to this code" },
    { label: "Write tests", prompt: "Write unit tests for this code" },
    { label: "Convert to Python", prompt: "Convert this code to Python" },
  ];

  if (!aiApiKey) {
    return (
      <View style={[styles.noKeyContainer, { backgroundColor: colors.sidebar }]}>
        <Feather name="cpu" size={40} color={colors.aiAccent} />
        <Text style={[styles.noKeyTitle, { color: colors.text }]}>AI Agent</Text>
        <Text style={[styles.noKeyDesc, { color: colors.mutedText }]}>
          Configure your AI API key in Settings to enable the AI assistant.{"\n\n"}
          Supports: Gemini, OpenAI, OpenRouter, or any OpenAI-compatible API.
        </Text>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.accent }]}
          onPress={() => setActivePanel("settings")}
        >
          <Feather name="settings" size={14} color="#fff" />
          <Text style={styles.settingsBtnText}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebar }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Feather name="cpu" size={14} color={colors.aiAccent} />
          <Text style={[styles.headerTitle, { color: colors.mutedText }]}>AI AGENT</Text>
          <View style={[styles.providerBadge, { backgroundColor: colors.aiAccent + "22" }]}>
            <Text style={[styles.providerText, { color: colors.aiAccent }]}>{aiProvider.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {activeFile && (
            <View style={[styles.fileBadge, { backgroundColor: colors.muted }]}>
              <Feather name="file" size={10} color={colors.mutedText} />
              <Text style={[styles.fileText, { color: colors.mutedText }]} numberOfLines={1}>
                {activeFile.name}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={clearAiMessages} style={styles.iconBtn}>
            <Feather name="trash-2" size={13} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
      </View>

      {aiMessages.length === 0 ? (
        <View style={styles.emptyArea}>
          <Text style={[styles.welcomeText, { color: colors.mutedText }]}>
            Ask me anything about your code!
          </Text>
          <View style={styles.quickGrid}>
            {QUICK_PROMPTS.map(q => (
              <TouchableOpacity
                key={q.label}
                style={[styles.quickBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => { setInput(q.prompt); }}
              >
                <Text style={[styles.quickBtnText, { color: colors.text }]}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={aiMessages}
          keyExtractor={item => item.id}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          renderItem={({ item }) => (
            <View style={[
              styles.bubble,
              item.role === "user"
                ? [styles.userBubble, { backgroundColor: colors.aiUserBubble }]
                : [styles.aiBubble, { backgroundColor: colors.aiAssistantBubble, borderColor: colors.border }],
            ]}>
              {item.role === "assistant" && (
                <View style={styles.aiLabel}>
                  <Feather name="cpu" size={11} color={colors.aiAccent} />
                  <Text style={[styles.aiLabelText, { color: colors.aiAccent }]}>AI</Text>
                </View>
              )}
              <Text style={[styles.bubbleText, { color: colors.text }]}>
                {item.content}
              </Text>
              <Text style={[styles.timeText, { color: colors.mutedText }]}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
        />
      )}

      {aiLoading && (
        <View style={[styles.loadingRow, { borderTopColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.aiAccent} />
          <Text style={[styles.loadingText, { color: colors.mutedText }]}>AI is thinking...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.sidebar }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.muted, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask AI about your code..."
            placeholderTextColor={colors.mutedText}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || aiLoading}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.aiAccent : colors.muted }]}
          >
            <Feather name="send" size={15} color={input.trim() ? "#fff" : colors.mutedText} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  headerTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  providerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  providerText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  fileBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, maxWidth: 100,
  },
  fileText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  iconBtn: { padding: 4 },
  emptyArea: { flex: 1, padding: 16, alignItems: "center", justifyContent: "center", gap: 16 },
  welcomeText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  quickBtn: {
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, borderWidth: 1,
  },
  quickBtnText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messages: { flex: 1 },
  messagesContent: { padding: 10, gap: 10 },
  bubble: { borderRadius: 8, padding: 10, maxWidth: "92%" },
  userBubble: { alignSelf: "flex-end" },
  aiBubble: { alignSelf: "flex-start", borderWidth: 1 },
  aiLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  aiLabelText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  bubbleText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  timeText: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "right" },
  loadingRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1,
  },
  loadingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1,
  },
  input: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular",
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
    maxHeight: 100, minHeight: 36,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  noKeyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  noKeyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  noKeyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  settingsBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 8,
  },
  settingsBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },
});
