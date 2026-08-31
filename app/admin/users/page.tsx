"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createClient,
} from "../../../lib/supabaseClient";

type UserRole =
  | "customer"
  | "admin"
  | "super_admin";

type AdminUserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  reward_points: number;
  lifetime_spend: number;
  vip_tier: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  const [users, setUsers] =
    useState<AdminUserRow[]>([]);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [savingUserId, setSavingUserId] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState("");

  async function loadUsers() {
    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_list_users"
    );

    if (error) {
      setNotice(
        `Accounts could not be loaded: ${error.message}`
      );
      return;
    }

    setUsers(
      (data || []) as AdminUserRow[]
    );
  }

  useEffect(() => {
    async function loadPage() {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setCurrentUserId(
        userData.user.id
      );

      const {
        data: superAdmin,
        error: roleError,
      } = await supabase.rpc(
        "is_pugpep_super_admin"
      );

      if (
        roleError ||
        !superAdmin
      ) {
        if (roleError) {
          console.error(
            "Super-admin role check failed:",
            roleError
          );
        }

        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadUsers();
      setLoading(false);
    }

    void loadPage();
  }, [supabase]);

  async function changeRole(
    user: AdminUserRow,
    nextRole: UserRole
  ) {
    if (
      savingUserId ||
      user.role === nextRole
    ) {
      return;
    }

    const label =
      nextRole === "super_admin"
        ? "Super Admin"
        : nextRole === "admin"
        ? "Admin"
        : "Customer";

    const confirmed =
      window.confirm(
        `Change ${user.email || user.full_name || "this account"} to ${label}?`
      );

    if (!confirmed) {
      return;
    }

    setSavingUserId(
      user.user_id
    );

    setNotice("");

    try {
      const {
        error,
      } = await supabase.rpc(
        "superadmin_set_user_role",
        {
          p_target_user_id:
            user.user_id,
          p_role:
            nextRole,
        }
      );

      if (error) {
        setNotice(
          `Role could not be changed: ${error.message}`
        );
        return;
      }

      setNotice(
        `${user.email || user.full_name || "Account"} is now ${label}.`
      );

      await loadUsers();
    } finally {
      setSavingUserId(
        null
      );
    }
  }

  const filteredUsers =
    users.filter(
      (user) => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        return (
          String(
            user.email || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            user.full_name || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            user.role || ""
          )
            .toLowerCase()
            .includes(query)
        );
      }
    );

  const superAdminCount =
    users.filter(
      (user) =>
        user.role ===
        "super_admin"
    ).length;

  const adminCount =
    users.filter(
      (user) =>
        user.role ===
        "admin"
    ).length;

  if (loading) {
    return (
      <main style={page}>
        <div style={container}>
          <h1>
            Loading admin users...
          </h1>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={page}>
        <div style={container}>
          <p style={eyebrow}>
            ACCESS DENIED
          </p>

          <h1 style={title}>
            Super Admin Required
          </h1>

          <p style={subtitle}>
            Only a super-admin can
            grant or revoke
            administrative access.
          </p>

          <Link
            href="/admin"
            style={backLink}
          >
            ← Operations Center
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <div>
            <p style={eyebrow}>
              SECURITY & ACCESS
            </p>

            <h1 style={title}>
              Admin Users
            </h1>

            <p style={subtitle}>
              Grant or revoke
              administrative access
              without changing code.
              Customer is the default
              role for normal accounts.
            </p>
          </div>

          <Link
            href="/admin"
            style={backLink}
          >
            ← Operations Center
          </Link>
        </header>

        {notice && (
          <div style={noticeBox}>
            <span>{notice}</span>

            <button
              type="button"
              onClick={() =>
                setNotice("")
              }
              style={noticeClose}
            >
              ×
            </button>
          </div>
        )}

        <section style={summaryGrid}>
          <SummaryCard
            label="Super Admins"
            value={String(
              superAdminCount
            )}
            accent="#ff75df"
          />

          <SummaryCard
            label="Admins"
            value={String(
              adminCount
            )}
            accent="#00d9ff"
          />

          <SummaryCard
            label="Customer Accounts"
            value={String(
              Math.max(
                0,
                users.length -
                  superAdminCount -
                  adminCount
              )
            )}
            accent="#00ff99"
          />

          <SummaryCard
            label="Total Accounts"
            value={String(
              users.length
            )}
            accent="#9ea7ff"
          />
        </section>

        <section style={searchPanel}>
          <label style={searchLabel}>
            FIND ACCOUNT
          </label>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search name, email, or role..."
            style={searchInput}
          />
        </section>

        <section style={usersPanel}>
          <div style={usersHeader}>
            <div>
              <p style={sectionEyebrow}>
                ACCOUNT ACCESS
              </p>

              <h2 style={sectionTitle}>
                {filteredUsers.length}{" "}
                Account
                {filteredUsers.length ===
                1
                  ? ""
                  : "s"}
              </h2>
            </div>

            <div style={legend}>
              Super-admin orders are
              automatically internal and
              excluded from rewards,
              Nexus, commission, and
              business metrics.
            </div>
          </div>

          <div style={userGrid}>
            {filteredUsers.map(
              (user) => {
                const isYou =
                  user.user_id ===
                  currentUserId;

                const saving =
                  savingUserId ===
                  user.user_id;

                const presentation =
                  getRolePresentation(
                    user.role
                  );

                return (
                  <article
                    key={
                      user.user_id
                    }
                    style={{
                      ...userCard,
                      borderColor:
                        presentation.border,
                    }}
                  >
                    <div style={cardTop}>
                      <div>
                        <div style={nameRow}>
                          <strong style={userName}>
                            {user.full_name ||
                              "Unnamed Account"}
                          </strong>

                          {isYou && (
                            <span style={youBadge}>
                              YOU
                            </span>
                          )}
                        </div>

                        <div style={email}>
                          {user.email ||
                            "No email"}
                        </div>
                      </div>

                      <span
                        style={{
                          ...roleBadge,
                          color:
                            presentation.color,
                          borderColor:
                            presentation.border,
                          background:
                            presentation.background,
                        }}
                      >
                        {presentation.label}
                      </span>
                    </div>

                    <div style={accountMeta}>
                      <Meta
                        label="PugPoints"
                        value={Number(
                          user.reward_points ||
                            0
                        ).toFixed(2)}
                      />

                      <Meta
                        label="Lifetime Spend"
                        value={`$${Number(
                          user.lifetime_spend ||
                            0
                        ).toFixed(2)}`}
                      />

                      <Meta
                        label="VIP"
                        value={
                          user.vip_tier ||
                          "Stone"
                        }
                      />
                    </div>

                    <div style={actionRow}>
                      <button
                        type="button"
                        disabled={
                          saving ||
                          user.role ===
                            "customer"
                        }
                        onClick={() =>
                          void changeRole(
                            user,
                            "customer"
                          )
                        }
                        style={{
                          ...roleButton,
                          opacity:
                            saving ||
                            user.role ===
                              "customer"
                              ? 0.4
                              : 1,
                        }}
                      >
                        Customer
                      </button>

                      <button
                        type="button"
                        disabled={
                          saving ||
                          user.role ===
                            "admin"
                        }
                        onClick={() =>
                          void changeRole(
                            user,
                            "admin"
                          )
                        }
                        style={{
                          ...roleButton,
                          ...adminButton,
                          opacity:
                            saving ||
                            user.role ===
                              "admin"
                              ? 0.4
                              : 1,
                        }}
                      >
                        Admin
                      </button>

                      <button
                        type="button"
                        disabled={
                          saving ||
                          user.role ===
                            "super_admin"
                        }
                        onClick={() =>
                          void changeRole(
                            user,
                            "super_admin"
                          )
                        }
                        style={{
                          ...roleButton,
                          ...superAdminButton,
                          opacity:
                            saving ||
                            user.role ===
                              "super_admin"
                              ? 0.4
                              : 1,
                        }}
                      >
                        {saving
                          ? "Saving..."
                          : "Super Admin"}
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function getRolePresentation(
  role: UserRole
) {
  if (role === "super_admin") {
    return {
      label: "SUPER ADMIN",
      color: "#ff75df",
      border:
        "rgba(255,117,223,.42)",
      background:
        "rgba(255,117,223,.09)",
    };
  }

  if (role === "admin") {
    return {
      label: "ADMIN",
      color: "#00d9ff",
      border:
        "rgba(0,217,255,.40)",
      background:
        "rgba(0,217,255,.08)",
    };
  }

  return {
    label: "CUSTOMER",
    color: "#00ff99",
    border:
      "rgba(0,255,153,.30)",
    background:
      "rgba(0,255,153,.06)",
  };
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...summaryCard,
        borderColor:
          `${accent}45`,
      }}
    >
      <span style={summaryLabel}>
        {label}
      </span>

      <strong
        style={{
          ...summaryValue,
          color: accent,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={metaBox}>
      <span style={metaLabel}>
        {label}
      </span>

      <strong style={metaValue}>
        {value}
      </strong>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding:
    "clamp(18px, 4vw, 42px) 16px 60px",
  background:
    "radial-gradient(circle at top left, rgba(0,217,255,.08), transparent 32%), radial-gradient(circle at top right, rgba(255,47,208,.07), transparent 30%), #050607",
  color: "#ffffff",
};

const container = {
  width: "min(1220px, 100%)",
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00ff99",
  fontSize: 11,
  fontWeight: 1000,
  letterSpacing: ".14em",
};

const title = {
  margin: "6px 0 0",
  fontSize:
    "clamp(30px, 6vw, 48px)",
};

const subtitle = {
  maxWidth: 720,
  margin: "10px 0 0",
  color: "#9299a2",
  lineHeight: 1.6,
};

const backLink = {
  padding: "10px 14px",
  border:
    "1px solid rgba(0,217,255,.35)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: 12,
};

const noticeBox = {
  marginTop: 18,
  padding: "12px 14px",
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
  border:
    "1px solid rgba(255,204,0,.32)",
  borderRadius: 12,
  background:
    "rgba(255,204,0,.06)",
  color: "#ffe28a",
};

const noticeClose = {
  border: 0,
  background: "transparent",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 18,
};

const summaryGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};

const summaryCard = {
  padding: 16,
  display: "grid",
  gap: 7,
  border: "1px solid",
  borderRadius: 14,
  background:
    "rgba(255,255,255,.025)",
};

const summaryLabel = {
  color: "#7d858e",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const summaryValue = {
  fontSize: 30,
  lineHeight: 1,
};

const searchPanel = {
  marginTop: 18,
  padding: 16,
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 14,
  background:
    "rgba(255,255,255,.025)",
};

const searchLabel = {
  display: "block",
  marginBottom: 8,
  color: "#8b929a",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const searchInput = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "12px 13px",
  border:
    "1px solid rgba(0,217,255,.25)",
  borderRadius: 10,
  outline: "none",
  background: "#090b0d",
  color: "#ffffff",
  fontSize: 14,
};

const usersPanel = {
  marginTop: 18,
  padding:
    "clamp(16px, 3vw, 22px)",
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 16,
  background:
    "rgba(6,8,10,.88)",
};

const usersHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap" as const,
};

const sectionEyebrow = {
  margin: 0,
  color: "#ff75df",
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".12em",
};

const sectionTitle = {
  margin: "5px 0 0",
  fontSize: 24,
};

const legend = {
  maxWidth: 430,
  padding: "9px 11px",
  border:
    "1px solid rgba(255,117,223,.20)",
  borderRadius: 10,
  background:
    "rgba(255,117,223,.04)",
  color: "#a69aaa",
  fontSize: 11,
  lineHeight: 1.5,
};

const userGrid = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 12,
};

const userCard = {
  padding: 16,
  border: "1px solid",
  borderRadius: 14,
  background:
    "rgba(255,255,255,.022)",
};

const cardTop = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const nameRow = {
  display: "flex",
  gap: 7,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const userName = {
  color: "#ffffff",
  fontSize: 15,
};

const youBadge = {
  padding: "2px 6px",
  border:
    "1px solid rgba(0,255,153,.35)",
  borderRadius: 999,
  color: "#00ff99",
  fontSize: 8,
  fontWeight: 1000,
};

const email = {
  marginTop: 4,
  color: "#858d96",
  fontSize: 12,
  wordBreak:
    "break-word" as const,
};

const roleBadge = {
  padding: "5px 8px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 1000,
  letterSpacing: ".05em",
  whiteSpace: "nowrap" as const,
};

const accountMeta = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const metaBox = {
  padding: 9,
  border:
    "1px solid rgba(255,255,255,.08)",
  borderRadius: 9,
  background:
    "rgba(0,0,0,.20)",
};

const metaLabel = {
  display: "block",
  color: "#717983",
  fontSize: 8,
  fontWeight: 900,
};

const metaValue = {
  display: "block",
  marginTop: 4,
  color: "#ffffff",
  fontSize: 12,
};

const actionRow = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 7,
};

const roleButton = {
  minHeight: 36,
  padding: "8px 6px",
  border:
    "1px solid rgba(255,255,255,.18)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,.035)",
  color: "#c7ccd1",
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 900,
};

const adminButton = {
  border:
    "1px solid rgba(0,217,255,.30)",
  color: "#7df9ff",
  background:
    "rgba(0,217,255,.05)",
};

const superAdminButton = {
  border:
    "1px solid rgba(255,117,223,.32)",
  color: "#ff75df",
  background:
    "rgba(255,117,223,.05)",
};
