import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { type AiProvider, useIDE } from "@/context/IDEContext";
import { THEMES, type ThemeType } from "@/constants/colors";

const THEME_OPTIONS: { id: ThemeType; label: string; desc: string }[] = [
  { id: "dark", label: "Dark+", desc: "Classic VS Code dark theme" },
  { id: "transparent", label: "Glassmorphism", desc: "Frosted glass transparent effect" },
  { id: "light", label: "Light", desc: "VS Code light theme" },
  { id: "hacker", label: "Hacker Green", desc: "Matrix-style green terminal look" },
];

const AI_PROVIDERS: { id: AiProvider; label: string; placeholder: string; modelPlaceholder: string }[] = [
  { id: "gemini", label: "Google Gemini", placeholder: "AIza...", modelPlaceholder: "gemini-2.0-flash" },
  { id: "openai", label: "OpenAI", placeholder: "sk-...", modelPlaceholder: "gpt-4o-mini" },
  { id: "openrouter", label: "OpenRouter", placeholder: "sk-or-...", modelPlaceholder: "openai/gpt-4o-mini" },
  { id: "custom", label: "Custom (OpenAI-compatible)", placeholder: "API Key", modelPlaceholder: "model-name" },
];

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22];
const TAB_SIZES = [2, 4, 8];

