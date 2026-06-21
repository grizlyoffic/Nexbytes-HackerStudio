import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useIDE } from "@/context/IDEContext";

import { Directory, File, Paths } from "expo-file-system";

interface FSItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size?: number;
}

const TEXT_EXTS = new Set([
  ".py",".js",".ts",".tsx",".jsx",".java",".sh",".html",".css",".json",
  ".md",".txt",".cpp",".c",".h",".hpp",".rs",".go",".xml",".yaml",".yml",
  ".toml",".ini",".cfg",".conf",".env",".gitignore",".kt",".swift",".dart",".rb",
]);

function isTextFile(name: string) {
  const idx = name.lastIndexOf(".");
  return TEXT_EXTS.has(idx >= 0 ? name.slice(idx).toLowerCase() : "");
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

const QUICK_DIRS = [
  { label: "App Documents", getUri: () => Paths.document.uri },
  { label: "App Cache",     getUri: () => Paths.cache.uri },
  { label: "Downloads",     getUri: () => "file:///storage/emulated/0/Download/" },
  { label: "Device Root",   getUri: () => "file:///storage/emulated/0/" },
  { label: "DCIM",          getUri: () => "file:///storage/emulated/0/DCIM/" },
];

async function listDirectory(uri: string): Promise<FSItem[]> {
  const dir = new Directory(uri);
  const entries = await dir.list();
  const items: FSItem[] = entries.map((entry: Directory | File) => {
    const isDir = entry instanceof Directory;
    const itemUri = entry.uri;
    const parts = itemUri.replace(/\/$/, "").split("/");
    const name = parts[parts.length - 1] ?? itemUri;
    return { name, uri: itemUri, isDirectory: isDir };
  });
  return [...items.filter(i => i.isDirectory), ...items.filter(i => !i.isDirectory)]
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function readTextFile(uri: string): Promise<string> {
  const f = new File(uri);
  return await f.text();
}

async function collectTextFiles(
  uri: string,
  baseName: string,
  depth = 0,
  maxFiles = 80
): Promise<{ name: string; content: string; path: string }[]> {
  if (depth > 4) return [];
  try {
    const items = await listDirectory(uri);
    const results: { name: string; content: string; path: string }[] = [];
    for (const item of items) {
      if (results.length >= maxFiles) break;
      if (item.isDirectory) {
        const sub = await collectTextFiles(item.uri, item.name, depth + 1, maxFiles - results.length);
        results.push(...sub);
      } else if (isTextFile(item.name)) {
        try {
          const content = await readTextFile(item.uri);
          results.push({ name: item.name, content, path: `/${baseName}/${item.name}` });
        } catch {}
      }
    }
    return results;
  } catch {
    return [];
  }
}

export default function DeviceExplorer() {
  const { colors, currentProject, createFile, importFolderAsProject, setActivePanel } = useIDE();

  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [currentDirName, setCurrentDirName] = useState<string>("");
  const [items, setItems] = useState<FSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; uri: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const browseDir = useCallback(async (uri: string, crumbName: string, replace = false) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const list = await listDirectory(uri);
      setItems(list);
      setCurrentUri(uri);
      setCurrentDirName(crumbName);
      setBreadcrumbs(prev => {
        return replace ? [{ name: crumbName, uri }] : [...prev, { name: crumbName, uri }];
      });
    } catch (e: any) {
      Alert.alert("Cannot Open", e?.message ?? "Directory not accessible on this device.");
    }
    setLoading(false);
  }, []);

  const goBack = useCallback(() => {
    if (breadcrumbs.length <= 1) {
      setCurrentUri(null);
      setBreadcrumbs([]);
      setItems([]);
      return;
    }
    const prev = breadcrumbs[breadcrumbs.length - 2];
    setBreadcrumbs(b => b.slice(0, -1));
    setCurrentUri(prev.uri);
    setCurrentDirName(prev.name);
    setLoading(true);
    listDirectory(prev.uri).then(list => {
      setItems(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [breadcrumbs]);

  const toggleSelect = useCallback((uri: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => {
      const next = new Set(prev);
      next.has(uri) ? next.delete(uri) : next.add(uri);
      return next;
    });
  }, []);

  const importSelected = useCallback(async () => {
    if (!currentProject) {
      Alert.alert("No Project", "Create a project in the Explorer tab first.");
      return;
    }
    let ok = 0;
    for (const uri of selected) {
      const item = items.find(i => i.uri === uri);
      if (!item || item.isDirectory) continue;
      try {
        createFile(item.name, "text");
        ok++;
      } catch {}
    }
    Alert.alert("Done", `${ok} file(s) imported into "${currentProject.name}".`);
    setSelected(new Set());
  }, [selected, items, currentProject, createFile]);

  const openFolderAsProject = useCallback(async () => {
    if (!currentUri || !currentDirName) return;
    Alert.alert(
      "Open as Project",
      `Import all files from "${currentDirName}" as a new project? (up to 80 text files)`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open",
          onPress: async () => {
            setImporting(true);
            try {
              const files = await collectTextFiles(currentUri, currentDirName);
              if (files.length === 0) {
                Alert.alert("No Files", "No readable text files found in this folder.");
                return;
              }
              importFolderAsProject(currentDirName, files);
              Alert.alert("Done", `Opened "${currentDirName}" as project with ${files.length} file(s).`);
              setActivePanel("files");
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to import folder.");
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  }, [currentUri, currentDirName, importFolderAsProject, setActivePanel]);

  if (!currentUri) {
    return (
      <View style={[styles.container, { backgroundColor: colors.sidebar }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Feather name="hard-drive" size={14} color={colors.mutedText} />
          <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>DEVICE FILES</Text>
        </View>

        <Text style={[styles.groupLabel, { color: colors.mutedText }]}>Quick Access</Text>

        {QUICK_DIRS.map(dir => (
          <TouchableOpacity
            key={dir.label}
            style={[styles.quickRow, { borderBottomColor: colors.border }]}
            onPress={() => browseDir(dir.getUri(), dir.label, true)}
            activeOpacity={0.7}
          >
            <Feather name="folder" size={18} color="#f7bd2e" />
            <Text style={[styles.quickLabel, { color: colors.text }]}>{dir.label}</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedText} />
          </TouchableOpacity>
        ))}

        {Platform.OS === "android" && (
          <View style={[styles.infoBox, { backgroundColor: colors.accent + "18", borderColor: colors.accent + "44" }]}>
            <Feather name="info" size={13} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.mutedText }]}>
              "Downloads" and "Device Root" require Android storage permissions. Use "App Documents" for app-specific storage.
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebar }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={16} color={colors.mutedText} />
        </TouchableOpacity>
        <Text style={[styles.crumbText, { color: colors.text }]} numberOfLines={1}>
          {breadcrumbs[breadcrumbs.length - 1]?.name ?? "Files"}
        </Text>
        {selected.size > 0 && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={importSelected}
          >
            <Feather name="download" size={12} color="#fff" />
            <Text style={styles.actionBtnTxt}>Import {selected.size}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.pathBar, { backgroundColor: colors.muted }]}>
        <Text style={[styles.pathTxt, { color: colors.mutedText }]} numberOfLines={1}>
          {currentUri.replace("file:///storage/emulated/0", "~").replace(Paths.document.uri, "~/app/")}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.openProjectBtn, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "55" }]}
        onPress={openFolderAsProject}
        disabled={importing}
      >
        <Feather name="folder-plus" size={15} color={colors.accent} />
        <Text style={[styles.openProjectTxt, { color: colors.accent }]}>
          {importing ? "Importing..." : `Open "${currentDirName}" as Project`}
        </Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <Text style={[styles.statusTxt, { color: colors.mutedText }]}>Loading…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={28} color={colors.mutedText} />
          <Text style={[styles.statusTxt, { color: colors.mutedText }]}>(empty folder)</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.uri}
          renderItem={({ item }) => {
            const isSel = selected.has(item.uri);
            const importable = !item.isDirectory && isTextFile(item.name);
            return (
              <TouchableOpacity
                style={[
                  styles.fsRow,
                  { borderBottomColor: colors.border },
                  isSel && { backgroundColor: colors.selection },
                ]}
                onPress={() => {
                  if (item.isDirectory) {
                    browseDir(item.uri, item.name);
                  } else if (importable) {
                    toggleSelect(item.uri);
                  }
                }}
                onLongPress={() => importable && toggleSelect(item.uri)}
                activeOpacity={0.75}
              >
                <Feather
                  name={item.isDirectory ? "folder" : "file-text"}
                  size={16}
                  color={item.isDirectory ? "#f7bd2e" : colors.mutedText}
                />
                <View style={styles.fsInfo}>
                  <Text style={[styles.fsName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  {item.size !== undefined && (
                    <Text style={[styles.fsSize, { color: colors.mutedText }]}>{formatSize(item.size)}</Text>
                  )}
                </View>
                {isSel
                  ? <Feather name="check-circle" size={16} color={colors.accent} />
                  : item.isDirectory
                    ? <Feather name="chevron-right" size={14} color={colors.mutedText} />
                    : !importable
                      ? <Text style={[styles.binBadge, { color: colors.mutedText }]}>binary</Text>
                      : null
                }
              </TouchableOpacity>
            );
          }}
        />
      )}

      {selected.size > 0 && (
        <TouchableOpacity
          style={[styles.importBar, { backgroundColor: colors.accent }]}
          onPress={importSelected}
        >
          <Feather name="download" size={16} color="#fff" />
          <Text style={styles.importBarTxt}>Import {selected.size} file{selected.size !== 1 ? "s" : ""} into Project</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1,
  },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, flex: 1 },
  backBtn: { padding: 4 },
  crumbText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5,
  },
  actionBtnTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_500Medium" },
  pathBar: { paddingHorizontal: 12, paddingVertical: 4 },
  pathTxt: { fontSize: 10, fontFamily: "monospace" },
  openProjectBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 10, marginVertical: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1,
  },
  openProjectTxt: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  groupLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5,
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
  },
  quickRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1,
  },
  quickLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    margin: 12, padding: 10, borderRadius: 8, borderWidth: 1,
  },
  infoText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  statusTxt: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fsRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
  },
  fsInfo: { flex: 1 },
  fsName: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fsSize: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  binBadge: { fontSize: 10, fontFamily: "Inter_400Regular" },
  importBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12,
  },
  importBarTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
