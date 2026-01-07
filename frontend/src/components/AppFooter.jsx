import { useTheme } from "@/components/ThemeProvider";

export default function AppFooter() {
  const { settings } = useTheme();
  
  return (
    <>
      {/* Spacer damit Content nicht vom Footer überdeckt wird */}
      <div className="h-14 sm:h-12 shrink-0" />
      
      {/* Fixed Footer - IMMER sichtbar */}
      <footer className="fixed bottom-0 left-0 right-0 z-[9999] bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3 sm:py-2">
        <div className="flex items-center justify-between max-w-4xl mx-auto min-h-[32px]">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {settings?.event_name || "Karnbachs Event OS"}
          </span>
          {/* Platzhalter für Emergent Badge (rechte Seite) */}
          <span className="w-[140px] sm:w-[160px]"></span>
        </div>
      </footer>
    </>
  );
}
