import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import NotFound from "./pages/NotFound";
import PhoneIdentify from "./pages/PhoneIdentify";
import CadastroRapido from "./pages/CadastroRapido";
import { UserProvider, useUser } from "./context/UserContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <UserProvider>
        <BrowserRouter>
          <OnReloadRedirect />
          <Routes>
            <Route path="/" element={<PhoneIdentify />} />
            <Route
              path="/cadastro"
              element={
                <RequireTelefone>
                  <CadastroRapido />
                </RequireTelefone>
              }
            />
            <Route
              path="/carta"
              element={
                <RequirePhoneOrUser>
                  <Suspense fallback={<div />}> 
                    <CartaPage />
                  </Suspense>
                </RequirePhoneOrUser>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

function RequirePhoneOrUser({ children }: { children: JSX.Element }) {
  const { usuario, telefone } = useUser();
  if (!usuario && !telefone) return <Navigate to="/" replace />;
  return children;
}
function RequireTelefone({ children }: { children: JSX.Element }) {
  const { telefone } = useUser();
  if (!telefone) return <Navigate to="/" replace />;
  return children;
}
function OnReloadRedirect() {
  const nav = useNavigate();
  const loc = useLocation();
  const { usuario, telefone } = useUser();
  useEffect(() => {
    try {
      const entries = performance.getEntriesByType("navigation") as any[];
      const type = entries && entries.length ? entries[entries.length - 1]?.type : undefined;
      if (type === "reload" && loc.pathname !== "/" && !usuario && !telefone) {
        nav("/", { replace: true });
      }
    } catch {}
  }, []);
  return null;
}
const CartaPage = lazy(() => import("./pages/Index"));
