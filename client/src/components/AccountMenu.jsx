/** @jsxImportSource solid-js */
import { createSignal, onCleanup, Show } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import { A } from "@solidjs/router";
import "./AccountMenu.css";

function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = createSignal(false);

  const toggle = () => setOpen(!open());
  const close = () => setOpen(false);

  // Close when clicking outside
  const handleClickOutside = (e) => {
    if (!e.target.closest(".account-menu")) close();
  };
  document.addEventListener("click", handleClickOutside);
  onCleanup(() => document.removeEventListener("click", handleClickOutside));

  const username = () => user()?.username || "Tamu";
  const firstLetter = () => username().charAt(0).toUpperCase();

  return (
    <div class="account-menu">
      <button
        onClick={toggle}
        class="avatar-btn"
        title={username()}
      >
        {firstLetter()}
      </button>

      <Show when={open()}>
        <div class="account-dropdown">
          <div class="dropdown-header">
            <span class="welcome">Selamat datang,</span>
            <span class="username">{username()}</span>
          </div>
          
          <div class="dropdown-list">
            <A href="/profile" class="dropdown-item" onClick={close}>
              <i class="fas fa-user-circle"></i>
              <span>Profil Saya</span>
            </A>
            
            <div class="dropdown-divider"></div>
            
            <button
              onClick={() => {
                close();
                logout();
                window.location.href = "/login";
              }}
              class="dropdown-item logout"
            >
              <i class="fas fa-sign-out-alt"></i>
              <span>Keluar Akun</span>
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default AccountMenu;
