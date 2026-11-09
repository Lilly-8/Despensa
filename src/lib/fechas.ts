export function fechaATexto(fecha: Date): string {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

export function textoAFecha(texto: string): Date {
  const [año, mes, dia] = texto.split('-').map(Number);
  return new Date(año, mes - 1, dia);
}

export function hoy(): string {
  return fechaATexto(new Date());
}

export function sumarDias(texto: string, dias: number): string {
  const fecha = textoAFecha(texto);
  fecha.setDate(fecha.getDate() + dias);
  return fechaATexto(fecha);
}


export function diasRestantes(texto: string): number {
  const fecha = textoAFecha(texto);
  const hoyFecha = textoAFecha(hoy());
  const MS_POR_DIA = 1000 * 60 * 60 * 24;
  return Math.round((fecha.getTime() - hoyFecha.getTime()) / MS_POR_DIA);
}

export function formatoMexico(texto: string): string {
  if (!texto) return '';
  const [año, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${año}`;
}
