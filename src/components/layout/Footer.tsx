
import React from "react";

export default function Footer() {
  return (
    <footer className="py-6 border-t">
      <div className="container flex flex-col items-center gap-2 px-4 md:flex-row md:justify-between">
        <p className="text-sm text-muted-foreground">
          © 2025 Convert-IA. Todos los derechos reservados.
        </p>
        <div className="flex items-center gap-4">
          <a href="#" className="text-sm text-muted-foreground hover:underline">
            Términos
          </a>
          <a href="#" className="text-sm text-muted-foreground hover:underline">
            Privacidad
          </a>
          <a href="#" className="text-sm text-muted-foreground hover:underline">
            Contacto
          </a>
        </div>
      </div>
    </footer>
  );
}
