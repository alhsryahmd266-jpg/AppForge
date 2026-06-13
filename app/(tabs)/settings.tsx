import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const GITHUB_TOKEN_KEY = "appforge_github_token";
const EXPO_TOKEN_KEY = "appforge_expo_token";

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Feather name={icon as any} size={18} color={colors.mutedForeground} />
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      {value && (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [githubToken, setGithubToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);

  const [expoToken, setExpoToken] = useState("");
  const [savingExpo, setSavingExpo] = useState(false);
  const [savedExpo, setSavedExpo] = useState(false);
  const [expoVisible, setExpoVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(GITHUB_TOKEN_KEY).then((val) => { if (val) setGithubToken(val); });
    AsyncStorage.getItem(EXPO_TOKEN_KEY).then((val) => { if (val) setExpoToken(val); });
  }, []);

  const handleSaveToken = async () => {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (githubToken.trim()) {
        await AsyncStorage.setItem(GITHUB_TOKEN_KEY, githubToken.trim());
      } else {
        await AsyncStorage.removeItem(GITHUB_TOKEN_KEY);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert("Error", "Could not save token.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExpoToken = async () => {
    setSavingExpo(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (expoToken.trim()) {
        await AsyncStorage.setItem(EXPO_TOKEN_KEY, expoToken.trim());
      } else {
        await AsyncStorage.removeItem(EXPO_TOKEN_KEY);
      }
      setSavedExpo(true);
      setTimeout(() => setSavedExpo(false), 2500);
    } catch {
      Alert.alert("Error", "Could not save token.");
    } finally {
      setSavingExpo(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={[colors.gradient1, colors.gradient2]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="cpu" size={28} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              AppForge Builder
            </Text>
            <Text style={[styles.profileSub, { color: colors.mutedForeground }]}>
              AI-Powered App Creator
            </Text>
          </View>
        </View>

        {/* Expo — Build APK Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="smartphone" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitleInline, { color: colors.foreground }]}>بناء APK</Text>
            <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.newBadgeText}>جديد</Text>
            </View>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            ادخل Expo Access Token وسيقوم AppForge ببناء الـ APK تلقائياً — وأنت ترى كل خطوة مباشرةً.
          </Text>
          <View style={[styles.tokenRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              value={expoToken}
              onChangeText={setExpoToken}
              placeholder="ytoXAB..."
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!expoVisible}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.tokenInput, { color: colors.foreground }]}
            />
            <Pressable onPress={() => setExpoVisible((v) => !v)} style={styles.eyeBtn}>
              <Feather name={expoVisible ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Pressable
            onPress={handleSaveExpoToken}
            disabled={savingExpo}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: savedExpo ? "#22c55e" : colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {savingExpo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name={savedExpo ? "check" : "save"} size={16} color="#fff" />
                <Text style={styles.saveBtnText}>{savedExpo ? "تم الحفظ!" : "حفظ التوكن"}</Text>
              </>
            )}
          </Pressable>
          <View style={[styles.tipBox, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
              احصل على التوكن من{" "}
              <Text style={{ color: colors.primary }}>expo.dev → Account → Access Tokens</Text>
            </Text>
          </View>
        </View>

        {/* GitHub Export Section */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Feather name="github" size={16} color={colors.foreground} />
            <Text style={[styles.sectionTitleInline, { color: colors.foreground }]}>
              GitHub Export
            </Text>
          </View>

          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Paste your GitHub Personal Access Token to export any project directly to a GitHub repository — ready to build an APK with one command.
          </Text>

          <View
            style={[
              styles.tokenRow,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <TextInput
              value={githubToken}
              onChangeText={setGithubToken}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!tokenVisible}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.tokenInput, { color: colors.foreground }]}
            />
            <Pressable
              onPress={() => setTokenVisible((v) => !v)}
              style={styles.eyeBtn}
            >
              <Feather
                name={tokenVisible ? "eye-off" : "eye"}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          <Pressable
            onPress={handleSaveToken}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: saved
                  ? "#22c55e"
                  : colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather
                  name={saved ? "check" : "save"}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.saveBtnText}>
                  {saved ? "Saved!" : "Save Token"}
                </Text>
              </>
            )}
          </Pressable>

          <View
            style={[
              styles.tipBox,
              { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" },
            ]}
          >
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
              Create a token at{" "}
              <Text style={{ color: colors.primary }}>
                github.com → Settings → Developer settings → Personal access tokens
              </Text>
              . Enable the <Text style={{ color: colors.foreground }}>repo</Text> scope.
            </Text>
          </View>
        </View>

        {/* APK Build Guide */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            BUILD APK
          </Text>
          <View style={styles.stepsList}>
            {[
              { n: "1", text: "Export project to GitHub from any project screen" },
              { n: "2", text: "Clone the repo on your computer" },
              { n: "3", text: "Run: npm install -g eas-cli" },
              { n: "4", text: "Run: eas build -p android --profile preview" },
              { n: "5", text: "Download the APK from the Expo dashboard link" },
            ].map((step) => (
              <View key={step.n} style={styles.step}>
                <View
                  style={[
                    styles.stepNum,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.stepNumText}>{step.n}</Text>
                </View>
                <Text
                  style={[styles.stepText, { color: colors.foreground }]}
                >
                  {step.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI Engine */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            AI ENGINE
          </Text>
          <InfoRow icon="zap" label="Model" value="GPT-5.4" colors={colors} />
          <InfoRow
            icon="server"
            label="Provider"
            value="OpenAI via Replit"
            colors={colors}
          />
          <InfoRow
            icon="shield"
            label="API Key"
            value="Managed by Replit"
            colors={colors}
          />
        </View>

        {/* App Info */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            APP
          </Text>
          <InfoRow
            icon="smartphone"
            label="Platform"
            value="React Native + Expo"
            colors={colors}
          />
          <InfoRow
            icon="database"
            label="Database"
            value="PostgreSQL + Drizzle"
            colors={colors}
          />
          <InfoRow icon="code" label="Version" value="1.0.0" colors={colors} />
          <InfoRow
            icon="gift"
            label="Payment"
            value="None — Free"
            colors={colors}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden", padding: 16, gap: 12 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitleInline: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  tokenInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 12,
  },
  eyeBtn: { padding: 6 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  tipBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
  stepsList: { gap: 10 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  stepText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  newBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  newBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
});
