import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Search, ChevronDown, HelpCircle, Settings, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notifications } from "@/lib/data";
import { GlobalSearch } from "@/components/global-search";

export function TopBar() {
  const unread = notifications.filter((n) => n.unread).length;
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
        <SidebarTrigger className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-secondary" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="hidden h-8 items-center gap-2 rounded-md px-2 sm:flex">
              <div className="grid h-6 w-6 place-items-center rounded bg-primary text-[10px] font-bold text-primary-foreground">T</div>
              <span className="text-sm font-semibold text-foreground">Treats24</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 rounded-md">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 rounded-sm">
              <div className="grid h-6 w-6 place-items-center rounded bg-primary text-[10px] font-bold text-primary-foreground">T</div>
              Treats24
              <Badge className="ml-auto rounded-full border-transparent bg-cta/15 text-[10px] text-cta">Active</Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-sm">+ Create workspace</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button type="button" onClick={() => setSearchOpen(true)} className="relative ml-1 max-w-md flex-1 text-left">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            readOnly
            placeholder="Search tasks, issues… (⌘K)"
            className="h-8 cursor-pointer rounded-md border-border bg-background pl-10 text-sm shadow-none focus-visible:ring-primary/30"
          />
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="hidden h-8 w-8 rounded-md sm:flex">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-md">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-cta px-1 text-[10px] font-semibold text-cta-foreground">
                    {unread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-md">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications <Badge variant="secondary" className="rounded-full">{unread} new</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</div>
              ) : (
                notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="flex items-start gap-2 rounded-sm py-2">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.unread ? "bg-primary" : "bg-muted-foreground/40"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  </div>
                </DropdownMenuItem>
              ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md p-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">SD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-md">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>Sudev</span>
                  <span className="text-xs font-normal text-muted-foreground">sudev@treats24.com</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="gap-2 rounded-sm">
                <Link to="/profile">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 rounded-sm">
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
