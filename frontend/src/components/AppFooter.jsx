import { useTheme } from "@/components/ThemeProvider";

export default function AppFooter() {
  const { settings } = useTheme();
  
  return (
    <footer className="glass border-t border-border/50 px-4 py-4 sm:py-3 mt-auto">
      <div className="flex items-center justify-between max-w-4xl mx-auto min-h-[32px]">
        <span className="text-xs sm:text-sm text-muted-foreground">
          {settings?.event_name || "Karnbachs Event OS"}
        </span>
        {/* Platzhalter für Emergent Badge (rechte Seite) */}
        <span className="w-[140px] sm:w-[160px]"></span>
      </div>
    </footer>
  );
}
