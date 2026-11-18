import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Boton from '../components/Boton';
import { buscarProductoPorCodigo } from '../lib/openFoodFacts';
import { guardarDatosDeCodigo, leerDatosDeCodigo } from '../lib/almacenamiento';
import { colores, espacios, bordes } from '../constants/colores';

// Los códigos de los productos del súper:
// ean13 (casi todos en México, empiezan con 750), ean8 (productos chicos),
// upc_a y upc_e (productos de Estados Unidos)
const TIPOS_DE_CODIGO: ('ean13' | 'ean8' | 'upc_a' | 'upc_e')[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
];

export default function EscanerScreen({ navigation }: any) {
  // permiso: null mientras se consulta; luego trae granted y canAskAgain
  const [permiso, pedirPermiso, revisarPermiso] = useCameraPermissions();
  const [codigo, setCodigo] = useState(''); // '' = todavía no se lee nada

  // La cámara puede avisar el mismo código varias veces seguidas, antes de que
  // React vuelva a dibujar la pantalla. Un ref cambia al instante (no espera
  // al siguiente render), así que solo la primera lectura busca el producto.
  const yaLeyo = useRef(false);

  // Al volver de la configuración del teléfono, revisar otra vez el permiso
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') revisarPermiso();
    });

    return () => sub.remove();
  }, [revisarPermiso]);

  // Se llama cuando la cámara reconoce un código
  const leerCodigo = async ({ data }: { data: string }) => {
    if (yaLeyo.current) return;
    yaLeyo.current = true;
    setCodigo(data);

    // replace: al guardar o regresar se vuelve a Despensa, no al escáner.

    // 1. ¿Ya lo conocemos? Instantáneo, sin internet y con lo que eligió el
    //    usuario la última vez (nombre, categoría, ubicación y unidad)
    const guardado = await leerDatosDeCodigo(data);
    if (guardado) {
      navigation.replace('Producto', {
        codigoBarras: data,
        nombre: guardado.nombre,
        categoria: guardado.categoria,
        ubicacion: guardado.ubicacion,
        unidad: guardado.unidad,
        desdeCache: true,
      });
      return;
    }

    // 2. Si no, buscarlo en Open Food Facts. En cualquier caso se abre el
    //    formulario con el código; si no hay nombre, con un aviso.
    try {
      const encontrado = await buscarProductoPorCodigo(data);
      if (encontrado) {
        // Se recuerda aunque el usuario no llegue a guardar el producto
        await guardarDatosDeCodigo(data, encontrado);
        navigation.replace('Producto', {
          codigoBarras: data,
          nombre: encontrado.nombre,
          categoria: encontrado.categoria,
          ubicacion: encontrado.ubicacion,
        });
      } else {
        navigation.replace('Producto', {
          codigoBarras: data,
          avisoCodigo: 'Este código no está en Open Food Facts. Escribe el nombre del producto.',
        });
      }
    } catch (error: any) {
      navigation.replace('Producto', {
        codigoBarras: data,
        avisoCodigo: error.message + ' Escribe el nombre del producto.',
      });
    }
  };

  // Sin permiso o si no quiere usar la cámara: el formulario normal
  const escribirAMano = () => {
    navigation.replace('Producto');
  };

  // Todavía no se sabe si hay permiso (son milisegundos)
  if (!permiso) {
    return <View style={styles.contenedorPermiso} />;
  }

  // Sin permiso: primero se explica para qué, y luego se pide
  if (!permiso.granted) {
    return (
      <View style={styles.contenedorPermiso}>
        <Ionicons name="barcode-outline" size={40} color={colores.primario} />
        <Text style={styles.permisoTitulo}>Escanea el código de barras</Text>

        {permiso.canAskAgain ? (
          <Text style={styles.permisoTexto}>
            Usamos la cámara solo para leer el código del producto y llenar su nombre por ti.
            Funciona mientras estás en esta pantalla y no se guarda ninguna foto.
          </Text>
        ) : (
          // Ya dijo que no y el teléfono no deja volver a preguntar
          <Text style={styles.permisoTexto}>
            El permiso de cámara está desactivado. Puedes activarlo en la configuración del
            teléfono o escribir el producto a mano.
          </Text>
        )}

        <View style={styles.permisoBotones}>
          {permiso.canAskAgain ? (
            <Boton texto="Permitir cámara" onPress={pedirPermiso} />
          ) : (
            <Boton
              texto="Abrir configuración del teléfono"
              onPress={() => Linking.openSettings()}
            />
          )}
          <Boton texto="Escribir a mano" onPress={escribirAMano} secundario />
        </View>
      </View>
    );
  }

  // Con permiso: la cámara arriba y lo leído abajo
  return (
    <View style={styles.contenedor}>
      <CameraView
        style={styles.camara}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: TIPOS_DE_CODIGO }}
        onBarcodeScanned={codigo ? undefined : leerCodigo}
      />

      <View style={styles.panel}>
        {codigo ? (
          <View>
            <Text style={styles.panelEtiqueta}>Código leído</Text>
            <Text style={styles.codigo}>{codigo}</Text>
            <View style={styles.buscando}>
              <ActivityIndicator size="small" color={colores.primario} />
              <Text style={styles.panelTexto}>Buscando el producto…</Text>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.panelEtiqueta}>Buscando código…</Text>
            <Text style={styles.panelTexto}>
              Apunta la cámara al código de barras del producto.
            </Text>
          </View>
        )}
        <Text style={styles.fuente}>Datos de Open Food Facts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  camara: {
    flex: 1,
  },
  panel: {
    padding: espacios.l,
    paddingBottom: espacios.xl,
    borderTopWidth: bordes.grosor,
    borderTopColor: colores.borde,
    backgroundColor: colores.fondo,
  },
  panelEtiqueta: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colores.primario,
    marginBottom: espacios.s,
  },
  panelTexto: {
    fontSize: 16,
    lineHeight: 24,
    color: colores.textoSuave,
  },
  codigo: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
    color: colores.texto,
    marginBottom: espacios.s,
  },
  buscando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s,
  },
  // Crédito a la fuente de los nombres, discreto
  fuente: {
    fontSize: 12,
    color: colores.textoSuave,
    marginTop: espacios.m,
  },
  contenedorPermiso: {
    flex: 1,
    backgroundColor: colores.fondo,
    padding: espacios.l,
    paddingTop: espacios.xxl,
  },
  permisoTitulo: {
    fontSize: 24,
    fontWeight: '700',
    color: colores.texto,
    marginTop: espacios.m,
    marginBottom: espacios.s,
  },
  permisoTexto: {
    fontSize: 16,
    lineHeight: 24,
    color: colores.textoSuave,
  },
  permisoBotones: {
    marginTop: espacios.l,
    gap: espacios.s,
  },
});
