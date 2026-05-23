import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";

import { AppProvider, useAppContext } from "./src/context/AppContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SignupScreen } from "./src/screens/SignupScreen";
import { MedicineSearchScreen } from "./src/screens/MedicineSearchScreen";
import { CautionsScreen } from "./src/screens/CautionsScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { ScheduleScreen } from "./src/screens/ScheduleScreen";
import { MyPageScreen } from "./src/screens/MyPageScreen";

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { color: "#10332b", fontWeight: "700" },
        tabBarActiveTintColor: "#0f766e",
        tabBarInactiveTintColor: "#7c948d",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#d9e7e2",
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen name="약 검색" component={MedicineSearchScreen} />
      <Tab.Screen name="주의 약" component={CautionsScreen} />
      <Tab.Screen name="챗봇" component={ChatScreen} />
      <Tab.Screen name="복약 일정" component={ScheduleScreen} />
      <Tab.Screen name="내 정보" component={MyPageScreen} />
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
          <AuthStack.Screen name="로그인" component={LoginScreen} />
          <AuthStack.Screen name="회원가입" component={SignupScreen} />
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
