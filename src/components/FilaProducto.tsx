import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Producto } from '../lib/almacenamiento';
import { formatoMexico } from '../lib/fechas';
import { UBICACIONES } from '../constants/opciones';
import { colores, espacios } from '../constants/colores';

interface FilaProductoProps {
  producto: Producto;
  onPress: () => void;
}

// memo: la fila solo se vuelve a dibujar si su producto cambia
const FilaProducto = memo(({ producto, onPress }: FilaProductoProps) => {
  const ubicacion = UBICACIONES.find((u) => u.valor === producto.ubicacion);

  return (
    <TouchableOpacity style={styles.fila} onPress={onPress}>
      <View style={styles.info}>
        <Text style={styles.nombre}>{producto.nombre}</Text>
        <Text style={styles.detalle}>
          {producto.cantidad} {producto.unidad} · {ubicacion ? ubicacion.texto : producto.ubicacion}
        </Text>
      </View>
      <Text style={styles.fecha}>
        {producto.fechaCaducidad ? formatoMexico(producto.fechaCaducidad) : 'Sin fecha'}
      </Text>
    </TouchableOpacity>
  );
});

export default FilaProducto;

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacios.m,
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
  fecha: {
    fontSize: 14,
    color: colores.texto,
  },
});
