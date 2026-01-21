// Metadatos de voces en español con información extendida
export interface VoiceMetadata {
  name: string;
  gender: string;
  age: string;
  accent: string;
  language: string;
  category: string;
  descriptive: string;
}

export const voiceMetadata: Record<string, VoiceMetadata> = {
  // Voces masculinas
  '57D8YIbQSuE3REDPO6Vm': { name: 'Horacio - Safe & Reliable', gender: 'Masculino', age: 'Mediana edad', accent: 'Colombiano', language: 'Español', category: 'professional', descriptive: 'Confiado' },
  'sdxJtmxpzgSLekrYUGIu': { name: 'Damian Tutorial', gender: 'Masculino', age: 'Mediana edad', accent: 'Colombiano', language: 'Español', category: 'professional', descriptive: 'Formal' },
  '6BEk9bRlUBhlAoIbhBYK': { name: 'ArthisRap Pro', gender: 'Masculino', age: 'Joven', accent: 'Mexicano', language: 'Español', category: 'professional', descriptive: 'Profesional' },
  'nNS8uylvF9GBWVSiIt5h': { name: 'Cristian Cornejo', gender: 'Masculino', age: 'Mediana edad', accent: 'Chileno', language: 'Español', category: 'professional', descriptive: 'Confiado' },
  '0cheeVA5B3Cv6DGq65cT': { name: 'Alejandro - Conversations', gender: 'Masculino', age: 'Joven', accent: 'Chileno', language: 'Español', category: 'professional', descriptive: 'Casual' },
  'KqSsYz0buWgkvSbaGn1n': { name: 'Agustin - Argentino', gender: 'Masculino', age: 'Mediana edad', accent: 'Argentino', language: 'Español', category: 'professional', descriptive: 'Confiado' },

  // Voces femeninas
  '86V9x9hrQds83qf7zaGn': { name: 'Marcela - Colombian Girl', gender: 'Femenino', age: 'Joven', accent: 'Colombiano', language: 'Español', category: 'professional', descriptive: 'Relajada' },
  'VmejBeYhbrcTPwDniox7': { name: 'Lina - Carefree & Fresh', gender: 'Femenino', age: 'Joven', accent: 'Colombiano', language: 'Español', category: 'professional', descriptive: 'Casual' },
  'b2htR0pMe28pYwCY9gnP': { name: 'Sofía – Soft & Warm', gender: 'Femenino', age: 'Joven', accent: 'Colombiano', language: 'Español', category: 'professional', descriptive: 'Agradable' },
  'KoIf2KgeJA8uoGcgKIao': { name: 'Marcela - Positive', gender: 'Femenino', age: 'Joven', accent: 'Colombiano', language: 'Español', category: 'professional', descriptive: 'Confiada' },
  'SplyIQAjgy4DKGAnOrHi': { name: 'Clau Bogotá - Natural & Neutral', gender: 'Femenino', age: 'Mediana edad', accent: 'Colombiano', language: 'Español', category: 'professional', descriptive: 'Casual' },
  'IOyj8WtBHdke2FjQgGAr': { name: 'Serena AI', gender: 'Femenino', age: 'Joven', accent: 'Colombiano', language: 'Español', category: 'professional', descriptive: 'Tranquila' },
  'x6LHvMgpXmty838MUqHh': { name: 'Pilar Durán', gender: 'Femenino', age: 'Mediana edad', accent: 'Colombiano', language: 'Español', category: 'professional', descriptive: 'Agradable' },
  'rixsIpPlTphvsJd2mI03': { name: 'Isabel - Neutral Latino', gender: 'Femenino', age: 'Joven', accent: 'Mexicano', language: 'Español', category: 'professional', descriptive: 'Neutral' },
  'iBGVhgcEZS6A5gTOjqSJ': { name: 'Gabiyoya', gender: 'Femenino', age: 'Mediana edad', accent: 'Mexicano', language: 'Español', category: 'professional', descriptive: 'Tranquila' },
  'FIhWHKTvfI9sX1beLEJ8': { name: 'Diana Sanchez', gender: 'Femenino', age: 'Joven', accent: 'Mexicano', language: 'Español', category: 'professional', descriptive: 'Elegante' },
  'cAvMBIZ0VNTU8XdsUpEq': { name: 'Susana Elizabeth', gender: 'Femenino', age: 'Joven', accent: 'Mexicano', language: 'Español', category: 'professional', descriptive: 'Casual' },
  'D3ws14YxTqcjPaXEOehR': { name: 'Azu', gender: 'Femenino', age: 'Mayor', accent: 'Mexicano', language: 'Español', category: 'professional', descriptive: 'Madura' },
  '8XmnJFXynxUN7hZH7q3a': { name: 'Vale Chile', gender: 'Femenino', age: 'Joven', accent: 'Chileno', language: 'Español', category: 'professional', descriptive: 'Confiada' },
  '9rvdnhrYoXoUt4igKpBw': { name: 'Mariana -Intimate and Assertive', gender: 'Femenino', age: 'Mediana edad', accent: 'Argentino', language: 'Español', category: 'professional', descriptive: 'Meditativa' },
  '9oPKasc15pfAbMr7N6Gs': { name: 'Valeria', gender: 'Femenino', age: 'Mediana edad', accent: 'Argentino', language: 'Español', category: 'professional', descriptive: 'Confiada' },
  '5vkxOzoz40FrElmLP4P7': { name: 'Gaby - Conversational', gender: 'Femenino', age: 'Joven', accent: 'Peruano', language: 'Español', category: 'professional', descriptive: 'Casual' },
  'VywzfvxxNk4yFAaoMm4Q': { name: 'Daniela - Young and Talkative', gender: 'Femenino', age: 'Joven', accent: 'Peruano', language: 'Español', category: 'professional', descriptive: 'Casual' },
  '4VDZLGtT3KMPG6CtDKCT': { name: 'Ligia Elena', gender: 'Neutral', age: 'Mediana edad', accent: 'Venezolano', language: 'Español', category: 'professional', descriptive: 'Casual' },
  'qHkrJuifPpn95wK3rm2A': { name: 'Andrea', gender: 'Femenino', age: 'Joven', accent: 'Latinoamericano', language: 'Español', category: 'professional', descriptive: 'Casual' },
  'tTQzD8U9VSnJgfwC6HbY': { name: 'Nathalia', gender: 'Femenino', age: 'Joven', accent: 'Latinoamericano', language: 'Español', category: 'professional', descriptive: 'Casual' },
  '3Fx71T889APcHRu4VtQf': { name: 'Medellin - Colombian Voice', gender: 'Femenino', age: 'Joven', accent: 'Latinoamericano', language: 'Español', category: 'professional', descriptive: 'Tranquila' },
  'YPh7OporwNAJ28F5IQrm': { name: 'Angie vendedora Colombiana', gender: 'Femenino', age: 'Joven', accent: 'Latinoamericano', language: 'Español', category: 'professional', descriptive: 'Casual' },
  'UNIruiz09F4kWYjRpOvy': { name: 'Paula Pinzon', gender: 'Femenino', age: 'Joven', accent: 'Latinoamericano', language: 'Español', category: 'professional', descriptive: 'Confiada' },
  'CaJslL1xziwefCeTNzHv': { name: 'Cristina Campos', gender: 'Femenino', age: 'Joven', accent: 'Latinoamericano', language: 'Español', category: 'professional', descriptive: 'Casual' },
};

export const getVoiceMetadata = (voiceId: string): VoiceMetadata => {
  return voiceMetadata[voiceId] || { 
    name: 'Voz desconocida', 
    gender: 'Neutral', 
    age: 'Sin especificar',
    accent: 'Sin especificar', 
    language: 'Español',
    category: 'professional',
    descriptive: 'Sin especificar'
  };
};

export const getUniqueAccents = () => {
  const accents = Object.values(voiceMetadata).map(v => v.accent);
  return [...new Set(accents)].sort();
};

export const getUniqueGenders = () => {
  const genders = Object.values(voiceMetadata).map(v => v.gender);
  return [...new Set(genders)].sort();
};

export const getUniqueAges = () => {
  const ages = Object.values(voiceMetadata).map(v => v.age);
  return [...new Set(ages)].sort();
};

export const getUniqueDescriptives = () => {
  const descriptives = Object.values(voiceMetadata).map(v => v.descriptive);
  return [...new Set(descriptives)].sort();
};