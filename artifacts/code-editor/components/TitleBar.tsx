import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useIDE } from "@/context/IDEContext";

export default function TitleBar() {
  const { currentProject, activeFile, colors, createProject, projects, selectProject } = useIDE();
  const [showProjectInput, setShowProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProject(newProjectName.trim());
    setNewProjectName("");
    setShowProjectInput(false);
  };

  const handleProjectPress = () => {
    if (projects.length === 0) {
      setShowProjectInput(true);
      return;
    }
    const options = [
      ...projects.map((p) => ({
        text: p.name,
        onPress: () => selectProject(p),
      })),
      { text: "New Project", onPress: () => setShowProjectInput(true) },
      { text: "Cancel", onPress: () => {} },
    ];
    Alert.alert("Projects", "Select or create a project", options);
  };

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.titleBar, paddingTop: topPad }]}>
      {showProjectInput ? (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={newProjectName}
            onChangeText={setNewProjectName}
            placeholder="Project name..."
            placeholderTextColor={colors.mutedText}
            autoFocus
            onSubmitEditing={handleCreateProject}
          />
          <TouchableOpacity onPress={handleCreateProject} style={styles.confirmBtn}>
            <Feather name="check" size={16} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowProjectInput(false)} style={styles.confirmBtn}>
            <Feather name="x" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.row}>
          <TouchableOpacity style={styles.projectSection} onPress={handleProjectPress}>
            <Feather name="folder" size={14} color={colors.accent} />
            <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
              {currentProject ? currentProject.name : "Open Folder"}
            </Text>
            <Feather name="chevron-down" size={12} color={colors.mutedText} />
          </TouchableOpacity>

          <View style={styles.breadcrumb}>
            {activeFile && (
              <>
                <Feather name="chevron-right" size={12} color={colors.mutedText} />
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                  {activeFile.name}
                </Text>
                {activeFile.modified && (
                  <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                )}
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  projectSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  projectName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    maxWidth: 120,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    marginLeft: 4,
  },
  fileName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 4,
  },
  confirmBtn: {
    padding: 4,
  },
});
