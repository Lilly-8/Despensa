import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';


export const CANAL_CADUCIDAD = 'caducidad';
const CLAVE_PREGUNTADO = 'permisoNotificacionesPreguntado';

export async function configurarNotificaciones(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true, 
      shouldSetBadge: false,
    }),
  });


  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_CADUCIDAD, {
      name: 'Caducidad',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

function mostrarExplicacion(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      '¿Te avisamos antes de que caduque?',
      'Te mandaremos un aviso unos días antes de que caduque cada producto, para que lo uses a tiempo.',
      [
        { text: 'Ahora no', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Sí, avisarme', onPress: () => resolve(true) },
      ],
      { cancelable: false } 
    );
  });
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  try {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;

    const preguntado = await AsyncStorage.getItem(CLAVE_PREGUNTADO);
    if (preguntado || !actual.canAskAgain) return false;

    await AsyncStorage.setItem(CLAVE_PREGUNTADO, 'si');

    const acepta = await mostrarExplicacion();
    if (!acepta) return false;

    const nuevo = await Notifications.requestPermissionsAsync();
    if (!nuevo.granted) {
      Alert.alert(
        'Avisos desactivados',
        'La app seguirá funcionando igual. Si cambias de opinión, podrás activarlos desde Ajustes.'
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error al pedir permiso de notificaciones:', error);
    return false;
  }
}
