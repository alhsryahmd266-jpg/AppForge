import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProjects, useDeleteProject } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import type { Project } from "@workspace/api-client-react";

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const colors = useColors();
  const router = useRouter();

  const statusColor =
    project.status === "planned"
      ? "#22c55e"
      : project.status === "building"
      ? "#f59e0b"
      : colors.mutedForeground;

  return (
    <Pressable
      onPress={() => router.push(`/project/${project.id}` as never)}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.appIcon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="smartphone" size={20} color={colors.primary} />
        </View>
        <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
          <Feather name="trash-2" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
        {project.title}
      </Text>
      <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {project.description}
      </Text>
      <View style={styles.cardFooter}>
        <View style={[styles.badge, { backgroundColor: statusColor + "22" }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {project.status === "planned" ? "Ready" : project.status === "building" ? "Building" : "Draft"}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
          {new Date(project.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: projects, isLoading, refetch } = useGetProjects();
  const { mutate: deleteProject } = useDeleteProject();

  const handleDelete = useCallback(
    (id: number) => {
      deleteProject({ id }, { onSuccess: () => refetch() });
    },
    [deleteProject, refetch]
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>AppForge</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Build apps with AI
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => router.push("/build-apk" as never)}
            style={({ pressed }) => [styles.newBtn, { backgroundColor: "#18181b", borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="terminal" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/new-project" as never)}
            style={({ pressed }) => [styles.newBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !projects || projects.length === 0 ? (
        <View style={styles.empty}>
          <LinearGradient
            colors={[colors.gradient1 + "22", colors.gradient2 + "11"]}
            style={styles.emptyIcon}
          >
            <Feather name="smartphone" size={40} color={colors.primary} />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No projects yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Start building your first app with AI assistance
          </Text>
          <Pressable
            onPress={() => router.push("/new-project" as never)}
            style={({ pressed }) => [styles.createBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.createBtnText}>Create Project</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyDesc: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  createBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  appIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  deleteBtn: { padding: 4 },
  cardTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", letterSpacing: -0.3 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
