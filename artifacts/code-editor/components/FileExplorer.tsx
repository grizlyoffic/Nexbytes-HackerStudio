import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { type FileItem, type FolderItem, type SupportedLanguage, useIDE } from "@/context/IDEContext";
import NewFileModal from "./NewFileModal";

const FILE_ICONS: Record<string, string> = {
  ".py": "layers", ".js": "zap", ".ts": "zap", ".tsx": "zap",
  ".jsx": "zap", ".java": "coffee", ".sh": "terminal",
  ".html": "globe", ".css": "droplet", ".json": "database",
  ".md": "file-text", ".txt": "file-text", ".cpp": "cpu",
  ".c": "cpu", ".rs": "anchor", ".go": "box", ".kt": "zap",
  ".swift": "zap", ".dart": "zap", ".rb": "zap",
};

const FILE_COLORS: Record<string, string> = {
  ".py": "#3776ab", ".js": "#f7df1e", ".ts": "#3178c6", ".tsx": "#61dafb",
  ".jsx": "#61dafb", ".java": "#ed8b00", ".sh": "#4ec9b0", ".html": "#e34c26",
  ".css": "#264de4", ".json": "#cbcb41", ".md": "#083fa1", ".cpp": "#004482",
  ".rs": "#ce422b", ".go": "#00acd7", ".kt": "#7f52ff", ".swift": "#fa7343",
  ".dart": "#0175c2", ".rb": "#cc342d",
};

function getExt(name: string) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx) : "";
}

function FileIcon({ name, size = 15 }: { name: string; size?: number }) {
  const ext = getExt(name);
  return <Feather name={(FILE_ICONS[ext] ?? "file") as any} size={size} color={FILE_COLORS[ext] ?? "#858585"} />;
}

interface ContextMenu {
  visible: boolean;
  file: FileItem | null;
  x: number;
  y: number;
}

interface FolderContextMenu {
  visible: boolean;
  folder: FolderItem | null;
}

