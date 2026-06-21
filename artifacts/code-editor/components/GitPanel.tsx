import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useIDE } from "@/context/IDEContext";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  updated_at: string;
}

interface GithubUser {
  login: string;
  name: string;
  avatar_url: string;
  public_repos: number;
}

export default function GitPanel() {
  const { colors, githubToken, githubUsername, setGithubToken, setGithubUsername, currentProject, activeFile } =
    useIDE();
  const [token, setToken] = useState(githubToken);
  const [username, setUsername] = useState(githubUsername);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState<GithubUser | null>(null);
  const [view, setView] = useState<"login" | "repos" | "push">("login");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [commitMessage, setCommitMessage] = useState("Update via VS Code Mobile");
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState("");

  useEffect(() => {
    if (githubToken) {
      fetchUser(githubToken);
    }
  }, []);

  const fetchUser = async (pat: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${pat}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!res.ok) throw new Error("Invalid token");
      const data: GithubUser = await res.json();
      setUserInfo(data);
      setGithubToken(pat);
      setGithubUsername(data.login);

      // Fetch repos
      const reposRes = await fetch("https://api.github.com/user/repos?per_page=50&sort=updated", {
        headers: {
          Authorization: `token ${pat}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      const reposData: Repo[] = await reposRes.json();
      setRepos(reposData);
      setView("repos");
    } catch (e: any) {
      setError("Authentication failed. Check your token.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!token.trim()) {
      setError("Please enter a GitHub Personal Access Token");
      return;
    }
    fetchUser(token.trim());
  };

  const handlePush = async () => {
    if (!selectedRepo || !currentProject || !activeFile) {
      Alert.alert("Push Error", "No file selected to push.");
      return;
    }
    if (!commitMessage.trim()) {
      Alert.alert("Commit message required");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPushing(true);
    setPushResult("");

    try {
      // Check if file exists (get SHA)
      const filePath = activeFile.name;
      const checkRes = await fetch(
        `https://api.github.com/repos/${selectedRepo.full_name}/contents/${filePath}`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      let sha: string | undefined;
      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }

      const content = btoa(unescape(encodeURIComponent(activeFile.content)));

      const body: Record<string, any> = {
        message: commitMessage,
        content,
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(
        `https://api.github.com/repos/${selectedRepo.full_name}/contents/${filePath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.message ?? "Push failed");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPushResult(`Pushed "${filePath}" to ${selectedRepo.full_name} successfully`);
    } catch (e: any) {
      setPushResult(`Error: ${e.message}`);
    } finally {
      setPushing(false);
    }
  };

  const handleLogout = () => {
    setGithubToken("");
    setGithubUsername("");
    setUserInfo(null);
    setRepos([]);
    setToken("");
    setView("login");
  };

  // Login view
  if (view === "login" || !userInfo) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.sidebar }]}
        contentContainerStyle={styles.loginContent}
        keyboardShouldPersistTaps="handled"
      >
        <Feather name="github" size={48} color={colors.text} />
        <Text style={[styles.title, { color: colors.text }]}>GitHub Integration</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          Connect with a Personal Access Token (PAT) to push code to your repos.
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedText }]}>PERSONAL ACCESS TOKEN</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.input },
            ]}
            value={token}
            onChangeText={setToken}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            placeholderTextColor={colors.mutedText}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: colors.accent }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="log-in" size={16} color="#fff" />
              <Text style={styles.loginBtnText}>Connect to GitHub</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.mutedText }]}>
          Create a token at github.com/settings/tokens with repo scope
        </Text>
      </ScrollView>
    );
  }

  // Push view
  if (view === "push" && selectedRepo) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.sidebar }]}
        contentContainerStyle={styles.section}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { setView("repos"); setPushResult(""); }}
        >
          <Feather name="arrow-left" size={16} color={colors.accent} />
          <Text style={[styles.backBtnText, { color: colors.accent }]}>Back to Repos</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Push to GitHub</Text>

        <View style={[styles.repoCard, { backgroundColor: colors.card }]}>
          <Feather name="github" size={16} color={colors.mutedText} />
          <Text style={[styles.repoName, { color: colors.text }]}>{selectedRepo.full_name}</Text>
          {selectedRepo.private && (
            <View style={[styles.privateBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.privateBadgeText, { color: colors.mutedText }]}>private</Text>
            </View>
          )}
        </View>

        {!activeFile ? (
          <View style={styles.noFileWarn}>
            <Feather name="alert-circle" size={16} color={colors.warning} />
            <Text style={[styles.noFileText, { color: colors.warning }]}>
              Open a file in the editor first to push it.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.fileCard, { backgroundColor: colors.card }]}>
              <Feather name="file" size={14} color={colors.accent} />
              <Text style={[styles.fileName, { color: colors.text }]}>{activeFile.name}</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedText }]}>COMMIT MESSAGE</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.input },
                ]}
                value={commitMessage}
                onChangeText={setCommitMessage}
                placeholder="Update via VS Code Mobile"
                placeholderTextColor={colors.mutedText}
              />
            </View>

            {pushResult ? (
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: pushResult.startsWith("Error")
                      ? colors.error + "22"
                      : colors.success + "22",
                  },
                ]}
              >
                <Feather
                  name={pushResult.startsWith("Error") ? "x-circle" : "check-circle"}
                  size={16}
                  color={pushResult.startsWith("Error") ? colors.error : colors.success}
                />
                <Text
                  style={[
                    styles.resultText,
                    { color: pushResult.startsWith("Error") ? colors.error : colors.success },
                  ]}
                >
                  {pushResult}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.pushBtn, { backgroundColor: colors.accent }]}
              onPress={handlePush}
              disabled={pushing}
            >
              {pushing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="upload" size={16} color="#fff" />
                  <Text style={styles.pushBtnText}>Push to {selectedRepo.name}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  // Repos view
  return (
    <View style={[styles.container, { backgroundColor: colors.sidebar }]}>
      {/* User header */}
      <View style={[styles.userHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {userInfo.name ?? userInfo.login}
          </Text>
          <Text style={[styles.userLogin, { color: colors.mutedText }]}>@{userInfo.login}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Feather name="log-out" size={16} color={colors.mutedText} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.reposLabel, { color: colors.mutedText }]}>
        REPOSITORIES ({repos.length})
      </Text>

      <FlatList
        data={repos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.repoRow, { borderBottomColor: colors.border }]}
            onPress={() => {
              setSelectedRepo(item);
              setView("push");
            }}
            activeOpacity={0.7}
          >
            <View style={styles.repoRowLeft}>
              <Feather name={item.private ? "lock" : "book-open"} size={14} color={colors.mutedText} />
              <View>
                <Text style={[styles.repoName, { color: colors.text }]}>{item.name}</Text>
                {item.description ? (
                  <Text style={[styles.repoDesc, { color: colors.mutedText }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </View>
            <Feather name="chevron-right" size={14} color={colors.mutedText} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>No repositories found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loginContent: {
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  field: { width: "100%", gap: 6 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
  error: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    width: "100%",
    justifyContent: "center",
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  userLogin: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  reposLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  repoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  repoRowLeft: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    flex: 1,
  },
  repoName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  repoDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  section: { padding: 16, gap: 14 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  repoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  privateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  privateBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  fileName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  noFileWarn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noFileText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  resultText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  pushBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 6,
  },
  pushBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  emptyList: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
