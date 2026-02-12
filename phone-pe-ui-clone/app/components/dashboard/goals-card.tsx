"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

interface GoalsData {
  name: string;
  progress: number;
  target: number;
  current: number;
}

export function GoalsCard() {
  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.getDashboard();
        setGoals(data.goals || null);
      } catch {
        setGoals(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (!goals) {
    return (
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <Target className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No goals yet</p>
            <p className="text-xs text-muted-foreground">Goals will appear here when you set them.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-cyan-400 text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-white">Goals</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-white/90 mb-4">{goals.name}</p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
            <Target className="h-5 w-5 text-cyan-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white mb-2">{goals.progress}% Reached</p>
            <Progress value={goals.progress} className="h-2 bg-white/30 [&>div]:bg-slate-800" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