export default function FileExplorer() {
  const {
    currentProject, projects, openFiles, activeFile, colors,
    openFile, deleteFile, createFile, createFolder, deleteFolder, renameFolder,
    createProject, renameFile, duplicateFile, copyFile, pasteFile,
    clipboardFile, selectProject,
  } = useIDE();

  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, file: null, x: 0, y: 0 });
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [folderCtx, setFolderCtx] = useState<FolderContextMenu>({ visible: false, folder: null });
  const [renamingFolder, setRenamingFolder] = useState<FolderItem | null>(null);
  const [renameFolderVal, setRenameFolderVal] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(undefined);

  const handleFilePress = (file: FileItem) => {
    Haptics.selectionAsync();
    openFile(file);
  };

  const handleLongPress = (file: FileItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextMenu({ visible: true, file, x: 0, y: 0 });
  };

  const closeContext = () => setContextMenu({ visible: false, file: null, x: 0, y: 0 });

  const handleContextAction = (action: string) => {
    const file = contextMenu.file!;
    closeContext();
    switch (action) {
      case "open": openFile(file); break;
      case "rename":
        setRenameTarget(file);
        setRenameValue(file.name);
        break;
      case "copy": copyFile(file); break;
      case "duplicate": duplicateFile(file.id); break;
      case "delete":
        Alert.alert("Delete File", `Delete "${file.name}"?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteFile(file.id) },
        ]);
        break;
    }
  };

  const handleCreateFile = (name: string, language: SupportedLanguage) => {
    const file = createFile(name, language, activeFolderId);
    if (file) openFile(file);
    setShowNewFile(false);
    setActiveFolderId(undefined);
  };

  const handleCreateFolder = (name: string) => {
    createFolder(name);
    setShowNewFile(false);
    setActiveFolderId(undefined);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProject(newProjectName.trim());
    setNewProjectName("");
    setShowNewProject(false);
  };

  const handleRenameConfirm = () => {
    if (!renameTarget || !renameValue.trim()) return;
    renameFile(renameTarget.id, renameValue.trim());
    setRenameTarget(null);
  };

  const toggleFolder = (id: string) => {
    Haptics.selectionAsync();
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!currentProject) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.sidebar }]}>
        {showNewProject ? (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>New Project</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="project-name"
              placeholderTextColor={colors.mutedText}
              autoFocus
              onSubmitEditing={handleCreateProject}
            />
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleCreateProject}>
                <Text style={styles.btnWhite}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.muted }]} onPress={() => setShowNewProject(false)}>
                <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Feather name="folder" size={44} color={colors.mutedText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Project Open</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedText }]}>Create a project to start coding</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={() => setShowNewProject(true)}>
              <Feather name="plus" size={15} color="#fff" />
              <Text style={styles.btnWhite}>New Project</Text>
            </TouchableOpacity>
            {projects.length > 0 && (
              <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={() => setShowProjectList(true)}>
                <Feather name="folder" size={15} color={colors.mutedText} />
                <Text style={[styles.btnText, { color: colors.mutedText }]}>Open Existing</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  }

  const folders = currentProject.folders ?? [];
  const files = currentProject.files;
  const rootFiles = files.filter(f => !f.folderId);

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebar }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>EXPLORER</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => { setActiveFolderId(undefined); setShowNewFile(true); }}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="file-plus" size={15} color={colors.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNewProject(true)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="layers" size={15} color={colors.mutedText} />
          </TouchableOpacity>
          {clipboardFile && (
            <TouchableOpacity onPress={pasteFile} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="clipboard" size={15} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Project row */}
      <TouchableOpacity
        style={[styles.projectRow, { borderBottomColor: colors.border }]}
        onPress={() => setShowProjectList(true)}
      >
        <Feather name="chevron-down" size={13} color={colors.mutedText} />
        <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
          {currentProject.name.toUpperCase()}
        </Text>
        <Feather name="more-horizontal" size={13} color={colors.mutedText} />
      </TouchableOpacity>

      {files.length === 0 && folders.length === 0 ? (
        <TouchableOpacity style={styles.addFirstFile} onPress={() => setShowNewFile(true)}>
          <Feather name="plus-circle" size={14} color={colors.accent} />
          <Text style={[styles.addFileText, { color: colors.accent }]}>Create first file</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={[
            ...folders.map(f => ({ type: "folder" as const, data: f })),
            ...rootFiles.map(f => ({ type: "file" as const, data: f })),
          ]}
          keyExtractor={item => item.data.id}
          renderItem={({ item }) => {
            if (item.type === "folder") {
              const folder = item.data as FolderItem;
              const folderFiles = files.filter(f => f.folderId === folder.id);
              const isCollapsed = collapsedFolders.has(folder.id);
              return (
                <>
                  <TouchableOpacity
                    style={[styles.folderRow, { borderBottomColor: colors.border }]}
                    onPress={() => toggleFolder(folder.id)}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setFolderCtx({ visible: true, folder });
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={isCollapsed ? "chevron-right" : "chevron-down"}
                      size={12}
                      color={colors.mutedText}
                    />
                    <Feather name="folder" size={15} color="#f7bd2e" />
                    <Text style={[styles.folderName, { color: colors.text }]} numberOfLines={1}>
                      {folder.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.folderAddBtn}
                      onPress={() => { setActiveFolderId(folder.id); setShowNewFile(true); }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather name="file-plus" size={12} color={colors.mutedText} />
                    </TouchableOpacity>
                    <Text style={[styles.folderCount, { color: colors.mutedText }]}>
                      {folderFiles.length}
                    </Text>
                  </TouchableOpacity>
                  {!isCollapsed && folderFiles.map(file => {
                    const isActive = activeFile?.id === file.id;
                    const openedFile = openFiles.find(f => f.id === file.id);
                    return (
                      <TouchableOpacity
                        key={file.id}
                        style={[
                          styles.fileRow,
                          styles.fileRowIndented,
                          isActive && { backgroundColor: colors.selection },
                        ]}
                        onPress={() => handleFilePress(file)}
                        onLongPress={() => handleLongPress(file)}
                        delayLongPress={400}
                        activeOpacity={0.7}
                      >
                        <FileIcon name={file.name} />
                        <Text style={[styles.fileName, { color: openedFile ? colors.text : colors.mutedText }]} numberOfLines={1}>
                          {file.name}
                        </Text>
                        {openedFile?.modified && <View style={[styles.modDot, { backgroundColor: colors.accent }]} />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              );
            }
            const file = item.data as FileItem;
            const isActive = activeFile?.id === file.id;
            const openedFile = openFiles.find(f => f.id === file.id);
            return (
              <TouchableOpacity
                style={[styles.fileRow, isActive && { backgroundColor: colors.selection }]}
                onPress={() => handleFilePress(file)}
                onLongPress={() => handleLongPress(file)}
                delayLongPress={400}
                activeOpacity={0.7}
              >
                <FileIcon name={file.name} />
                <Text style={[styles.fileName, { color: openedFile ? colors.text : colors.mutedText }]} numberOfLines={1}>
                  {file.name}
                </Text>
                {openedFile?.modified && <View style={[styles.modDot, { backgroundColor: colors.accent }]} />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* File context menu */}
      <Modal transparent visible={contextMenu.visible} onRequestClose={closeContext} animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeContext}>
          <View style={[styles.contextMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.contextTitle, { color: colors.mutedText, borderBottomColor: colors.border }]} numberOfLines={1}>
              {contextMenu.file?.name}
            </Text>
            {[
              { action: "open", icon: "external-link", label: "Open" },
              { action: "rename", icon: "edit-2", label: "Rename" },
              { action: "copy", icon: "copy", label: "Copy" },
              { action: "duplicate", icon: "files", label: "Duplicate" },
              { action: "delete", icon: "trash-2", label: "Delete", danger: true },
            ].map(it => (
              <TouchableOpacity key={it.action} style={styles.contextItem} onPress={() => handleContextAction(it.action)}>
                <Feather name={it.icon as any} size={15} color={it.danger ? colors.error : colors.text} />
                <Text style={[styles.contextLabel, { color: it.danger ? colors.error : colors.text }]}>{it.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Folder context menu */}
      <Modal transparent visible={folderCtx.visible} onRequestClose={() => setFolderCtx({ visible: false, folder: null })} animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setFolderCtx({ visible: false, folder: null })}>
          <View style={[styles.contextMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.contextTitle, { color: colors.mutedText, borderBottomColor: colors.border }]} numberOfLines={1}>
              📁 {folderCtx.folder?.name}
            </Text>
            <TouchableOpacity style={styles.contextItem} onPress={() => {
              setFolderCtx({ visible: false, folder: null });
              setActiveFolderId(folderCtx.folder?.id);
              setShowNewFile(true);
            }}>
              <Feather name="file-plus" size={15} color={colors.text} />
              <Text style={[styles.contextLabel, { color: colors.text }]}>New File in Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contextItem} onPress={() => {
              setFolderCtx(prev => { setRenamingFolder(prev.folder); setRenameFolderVal(prev.folder?.name ?? ""); return { visible: false, folder: null }; });
            }}>
              <Feather name="edit-2" size={15} color={colors.text} />
              <Text style={[styles.contextLabel, { color: colors.text }]}>Rename Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contextItem} onPress={() => {
              const f = folderCtx.folder;
              setFolderCtx({ visible: false, folder: null });
              if (f) Alert.alert("Delete Folder", `Delete "${f.name}" and all its files?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteFolder(f.id) },
              ]);
            }}>
              <Feather name="trash-2" size={15} color={colors.error} />
              <Text style={[styles.contextLabel, { color: colors.error }]}>Delete Folder</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename file modal */}
      <Modal transparent visible={!!renameTarget} onRequestClose={() => setRenameTarget(null)} animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setRenameTarget(null)}>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Rename File</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={handleRenameConfirm}
            />
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleRenameConfirm}>
                <Text style={styles.btnWhite}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.muted }]} onPress={() => setRenameTarget(null)}>
                <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename folder modal */}
      <Modal transparent visible={!!renamingFolder} onRequestClose={() => setRenamingFolder(null)} animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setRenamingFolder(null)}>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Rename Folder</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              value={renameFolderVal}
              onChangeText={setRenameFolderVal}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={() => { if (renamingFolder && renameFolderVal.trim()) { renameFolder(renamingFolder.id, renameFolderVal.trim()); setRenamingFolder(null); } }}
            />
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => {
                if (renamingFolder && renameFolderVal.trim()) { renameFolder(renamingFolder.id, renameFolderVal.trim()); setRenamingFolder(null); }
              }}>
                <Text style={styles.btnWhite}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.muted }]} onPress={() => setRenamingFolder(null)}>
                <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Project list modal */}
      <Modal transparent visible={showProjectList} onRequestClose={() => setShowProjectList(false)} animationType="slide">
        <View style={[styles.overlay, { justifyContent: "flex-end" }]}>
          <View style={[styles.projectListCard, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Projects</Text>
            {projects.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.projectItem,
                  { borderBottomColor: colors.border },
                  currentProject?.id === p.id && { backgroundColor: colors.selection },
                ]}
                onPress={() => { selectProject(p); setShowProjectList(false); }}
              >
                <Feather name="folder" size={16} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.projectItemName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.projectItemMeta, { color: colors.mutedText }]}>
                    {p.files.length} files · {new Date(p.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {currentProject?.id === p.id && <Feather name="check" size={14} color={colors.accent} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.newProjectRow, { borderTopColor: colors.border }]}
              onPress={() => { setShowProjectList(false); setShowNewProject(true); }}
            >
              <Feather name="plus" size={15} color={colors.accent} />
              <Text style={[styles.newProjectText, { color: colors.accent }]}>New Project</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New project modal */}
      {showNewProject && (
        <Modal transparent visible animationType="fade">
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowNewProject(false)}>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>New Project</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
                value={newProjectName}
                onChangeText={setNewProjectName}
                placeholder="project-name"
                placeholderTextColor={colors.mutedText}
                autoFocus
                onSubmitEditing={handleCreateProject}
              />
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleCreateProject}>
                  <Text style={styles.btnWhite}>Create</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.muted }]} onPress={() => setShowNewProject(false)}>
                  <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <NewFileModal
        visible={showNewFile}
        onClose={() => { setShowNewFile(false); setActiveFolderId(undefined); }}
        onCreate={handleCreateFile}
        onCreateFolder={handleCreateFolder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1,
  },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  headerActions: { flexDirection: "row", gap: 10 },
  iconBtn: { padding: 2 },
  projectRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1,
  },
  projectName: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, flex: 1 },
  folderRow: {
    flexDirection: "row", alignItems: "center",
    paddingLeft: 10, paddingRight: 10, paddingVertical: 7, gap: 6, borderBottomWidth: 1,
  },
  folderName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  folderAddBtn: { padding: 4 },
  folderCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  fileRow: {
    flexDirection: "row", alignItems: "center",
    paddingLeft: 20, paddingRight: 10, paddingVertical: 7, gap: 8,
  },
  fileRowIndented: { paddingLeft: 36 },
  fileName: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  modDot: { width: 6, height: 6, borderRadius: 3 },
  addFirstFile: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, margin: 10, borderRadius: 6,
  },
  addFileText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, marginTop: 8,
  },
  outlineBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  contextMenu: { width: 230, borderRadius: 10, borderWidth: 1, overflow: "hidden", paddingVertical: 4 },
  contextTitle: {
    fontSize: 11, fontFamily: "Inter_400Regular",
    paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1,
  },
  contextItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  contextLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  formCard: { width: "85%", borderRadius: 10, borderWidth: 1, padding: 18, gap: 12 },
  formTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  textInput: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderRadius: 6,
  },
  btnRow: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  btnWhite: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  btnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  projectListCard: {
    width: "100%", borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: 24, maxHeight: "80%",
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#666", alignSelf: "center", marginVertical: 10 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold", paddingHorizontal: 16, marginBottom: 8 },
  projectItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  projectItemName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  projectItemMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  newProjectRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1,
  },
  newProjectText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
