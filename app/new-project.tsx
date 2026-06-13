import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useColors } from "@/hooks/useColors";
import { useCreateProject } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";

const APP_TYPES = [
  { id: "mobile", label: "Mobile App", icon: "smartphone" },
  { id: "ecommerce", label: "E-Commerce", icon: "shopping-bag" },
  { id: "social", label: "Social", icon: "users" },
  { id: "business", label: "Business", icon: "briefcase" },
  { id: "health", label: "Health", icon: "heart" },
  { id: "education", label: "Education", icon: "book" },
];

export default function NewProjectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mutate: createProject, isPending } = useCreateProject();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [appType, setAppType] = useState("mobile");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const canCreate = title.trim().length > 0 && description.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate || isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createProject(
      { data: { title: title.trim(), description: description.trim(), appType } },
      {
        onSuccess: (project) => {
          router.replace(`/project/${project.id}` as never);
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>New Project</Text>
        <Pressable
          onPress={handleCreate}
          disabled={!canCreate || isPending}
          style={[styles.createBtn, { backgroundColor: canCreate ? colors.primary : colors.muted }]}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.createText, { color: canCreate ? "#fff" : colors.mutedForeground }]}>
              Create
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>APP NAME</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. FitTrack Pro"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            autoFocus
            returnKeyType="next"
            maxLength={60}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>DESCRIBE YOUR APP</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What does your app do? Who is it for? What problems does it solve?"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
            {description.length}/500
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>APP CATEGORY</Text>
          <View style={styles.typeGrid}>
            {APP_TYPES.map((type) => (
              <Pressable
                key={type.id}
                onPress={() => {
                  setAppType(type.id);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: appType === type.id ? colors.primary + "22" : colors.card,
                    borderColor: appType === type.id ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather
                  name={type.icon as any}
                  size={18}
                  color={appType === type.id ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: appType === type.id ? colors.primary : colors.foreground },
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.tipBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="zap" size={16} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            After creating your project, the AI will help you design every screen, feature, and detail of your app.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { padding: 6 },
  topTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  createBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  createText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 24 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 130,
  },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  tipBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  tipText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, flex: 1 },
});
