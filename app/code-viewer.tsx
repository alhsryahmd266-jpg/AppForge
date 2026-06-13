import { Feather } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

interface FileEntry {
  id?: number;
  path: string;
  content: string;
}

interface LogLine {
  id: string;
  type: "status" | "chunk" | "file_start" | "file_saved" | "done" | "error";
  msg?: string;
  file?: string;
  content?: string;
}

function FileTree({
  files,
  selected,
  onSelect,
  colors,
}: {
  files: FileEntry[];
  selected: string | null;
  onSelect: (f: FileEntry) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const getIcon = (path: string) => {
    if (path.endsWith(".tsx") || path.endsWith(".ts")) return "code";
    if (path.endsWith(".json")) return "file-text";
    if (path.endsWith(".md")) return "book";
    return "file";
  };

  return (
    <FlatList
      data={files}
      keyExtractor={(f) => f.path}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 8 }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onSelect(item)}
          style={[
            styles.fileRow,
            selected === item.path && {
              backgroundColor: colors.primary + "20",
              borderLeftColor: colors.primary,
              borderLeftWidth: 2,
            },
          ]}
        >
          <Feather
            name={getIcon(item.path) as any}
            size={14}
            color={selected === item.path ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.fileName,
              {
                color: selected === item.path ? colors.primary : colors.foreground,
              },
            ]}
            numberOfLines={1}
          >
            {item.path.split("/").pop()}
          </Text>
        </Pressable>
      )}
    />
  );
}

