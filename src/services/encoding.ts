const WINDOWS_1252_TO_UTF8: Record<number, string> = {
  0xe4: 'ä', 0xc4: 'Ä',
  0xf6: 'ö', 0xd6: 'Ö',
  0xfc: 'ü', 0xdc: 'Ü',
  0xdf: 'ß',
  0xe0: 'à', 0xc0: 'À',
  0xe1: 'á', 0xc1: 'Á',
  0xe2: 'â', 0xc2: 'Â',
  0xe3: 'ã', 0xc3: 'Ã',
  0xe5: 'å', 0xc5: 'Å',
  0xe6: 'æ', 0xc6: 'Æ',
  0xe7: 'ç', 0xc7: 'Ç',
  0xe8: 'è', 0xc8: 'È',
  0xe9: 'é', 0xc9: 'É',
  0xea: 'ê', 0xca: 'Ê',
  0xeb: 'ë', 0xcb: 'Ë',
  0xec: 'ì', 0xcc: 'Ì',
  0xed: 'í', 0xcd: 'Í',
  0xee: 'î', 0xce: 'Î',
  0xef: 'ï', 0xcf: 'Ï',
  0xf0: 'ð', 0xd0: 'Ð',
  0xf1: 'ñ', 0xd1: 'Ñ',
  0xf2: 'ò', 0xd2: 'Ò',
  0xf3: 'ó', 0xd3: 'Ó',
  0xf4: 'ô', 0xd4: 'Ô',
  0xf5: 'õ', 0xd5: 'Õ',
  0xf7: '÷', 0xd7: '×',
  0xf8: 'ø', 0xd8: 'Ø',
  0xf9: 'ù', 0xd9: 'Ù',
  0xfa: 'ú', 0xda: 'Ú',
  0xfb: 'û', 0xdb: 'Û',
  0xfd: 'ý', 0xdd: 'Ý',
  0xfe: 'þ', 0xde: 'Þ',
  0xff: 'ÿ', 0x9f: 'Ÿ',
}

export function convertWindows1252ToUtf8(buffer: Uint8Array): string {
  let result = ''
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i]
    if (WINDOWS_1252_TO_UTF8[byte]) {
      result += WINDOWS_1252_TO_UTF8[byte]
    } else if (byte >= 0x20 && byte <= 0x7e) {
      result += String.fromCharCode(byte)
    } else if (byte === 0x0a) {
      result += '\n'
    } else if (byte === 0x0d) {
      result += '\r'
    } else if (byte === 0x09) {
      result += '\t'
    } else {
      result += String.fromCharCode(byte)
    }
  }
  return result
}

export function fixGermanEncoding(text: string): string {
  if (!text || typeof text !== 'string') return text

  if (text.includes('\ufffd')) {
    const encodingFixes: Record<string, string> = {
      'gem\ufffdss': 'gemäß',
      'f\ufffdr': 'für',
      'Veterin\ufffdrwesen': 'Veterinärwesen',
      'Bundesamt f\ufffdr Lebensmittelsicherheit und Veterin\ufffdrwesen':
        'Bundesamt für Lebensmittelsicherheit und Veterinärwesen',
    }

    let fixedText = text
    for (const [corrupted, correct] of Object.entries(encodingFixes)) {
      const escaped = corrupted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      fixedText = fixedText.replace(new RegExp(escaped, 'g'), correct)
    }
    return fixedText
  }

  return text
}
