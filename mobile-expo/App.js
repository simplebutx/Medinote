"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var native_1 = require("@react-navigation/native");
var bottom_tabs_1 = require("@react-navigation/bottom-tabs");
var native_stack_1 = require("@react-navigation/native-stack");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var expo_status_bar_1 = require("expo-status-bar");
var react_native_1 = require("react-native");
var vector_icons_1 = require("@expo/vector-icons");
var AppContext_1 = require("./src/context/AppContext");
var LoginScreen_1 = require("./src/screens/LoginScreen");
var SignupScreen_1 = require("./src/screens/SignupScreen");
var MedicineSearchScreen_1 = require("./src/screens/MedicineSearchScreen");
var CautionsScreen_1 = require("./src/screens/CautionsScreen");
var ChatScreen_1 = require("./src/screens/ChatScreen");
var ScheduleScreen_1 = require("./src/screens/ScheduleScreen");
var MyPageScreen_1 = require("./src/screens/MyPageScreen");
var ui_1 = require("./src/ui");
var AuthStack = (0, native_stack_1.createNativeStackNavigator)();
var Tab = (0, bottom_tabs_1.createBottomTabNavigator)();
var MyStack = (0, native_stack_1.createNativeStackNavigator)();
var theme = __assign(__assign({}, native_1.DefaultTheme), { colors: __assign(__assign({}, native_1.DefaultTheme.colors), { background: "#f3f7f6", card: "#ffffff", text: "#10332b", border: "#d9e7e2", primary: "#0f766e" }) });
function TemporaryTabScreen() {
    return (<ui_1.Screen>
      <ui_1.SectionCard title="준비 중" subtitle="이 탭은 다음 기능을 위한 임시 자리입니다.">
        <react_native_1.Text style={{ color: "#547066", lineHeight: 22 }}>
          추후 필요한 기능이 정리되면 이 자리에 연결할 예정입니다.
        </react_native_1.Text>
      </ui_1.SectionCard>
    </ui_1.Screen>);
}
function MyPageStack() {
    return (<MyStack.Navigator screenOptions={{
            headerStyle: { backgroundColor: "#ffffff" },
            headerTitleStyle: { color: "#10332b", fontWeight: "700" },
        }}>
      <MyStack.Screen name="MyPageHome" component={MyPageScreen_1.MyPageScreen} options={{ title: "내 정보" }}/>
      <MyStack.Screen name="MyCautions" component={CautionsScreen_1.CautionsScreen} options={{ title: "주의 약/성분 관리" }}/>
    </MyStack.Navigator>);
}
function MainTabs() {
    return (<Tab.Navigator screenOptions={function (_a) {
            var route = _a.route;
            return ({
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
                tabBarIcon: function (_a) {
                    var color = _a.color, size = _a.size, focused = _a.focused;
                    var iconSize = focused ? size + 2 : size;
                    switch (route.name) {
                        case "SearchTab":
                            return <vector_icons_1.Ionicons name="search-outline" size={iconSize} color={color}/>;
                        case "TempTab":
                            return <vector_icons_1.Ionicons name="ellipse-outline" size={iconSize} color={color}/>;
                        case "ChatTab":
                            return <vector_icons_1.Ionicons name="chatbubble-ellipses-outline" size={iconSize} color={color}/>;
                        case "ScheduleTab":
                            return <vector_icons_1.Ionicons name="calendar-outline" size={iconSize} color={color}/>;
                        case "MyTab":
                            return <vector_icons_1.Ionicons name="person-circle-outline" size={iconSize} color={color}/>;
                        default:
                            return <vector_icons_1.Ionicons name="help-circle-outline" size={iconSize} color={color}/>;
                    }
                },
            });
        }}>
      <Tab.Screen name="SearchTab" component={MedicineSearchScreen_1.MedicineSearchScreen} options={{ title: "약 검색" }}/>
      <Tab.Screen name="TempTab" component={TemporaryTabScreen} options={{ title: "준비 중" }}/>
      <Tab.Screen name="ChatTab" component={ChatScreen_1.ChatScreen} options={{ title: "챗봇" }}/>
      <Tab.Screen name="ScheduleTab" component={ScheduleScreen_1.ScheduleScreen} options={{ title: "복약 일정" }}/>
      <Tab.Screen name="MyTab" component={MyPageStack} options={{ headerShown: false, title: "내 정보" }}/>
    </Tab.Navigator>);
}
function RootNavigator() {
    var _a = (0, AppContext_1.useAppContext)(), session = _a.session, hydrated = _a.hydrated;
    if (!hydrated) {
        return (<react_native_1.View style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f3f7f6",
                gap: 14,
            }}>
        <react_native_1.ActivityIndicator size="large" color="#0f766e"/>
        <react_native_1.Text style={{ color: "#335c52", fontSize: 16 }}>모바일 앱을 준비하는 중입니다.</react_native_1.Text>
      </react_native_1.View>);
    }
    return (<native_1.NavigationContainer theme={theme}>
      {session ? (<MainTabs />) : (<AuthStack.Navigator screenOptions={{
                headerStyle: { backgroundColor: "#ffffff" },
                headerTitleStyle: { color: "#10332b", fontWeight: "700" },
            }}>
          <AuthStack.Screen name="로그인" component={LoginScreen_1.LoginScreen}/>
          <AuthStack.Screen name="회원가입" component={SignupScreen_1.SignupScreen}/>
        </AuthStack.Navigator>)}
      <expo_status_bar_1.StatusBar style="dark"/>
    </native_1.NavigationContainer>);
}
function App() {
    return (<react_native_safe_area_context_1.SafeAreaProvider>
      <AppContext_1.AppProvider>
        <RootNavigator />
      </AppContext_1.AppProvider>
    </react_native_safe_area_context_1.SafeAreaProvider>);
}
