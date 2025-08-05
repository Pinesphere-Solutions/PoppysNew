import React, { useState } from "react";
import { MdDashboard, MdSettings } from "react-icons/md";
import { FaIndustry, FaUserCog } from "react-icons/fa";
import { GiSewingMachine } from "react-icons/gi";
import { BsBarChartLine } from "react-icons/bs";
import { Link, Outlet } from "react-router-dom";
import headerBg from "../../assets/images/9.jpg"; // Import image

/* Sidebar - Menu panel */
const menuItems = [
  { label: "Dashboard", icon: <MdDashboard />, path: "/dashboard" },
  { label: "Machine Report", icon: <GiSewingMachine />, path: "/machine" },
  { label: "Operator Report", icon: <FaUserCog />, path: "/operator" },
  { label: "Line Report", icon: <FaIndustry />, path: "/line" },
  { label: "Consolidated Report", icon: <BsBarChartLine />, path: "/consolidated" },
  
];

const HEADER_HEIGHT = 56; // px
const FOOTER_HEIGHT = 40; // px

export default function Layout({ children }) {
  const [minimized, setMinimized] = useState(false);

  // Use children if provided, otherwise use Outlet for react-router v6 nested routes
  const content = children || <Outlet />;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      {/* Header */}
      <header
        style={{
          background: `url(${headerBg}) center center / cover no-repeat`,
          color: "#fff",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: HEADER_HEIGHT,
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
        }}
      >
        {/* <span className="dashboard-title" style={{ fontWeight: 600, verticalAlign: "middle", textShadow: "0 2px 8px #0008" }}>
          Poppys Sewing Machine Dashboard
        </span> */}
      </header>

      <div
        style={{
          display: "flex",
          flex: 1,
          marginTop: HEADER_HEIGHT,
          marginBottom: FOOTER_HEIGHT,
          minHeight: `calc(100vh - ${HEADER_HEIGHT + FOOTER_HEIGHT}px)`
        }}
      >
        {/* Left Menu */}
        <aside
          style={{
            background: "#f7fafc",
            minWidth: minimized ? 56 : 200,
            width: minimized ? 56 : 200,
            maxWidth: minimized ? 56 : 200,
            padding: 0,
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            transition: "width 0.2s, min-width 0.2s, max-width 0.2s",
            height: `calc(100vh - ${HEADER_HEIGHT + FOOTER_HEIGHT}px)`,
            position: "sticky",
            top: HEADER_HEIGHT,
            zIndex: 999,
            overflowX: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: minimized ? "center" : "flex-end",
              alignItems: "center",
              padding: minimized ? "0.5rem 0" : "0.5rem 1rem",
              borderBottom: "1px solid #e2e8f0",
              background: "#edf2f7"
            }}
          >
            <button
              onClick={() => setMinimized((m) => !m)}
              style={{
                background: "#e2e8f0",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                padding: "0.25rem 0.7rem",
                fontSize: "1.3rem",
                display: "flex",
                alignItems: "center"
              }}
              title={minimized ? "Expand menu" : "Minimize menu"}
            >
              {minimized ? "»" : "«"}
            </button>
          </div>
         
          {/* --- WRAPPING MENU NAVIGATION --- */}
          <nav
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              flexWrap: "wrap", // allow wrapping on desktop
              maxHeight: "100vh",
              
            }}
          >
            {menuItems.map(item =>
              item.path ? (
                <Link
                  key={item.label}
                  to={item.path}
                  className="menu-link" // <-- for responsive CSS
                  style={{
                    padding: minimized ? "0.9rem 0" : "0.9rem 1.5rem",
                    color: "#5a5a5a",
                    textDecoration: "none",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: minimized ? "center" : "flex-start",
                    fontSize: "1.1rem",
                    width: "100%",
                    maxWidth: "100%",
                    transition: "background 0.2s",
                    borderLeft: "4px solid transparent",
                    overflow: "hidden",
                    wordBreak: "break-word",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    position: "relative"
                  }}
                  tabIndex={0}
                  title={item.label}
                  onFocus={e => e.target.style.background = "#e2e8f0"}
                  onBlur={e => e.target.style.background = "transparent"}
                  onMouseOver={e => e.target.style.background = "#e2e8f0"}
                  onMouseOut={e => e.target.style.background = "transparent"}
                >
                  <span style={{ fontSize: "1.4rem", marginRight: minimized ? 0 : 12 }}>{item.icon}</span>
                  {!minimized && (
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                        wordBreak: "break-word",
                        maxWidth: minimized ? "32px" : "120px"
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href="#"
                  className="menu-link" // <-- for responsive CSS
                  style={{
                    padding: minimized ? "0.9rem 0" : "0.9rem 1.5rem",
                    color: "#5a5a5a",
                    textDecoration: "none",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: minimized ? "center" : "flex-start",
                    fontSize: "1.1rem",
                    width: "100%",
                    maxWidth: "100%",
                    transition: "background 0.2s",
                    borderLeft: "4px solid transparent",
                    overflow: "hidden",
                    wordBreak: "break-word",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    position: "relative"
                  }}
                  tabIndex={0}
                  title={item.label}
                  onFocus={e => e.target.style.background = "#e2e8f0"}
                  onBlur={e => e.target.style.background = "transparent"}
                  onMouseOver={e => e.target.style.background = "#e2e8f0"}
                  onMouseOut={e => e.target.style.background = "transparent"}
                >
                  <span style={{ fontSize: "1.4rem", marginRight: minimized ? 0 : 12 }}>{item.icon}</span>
                  {!minimized && (
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                        wordBreak: "break-word",
                        maxWidth: minimized ? "32px" : "120px"
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </a>
              )
            )}
          </nav>
          {/* --- END WRAPPING MENU NAVIGATION --- */}

        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: "2rem",
            background: "#fff",
            minHeight: `calc(100vh - ${HEADER_HEIGHT + FOOTER_HEIGHT}px)`,
            overflow: "auto"
          }}
        >
          {content}
        </main>
      </div>

      {/* Footer */}
      <footer
        style={{
          background: "#1980c4",
          color: "#fff",
          textAlign: "center",
          padding: 0,
          fontSize: "1rem",
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          height: FOOTER_HEIGHT,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        &copy; {new Date().getFullYear()} Pinesphere. All rights reserved.
      </footer>

      {/* Responsive styles for menu wrapping */}
      <style>
        {`
          @media (max-width: 900px) {
            aside {
              min-width: 48px !important;
              width: 48px !important;
              max-width: 48px !important;
            }
            main {
              padding: 1rem !important;
            }
          }
          @media (max-width: 768px) {
            aside {
              min-width: 0 !important;
              width: 100vw !important;
              max-width: 100vw !important;
              height: auto !important;
              flex-direction: row !important;
              border-right: none !important;
              border-bottom: 1px solid #e2e8f0 !important;
              position: static !important;
              top: unset !important;
            }
            nav {
              flex-direction: row !important;
              flex-wrap: wrap !important;
              justify-content: flex-start !important;
              align-items: flex-start !important;
            }
            a.menu-link, .menu-link {
              min-width: 120px !important;
              max-width: 45vw !important;
              margin: 2px 2px !important;
              display: flex !important;
              flex: 1 1 120px !important;
            }
            main {
              padding: 0.5rem !important;
            }
          }
        `}
      </style>
            {/* End Responsive styles for menu wrapping */}
    </div>
  );
}