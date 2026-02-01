"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/api";

interface Contact {
  _id: string;
  name: string;
  avatar?: string;
}

export function QuickTransfer() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await api.getFavoriteContacts();
        setContacts(data || []);
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-0 shadow-sm bg-slate-900 text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-white">Quick Transfer</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/transfer" className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border-2 border-dashed border-white/30">
                <Plus className="h-5 w-5 text-white/70" />
              </div>
              <span className="text-xs text-white/70">Add New</span>
            </Link>
            {contacts.map((contact) => (
              <Link
                key={contact._id}
                href={`/transfer?contact=${contact._id}`}
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contact.avatar || "/placeholder.svg"} alt={contact.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-white/90">{contact.name.split(" ")[0]}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
