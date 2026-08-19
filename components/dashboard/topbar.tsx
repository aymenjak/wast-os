'use client';

import { Search, Bell, Globe, ChevronDown, Moon, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';

export function TopBar() {
  const [lang, setLang] = useState<'EN' | 'FR' | 'AR'>('EN');
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reports, work orders, vehicles..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-muted/50 rounded-lg border border-transparent focus:border-primary/30 focus:bg-background focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 h-9 rounded-lg bg-muted/50 text-sm">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-0.5">
            {(['EN', 'FR', 'AR'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${
                  lang === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <button className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Moon className="w-4 h-4" />
        </button>

        <button className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-background" />
        </button>

        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent text-white text-xs font-semibold">
            {user ? user.email?.[0]?.toUpperCase() : 'S'}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-medium leading-tight">
              {user ? user.email : 'Super Admin'}
            </div>
            <div className="text-[10px] text-muted-foreground">Platform Admin</div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
