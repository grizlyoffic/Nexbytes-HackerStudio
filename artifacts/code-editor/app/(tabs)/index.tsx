import React, { useCallback, useEffect } from "react";
import {
  BackHandler,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActivityBar from "@/components/ActivityBar";
import AIPanel from "@/components/AIPanel";
import CodeEditor from "@/components/CodeEditor";
import DeviceExplorer from "@/components/DeviceExplorer";
import FileExplorer from "@/components/FileExplorer";
import GitPanel from "@/components/GitPanel";
import SettingsPanel from "@/components/SettingsPanel";
import TerminalPanel from "@/components/TerminalPanel";
import { useIDE } from "@/context/IDEContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(270, SCREEN_WIDTH * 0.72);

export default function IDEScreen() {
  const { activePanel, terminalOpen, colors, sidebarOpen, setSidebarOpen, toggleTerminal } = useIDE();
  const insets = useSafeAreaInsets();

  // ── Android back button: close sidebar/terminal instead of exiting ──
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (terminalOpen) { toggleTerminal(); return true; }
      if (sidebarOpen) { setSidebarOpen(false); return true; }
      return true; // always prevent exit
    });
    return () => handler.remove();
  }, [terminalOpen, sidebarOpen, toggleTerminal, setSidebarOpen]);

  const renderSidePanel = useCallback(() => {
    switch (activePanel) {
      case "files":   return <FileExplorer />;
      case "device":  return <DeviceExplorer />;
      case "ai":      return <AIPanel />;
      case "git":     return <GitPanel />;
      case "settings":return <SettingsPanel />;
      default:        return null;
    }
  }, [activePanel]);

  const showSide = sidebarOpen && activePanel !== "editor" && activePanel !== "terminal";
  const showTerminalFull = activePanel === "terminal" && !sidebarOpen;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.body}>
        {/* Left Activity Bar */}
        <ActivityBar />

        {/* Workspace: side panel + editor */}
        <View style={styles.workspace}>
          {showSide && (
            <View style={[styles.sidebar, {
              width: SIDEBAR_WIDTH,
              backgroundColor: colors.sidebar,
              borderRightColor: colors.sidebarBorder,
            }]}>
              {renderSidePanel()}
            </View>
          )}

          {showTerminalFull ? (
            <View style={styles.fill}>
              <TerminalPanel />
            </View>
          ) : (
            <View style={styles.fill}>
              <View style={[styles.fill, terminalOpen && { flex: 2 }]}>
                <CodeEditor />
              </View>
              {terminalOpen && (
                <View style={[styles.termPane, { borderTopColor: colors.border }]}>
                  <TerminalPanel />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, flexDirection: "row" },
  workspace: { flex: 1, flexDirection: "row" },
  sidebar: { borderRightWidth: 1 },
  fill: { flex: 1 },
  termPane: { height: 280, borderTopWidth: 1 },
});
