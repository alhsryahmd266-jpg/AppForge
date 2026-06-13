import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCreateProject } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";

const TEMPLATES = [
  { id: "ecommerce", name: "E-Commerce Store", description: "Full shopping app with products, cart, orders, and payments integration", icon: "shopping-bag", category: "Business", gradient: ["#f093fb", "#f5576c"] as [string, string] },
  { id: "social", name: "Social Network", description: "User profiles, posts, likes, comments, messaging, and follow system", icon: "users", category: "Social", gradient: ["#4facfe", "#00f2fe"] as [string, string] },
  { id: "fitness", name: "Fitness Tracker", description: "Workout plans, exercise tracking, nutrition log, and progress charts", icon: "activity", category: "Health", gradient: ["#43e97b", "#38f9d7"] as [string, string] },
  { id: "delivery", name: "Food Delivery", description: "Restaurant browsing, order management, real-time tracking, and reviews", icon: "truck", category: "Service", gradient: ["#fa709a", "#fee140"] as [string, string] },
  { id: "education", name: "Online Learning", description: "Course catalog, video lessons, quizzes, certificates, and progress tracking", icon: "book-open", category: "Education", gradient: ["#a18cd1", "#fbc2eb"] as [string, string] },
  { id: "finance", name: "Finance Manager", description: "Budget tracking, expense categories, bank sync, reports, and savings goals", icon: "pie-chart", category: "Finance", gradient: ["#ffecd2", "#fcb69f"] as [string, string] },
  { id: "booking", name: "Booking Platform", description: "Service scheduling, calendar availability, payments, and reminders", icon: "calendar", category: "Service", gradient: ["#a1c4fd", "#c2e9fb"] as [string, string] },
  { id: "news", name: "News & Blog", description: "Article feed, categories, bookmarks, comments, and push notifications", icon: "rss", category: "Media", gradient: ["#fd7943", "#fd267a"] as [string, string] },
];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mutate: createProject } = useCreateProject();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleUseTemplate = (template: typeof TEMPLATES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createProject(
      {
        data: {
          title: template.name,
          description: template.description,
          appType: "mobile",
        },
      },
      {
        onSuccess: (project) => {
          router.push(`/project/${project.id}` as never);
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Templates</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Start with a ready-made blueprint
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {TEMPLATES.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => handleUseTemplate(template)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <LinearGradient
              colors={template.gradient}
              style={styles.iconBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name={template.icon as any} size={22} color="#fff" />
            </LinearGradient>
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {template.name}
                </Text>
                <View style={[styles.catBadge, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.catText, { color: colors.primary }]}>
                    {template.category}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {template.description}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, gap: 4 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