function TerminalLog({ logs }: { logs: LogLine[] }) {
  const scrollRef = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.terminal}
      contentContainerStyle={{ padding: 12, gap: 4 }}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
    >
      {logs.map((log) => {
        const color =
          log.type === "error"
            ? "#ef4444"
            : log.type === "done"
            ? "#22c55e"
            : log.type === "file_start"
            ? "#60a5fa"
            : log.type === "file_saved"
            ? "#22c55e"
            : "#a1a1aa";

        if (log.type === "chunk") return null;
        return (
          <View key={log.id} style={{ flexDirection: "row", gap: 6 }}>
            <Text style={{ color: "#6366f1", fontSize: 11, fontFamily: "Inter_700Bold" }}>›</Text>
            <Text style={{ color, fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 }}>
              {log.msg}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function CodeViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [done, setDone] = useState(false);
  const [view, setView] = useState<"terminal" | "files">("terminal");
  const [streamingCode, setStreamingCode] = useState("");

  const addLog = useCallback((log: Omit<LogLine, "id">) => {
    setLogs((prev) => [...prev, { ...log, id: Date.now().toString() + Math.random() }]);
  }, []);

  const generateCode = useCallback(async () => {
    setGenerating(true);
    setDone(false);
    setFiles([]);
    setSelectedFile(null);
    setLogs([]);
    setStreamingCode("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const url = domain
        ? `https://${domain}/api/projects/${id}/generate-code`
        : `/api/projects/${id}/generate-code`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let rawCode = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        const chunk = decoder.decode(value);

        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as LogLine & {
              fileCount?: number;
              files?: string[];
              content?: string;
            };

            if (parsed.type === "chunk" && parsed.content) {
              rawCode += parsed.content;
              setStreamingCode(rawCode);
            } else if (parsed.type === "file_saved" && parsed.file) {
              setFiles((prev) => {
                const exists = prev.find((f) => f.path === parsed.file);
                if (exists) return prev;
                return [...prev, { path: parsed.file!, content: "" }];
              });
              addLog(parsed);
            } else if (parsed.type === "done") {
              setDone(true);
              setView("files");
              addLog(parsed);
              // Fetch full files
              const filesUrl = domain
                ? `https://${domain}/api/projects/${id}/files`
                : `/api/projects/${id}/files`;
              const filesRes = await fetch(filesUrl);
              const filesData = await filesRes.json() as { files: FileEntry[] };
              setFiles(filesData.files || []);
              if (filesData.files?.length > 0) setSelectedFile(filesData.files[0]);
            } else {
              addLog(parsed);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      addLog({ type: "error", msg: err instanceof Error ? err.message : "فشل توليد الكود" });
    } finally {
      setGenerating(false);
    }
  }, [id, addLog]);

  return (
    <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <LinearGradient
          colors={[colors.gradient1, colors.gradient2]}
          style={styles.headerIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="code" size={15} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AppForge Code</Text>
          <Text style={styles.headerSub}>AI Code Generator</Text>
        </View>
        {generating && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      {(logs.length > 0 || files.length > 0) && (
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setView("terminal")}
            style={[styles.tab, view === "terminal" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Feather name="terminal" size={14} color={view === "terminal" ? colors.primary : "#71717a"} />
            <Text style={[styles.tabText, { color: view === "terminal" ? colors.primary : "#71717a" }]}>Terminal</Text>
          </Pressable>
          <Pressable
            onPress={() => setView("files")}
            style={[styles.tab, view === "files" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Feather name="folder" size={14} color={view === "files" ? colors.primary : "#71717a"} />
            <Text style={[styles.tabText, { color: view === "files" ? colors.primary : "#71717a" }]}>
              Files {files.length > 0 ? `(${files.length})` : ""}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Content */}
      {view === "terminal" && (logs.length > 0 || generating) ? (
        <View style={{ flex: 1 }}>
          <TerminalLog logs={logs} />
          {generating && streamingCode && (
            <View style={styles.streamPreview}>
              <Text style={styles.streamLabel}>جاري الكتابة...</Text>
              <ScrollView style={{ maxHeight: 120 }}>
                <Text style={styles.streamCode} numberOfLines={6}>
                  {streamingCode.slice(-500)}
                </Text>
              </ScrollView>
            </View>
          )}
        </View>
      ) : view === "files" && files.length > 0 ? (
        <View style={styles.ide}>
          {/* File tree */}
          <View style={[styles.sidebar, { borderRightColor: "#1f1f23" }]}>
            <Text style={styles.sidebarTitle}>EXPLORER</Text>
            <FileTree
              files={files}
              selected={selectedFile?.path ?? null}
              onSelect={setSelectedFile}
              colors={colors}
            />
          </View>
          {/* Code viewer */}
          <ScrollView style={styles.codeArea} horizontal={false}>
            {selectedFile ? (
              <ScrollView horizontal>
                <Text style={styles.code}>{selectedFile.content}</Text>
              </ScrollView>
            ) : (
              <View style={styles.noFile}>
                <Feather name="file-text" size={32} color="#27272a" />
                <Text style={{ color: "#27272a", marginTop: 8 }}>اختر ملف للعرض</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={[colors.gradient1 + "22", colors.gradient2 + "11"]}
            style={styles.emptyIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="cpu" size={36} color={colors.primary} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>AI يكتب الكود بدالك</Text>
          <Text style={styles.emptyDesc}>
            اضغط "توليد الكود" وشوف الذكاء الاصطناعي يكتب تطبيقك من الصفر — سطر سطر
          </Text>
        </View>
      )}

      {/* Bottom Button */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={generateCode}
          disabled={generating}
          style={({ pressed }) => [
            styles.genBtn,
            { backgroundColor: generating ? "#27272a" : colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name={generating ? "loader" : "cpu"} size={20} color={generating ? "#71717a" : "#fff"} />
          <Text style={[styles.genBtnText, { color: generating ? "#71717a" : "#fff" }]}>
            {generating ? "الذكاء الاصطناعي يكتب الكود..." : done ? "إعادة توليد الكود" : "توليد الكود الآن"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
  },
  headerIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#71717a" },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#ef444420", paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: "#ef444440",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#ef4444", letterSpacing: 1 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#18181b" },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  tabText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  ide: { flex: 1, flexDirection: "row" },
  sidebar: { width: 160, borderRightWidth: 1 },
  sidebarTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#52525b", padding: 12, letterSpacing: 1 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  fileName: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  codeArea: { flex: 1, backgroundColor: "#0d0d0d" },
  code: { fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: "#e4e4e7", padding: 16, lineHeight: 20 },
  noFile: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  terminal: { flex: 1, backgroundColor: "#0a0a0a" },
  streamPreview: { borderTopWidth: 1, borderTopColor: "#18181b", padding: 12 },
  streamLabel: { fontSize: 10, color: "#6366f1", fontFamily: "Inter_600SemiBold", marginBottom: 6, letterSpacing: 1 },
  streamCode: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: "#71717a", lineHeight: 18 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#71717a", textAlign: "center", lineHeight: 22 },
  bottom: { padding: 16, borderTopWidth: 1, borderTopColor: "#18181b", backgroundColor: "#0f0f0f" },
  genBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  genBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