export default function SettingsPanel() {
  const {
    colors, theme, setTheme, fontSize, setFontSize,
    wordWrap, setWordWrap, lineNumbers, setLineNumbers,
    autoComplete, setAutoComplete, tabSize, setTabSize, minimap, setMinimap,
    aiProvider, setAiProvider, aiApiKey, setAiApiKey,
    aiBaseUrl, setAiBaseUrl, aiModel, setAiModel,
    githubToken, setGithubToken, githubUsername, setGithubUsername,
    clearAiMessages,
  } = useIDE();

  const [showApiKey, setShowApiKey] = useState(false);
  const [showGitToken, setShowGitToken] = useState(false);

  const Section = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>{title}</Text>
  );

  const Row = ({ label, right }: { label: string; right: React.ReactNode }) => (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      {right}
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.sidebar }]} showsVerticalScrollIndicator={false}>
      {/* APPEARANCE */}
      <Section title="APPEARANCE" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Color Theme</Text>
        {THEME_OPTIONS.map(opt => {
          const themeColors = THEMES[opt.id];
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.themeRow, theme === opt.id && { backgroundColor: colors.selection, borderRadius: 6 }]}
              onPress={() => setTheme(opt.id)}
            >
              <View style={[styles.themePreview, { backgroundColor: themeColors.background, borderColor: themeColors.accent }]}>
                <View style={[styles.themePreviewLine, { backgroundColor: themeColors.keyword }]} />
                <View style={[styles.themePreviewLine, { backgroundColor: themeColors.string, width: 12 }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeLabel, { color: colors.text }]}>{opt.label}</Text>
                <Text style={[styles.themeDesc, { color: colors.mutedText }]}>{opt.desc}</Text>
              </View>
              {theme === opt.id && <Feather name="check" size={15} color={colors.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* EDITOR */}
      <Section title="EDITOR" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Font Size: {fontSize}px</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {FONT_SIZES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, { backgroundColor: s === fontSize ? colors.accent : colors.muted }]}
                onPress={() => setFontSize(s)}
              >
                <Text style={[styles.chipText, { color: s === fontSize ? "#fff" : colors.text }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <Text style={[styles.cardTitle, { color: colors.text, marginTop: 12 }]}>Tab Size</Text>
        <View style={styles.chipRow}>
          {TAB_SIZES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, { backgroundColor: s === tabSize ? colors.accent : colors.muted }]}
              onPress={() => setTabSize(s)}
            >
              <Text style={[styles.chipText, { color: s === tabSize ? "#fff" : colors.text }]}>{s} spaces</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, gap: 0 }]}>
        <Row label="Word Wrap" right={<Switch value={wordWrap} onValueChange={setWordWrap} trackColor={{ true: colors.accent }} />} />
        <Row label="Line Numbers" right={<Switch value={lineNumbers} onValueChange={setLineNumbers} trackColor={{ true: colors.accent }} />} />
        <Row label="Auto Complete" right={<Switch value={autoComplete} onValueChange={setAutoComplete} trackColor={{ true: colors.accent }} />} />
        <Row label="Minimap" right={<Switch value={minimap} onValueChange={setMinimap} trackColor={{ true: colors.accent }} />} />
      </View>

      {/* AI AGENT */}
      <Section title="AI AGENT" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Provider</Text>
        {AI_PROVIDERS.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.providerRow, aiProvider === p.id && { backgroundColor: colors.selection, borderRadius: 6 }]}
            onPress={() => setAiProvider(p.id)}
          >
            <Text style={[styles.providerLabel, { color: colors.text }]}>{p.label}</Text>
            {aiProvider === p.id && <Feather name="check" size={14} color={colors.accent} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, gap: 10 }]}>
        {aiProvider === "custom" && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Base URL</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              value={aiBaseUrl}
              onChangeText={setAiBaseUrl}
              placeholder="https://api.example.com"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}
        <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
          API Key {AI_PROVIDERS.find(p => p.id === aiProvider)?.placeholder ? `(e.g. ${AI_PROVIDERS.find(p => p.id === aiProvider)?.placeholder})` : ""}
        </Text>
        <View style={styles.secretRow}>
          <TextInput
            style={[styles.fieldInputFlex, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            value={aiApiKey}
            onChangeText={setAiApiKey}
            placeholder="Your API key"
            placeholderTextColor={colors.mutedText}
            secureTextEntry={!showApiKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowApiKey(v => !v)}>
            <Feather name={showApiKey ? "eye-off" : "eye"} size={16} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>
          Model (optional, e.g. {AI_PROVIDERS.find(p => p.id === aiProvider)?.modelPlaceholder})
        </Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
          value={aiModel}
          onChangeText={setAiModel}
          placeholder={AI_PROVIDERS.find(p => p.id === aiProvider)?.modelPlaceholder || "model"}
          placeholderTextColor={colors.mutedText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.clearBtn, { borderColor: colors.border }]}
          onPress={() => Alert.alert("Clear AI Chat", "Clear all AI conversation history?", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", style: "destructive", onPress: clearAiMessages },
          ])}
        >
          <Feather name="trash-2" size={13} color={colors.mutedText} />
          <Text style={[styles.clearBtnText, { color: colors.mutedText }]}>Clear AI Chat History</Text>
        </TouchableOpacity>
      </View>

      {/* GITHUB */}
      <Section title="GITHUB" />
      <View style={[styles.card, { backgroundColor: colors.card, gap: 10 }]}>
        <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>GitHub Username</Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
          value={githubUsername}
          onChangeText={setGithubUsername}
          placeholder="username"
          placeholderTextColor={colors.mutedText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Personal Access Token (PAT)</Text>
        <View style={styles.secretRow}>
          <TextInput
            style={[styles.fieldInputFlex, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            value={githubToken}
            onChangeText={setGithubToken}
            placeholder="ghp_..."
            placeholderTextColor={colors.mutedText}
            secureTextEntry={!showGitToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowGitToken(v => !v)}>
            <Feather name={showGitToken ? "eye-off" : "eye"} size={16} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.helpText, { color: colors.mutedText }]}>
          Token needs 'repo' scope. Create at github.com → Settings → Developer settings → PAT
        </Text>
      </View>

      {/* ABOUT */}
      <Section title="ABOUT" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {[
          ["App", "HackerStudio"],
          ["Version", "1.0.0"],
          ["Package", "com.nexbytes.hackerstudio"],
          ["Runtime", "React Native / Expo SDK 54"],
          ["Languages", "Python, JS, TS, Java, Bash, C++, Rust, Go"],
          ["AI Providers", "Gemini, OpenAI, OpenRouter, Custom"],
        ].map(([label, value]) => (
          <View key={label} style={[styles.aboutRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.aboutLabel, { color: colors.mutedText }]}>{label}</Text>
            <Text style={[styles.aboutValue, { color: colors.text }]}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1,
    paddingHorizontal: 14, paddingTop: 16, paddingBottom: 6,
  },
  card: {
    marginHorizontal: 10, borderRadius: 8,
    padding: 12, gap: 6, marginBottom: 2,
  },
  cardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    minWidth: 36, alignItems: "center",
  },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  themeRow: {
    flexDirection: "row", alignItems: "center",
    padding: 8, gap: 10, marginVertical: 1,
  },
  themePreview: {
    width: 36, height: 28, borderRadius: 5, borderWidth: 2,
    padding: 4, gap: 3, overflow: "hidden",
  },
  themePreviewLine: { height: 3, borderRadius: 2, width: 18 },
  themeLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  themeDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  settingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 11, borderBottomWidth: 1,
  },
  settingLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  providerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 9, paddingHorizontal: 6, marginVertical: 1,
  },
  providerLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  fieldInput: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    paddingHorizontal: 10, paddingVertical: 9,
    borderWidth: 1, borderRadius: 6,
  },
  secretRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldInputFlex: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular",
    paddingHorizontal: 10, paddingVertical: 9,
    borderWidth: 1, borderRadius: 6,
  },
  eyeBtn: { padding: 8 },
  clearBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderRadius: 6, marginTop: 4,
  },
  clearBtnText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  helpText: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 2 },
  aboutRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 1,
  },
  aboutLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aboutValue: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", flex: 1, marginLeft: 16 },
});
