import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Producto } from '../lib/almacenamiento';
import { diasRestantes, formatoMexico } from '../lib/fechas';
import { UBICACIONES } from '../constants/opciones';
import { colores, espacios, bordes } from '../constants/colores';

interface FilaProductoProps {
  producto: Producto;
  onPress: () => void;
}

function colorUrgencia(dias: number): string {
  if (dias <= 3) return colores.urgente; 
  if (dias <= 7) return colores.pronto; 
  return colores.tranquilo; 
}


function textoDias(dias: number): string {
  if (dias < -1) return `Caducó hace ${-dias} días`;
  if (dias === -1) return 'Caducó ayer';
  if (dias === 0) return 'Caduca hoy';
  if (dias === 1) return 'Caduca mañana';
  return `Quedan ${dias} días`;
}

const FilaProducto = memo(({ producto, onPress }: FilaProductoProps) => {
  const ubicacion = UBICACIONES.find((u) => u.valor === producto.ubicacion);
  const tieneFecha = producto.fechaCaducidad !== '';
  const dias = tieneFecha ? diasRestantes(producto.fechaCaducidad) : 0;

  return (
    <TouchableOpacity style={styles.fila} onPress={onPress}>
      <View
        style={[
          styles.barra,
          { backgroundColor: tieneFecha ? colorUrgencia(dias) : colores.borde },
        ]}
      />

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
          <Text style={styles.fecha}>{formatoMexico(producto.fechaCaducidad)}</Text>
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
