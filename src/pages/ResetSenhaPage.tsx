import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordConfirm } from "@/services/saasService";
import { getFriendlyError } from "@/lib/error-map";

export default function ResetSenhaPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => String(params.get("token") || "").trim(), [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      toast.error("Link invalido. Solicite um novo reset de senha.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordConfirm({ token, new_password: newPassword });
      toast.success("Senha redefinida com sucesso.");
      nav("/", { replace: true });
    } catch (err) {
      toast.error(getFriendlyError(err, "auth"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f5f9] p-6">
      <div className="mx-auto max-w-md">
        <Card className="border border-slate-200 bg-white shadow-lg">
          <CardHeader>
            <CardTitle>Redefinir senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    className="pr-10"
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShowNew((v) => !v)}>
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirmar senha</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="pr-10"
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShowConfirm((v) => !v)}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar nova senha"}
              </Button>

              <Button type="button" variant="outline" className="w-full" onClick={() => nav("/")}>Voltar para login</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
