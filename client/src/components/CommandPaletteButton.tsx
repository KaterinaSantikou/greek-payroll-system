import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Command } from 'lucide-react';

interface CommandPaletteButtonProps {
  onClick: () => void;
}

export function CommandPaletteButton({ onClick }: CommandPaletteButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <Badge
        variant="secondary"
        className="ml-auto text-xs hidden sm:flex items-center gap-1"
      >
        <Command className="h-3 w-3" />K
      </Badge>
    </Button>
  );
}
