import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function TeamSelect() {
  const [, navigate] = useLocation();
  const [selectedLeague, setSelectedLeague] = useState<"J1" | "J2" | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  
  const { data: teams, isLoading: teamsLoading } = trpc.teams.list.useQuery(
    selectedLeague ? { league: selectedLeague } : { league: "all" }
  );
  const setSupportedMutation = trpc.teams.setSupported.useMutation({
    onSuccess: () => {
      toast.success("応援クラブを設定しました！");
      navigate("/app");
    },
    onError: (error) => {
      toast.error(error.message || "設定に失敗しました");
    },
  });

  const filteredTeams = selectedLeague 
    ? teams?.filter((team) => team.league === selectedLeague) || []
    : [];

  const handleConfirm = () => {
    if (selectedTeamId) {
      setSupportedMutation.mutate({ teamId: selectedTeamId });
    }
  };

  if (teamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src="/logo.png"
              alt="オシカケ"
              className="h-16 w-16 rounded-xl shadow-sm"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">応援するクラブを選択</h1>
          <p className="mt-2 text-slate-600">
            あなたが応援するJリーグクラブを選んでください
          </p>
        </div>

        {!selectedLeague ? (
          <div className="space-y-4">
            <Card 
              className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
              onClick={() => setSelectedLeague("J1")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    J1リーグ
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </CardTitle>
                <CardDescription>明治安田J1リーグ所属クラブ</CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
              onClick={() => setSelectedLeague("J2")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    J2リーグ
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </CardTitle>
                <CardDescription>明治安田J2リーグ所属クラブ</CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setSelectedLeague(null);
                setSelectedTeamId(null);
              }}
              className="mb-4"
            >
              ← リーグ選択に戻る
            </Button>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className={`h-5 w-5 ${selectedLeague === "J1" ? "text-blue-600" : "text-green-600"}`} />
                  {selectedLeague}リーグ クラブ一覧
                </CardTitle>
                <CardDescription>応援するクラブを選択してください</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredTeams.map((team) => (
                    <Button
                      key={team.id}
                      variant={selectedTeamId === team.id ? "default" : "outline"}
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      {team.name}
                    </Button>
                  ))}
                </div>

                {filteredTeams.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    チームが登録されていません。管理者にお問い合わせください。
                  </p>
                )}
              </CardContent>
            </Card>

            {selectedTeamId && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
                <div className="max-w-2xl mx-auto">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleConfirm}
                    disabled={setSupportedMutation.isPending}
                  >
                    {setSupportedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    このクラブを応援する
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
