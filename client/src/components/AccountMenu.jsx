/** @jsxImportSource solid-js */
import { createSignal, onCleanup } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import { A } from "@solidjs/router";

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

  return (
    <div class="account-menu relative ml-auto">
      <button
        onClick={toggle}
        class="avatar-btn bg-surface border border-border rounded-full w-10 h-10 flex items-center justify-center cursor-pointer"
      >
        {/* Simple avatar: first letter of username or generic icon */}
        {user() ? user().username.charAt(0).toUpperCase() : "U"}
      </button>
      {open() && (
        <div class="dropdown absolute right-0 top-12 bg-surface border border-border rounded-xl min-w-36 shadow-lg z-1000">
          <A
            href="/profile"
            class="dropdown-item block px-4 py-3 text-text no-underline"
            onClick={close}
          >
            Profile
          </A>
          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            class="dropdown-item w-full text-left px-4 py-3 bg-none border-none cursor-pointer text-danger"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
