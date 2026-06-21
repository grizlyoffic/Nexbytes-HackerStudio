import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { type SupportedLanguage, useIDE } from "@/context/IDEContext";

const LANGUAGES: { id: SupportedLanguage; label: string; icon: string; color: string; ext: string }[] = [
  { id: "python",     label: "Python",      icon: "layers",    color: "#3776ab", ext: ".py"  },
  { id: "javascript", label: "JavaScript",  icon: "zap",       color: "#f7df1e", ext: ".js"  },
  { id: "typescript", label: "TypeScript",  icon: "zap",       color: "#3178c6", ext: ".ts"  },
  { id: "java",       label: "Java",        icon: "coffee",    color: "#ed8b00", ext: ".java"},
  { id: "bash",       label: "Bash / Shell",icon: "terminal",  color: "#4ec9b0", ext: ".sh"  },
  { id: "html",       label: "HTML",        icon: "globe",     color: "#e34c26", ext: ".html"},
  { id: "css",        label: "CSS",         icon: "droplet",   color: "#264de4", ext: ".css" },
  { id: "json",       label: "JSON",        icon: "database",  color: "#cbcb41", ext: ".json"},
  { id: "cpp",        label: "C++",         icon: "cpu",       color: "#004482", ext: ".cpp" },
  { id: "rust",       label: "Rust",        icon: "anchor",    color: "#ce422b", ext: ".rs"  },
  { id: "go",         label: "Go",          icon: "box",       color: "#00acd7", ext: ".go"  },
  { id: "text",       label: "Plain Text",  icon: "file-text", color: "#858585", ext: ".txt" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, language: SupportedLanguage) => void;
  onCreateFolder?: (name: string) => void;
}

export default function NewFileModal({ visible, onClose, onCreate, onCreateFolder }: Props) {
  const { colors } = useIDE();
  const [tab, setTab] = useState<"file" | "folder">("file");
  const [name, setName] = useState("");
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("python");
  const [useCustomExt, setUseCustomExt] = useState(false);
  const [customExt, setCustomExt] = useState(".txt");

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (tab === "folder") {
      onCreateFolder?.(trimmed);
      setName("");
      return;
    }

    if (useCustomExt) {
      const ext = customExt.startsWith(".") ? customExt : "." + customExt;
      const finalName = trimmed.includes(".") ? trimmed : trimmed + ext;
      onCreate(finalName, "text");
    } else {
      onCreate(trimmed, selectedLang);
    }
    setName("");
    setCustomExt(".txt");
    setUseCustomExt(false);
  };

  const currentLang = LANGUAGES.find(l => l.id === selectedLang);
  const previewName = name.trim()
    ? (name.includes(".")
        ? name
        : name + (useCustomExt ? (customExt.startsWith(".") ? customExt : "." + customExt) : (currentLang?.ext ?? "")))
    : (useCustomExt ? "filename" + customExt : "filename" + (currentLang?.ext ?? ""));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>New</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <View style={[styles.tabRow, { backgroundColor: colors.muted, borderRadius: 6 }]}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === "file" && { backgroundColor: colors.accent, borderRadius: 5 }]}
              onPress={() => setTab("file")}
            >
              <Feather name="file-plus" size={13} color={tab === "file" ? "#fff" : colors.mutedText} />
              <Text style={[styles.tabText, { color: tab === "file" ? "#fff" : colors.mutedText }]}>File</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === "folder" && { backgroundColor: colors.accent, borderRadius: 5 }]}
              onPress={() => setTab("folder")}
            >
              <Feather name="folder-plus" size={13} color={tab === "folder" ? "#fff" : colors.mutedText} />
              <Text style={[styles.tabText, { color: tab === "folder" ? "#fff" : colors.mutedText }]}>Folder</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.mutedText }]}>
            {tab === "folder" ? "Folder Name" : "File Name"}
          </Text>
          <View style={styles.nameRow}>
            <TextInput
              style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              value={name}
              onChangeText={setName}
              placeholder={tab === "folder" ? "my-folder" : "main"}
              placeholderTextColor={colors.mutedText}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              onSubmitEditing={handleCreate}
            />
          </View>

          {tab === "file" && (
            <>
              <Text style={[styles.previewText, { color: colors.mutedText }]}>
                → {previewName}
              </Text>

              <View style={styles.extToggleRow}>
                <TouchableOpacity
                  style={[styles.extToggle, !useCustomExt && { backgroundColor: colors.selection }]}
                  onPress={() => setUseCustomExt(false)}
                >
                  <Text style={[styles.extToggleText, { color: !useCustomExt ? colors.accent : colors.mutedText }]}>
                    Choose Language
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.extToggle, useCustomExt && { backgroundColor: colors.selection }]}
                  onPress={() => setUseCustomExt(true)}
                >
                  <Text style={[styles.extToggleText, { color: useCustomExt ? colors.accent : colors.mutedText }]}>
                    Custom Extension
                  </Text>
                </TouchableOpacity>
              </View>

              {useCustomExt ? (
                <View>
                  <Text style={[styles.label, { color: colors.mutedText }]}>Extension (e.g. .kt, .swift, .env)</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.accent, backgroundColor: colors.input }]}
                    value={customExt}
                    onChangeText={setCustomExt}
                    placeholder=".txt"
                    placeholderTextColor={colors.mutedText}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>
              ) : (
                <>
                  <Text style={[styles.label, { color: colors.mutedText }]}>Language</Text>
                  <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
                    {LANGUAGES.map((lang) => (
                      <TouchableOpacity
                        key={lang.id}
                        style={[
                          styles.langRow,
                          selectedLang === lang.id && { backgroundColor: colors.selection, borderRadius: 4 },
                        ]}
                        onPress={() => setSelectedLang(lang.id)}
                      >
                        <Feather name={lang.icon as any} size={16} color={lang.color} />
                        <Text style={[styles.langLabel, { color: colors.text }]}>{lang.label}</Text>
                        <Text style={[styles.extHint, { color: colors.mutedText }]}>{lang.ext}</Text>
                        {selectedLang === lang.id && (
                          <Feather name="check" size={14} color={colors.accent} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.muted }]}
              onPress={onClose}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accent }]}
              onPress={handleCreate}
            >
              <Feather name={tab === "folder" ? "folder-plus" : "file-plus"} size={14} color="#fff" />
              <Text style={[styles.btnText, { color: "#fff" }]}>
                Create {tab === "folder" ? "Folder" : "File"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  modal: { width: "90%", maxHeight: "88%", borderRadius: 10, padding: 18, gap: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  tabRow: { flexDirection: "row", padding: 3, gap: 3 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 7 },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textTransform: "uppercase" },
  nameRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { fontSize: 14, fontFamily: "Inter_400Regular", paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 6 },
  previewText: { fontSize: 11, fontFamily: "monospace", marginTop: -4 },
  extToggleRow: { flexDirection: "row", gap: 6 },
  extToggle: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 5 },
  extToggleText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  langList: { maxHeight: 180 },
  langRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 8, gap: 10 },
  langLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  extHint: { fontSize: 11, fontFamily: "monospace" },
  btnRow: { flexDirection: "row", gap: 10, justifyContent: "flex-end", marginTop: 4 },
  btn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 6 },
  btnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
