import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Producto } from '../lib/almacenamiento';
import { diasRestantes, formatoMexico, nivelUrgencia } from '../lib/fechas';
import { UBICACIONES } from '../constants/opciones';
import { colores, espacios, bordes } from '../constants/colores';

interface FilaProductoProps {
  producto: Producto;
  onPress: () => void;
  onLongPress?: () => void; // mantener pulsado (selección múltiple en Despensa)
  seleccionado?: boolean;
}

function colorUrgencia(dias: number): string {
  return colores[nivelUrgencia(dias)];
}


function textoDias(dias: number): string {
  if (dias < -1) return `Caducó hace ${-dias} días`;
  if (dias === -1) return 'Caducó ayer';
  if (dias === 0) return 'Caduca hoy';
  if (dias === 1) return 'Caduca mañana';
  return `Quedan ${dias} días`;
}

// Función con nombre dentro de memo, para que el componente tenga nombre en los errores
const FilaProducto = memo(function FilaProducto({
  producto,
  onPress,
  onLongPress,
  seleccionado,
}: FilaProductoProps) {
  const ubicacion = UBICACIONES.find((u) => u.valor === producto.ubicacion);
  const tieneFecha = producto.fechaCaducidad !== '';
  const dias = tieneFecha ? diasRestantes(producto.fechaCaducidad) : 0;

  return (
    <TouchableOpacity
      style={[styles.fila, seleccionado && styles.filaSeleccionada]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View
        style={[
          styles.barra,
          { backgroundColor: tieneFecha ? colorUrgencia(dias) : colores.borde },
        ]}
      />

      {seleccionado ? (
        <Ionicons
          name="checkmark-circle-outline"
          size={24}
          color={colores.primario}
          style={styles.check}
        />
      ) : null}

      <View style={styles.info}>
        <Text style={styles.nombre}>{producto.nombre}</Text>
        <Text style={styles.detalle}>
          {producto.cantidad} {producto.unidad} · {ubicacion ? ubicacion.texto : producto.ubicacion}
        </Text>
      </View>

      <View style={styles.caducidad}>
        <Text style={[styles.dias, tieneFecha && dias <= 3 ? styles.diasUrgente : null]}>
          {tieneFecha ? textoDias(dias) : 'Sin fecha'}
        </Text>
        {tieneFecha ? (
          <Text style={styles.fecha}>
            {formatoMexico(producto.fechaCaducidad)}
            {/* La puso la app (tabla de vida útil), no viene impresa */}
            {producto.fechaEstimada ? ' · estimada' : ''}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

export default FilaProducto;

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacios.m,
    // El fondo de seleccionado se sale un poco a los lados sin mover el contenido
    marginHorizontal: -espacios.s,
    paddingHorizontal: espacios.s,
  },
  filaSeleccionada: {
    backgroundColor: colores.superficie,
  },
  check: {
    marginRight: espacios.s,
  },
  barra: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: bordes.radio,
    marginRight: espacios.m,
  },
  info: {
    flex: 1,
    marginRight: espacios.m,
  },
  nombre: {
    fontSize: 17,
    fontWeight: '600',
    color: colores.texto,
    marginBottom: espacios.xs,
  },
  detalle: {
    fontSize: 14,
    color: colores.textoSuave,
  },
  caducidad: {
    alignItems: 'flex-end',
  },
  dias: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.texto,
    marginBottom: espacios.xs,
  },
  diasUrgente: {
    color: colores.urgente,
  },
  fecha: {
    fontSize: 13,
    color: colores.textoSuave,
  },
});
