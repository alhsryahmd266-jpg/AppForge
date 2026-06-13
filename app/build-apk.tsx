import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const EXPO_TOKEN_KEY = "appforge_expo_token";

interface LogLine {
  id: string;
  type: "step" | "ok" | "error" | "building" | "done" | "info";
  msg: string;
  buildUrl?: string;
  downloadUrl?: string;
}

function TerminalLine({ line, colors }: { line: LogLine; colors: ReturnType<typeof useColors> }) {
  const colorMap = {
    step: "#60a5fa",
    ok: "#22c55e",
    error: "#ef4444",
    building: "#f59e0b",
    done: "#22c55e",
    info: colors.mutedForeground,
  };
  const c = colorMap[line.type] || colors.foreground;

  return (
    <View style={styles.logLine}>
      <Text style={[styles.logPrompt, { color: colors.primary }]}>{">"}</Text>
      <Text style={[styles.logText, { color: c }]}>{line.msg}</Text>
    </View>
  );
}

export default function BuildApkScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [logs, setLogs] = useState<LogLine[]>([]);
  const [building, setBuilding] = useState(false);
  const [buildUrl, setBuildUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(EXPO_TOKEN_KEY).then((val) => {
      if (val) { setToken(val); setTokenSaved(true); }
    });
  }, []);

  const saveToken = useCallback(async () => {
    if (!token.trim()) return;
    await AsyncStorage.setItem(EXPO_TOKEN_KEY, token.trim());
    setTokenSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [token]);

  const addLog = useCallback((line: Omit<LogLine, "id">) => {
    setLogs((prev) => [...prev, { ...line, id: Date.now().toString() + Math.random() }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const pollBuildStatus = useCallback(
    async (id: string, token: string) => {
      setPolling(true);
      let attempts = 0;
      const maxAttempts = 60;

      const check = async () => {
        attempts++;
        try {
          const domain = process.env.EXPO_PUBLIC_DOMAIN;
          const url = domain
            ? `https://${domain}/api/build-status/${id}`
            : `/api/build-status/${id}`;

          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = (await res.json()) as { build?: { status: string; artifacts?: { buildUrl?: string } } };
          const build = data.build;
          const status = build?.status;

          if (status === "FINISHED") {
            const apkUrl = build?.artifacts?.buildUrl;
            setDownloadUrl(apkUrl || null);
            addLog({ type: "done", msg: "🎉 APK جاهز للتحميل!", downloadUrl: apkUrl });
            if (pollTimer.current) clearInterval(pollTimer.current);
            setPolling(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (status === "ERRORED" || status === "CANCELLED") {
            addLog({ type: "error", msg: `❌ فشل البناء: ${status}` });
            if (pollTimer.current) clearInterval(pollTimer.current);
            setPolling(false);
          } else if (attempts >= maxAttempts) {
            addLog({ type: "error", msg: "⏰ انتهت مهلة الانتظار — تحقق من Expo Dashboard" });
            if (pollTimer.current) clearInterval(pollTimer.current);
            setPolling(false);
          } else {
            const mins = Math.floor((attempts * 30) / 60);
            const secs = (attempts * 30) % 60;
            addLog({ type: "building", msg: `🔄 حالة البناء: ${status || "IN_QUEUE"} — ${mins}:${String(secs).padStart(2, "0")} دقيقة مضت...` });
          }
        } catch {
          addLog({ type: "info", msg: `⏳ جاري التحقق من حالة البناء...` });
        }
      };

      await check();
      pollTimer.current = setInterval(check, 30000);
    },
    [addLog]
  );

  const startBuild = useCallback(async () => {
    if (!token.trim()) {
      Alert.alert("مطلوب Expo Token", "أدخل الـ Expo Token أولاً واضغط حفظ.");
      return;
    }
    await AsyncStorage.setItem(EXPO_TOKEN_KEY, token.trim());

    setLogs([]);
    setBuildUrl(null);
    setDownloadUrl(null);
    setBuildId(null);
    setBuilding(true);
    if (pollTimer.current) clearInterval(pollTimer.current);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addLog({ type: "info", msg: "═══════════════════════════════" });
    addLog({ type: "info", msg: "  AppForge APK Builder v1.0" });
    addLog({ type: "info", msg: "═══════════════════════════════" });

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const url = domain
        ? `https://${domain}/api/build-apk`
        : `/api/build-apk`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expoToken: token.trim() }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6)) as {
                type: string;
                msg: string;
                buildId?: string;
                buildUrl?: string;
              };

              addLog({
                type: parsed.type as LogLine["type"],
                msg: parsed.msg,
                buildUrl: parsed.buildUrl,
              });

              if (parsed.buildId) {
                setBuildId(parsed.buildId);
                if (parsed.buildUrl) setBuildUrl(parsed.buildUrl);
                pollBuildStatus(parsed.buildId, token);
              }
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      addLog({ type: "error", msg: `❌ ${msg}` });
    } finally {
      setBuilding(false);
    }
  }, [addLog, pollBuildStatus]);

  return (
    <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <LinearGradient
          colors={[colors.gradient1, colors.gradient2]}
          style={styles.headerIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="terminal" size={16} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AppForge Builder</Text>
          <Text style={styles.headerSub}>Android APK Builder</Text>
        </View>
        {(building || polling) && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Token Input */}
      <View style={styles.tokenBox}>
        <View style={styles.tokenRow}>
          <Feather name="key" size={15} color="#6366f1" />
          <Text style={styles.tokenLabel}>Expo Access Token</Text>
          {tokenSaved && (
            <View style={styles.savedBadge}>
              <Feather name="check" size={10} color="#22c55e" />
              <Text style={styles.savedText}>محفوظ</Text>
            </View>
          )}
        </View>
        <View style={styles.tokenInputRow}>
          <TextInput
            style={styles.tokenInput}
            value={token}
            onChangeText={(t) => { setToken(t); setTokenSaved(false); }}
            placeholder="expo_••••••••••••••••••••••••••"
            placeholderTextColor="#3f3f46"
            secureTextEntry={!showToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable onPress={() => setShowToken((v) => !v)} style={styles.eyeBtn}>
            <Feather name={showToken ? "eye-off" : "eye"} size={16} color="#71717a" />
          </Pressable>
          <Pressable
            onPress={saveToken}
            disabled={!token.trim() || tokenSaved}
            style={[styles.saveBtn, { backgroundColor: tokenSaved ? "#16a34a20" : "#6366f1" }]}
          >
            <Text style={[styles.saveBtnText, { color: tokenSaved ? "#22c55e" : "#fff" }]}>
              {tokenSaved ? "✓" : "حفظ"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.tokenHint}>
          expo.dev → Account Settings → Access Tokens
        </Text>
      </View>

      {/* Terminal */}
      <ScrollView
        ref={scrollRef}
        style={styles.terminal}
        contentContainerStyle={styles.terminalContent}
        showsVerticalScrollIndicator={false}
      >
        {logs.length === 0 && !building && (
          <View style={styles.emptyState}>
            <Feather name="terminal" size={40} color="#27272a" />
            <Text style={styles.emptyText}>اضغط "ابدأ البناء" لترى العملية مباشرةً</Text>
          </View>
        )}
        {logs.map((log) => (
          <TerminalLine key={log.id} line={log} colors={colors} />
        ))}
        {(building || polling) && (
          <View style={styles.logLine}>
            <Text style={[styles.logPrompt, { color: colors.primary }]}>{">"}</Text>
            <Text style={[styles.logText, { color: "#60a5fa" }]}>█</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {downloadUrl ? (
          <Pressable
            onPress={() => Linking.openURL(downloadUrl)}
            style={({ pressed }) => [
              styles.buildBtn,
              { backgroundColor: "#22c55e", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="download" size={20} color="#fff" />
            <Text style={styles.buildBtnText}>تحميل الـ APK</Text>
          </Pressable>
        ) : buildUrl ? (
          <Pressable
            onPress={() => Linking.openURL(buildUrl)}
            style={({ pressed }) => [
              styles.buildBtn,
              { backgroundColor: "#f59e0b", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="external-link" size={20} color="#fff" />
            <Text style={styles.buildBtnText}>متابعة البناء على Expo</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={startBuild}
            disabled={building || polling}
            style={({ pressed }) => [
              styles.buildBtn,
              {
                backgroundColor:
                  building || polling ? "#27272a" : colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name={building ? "loader" : "play"}
              size={20}
              color={building || polling ? "#71717a" : "#fff"}
            />
            <Text
              style={[
                styles.buildBtnText,
                { color: building || polling ? "#71717a" : "#fff" },
              ]}
            >
              {building ? "جاري التجهيز..." : polling ? "البناء قيد التشغيل..." : "ابدأ بناء الـ APK"}
            </Text>
          </Pressable>
        )}

        {buildId && (
          <Text style={styles.buildIdText}>Build ID: {buildId.slice(0, 16)}...</Text>
        )}
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
  backBtn: { padding: 4 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#71717a", marginTop: 1 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ef444420",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ef444440",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#ef4444", letterSpacing: 1 },
  terminal: { flex: 1, backgroundColor: "#0a0a0a" },
  terminalContent: { padding: 16, gap: 6, minHeight: 200 },
  logLine: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  logPrompt: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 1 },
  logText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 16 },
  emptyText: { color: "#3f3f46", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  bottom: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#18181b",
    backgroundColor: "#0f0f0f",
  },
  tokenBox: {
    margin: 12,
    backgroundColor: "#111113",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f1f23",
    gap: 8,
  },
  tokenRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tokenLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#a1a1aa", flex: 1 },
  savedBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#16a34a20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  savedText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#22c55e" },
  tokenInputRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tokenInput: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#e4e4e7",
  },
  eyeBtn: { padding: 8, backgroundColor: "#18181b", borderRadius: 8 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tokenHint: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#3f3f46" },
  buildBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buildBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  buildIdText: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular", color: "#3f3f46" },
});
