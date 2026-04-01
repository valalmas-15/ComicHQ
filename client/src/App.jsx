import { useLocation, A, Navigate } from "@solidjs/router";
import Navbar from "./components/Navbar";
import Library from "./components/Library";
import Updates from "./components/Updates";
import Browse from "./components/Browse";
import History from "./components/History";
import MangaDetail from "./components/MangaDetail";
import Reader from "./components/Reader";
import Sources from "./components/Sources";
import Login from "./components/Login";
import Profile from "./components/Profile";
import { useAuth } from "./contexts/AuthContext";
import { Show } from "solid-js";
import "./index.css";

function ProtectedRoute(props) {
  const { user, loading } = useAuth();
  
  return (
    <Show when={!loading()} fallback={<div class="flex justify-center p-8"><div class="loading-spinner"></div></div>}>
      <Show when={user()} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  );
}

function App(props) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isReader = () => location.pathname.includes('/read/');
  const isAuthPage = () => location.pathname === '/login' || location.pathname === '/register';

  return (
    <div class={`app-container ${isReader() ? 'reader-mode' : ''}`}>
      <Show when={!isReader()}>
        <Navbar />
      </Show>

      <main class="app-main">
        <Show when={isAuthPage()}>
          {props.children}
        </Show>
        <Show when={!isAuthPage()}>
          <ProtectedRoute>
            {props.children}
          </ProtectedRoute>
        </Show>
      </main>
    </div>
  );
}

export const routes = [
  { path: "/", component: () => <Navigate href="/library" /> },
  { path: "/library", component: Library },
  { path: "/updates", component: Updates },
  { path: "/browse", component: Browse },
  { path: "/history", component: History },
  { path: "/sources", component: Sources },
  { path: "/manga/:provider/*url", component: MangaDetail },
  { path: "/read/:provider/*url", component: Reader },
  { path: "/login", component: Login },
  { path: "/register", component: Login },
  { path: "/profile", component: Profile },
];

export default App;
