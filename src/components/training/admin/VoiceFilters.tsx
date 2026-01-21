import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { getUniqueAccents, getUniqueGenders, getUniqueAges, getUniqueDescriptives } from '@/lib/voice-data';

interface VoiceFiltersProps {
  selectedAccent: string;
  selectedGender: string;
  selectedAge: string;
  selectedDescriptive: string;
  searchTerm: string;
  onAccentChange: (accent: string) => void;
  onGenderChange: (gender: string) => void;
  onAgeChange: (age: string) => void;
  onDescriptiveChange: (descriptive: string) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
}

export function VoiceFilters({
  selectedAccent,
  selectedGender,
  selectedAge,
  selectedDescriptive,
  searchTerm,
  onAccentChange,
  onGenderChange,
  onAgeChange,
  onDescriptiveChange,
  onSearchChange,
  onClearFilters
}: VoiceFiltersProps) {
  const accents = getUniqueAccents();
  const genders = getUniqueGenders();
  const ages = getUniqueAges();
  const descriptives = getUniqueDescriptives();

  const hasActiveFilters = (selectedAccent && selectedAccent !== 'all') || 
                        (selectedGender && selectedGender !== 'all') || 
                        (selectedAge && selectedAge !== 'all') ||
                        (selectedDescriptive && selectedDescriptive !== 'all') ||
                        searchTerm;

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Filtros de Voces</h4>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Búsqueda por nombre */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filtro por acento */}
        <Select value={selectedAccent} onValueChange={onAccentChange}>
          <SelectTrigger className="h-9 bg-background z-50">
            <SelectValue placeholder="Todos los acentos" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="all">Todos los acentos</SelectItem>
            {accents.filter(accent => accent && accent.trim() !== '').map(accent => (
              <SelectItem key={accent} value={accent}>
                {accent}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por género */}
        <Select value={selectedGender} onValueChange={onGenderChange}>
          <SelectTrigger className="h-9 bg-background z-50">
            <SelectValue placeholder="Todos los géneros" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="all">Todos los géneros</SelectItem>
            {genders.filter(gender => gender && gender.trim() !== '').map(gender => (
              <SelectItem key={gender} value={gender}>
                {gender}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por edad */}
        <Select value={selectedAge} onValueChange={onAgeChange}>
          <SelectTrigger className="h-9 bg-background z-50">
            <SelectValue placeholder="Todas las edades" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="all">Todas las edades</SelectItem>
            {ages.filter(age => age && age.trim() !== '').map(age => (
              <SelectItem key={age} value={age}>
                {age}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por descriptivo */}
        <Select value={selectedDescriptive} onValueChange={onDescriptiveChange}>
          <SelectTrigger className="h-9 bg-background z-50">
            <SelectValue placeholder="Todos los estilos" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="all">Todos los estilos</SelectItem>
            {descriptives.filter(descriptive => descriptive && descriptive.trim() !== '').map(descriptive => (
              <SelectItem key={descriptive} value={descriptive}>
                {descriptive}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}