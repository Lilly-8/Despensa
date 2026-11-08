import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import InicioScreen from './src/screens/InicioScreen';
import DespensaScreen from './src/screens/DespensaScreen';
import RecetasScreen from './src/screens/RecetasScreen';
import ComprasScreen from './src/screens/ComprasScreen';
import ProductoScreen from './src/screens/ProductoScreen';
import { colores, bordes } from './src/constants/colores';

type TabParamList = {
  Inicio: undefined;
  Despensa: undefined;
  Recetas: undefined;
  Compras: undefined;
};

type RootStackParamList = {
  MainTabs: undefined;
  Producto: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarStyle: {
          backgroundColor: colores.fondo,
          borderTopWidth: bordes.grosor,
          borderTopColor: colores.borde,
          elevation: 0,
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={InicioScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Despensa"
        component={DespensaScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="file-tray-stacked-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Recetas"
        component={RecetasScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Compras"
        component={ComprasScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Producto"
            component={ProductoScreen}
            options={{
              title: 'Agregar producto',
              headerStyle: { backgroundColor: colores.fondo },
              headerTintColor: colores.primario,
              headerTitleStyle: { color: colores.texto },
              headerShadowVisible: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
