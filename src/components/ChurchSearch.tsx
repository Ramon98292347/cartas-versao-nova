import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// TODO: Replace with Supabase integration later
export interface Church {
  id: number;
  codigoTotvs: string;
  nome: string;
  cidade: string;
  uf: string;
  carimboIgreja: string;
  carimboPastor: string;
}

interface ChurchSearchProps {
  label: string;
  placeholder: string;
  onSelect: (church: Church) => void;
  churches: Church[];
  value?: string;
}

export function ChurchSearch({ label, placeholder, onSelect, churches, value }: ChurchSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredChurches, setFilteredChurches] = useState<Church[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const filtered = churches.filter(
        (church) =>
          church.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          church.codigoTotvs.toLowerCase().includes(searchTerm.toLowerCase()) ||
          church.cidade.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredChurches(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredChurches([]);
      setIsOpen(false);
    }
  }, [searchTerm, churches]);

  const handleSelect = (church: Church) => {
    setSearchTerm(`${church.codigoTotvs} - ${church.nome}`);
    onSelect(church);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      <Label htmlFor={label} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={label}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (filteredChurches.length > 0) setIsOpen(true);
          }}
          className="pl-9 bg-card border-input focus:border-primary focus:ring-primary transition-colors"
        />
      </div>

      {isOpen && filteredChurches.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-auto">
          {filteredChurches.map((church) => (
            <button
              key={church.id}
              onClick={() => handleSelect(church)}
              className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors flex flex-col gap-1 border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-sm text-primary">{church.codigoTotvs}</span>
                <span className="text-sm text-foreground">{church.nome}</span>
              </div>
              <div className="flex items-center gap-1 ml-6">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {church.cidade} - {church.uf}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
