import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-card py-8 mt-16">
      <div className="container mx-auto px-6 text-center">
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          © 2026. Built with <Heart className="icon-sm fill-destructive text-destructive" /> using{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground hover:text-primary transition-colors focus-ring rounded-sm px-1"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
