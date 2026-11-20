import { useEffect } from 'react';
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
import AjustesScreen from './src/screens/AjustesScreen';
import RecetaScreen from './src/screens/RecetaScreen';
import EscanerScreen from './src/screens/EscanerScreen';
import PasarDespensaScreen from './src/screens/PasarDespensaScreen';
import { Receta } from './src/lib/recetas';
import { colores, bordes } from './src/constants/colores';
import { configurarNotificaciones } from './src/lib/notificaciones';

type TabParamList = {
  Inicio: undefined;
  Despensa: undefined;
  Recetas: undefined;
  Compras: undefined;
};

type RootStackParamList = {
  MainTabs: undefined;
  // id = editar un producto. itemCompraId + nombre/cantidad/unidad = pasar
  // un item de la lista de compras a la despensa. codigoBarras (+ nombre o
  // avisoCodigo) = viene del escáner. Sin nada = agregar uno nuevo.
  Producto:
    | {
        id?: string;
        itemCompraId?: string;
        nombre?: string;
        cantidad?: number;
        unidad?: string;
        categoria?: string;
        ubicacion?: 'refrigerador' | 'congelador' | 'alacena';
        codigoBarras?: string;
        avisoCodigo?: string;
        desdeCache?: boolean; // el nombre salió de cache_codigos
      }
    | undefined;
  Ajustes: undefined;
  Receta: { receta: Receta }; // la receta completa, desde RecetasScreen
  Escaner: undefined;
  PasarDespensa: undefined; // revisión de los comprados, desde Compras
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

  useEffect(() => {
    configurarNotificaciones();
  }, []);

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
            options={({ route }) => ({
              title: route.params?.id ? 'Editar producto' : 'Agregar producto',
              headerStyle: { backgroundColor: colores.fondo },
              headerTintColor: colores.primario,
              headerTitleStyle: { color: colores.texto },
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="Ajustes"
            component={AjustesScreen}
            options={{
              title: 'Ajustes',
              headerStyle: { backgroundColor: colores.fondo },
              headerTintColor: colores.primario,
              headerTitleStyle: { color: colores.texto },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Receta"
            component={RecetaScreen}
            options={{
              title: 'Receta', // el título largo va dentro de la pantalla
              headerStyle: { backgroundColor: colores.fondo },
              headerTintColor: colores.primario,
              headerTitleStyle: { color: colores.texto },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Escaner"
            component={EscanerScreen}
            options={{
              title: 'Escanear código',
              headerStyle: { backgroundColor: colores.fondo },
              headerTintColor: colores.primario,
              headerTitleStyle: { color: colores.texto },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="PasarDespensa"
            component={PasarDespensaScreen}
            options={{
              title: 'Pasar a la despensa',
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
