// Prepara un texto para comparar: minúsculas, sin espacios a los lados
// y sin acentos ("Plátano" → "platano"). La ñ se queda igual.
// La usan la búsqueda de Despensa y el aviso de duplicados de Compras.
export function normalizarTexto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ü/g, 'u');
}
