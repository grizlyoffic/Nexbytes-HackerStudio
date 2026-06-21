import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { type ActivePanel, useIDE } from "@/context/IDEContext";

interface TabItem {
  id: ActivePanel;
  icon: string;
  label: string;
}

// Top icons: Explorer panels
const TOP_TABS: TabItem[] = [
  { id: "files",    icon: "copy",       label: "Explorer" },
  { id: "device",   icon: "hard-drive", label: "Device Files" },
  { id: "ai",       icon: "cpu",        label: "AI Agent" },
  { id: "git",      icon: "git-branch", label: "Source Control" },
];

// Bottom icons: actions
const BOTTOM_TABS: TabItem[] = [
  { id: "settings", icon: "settings",  label: "Settings" },
];

export default function ActivityBar() {
  const {
    activePanel, setActivePanel,
    sidebarOpen, setSidebarOpen,
    openFiles, colors, toggleTerminal, terminalOpen,
  } = useIDE();

  const modifiedCount = openFiles.filter(f => f.modified).length;

  const handlePress = (panel: ActivePanel) => {
    Haptics.selectionAsync();
    if (activePanel === panel && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setActivePanel(panel);
      setSidebarOpen(true);
    }
  };

  const handleTerminal = () => {
    Haptics.selectionAsync();
    toggleTerminal();
  };

  const renderTab = (tab: TabItem) => {
    const isActive = activePanel === tab.id && sidebarOpen;
    return (
      <TouchableOpacity
        key={tab.id}
        style={[
          styles.tab,
          isActive && [styles.tabActive, { borderLeftColor: colors.accent }],
        ]}
        onPress={() => handlePress(tab.id)}
        activeOpacity={0.7}
      >
        <Feather
          name={tab.icon as any}
          size={21}
          color={isActive ? colors.text : colors.mutedText}
        />
        {tab.id === "git" && modifiedCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>{modifiedCount}</Text>
          </View>
        )}
        {tab.id === "ai" && (
          <View style={[styles.aiDot, { backgroundColor: colors.aiAccent }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.activityBar, borderRightColor: colors.activityBarBorder },
    ]}>
      {/* Top section: panel icons */}
      <View style={styles.topSection}>
        {TOP_TABS.map(renderTab)}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Bottom section: terminal + settings */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.tab,
            terminalOpen && [styles.tabActive, { borderLeftColor: colors.accentGreen }],
          ]}
          onPress={handleTerminal}
          activeOpacity={0.7}
        >
          <Feather
            name="terminal"
            size={21}
            color={terminalOpen ? colors.accentGreen : colors.mutedText}
          />
        </TouchableOpacity>
        {BOTTOM_TABS.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    flexDirection: "column",
    borderRightWidth: 1,
  },
  topSection: {
    flex: 1,
    paddingTop: 6,
    gap: 2,
  },
  bottomSection: {
    paddingBottom: 6,
    gap: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  tab: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
    position: "relative",
  },
  tabActive: {
    borderLeftWidth: 2,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 7,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  aiDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
