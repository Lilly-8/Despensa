import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { colores, espacios, bordes } from '../constants/colores';

interface CampoTextoProps {
  etiqueta: string;
  value: string;
  onChangeText: (texto: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string; 
  keyboardType?: KeyboardTypeOptions;
}

export default function CampoTexto({
  etiqueta,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  keyboardType,
}: CampoTextoProps) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colores.textoSuave}
        keyboardType={keyboardType}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginBottom: espacios.m,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.texto,
    marginBottom: espacios.xs,
  },
  input: {
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
    backgroundColor: colores.superficie,
    paddingVertical: espacios.s + espacios.xs,
    paddingHorizontal: espacios.m,
    fontSize: 16,
    color: colores.texto,
  },
  inputError: {
    borderColor: colores.urgente,
  },
  error: {
    fontSize: 13,
    color: colores.urgente,
    marginTop: espacios.xs,
  },
});
