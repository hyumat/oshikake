/**
 * Team Selection Onboarding Page
 * Issue #107: サインアップ直後のクラブ/チーム選択導線
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Team {
  slug: string;
  name: string;
  description: string;
}

const teams: Team[] = [
  {
    slug: "yokohama-f-marinos",
    name: "横浜F・マリノス",
    description: "J1リーグ所属。トリコロールカラーが特徴。",
  },
  // Future: Add more teams here
];

export default function OnboardingTeam() {
  const [, setLocation] = useLocation();
  const [selectedTeam, setSelectedTeam] = useState<string>("yokohama-f-marinos");

  const selectTeamMutation = trpc.users.selectTeam.useMutation({
    onSuccess: () => {
      toast.success("チーム選択が完了しました");
      setLocation("/app");
    },
    onError: (err) => {
      toast.error(err.message || "エラーが発生しました");
    },
  });

  const handleSubmit = () => {
    if (!selectedTeam) {
      toast.error("チームを選択してください");
      return;
    }
    selectTeamMutation.mutate({ teamSlug: selectedTeam });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">応援クラブを選択</CardTitle>
          <CardDescription>
            まずは応援するクラブを選択してください。
            <br />
            後で変更することもできます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={selectedTeam}
            onValueChange={setSelectedTeam}
            className="space-y-3"
          >
            {teams.map((team) => (
              <div
                key={team.slug}
                className={`flex items-start space-x-3 space-y-0 rounded-lg border p-4 transition-colors ${
                  selectedTeam === team.slug
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/20"
                }`}
              >
                <RadioGroupItem value={team.slug} id={team.slug} className="mt-1" />
                <Label
                  htmlFor={team.slug}
                  className="flex-1 cursor-pointer font-normal"
                >
                  <div className="font-semibold text-base mb-1">{team.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {team.description}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong>MVP版について:</strong> 現在は横浜F・マリノスのみ対応しています。
              今後、他のクラブにも対応予定です。
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedTeam || selectTeamMutation.isPending}
            className="w-full"
            size="lg"
          >
            {selectTeamMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                設定中...
              </>
            ) : (
              "この内容で始める"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
