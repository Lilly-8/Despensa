import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

      <View style={styles.acciones}>
        <TouchableOpacity style={styles.accion} onPress={() => confirmarAccion('consumido')}>
          <Ionicons name="restaurant-outline" size={22} color={colores.primario} />
          <Text style={styles.accionTexto}>Me lo comí</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.accion, styles.accionDivisor]}
          onPress={() => confirmarAccion('tirado')}
        >
          <Ionicons name="trash-outline" size={22} color={colores.texto} />
          <Text style={styles.accionTexto}>Lo tiré</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.accion, styles.accionDivisor]}
          onPress={() => confirmarAccion('eliminar')}
        >
          <Ionicons name="close-circle-outline" size={22} color={colores.urgente} />
          <Text style={[styles.accionTexto, styles.accionPeligro]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
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
  acciones: {
    flexDirection: 'row',
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
  },
  accion: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: espacios.s,
  },
  accionDivisor: {
    borderLeftWidth: bordes.grosor,
    borderLeftColor: colores.borde,
  },
  accionTexto: {
    marginTop: espacios.xs,
    fontSize: 14,
    fontWeight: '600',
    color: colores.texto,
  },
  accionPeligro: {
    color: colores.urgente,
  },
});
