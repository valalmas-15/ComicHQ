import { A } from "@solidjs/router";
import { Show } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import "./Navbar.css";
import AccountMenu from "./AccountMenu";

function Navbar() {
  const { user } = useAuth();

  return (
    <>
      {/* 🏛️ BRANDING BAR: Fixed TOP always (Logo CENTER, Account RIGHT) */}
      <header class="branding-bar">
        <div class="branding-content">
          <div class="branding-left"></div> {/* Spacer for symmetry */}
          
          <A href="/" class="nav-logo">
            Comic<span>HQ</span>
          </A>
          
          <div class="branding-right">
            <Show 
              when={user()} 
              fallback={
                <A href="/login" class="login-mini-btn">
                  <i class="fas fa-sign-in-alt"></i>
                </A>
              }
            >
              <AccountMenu />
            </Show>
          </div>
        </div>
      </header>

      {/* 🧭 NAV BAR: TOP (under header) on Desktop, BOTTOM on Mobile */}
      <nav class="nav-bar">
        <div class="nav-links">
          <A href="/library" activeClass="active">
            <i class="fas fa-book"></i>
            <span>Library</span>
          </A>
          <A href="/browse" activeClass="active">
            <i class="fas fa-search"></i>
            <span>Explore</span>
          </A>
          <A href="/updates" activeClass="active">
            <i class="fas fa-bell"></i>
            <span>Updates</span>
          </A>
          <A href="/sources" activeClass="active">
            <i class="fas fa-server"></i>
            <span>Sources</span>
          </A>
          <A href="/history" activeClass="active">
            <i class="fas fa-clock"></i>
            <span>History</span>
          </A>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
