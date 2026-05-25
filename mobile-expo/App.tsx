import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProvider, useAppContext } from "./src/context/AppContext";
import { CautionsScreen } from "./src/screens/CautionsScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import {
  AccountDeleteScreen,
  FaqScreen,
  NotificationsScreen,
  PrescriptionUploadScreen,
} from "./src/screens/ExtraScreens";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MedicineSearchScreen } from "./src/screens/MedicineSearchScreen";
import { MyPageScreen } from "./src/screens/MyPageScreen";
import {
  MyScheduleListScreen,
  ScheduleCalendarScreen,
  ScheduleFormScreen,
} from "./src/screens/ScheduleScreen";
import { SignupScreen } from "./src/screens/SignupScreen";

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MyStack = createNativeStackNavigator();
const ScheduleStack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#f3f7f6",
    card: "#ffffff",
    text: "#10332b",
    border: "#d9e7e2",
    primary: "#0f766e",
  },
};

function MyPageStack() {
  return (
    <MyStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { color: "#10332b", fontWeight: "700" },
      }}
    >
      <MyStack.Screen name="MyPageHome" component={MyPageScreen} options={{ title: "내 정보" }} />
      <MyStack.Screen
        name="MyCautions"
        component={CautionsScreen}
        options={{ title: "주의 약/성분 관리" }}
      />
      <MyStack.Screen
        name="MySchedules"
        component={MyScheduleListScreen}
        options={{ title: "전체 일정 목록" }}
      />
      <MyStack.Screen
        name="MyScheduleForm"
        component={ScheduleFormScreen}
        options={{ title: "복약 일정 수정" }}
      />
      <MyStack.Screen name="MyFaq" component={FaqScreen} options={{ title: "FAQ" }} />
      <MyStack.Screen name="MyNotifications" component={NotificationsScreen} options={{ title: "알림" }} />
      <MyStack.Screen name="AccountDelete" component={AccountDeleteScreen} options={{ title: "회원 탈퇴" }} />
    </MyStack.Navigator>
  );
}

function ScheduleTabStack() {
  return (
    <ScheduleStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { color: "#10332b", fontWeight: "700" },
        gestureEnabled: true,
      }}
    >
      <ScheduleStack.Screen
        name="ScheduleCalendar"
        component={ScheduleCalendarScreen}
        options={{ title: "복약 일정" }}
      />
      <ScheduleStack.Screen
        name="ScheduleForm"
        component={ScheduleFormScreen}
        options={{ title: "복약 일정 등록" }}
      />
    </ScheduleStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { color: "#10332b", fontWeight: "700" },
        tabBarActiveTintColor: "#0f766e",
        tabBarInactiveTintColor: "#7c948d",
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#d9e7e2",
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const iconSize = focused ? size + 2 : size;

          switch (route.name) {
            case "SearchTab":
              return <Ionicons name="search-outline" size={iconSize} color={color} />;
            case "ScheduleTab":
              return <Ionicons name="calendar-outline" size={iconSize} color={color} />;
            case "ChatTab":
              return <Ionicons name="chatbubble-ellipses-outline" size={iconSize} color={color} />;
            case "UploadTab":
              return <Ionicons name="cloud-upload-outline" size={iconSize} color={color} />;
            case "MyTab":
              return <Ionicons name="person-circle-outline" size={iconSize} color={color} />;
            default:
              return <Ionicons name="help-circle-outline" size={iconSize} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen name="SearchTab" component={MedicineSearchScreen} options={{ title: "약 검색" }} />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleTabStack}
        options={{ headerShown: false, title: "복약 일정" }}
      />
      <Tab.Screen name="ChatTab" component={ChatScreen} options={{ title: "챗봇" }} />
      <Tab.Screen
        name="UploadTab"
        component={PrescriptionUploadScreen}
        options={{ title: "처방전 업로드" }}
      />
      <Tab.Screen
        name="MyTab"
        component={MyPageStack}
        options={{ headerShown: false, title: "내 정보" }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, hydrated } = useAppContext();

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f7f6",
          gap: 14,
        }}
      >
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={{ color: "#335c52", fontSize: 16 }}>모바일 앱을 준비하는 중입니다.</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      {session ? (
        <MainTabs />
      ) : (
        <AuthStack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#ffffff" },
            headerTitleStyle: { color: "#10332b", fontWeight: "700" },
          }}
        >
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: "로그인" }} />
          <AuthStack.Screen name="Signup" component={SignupScreen} options={{ title: "회원가입" }} />
        </AuthStack.Navigator>
      )}
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
