import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  AdminDashboardScreen,
  AdminMembersScreen,
  AdminMoreScreen,
  AdminPharmacistsScreen,
} from "./src/screens/AdminScreens";
import { LandingScreen, LoginScreen, SignupScreen } from "./src/screens/AuthScreens";
import {
  PharmacistConsultsScreen,
  PharmacistDashboardScreen,
  PharmacistInventoryScreen,
  PharmacistMoreScreen,
  PharmacistPatientsScreen,
  PharmacistPendingScreen,
} from "./src/screens/PharmacistScreens";
import {
  DrugSearchScreen,
  IotScreen,
  MyPageScreen,
  NotificationsScreen,
  OcrScreen,
  PharmacyMapScreen,
} from "./src/screens/SharedScreens";
import { ChatScreen, ScheduleScreen, UserMoreScreen } from "./src/screens/UserScreens";
import { colors } from "./src/constants";
import { AppProvider, useAppContext } from "./src/context/AppContext";

const AuthStack = createNativeStackNavigator();
const UserStack = createNativeStackNavigator();
const UserTab = createBottomTabNavigator();
const PharmStack = createNativeStackNavigator();
const PharmTab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={name} size={focused ? size + 2 : size} color={color} />
  );
}

const tabOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { color: colors.text, fontWeight: "800" as const },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 66,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: "800" as const,
  },
};

const stackOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { color: colors.text, fontWeight: "800" as const },
  headerBackTitle: "뒤로",
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={stackOptions}>
      <AuthStack.Screen name="Landing" component={LandingScreen} options={{ title: "MediNote" }} />
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: "로그인" }} />
      <AuthStack.Screen name="Signup" component={SignupScreen} options={{ title: "회원가입" }} />
    </AuthStack.Navigator>
  );
}

function UserTabs() {
  return (
    <UserTab.Navigator screenOptions={tabOptions}>
      <UserTab.Screen
        name="UserScheduleTab"
        component={ScheduleScreen}
        options={{ title: "복약", tabBarIcon: tabIcon("calendar-outline") }}
      />
      <UserTab.Screen
        name="UserOcrTab"
        component={OcrScreen}
        options={{ title: "OCR", tabBarIcon: tabIcon("scan-outline") }}
      />
      <UserTab.Screen
        name="UserChatTab"
        component={ChatScreen}
        options={{ title: "채팅", tabBarIcon: tabIcon("chatbubble-ellipses-outline") }}
      />
      <UserTab.Screen
        name="UserDrugsTab"
        component={DrugSearchScreen}
        options={{ title: "약 검색", tabBarIcon: tabIcon("search-outline") }}
      />
      <UserTab.Screen
        name="UserMoreTab"
        component={UserMoreScreen}
        options={{ title: "더보기", tabBarIcon: tabIcon("grid-outline") }}
      />
    </UserTab.Navigator>
  );
}

function UserNavigator() {
  return (
    <UserStack.Navigator screenOptions={stackOptions}>
      <UserStack.Screen name="UserTabs" component={UserTabs} options={{ headerShown: false }} />
      <UserStack.Screen name="UserPharmacies" component={PharmacyMapScreen} options={{ title: "근처 약국" }} />
      <UserStack.Screen name="UserNotifications" component={NotificationsScreen} options={{ title: "알림" }} />
      <UserStack.Screen name="UserIot" component={IotScreen} options={{ title: "스마트 약통" }} />
      <UserStack.Screen name="UserMyPage" component={MyPageScreen} options={{ title: "마이페이지" }} />
    </UserStack.Navigator>
  );
}

function PharmacistTabs() {
  return (
    <PharmTab.Navigator screenOptions={tabOptions}>
      <PharmTab.Screen
        name="PharmDashboardTab"
        component={PharmacistDashboardScreen}
        options={{ title: "대시보드", tabBarIcon: tabIcon("analytics-outline") }}
      />
      <PharmTab.Screen
        name="PharmConsultsTab"
        component={PharmacistConsultsScreen}
        options={{ title: "상담", tabBarIcon: tabIcon("chatbubbles-outline") }}
      />
      <PharmTab.Screen
        name="PharmInventoryTab"
        component={PharmacistInventoryScreen}
        options={{ title: "재고", tabBarIcon: tabIcon("cube-outline") }}
      />
      <PharmTab.Screen
        name="PharmNotificationsTab"
        component={NotificationsScreen}
        options={{ title: "알림", tabBarIcon: tabIcon("notifications-outline") }}
      />
      <PharmTab.Screen
        name="PharmMoreTab"
        component={PharmacistMoreScreen}
        options={{ title: "더보기", tabBarIcon: tabIcon("grid-outline") }}
      />
    </PharmTab.Navigator>
  );
}

function PharmacistNavigator() {
  return (
    <PharmStack.Navigator screenOptions={stackOptions}>
      <PharmStack.Screen name="PharmTabs" component={PharmacistTabs} options={{ headerShown: false }} />
      <PharmStack.Screen name="PharmPatients" component={PharmacistPatientsScreen} options={{ title: "환자 조회" }} />
      <PharmStack.Screen
        name="PharmDrugs"
        options={{ title: "약 검색" }}
      >
        {() => <DrugSearchScreen pharmacist />}
      </PharmStack.Screen>
      <PharmStack.Screen name="PharmNotifications" component={NotificationsScreen} options={{ title: "알림" }} />
      <PharmStack.Screen name="PharmMyPage" options={{ title: "약사 마이페이지" }}>
        {() => <MyPageScreen pharmacist />}
      </PharmStack.Screen>
    </PharmStack.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminTab.Navigator screenOptions={tabOptions}>
      <AdminTab.Screen
        name="AdminDashboardTab"
        component={AdminDashboardScreen}
        options={{ title: "대시보드", tabBarIcon: tabIcon("analytics-outline") }}
      />
      <AdminTab.Screen
        name="AdminMembersTab"
        component={AdminMembersScreen}
        options={{ title: "회원", tabBarIcon: tabIcon("people-outline") }}
      />
      <AdminTab.Screen
        name="AdminPharmacistsTab"
        component={AdminPharmacistsScreen}
        options={{ title: "약사", tabBarIcon: tabIcon("medkit-outline") }}
      />
      <AdminTab.Screen
        name="AdminMoreTab"
        component={AdminMoreScreen}
        options={{ title: "더보기", tabBarIcon: tabIcon("grid-outline") }}
      />
    </AdminTab.Navigator>
  );
}

function RootNavigator() {
  const { hydrated, session } = useAppContext();

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
          gap: 14,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.muted, fontWeight: "700" }}>모바일 화면을 준비하고 있습니다.</Text>
      </View>
    );
  }

  let content = <AuthNavigator />;

  if (session?.role === "ADMIN") {
    content = <AdminNavigator />;
  } else if (session?.role === "PHARMACIST") {
    content =
      session.status && session.status !== "ACTIVE" ? (
        <PharmacistPendingScreen />
      ) : (
        <PharmacistNavigator />
      );
  } else if (session?.role === "USER") {
    content = <UserNavigator />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {content}
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
