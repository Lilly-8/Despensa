import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AccionesProducto from './AccionesProducto';
import { cambiarEstadoVarios, eliminarVarios } from '../lib/almacenamiento';
import { reprogramarAvisos } from '../lib/notificaciones';
import { colores, espacios, bordes } from '../constants/colores';

interface BarraSeleccionProps {
  seleccionados: string[]; // ids de los productos marcados
  onCancelar: () => void; // la ✕: sale del modo selección sin hacer nada
  onTerminar: () => void; // después de guardar, para que la pantalla recargue
}

// Barra de abajo para la selección múltiple (Inicio y Despensa).
// Pregunta una sola vez y aplica la acción a todos los seleccionados.
export default function BarraSeleccion({ seleccionados, onCancelar, onTerminar }: BarraSeleccionProps) {
  const n = seleccionados.length;

  const confirmarAccion = (accion: 'consumido' | 'tirado' | 'eliminar') => {
    const productosTexto = n === 1 ? '1 producto' : `${n} productos`;

    let titulo = '';
    let mensaje = '';
    if (accion === 'consumido') {
      titulo = 'Me lo comí';
      mensaje = `¿Marcar ${productosTexto} como consumidos? Saldrán de tu despensa.`;
    } else if (accion === 'tirado') {
      titulo = 'Lo tiré';
      mensaje = `¿Marcar ${productosTexto} como tirados? Saldrán de tu despensa y contarán como desperdicio.`;
    } else {
      titulo = 'Eliminar productos';
      mensaje = `¿Seguro que quieres eliminar ${productosTexto}? No contarán en tu resumen y no se puede deshacer.`;
    }

    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: accion === 'eliminar' ? 'Eliminar' : 'Sí, marcar',
        style: accion === 'eliminar' ? 'destructive' : 'default',
        onPress: () => aplicarAccion(accion),
      },
    ]);
  };

  const aplicarAccion = async (accion: 'consumido' | 'tirado' | 'eliminar') => {
    try {
      if (accion === 'eliminar') {
        await eliminarVarios(seleccionados);
      } else {
        await cambiarEstadoVarios(seleccionados, accion);
      }
      // Ya no están en la despensa: salen de los avisos
      await reprogramarAvisos();
    } catch (error) {
      console.error('Error al aplicar la acción a los seleccionados:', error);
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
      return;
    }

    onTerminar();
  };

  return (
    <View style={styles.barra}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>{n === 1 ? '1 seleccionado' : `${n} seleccionados`}</Text>
        <TouchableOpacity onPress={onCancelar}>
          <Ionicons name="close-outline" size={26} color={colores.textoSuave} />
        </TouchableOpacity>
      </View>

      <AccionesProducto
        onComi={() => confirmarAccion('consumido')}
        onTire={() => confirmarAccion('tirado')}
        onEliminar={() => confirmarAccion('eliminar')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Pegada abajo, separada de la lista con un borde fino
  barra: {
    borderTopWidth: bordes.grosor,
    borderTopColor: colores.borde,
    paddingTop: espacios.s,
    paddingBottom: espacios.m,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espacios.s,
  },
  titulo: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colores.texto,
  },
});
